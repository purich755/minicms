'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getCurrentTenant, NO_ACCESS } from '@/lib/auth'
import { dbErrorMessage } from '@/lib/db-errors'
import { isValidSlug, slugify } from '@/lib/slug'
import { MEDIA_BUCKET, storagePathFromUrl } from '@/lib/storage'
import { createClient } from '@/lib/supabase/server'
import {
  hasErrors,
  takeBoolean,
  takeDateTime,
  takeText,
  type FieldErrors,
  type FormState,
} from '@/lib/validation'

/**
 * Удаляет картинку из хранилища, если она наша и больше не используется.
 * Молча: если не получилось, это мусор в бакете, а не повод ронять сохранение.
 */
async function dropImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  url: string | null | undefined,
) {
  const path = storagePathFromUrl(url)
  if (path) await supabase.storage.from(MEDIA_BUCKET).remove([path])
}

export async function saveNews(_prev: FormState, formData: FormData): Promise<FormState> {
  const tenant = await getCurrentTenant()
  if (!tenant) return { ok: false, error: NO_ACCESS }

  const id = String(formData.get('id') ?? '')
  const errors: FieldErrors = {}

  const title = takeText(formData, 'title', errors, {
    label: 'Заголовок',
    required: true,
    max: 200,
  })

  // Адрес страницы: что ввели, либо составленный из заголовка. Приводим к
  // допустимому виду в любом случае — «Мои Новости» станут my-novosti.
  const slug = slugify(takeText(formData, 'slug', errors, { label: 'Адрес', max: 200 }) || title)

  if (!slug) {
    errors.slug = 'Не удалось составить адрес. Впишите его вручную латиницей.'
  } else if (!isValidSlug(slug)) {
    errors.slug = 'Адрес: только латиница, цифры и дефис.'
  }

  const isPublished = takeBoolean(formData, 'is_published')
  const publishedAt = takeDateTime(formData, 'published_at', errors, { label: 'Дата публикации' })
  const body = takeText(formData, 'body', errors, { label: 'Текст', max: 20000 })
  const coverUrl = takeText(formData, 'cover_image_url', errors, { label: 'Обложка', max: 500 })

  if (hasErrors(errors)) return { ok: false, fieldErrors: errors }

  const supabase = await createClient()

  // tenant_id только при вставке: при обновлении его нет даже в типе — строка
  // не должна уметь переехать к другому тенанту.
  const fields = {
    title,
    slug,
    body: body || null,
    cover_image_url: coverUrl || null,
    is_published: isPublished,
    // Опубликовали без даты — считаем, что публикуем сейчас. Иначе новость
    // прошла бы фильтр published_at <= now() только из-за того, что дата пуста.
    published_at: isPublished ? (publishedAt ?? new Date().toISOString()) : publishedAt,
  }

  const duplicateSlug = {
    '23505': 'Новость с таким адресом уже есть. Измените адрес.',
  }

  if (id) {
    // Забираем старую обложку до обновления: если её заменили, старую надо убрать.
    const { data: existing } = await supabase
      .from('news')
      .select('cover_image_url')
      .eq('id', id)
      .maybeSingle()

    const { error } = await supabase
      .from('news')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenant.id)

    if (error) return { ok: false, error: dbErrorMessage(error, duplicateSlug) }

    if (existing?.cover_image_url && existing.cover_image_url !== fields.cover_image_url) {
      await dropImage(supabase, existing.cover_image_url)
    }
  } else {
    const { error } = await supabase.from('news').insert({ ...fields, tenant_id: tenant.id })
    if (error) return { ok: false, error: dbErrorMessage(error, duplicateSlug) }
  }

  revalidatePath('/admin/news')
  revalidatePath('/admin')
  redirect('/admin/news')
}

export async function deleteNews(_prev: FormState, formData: FormData): Promise<FormState> {
  const tenant = await getCurrentTenant()
  if (!tenant) return { ok: false, error: NO_ACCESS }

  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, error: 'Не указано, что удалять.' }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('news')
    .select('cover_image_url')
    .eq('id', id)
    .maybeSingle()

  // Условие по tenant_id избыточно рядом с RLS, но пусть намерение будет видно.
  const { error } = await supabase.from('news').delete().eq('id', id).eq('tenant_id', tenant.id)

  if (error) return { ok: false, error: dbErrorMessage(error) }

  await dropImage(supabase, existing?.cover_image_url)

  revalidatePath('/admin/news')
  revalidatePath('/admin')
  redirect('/admin/news')
}
