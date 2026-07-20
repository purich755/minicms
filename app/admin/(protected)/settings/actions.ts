'use server'

import { revalidatePath, updateTag } from 'next/cache'

import { getCurrentTenant, NO_ACCESS } from '@/lib/auth'
import { tags } from '@/lib/cache-tags'
import { dbErrorMessage } from '@/lib/db-errors'
import { createClient } from '@/lib/supabase/server'
import {
  hasErrors,
  takeHexColor,
  takeText,
  takeUrl,
  type FieldErrors,
  type FormState,
} from '@/lib/validation'

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const tenant = await getCurrentTenant()
  if (!tenant) return { ok: false, error: NO_ACCESS }

  const errors: FieldErrors = {}

  const name = takeText(formData, 'name', errors, {
    label: 'Название заведения',
    required: true,
    max: 120,
  })

  const payload = {
    tenant_id: tenant.id,
    phone: takeText(formData, 'phone', errors, { label: 'Телефон', max: 40 }) || null,
    address: takeText(formData, 'address', errors, { label: 'Адрес', max: 200 }) || null,
    working_hours:
      takeText(formData, 'working_hours', errors, { label: 'Часы работы', max: 200 }) || null,
    about: takeText(formData, 'about', errors, { label: 'О нас', max: 2000 }) || null,
    primary_color: takeHexColor(formData, 'primary_color', errors, '#111827'),
    logo_url: takeText(formData, 'logo_url', errors, { label: 'Логотип', max: 500 }) || null,
    yandex_map_url: takeUrl(formData, 'yandex_map_url', errors, { label: 'Яндекс.Карты' }),
    socials: {
      telegram: takeUrl(formData, 'telegram', errors, { label: 'Telegram' }) ?? '',
      vk: takeUrl(formData, 'vk', errors, { label: 'ВКонтакте' }) ?? '',
      whatsapp: takeUrl(formData, 'whatsapp', errors, { label: 'WhatsApp' }) ?? '',
    },
  }

  if (hasErrors(errors)) return { ok: false, fieldErrors: errors }

  const supabase = await createClient()

  // Название живёт в tenants, остальное — в site_settings. Две записи,
  // поэтому две операции; транзакции через PostgREST недоступны.
  const { error: tenantError } = await supabase
    .from('tenants')
    .update({ name })
    .eq('id', tenant.id)

  if (tenantError) {
    return { ok: false, error: dbErrorMessage(tenantError) }
  }

  const { error } = await supabase
    .from('site_settings')
    .upsert(payload, { onConflict: 'tenant_id' })

  if (error) {
    return { ok: false, error: dbErrorMessage(error) }
  }

  // updateTag, а не revalidateTag: второй отдаёт устаревшее, пока обновляет
  // в фоне, и владелец, открыв свой сайт сразу после сохранения, увидел бы
  // старое. updateTag сбрасывает немедленно — это и есть «сохранил и видно».
  updateTag(tags.settings(tenant.id))
  // Название заведения живёт в tenants и попадает в шапку и в title.
  updateTag(tags.tenant(tenant.slug))

  revalidatePath('/admin/settings')
  revalidatePath('/admin')

  return { ok: true }
}
