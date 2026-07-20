'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getCurrentTenant, NO_ACCESS } from '@/lib/auth'
import { dbErrorMessage } from '@/lib/db-errors'
import { MEDIA_BUCKET, storagePathFromUrl } from '@/lib/storage'
import { createClient } from '@/lib/supabase/server'
import {
  hasErrors,
  takeBoolean,
  takeInteger,
  takePrice,
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

function refresh() {
  revalidatePath('/admin/menu')
  revalidatePath('/admin')
}

// ---------------------------------------------------------------- категории

export async function saveCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  const tenant = await getCurrentTenant()
  if (!tenant) return { ok: false, error: NO_ACCESS }

  const id = String(formData.get('id') ?? '')
  const errors: FieldErrors = {}

  const name = takeText(formData, 'name', errors, {
    label: 'Название категории',
    required: true,
    max: 120,
  })
  const sortOrder = takeInteger(formData, 'sort_order', errors, { label: 'Порядок', fallback: 0 })

  if (hasErrors(errors)) return { ok: false, fieldErrors: errors }

  const supabase = await createClient()

  // tenant_id только при вставке: при обновлении его нет даже в типе — строка
  // не должна уметь переехать к другому тенанту.
  const fields = { name, sort_order: sortOrder }

  const { error } = id
    ? await supabase.from('menu_categories').update(fields).eq('id', id).eq('tenant_id', tenant.id)
    : await supabase.from('menu_categories').insert({ ...fields, tenant_id: tenant.id })

  if (error) return { ok: false, error: dbErrorMessage(error) }

  refresh()
  redirect('/admin/menu')
}

export async function deleteCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  const tenant = await getCurrentTenant()
  if (!tenant) return { ok: false, error: NO_ACCESS }

  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, error: 'Не указано, что удалять.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenant.id)

  if (error) {
    // Составной внешний ключ из menu_items не даст удалить непустую категорию.
    // Это осознанное решение схемы: лучше запретить, чем молча снести блюда.
    return {
      ok: false,
      error: dbErrorMessage(error, {
        '23503':
          'В категории ещё есть позиции. Перенесите их в другую категорию или удалите, потом удаляйте категорию.',
      }),
    }
  }

  refresh()
  redirect('/admin/menu')
}

// ----------------------------------------------------------------- позиции

export async function saveItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const tenant = await getCurrentTenant()
  if (!tenant) return { ok: false, error: NO_ACCESS }

  const id = String(formData.get('id') ?? '')
  const errors: FieldErrors = {}

  const name = takeText(formData, 'name', errors, {
    label: 'Название',
    required: true,
    max: 200,
  })
  const description = takeText(formData, 'description', errors, {
    label: 'Описание',
    max: 1000,
  })
  const price = takePrice(formData, 'price', errors)
  const imageUrl = takeText(formData, 'image_url', errors, { label: 'Фото', max: 500 })
  const sortOrder = takeInteger(formData, 'sort_order', errors, { label: 'Порядок', fallback: 0 })
  const isAvailable = takeBoolean(formData, 'is_available')

  // Пустое значение из <select> означает «без категории».
  const rawCategory = String(formData.get('category_id') ?? '')
  const categoryId = rawCategory || null

  if (hasErrors(errors)) return { ok: false, fieldErrors: errors }

  const supabase = await createClient()

  const fields = {
    category_id: categoryId,
    name,
    description: description || null,
    price,
    image_url: imageUrl || null,
    is_available: isAvailable,
    sort_order: sortOrder,
  }

  // Составной ключ (category_id, tenant_id) не пустит позицию в категорию
  // чужого тенанта — из PostgREST это придёт как 23503.
  const foreignCategory = {
    '23503': 'Выбранной категории не существует. Обновите страницу и попробуйте снова.',
  }

  if (id) {
    const { data: existing } = await supabase
      .from('menu_items')
      .select('image_url')
      .eq('id', id)
      .maybeSingle()

    const { error } = await supabase
      .from('menu_items')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenant.id)

    if (error) return { ok: false, error: dbErrorMessage(error, foreignCategory) }

    if (existing?.image_url && existing.image_url !== fields.image_url) {
      await dropImage(supabase, existing.image_url)
    }
  } else {
    const { error } = await supabase
      .from('menu_items')
      .insert({ ...fields, tenant_id: tenant.id })
    if (error) return { ok: false, error: dbErrorMessage(error, foreignCategory) }
  }

  refresh()
  redirect('/admin/menu')
}

export async function deleteItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const tenant = await getCurrentTenant()
  if (!tenant) return { ok: false, error: NO_ACCESS }

  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, error: 'Не указано, что удалять.' }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('menu_items')
    .select('image_url')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenant.id)

  if (error) return { ok: false, error: dbErrorMessage(error) }

  await dropImage(supabase, existing?.image_url)

  refresh()
  redirect('/admin/menu')
}
