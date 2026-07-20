import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'

import { tags } from './cache-tags'
import { createPublicClient } from './supabase/public'

export type PublicTenant = {
  id: string
  slug: string
  name: string
  customDomain: string | null
}

/**
 * Колонки перечислены явно: plan и owner_user_id грантами анониму не выданы,
 * и select('*') упрётся в permission denied.
 */
const COLUMNS = 'id, slug, name, custom_domain'

/**
 * Тенант по слагу из адреса — основной путь резолва.
 *
 * Закешировано: имя и слаг заведения меняются раз в год, а читаются на каждой
 * странице. Сброс — по тегу из админки, поэтому переименование видно сразу.
 *
 * cacheLife('hours') — страховка на случай, если сброс тега не сработает:
 * тогда данные протухнут сами через час, а не будут висеть вечно.
 */
export async function getTenantBySlug(slug: string): Promise<PublicTenant | null> {
  'use cache'
  cacheTag(tags.tenant(slug))
  cacheLife('hours')

  const supabase = createPublicClient()
  const { data } = await supabase
    .from('tenants')
    .select(COLUMNS)
    .eq('slug', slug)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    customDomain: data.custom_domain,
  }
}

/**
 * Тенант по своему домену клиента (Фаза 5).
 *
 * Кешируется отдельным тегом: тот же тенант, но другой ключ входа, и сбрасывать
 * их надо вместе — этим занимается админка при смене домена.
 */
/**
 * Тенант по сегменту адреса — что бы в нём ни лежало.
 *
 * Proxy кладёт в первый сегмент пути либо слаг (домен.рф/flora,
 * flora.домен.рф), либо целиком свой домен клиента (flora-cafe.ru). Различить
 * их можно без запроса к базе: ограничение tenants_slug_format не пускает
 * точку в слаг, а домена без точки не бывает.
 */
export async function resolveTenant(segment: string): Promise<PublicTenant | null> {
  return segment.includes('.') ? getTenantByDomain(segment) : getTenantBySlug(segment)
}

export async function getTenantByDomain(domain: string): Promise<PublicTenant | null> {
  'use cache'
  cacheTag(`domain:${domain}`)
  cacheLife('hours')

  const supabase = createPublicClient()
  const { data } = await supabase
    .from('tenants')
    .select(COLUMNS)
    .eq('custom_domain', domain)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    customDomain: data.custom_domain,
  }
}
