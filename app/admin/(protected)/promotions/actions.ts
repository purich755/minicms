'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'

import { getCurrentTenant, NO_ACCESS } from '@/lib/auth'
import { tags } from '@/lib/cache-tags'
import { dbErrorMessage } from '@/lib/db-errors'
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

async function dropImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  url: string | null | undefined,
) {
  const path = storagePathFromUrl(url)
  if (path) await supabase.storage.from(MEDIA_BUCKET).remove([path])
}

export async function savePromotion(_prev: FormState, formData: FormData): Promise<FormState> {
  const tenant = await getCurrentTenant()
  if (!tenant) return { ok: false, error: NO_ACCESS }

  const id = String(formData.get('id') ?? '')
  const errors: FieldErrors = {}

  const title = takeText(formData, 'title', errors, {
    label: 'Заголовок',
    required: true,
    max: 200,
  })
  const description = takeText(formData, 'description', errors, {
    label: 'Описание',
    max: 2000,
  })
  const imageUrl = takeText(formData, 'image_url', errors, { label: 'Картинка', max: 500 })
  const startsAt = takeDateTime(formData, 'starts_at', errors, { label: 'Начало' })
  const endsAt = takeDateTime(formData, 'ends_at', errors, { label: 'Окончание' })
  const isActive = takeBoolean(formData, 'is_active')

  // В базе на это есть check-ограничение, но оттуда прилетит невнятный текст.
  if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
    errors.ends_at = 'Окончание раньше начала.'
  }

  if (hasErrors(errors)) return { ok: false, fieldErrors: errors }

  const supabase = await createClient()

  // tenant_id только при вставке: при обновлении его нет даже в типе — строка
  // не должна уметь переехать к другому тенанту.
  const fields = {
    title,
    description: description || null,
    image_url: imageUrl || null,
    starts_at: startsAt,
    ends_at: endsAt,
    is_active: isActive,
  }

  if (id) {
    const { data: existing } = await supabase
      .from('promotions')
      .select('image_url')
      .eq('id', id)
      .maybeSingle()

    const { error } = await supabase
      .from('promotions')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenant.id)

    if (error) return { ok: false, error: dbErrorMessage(error) }

    if (existing?.image_url && existing.image_url !== fields.image_url) {
      await dropImage(supabase, existing.image_url)
    }
  } else {
    const { error } = await supabase.from('promotions').insert({ ...fields, tenant_id: tenant.id })
    if (error) return { ok: false, error: dbErrorMessage(error) }
  }

  // updateTag сбрасывает кеш сразу, revalidateTag отдавал бы старое, пока
  // обновляет в фоне — акция должна появляться на сайте немедленно.
  updateTag(tags.promotions(tenant.id))
  revalidatePath('/admin/promotions')
  revalidatePath('/admin')
  redirect('/admin/promotions')
}

export async function deletePromotion(_prev: FormState, formData: FormData): Promise<FormState> {
  const tenant = await getCurrentTenant()
  if (!tenant) return { ok: false, error: NO_ACCESS }

  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, error: 'Не указано, что удалять.' }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('promotions')
    .select('image_url')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('promotions')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenant.id)

  if (error) return { ok: false, error: dbErrorMessage(error) }

  await dropImage(supabase, existing?.image_url)

  // updateTag сбрасывает кеш сразу, revalidateTag отдавал бы старое, пока
  // обновляет в фоне — акция должна появляться на сайте немедленно.
  updateTag(tags.promotions(tenant.id))
  revalidatePath('/admin/promotions')
  revalidatePath('/admin')
  redirect('/admin/promotions')
}
