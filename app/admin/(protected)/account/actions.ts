'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser, NO_ACCESS } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { checkPassword, type FormState } from '@/lib/validation'

/**
 * Смена собственного пароля.
 *
 * Текущий пароль спрашиваем, хотя Supabase этого не требует: сессия живёт
 * час, и без такой проверки любой, кто подошёл к незакрытому ноутбуку в
 * подсобке кафе, менял бы владельцу пароль и забирал доступ себе.
 *
 * Проверяем повторным входом — это единственный способ убедиться, что пароль
 * тот самый. Побочный эффект в виде новой сессии тут безвреден: пользователь
 * тот же самый.
 */
export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser()
  if (!user?.email) return { ok: false, error: NO_ACCESS }

  const current = String(formData.get('current_password') ?? '')
  const next = String(formData.get('password') ?? '')
  const confirmation = String(formData.get('password_confirmation') ?? '')

  const problem = checkPassword(next, confirmation)
  if (problem) return { ok: false, fieldErrors: { password: problem } }

  if (next === current) {
    return { ok: false, fieldErrors: { password: 'Новый пароль совпадает с текущим' } }
  }

  const supabase = await createClient()

  if (!current) {
    return { ok: false, fieldErrors: { current_password: 'Введите текущий пароль' } }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  })

  if (signInError) {
    if (signInError.status === 429) {
      return { ok: false, error: 'Слишком много попыток. Подождите минуту.' }
    }
    return { ok: false, fieldErrors: { current_password: 'Текущий пароль не подошёл' } }
  }

  const { error } = await supabase.auth.updateUser({ password: next })

  if (error) {
    // Supabase не даёт поставить пароль, который уже использовался, и имеет
    // собственный минимум длины — обе причины стоит показать как есть.
    return { ok: false, fieldErrors: { password: error.message } }
  }

  revalidatePath('/admin/account')
  return { ok: true }
}
