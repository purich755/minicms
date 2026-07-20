import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'

import { tags } from './cache-tags'
import { createPublicClient } from './supabase/public'
import type { Row } from './types'

/**
 * Чтение контента для публичных сайтов.
 *
 * Всё здесь идёт через createPublicClient — клиент без сессии, под ролью anon.
 * Это не оптимизация, а часть модели безопасности: RLS-политики публичного
 * чтения выписаны именно на anon, и черновики с выключенными акциями сюда
 * физически не попадут.
 *
 * Раз ответ не зависит от того, кто смотрит, его можно держать в кеше и
 * сбрасывать точечно по тегу — этим занимается админка после каждой правки.
 */

export type MenuCategory = Pick<Row<'menu_categories'>, 'id' | 'name'>
export type MenuItem = Pick<
  Row<'menu_items'>,
  'id' | 'name' | 'description' | 'price' | 'image_url' | 'category_id'
>
export type Promotion = Pick<
  Row<'promotions'>,
  'id' | 'title' | 'description' | 'image_url' | 'ends_at'
>
export type NewsCard = Pick<
  Row<'news'>,
  'id' | 'title' | 'slug' | 'cover_image_url' | 'published_at'
>

export async function getSiteSettings(tenantId: string): Promise<Row<'site_settings'> | null> {
  'use cache'
  cacheTag(tags.settings(tenantId))
  cacheLife('hours')

  const supabase = createPublicClient()
  const { data } = await supabase
    .from('site_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return data
}

export async function getMenu(tenantId: string): Promise<{
  categories: MenuCategory[]
  items: MenuItem[]
}> {
  'use cache'
  cacheTag(tags.menu(tenantId))
  cacheLife('hours')

  const supabase = createPublicClient()

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .order('sort_order')
      .order('name'),
    // Снятые с продажи позиции сюда не приедут: их отсекает RLS-политика,
    // а не фильтр в этом запросе.
    supabase
      .from('menu_items')
      .select('id, name, description, price, image_url, category_id')
      .eq('tenant_id', tenantId)
      .order('sort_order')
      .order('name'),
  ])

  return { categories: categories ?? [], items: items ?? [] }
}

/**
 * Акции, которые идут прямо сейчас.
 *
 * Окно дат проверяет RLS-политика, поэтому просроченная акция исчезает сама.
 * Но кеш об этом не знает: он бы держал её ещё час. Поэтому здесь короткая
 * жизнь кеша — акция со сроком «до 12:00» не должна висеть до вечера.
 */
export async function getActivePromotions(tenantId: string): Promise<Promotion[]> {
  'use cache'
  cacheTag(tags.promotions(tenantId))
  cacheLife('minutes')

  const supabase = createPublicClient()
  const { data } = await supabase
    .from('promotions')
    .select('id, title, description, image_url, ends_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getNewsList(tenantId: string, limit?: number): Promise<NewsCard[]> {
  'use cache'
  cacheTag(tags.news(tenantId))
  cacheLife('hours')

  const supabase = createPublicClient()
  let query = supabase
    .from('news')
    .select('id, title, slug, cover_image_url, published_at')
    .eq('tenant_id', tenantId)
    .order('published_at', { ascending: false })

  if (limit) query = query.limit(limit)

  const { data } = await query
  return data ?? []
}

export async function getNewsItem(
  tenantId: string,
  slug: string,
): Promise<Row<'news'> | null> {
  'use cache'
  cacheTag(tags.news(tenantId))
  cacheLife('hours')

  const supabase = createPublicClient()
  const { data } = await supabase
    .from('news')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('slug', slug)
    .maybeSingle()

  return data
}
