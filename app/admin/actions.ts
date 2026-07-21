'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export type LoginState = { error: string | null }

/**
 * Возврат после входа разрешён только внутрь админки.
 *
 * Без этой проверки ссылка вида /admin/login?next=https://зло.рф увела бы
 * человека на чужой сайт сразу после ввода пароля. Двойной слэш отсекаем
 * отдельно: //зло.рф браузер считает внешним адресом.
 */
function safeNext(value: string): string {
  if (value.startsWith('/admin') && !value.startsWith('//')) return value
  return '/admin'
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('next') ?? '')

  if (!email || !password) {
    return { error: 'Введите почту и пароль.' }
  }

  const supabase = await createClient()

  let error
  try {
    ;({ error } = await supabase.auth.signInWithPassword({ email, password }))
  } catch {
    return { error: 'Сервис авторизации недоступен. Попробуйте через минуту.' }
  }

  if (error) {
    // Недоступность сервиса и неверный пароль — разные вещи, и человеку стоит
    // видеть разницу: иначе он будет перебирать пароли при упавшем Supabase.
    //
    // Разбираем по коду ответа, а не «всё кроме 5xx — неверный пароль»:
    // при сетевом сбое supabase-js отдаёт status 0, и такая проверка
    // молча превращала бы аварию в «неверный пароль».
    if (error.status === 429) {
      return { error: 'Слишком много попыток входа. Подождите минуту.' }
    }

    if (error.status === 400 || error.status === 401 || error.status === 403) {
      // Здесь намеренно не уточняем, что именно не подошло: иначе форма
      // превращается в способ выяснить, заведён ли в системе такой адрес.
      return { error: 'Неверная почта или пароль.' }
    }

    return { error: 'Сервис авторизации недоступен. Попробуйте через минуту.' }
  }

  // redirect() кидает специальное исключение — заворачивать его в try/catch
  // нельзя, иначе переход не произойдёт.
  redirect(safeNext(next))
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

export type ResetRequestState = { sent: boolean; error: string | null }

/**
 * Письмо со ссылкой на смену пароля.
 *
 * Ответ всегда одинаковый — «письмо отправлено», — даже если такой почты в
 * системе нет. Иначе форма превращается в способ выяснить, кто у нас клиент:
 * ввёл адрес, увидел «пользователь не найден» — узнал ответ.
 *
 * Адрес возврата берём из заголовков запроса, а не из переменной окружения:
 * сервис открывается и на localhost, и на домене Vercel, и на своём домене,
 * а ссылка в письме обязана вести туда, откуда её попросили.
 */
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()

  if (!email) return { sent: false, error: 'Введите почту.' }

  const headerList = await headers()
  const host = headerList.get('host') ?? ''
  const protocol = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'

  const supabase = await createClient()

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${protocol}://${host}/admin/auth/callback`,
    })

    // Ограничение частоты — единственный случай, когда молчать вредно:
    // человек будет жать кнопку и ждать письмо, которого не будет.
    if (error?.status === 429) {
      return {
        sent: false,
        error: 'Слишком много запросов. Письмо можно запросить раз в несколько минут.',
      }
    }
  } catch {
    return { sent: false, error: 'Сервис недоступен. Попробуйте через минуту.' }
  }

  return { sent: true, error: null }
}
