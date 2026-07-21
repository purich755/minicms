'use server'

import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

import { getCurrentTenant } from '@/lib/auth'

/**
 * Включение и выключение предпросмотра.
 *
 * Включать имеет право только владелец — проверка здесь, а не в proxy:
 * действие приходит POST-запросом на тот маршрут, где отрисована форма,
 * а форма выключения живёт на публичном сайте, куда матчер proxy не
 * заглядывает.
 *
 * Выключение, наоборот, никакой проверки не требует: погасить у себя чужую
 * cookie предпросмотра вредом быть не может.
 */

/**
 * Адрес возврата приходит из скрытого поля формы, то есть из браузера.
 * Пускаем только относительные пути: `//зло.рф` браузер считает внешним
 * адресом, и без этой проверки кнопка «выйти из предпросмотра» уводила бы
 * на чужой сайт.
 */
function safeReturn(value: string): string {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

export async function startPreview(formData: FormData): Promise<void> {
  const tenant = await getCurrentTenant()
  if (!tenant) redirect('/admin/login')

  const draft = await draftMode()
  draft.enable()

  redirect(safeReturn(String(formData.get('returnTo') ?? `/${tenant.slug}`)))
}

export async function stopPreview(formData: FormData): Promise<void> {
  const draft = await draftMode()
  draft.disable()

  redirect(safeReturn(String(formData.get('returnTo') ?? '/')))
}
