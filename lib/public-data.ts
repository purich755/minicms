import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { cacheLife, cacheTag } from 'next/cache'
import { cache } from 'react'

import { tags } from './cache-tags'
import { createClient } from './supabase/server'
import { createPublicClient } from './supabase/public'
import type { Database, Row } from './types'

/**
 * Чтение контента для публичных сайтов.
 *
 * У каждого чтения две версии, и разница между ними — вопрос безопасности,
 * а не удобства.
 *
 * Обычная (`getMenu`) ходит в базу через createPublicClient — клиент без
 * сессии, под ролью anon. RLS-политики публичного чтения выписаны именно на
 * anon, поэтому черновики и выключенные акции сюда физически не попадут, чей
 * бы браузер ни постучался. Ответ не зависит от зрителя, поэтому он лежит в
 * кеше и сбрасывается по тегу из админки.
 *
 * Черновиковая (`getMenuDraft`) ходит под сессией владельца и видит всё, что
 * видит админка. Она НЕ кешируется — иначе черновик осел бы в общем кеше и
 * уехал случайному посетителю.
 *
 * Выбирает между ними диспетчер (`readMenu`) по флагу, который считает
 * isPreviewFor() из lib/preview.ts. Флаг обязан приходить сверху, из места,
 * где доступны cookies: внутри 'use cache' их читать нельзя.
 */

type Client = SupabaseClient<Database>

export type MenuCategory = Pick<Row<'menu_categories'>, 'id' | 'name'>
export type MenuItem = Pick<
  Row<'menu_items'>,
  'id' | 'name' | 'description' | 'price' | 'image_url' | 'category_id' | 'is_available'
>
export type Promotion = Pick<
  Row<'promotions'>,
  'id' | 'title' | 'description' | 'image_url' | 'starts_at' | 'ends_at' | 'is_active'
>
export type NewsCard = Pick<
  Row<'news'>,
  'id' | 'title' | 'slug' | 'cover_image_url' | 'published_at' | 'is_published'
>
export type Menu = { categories: MenuCategory[]; items: MenuItem[] }

/**
 * Колонки-флаги (is_available, is_active, is_published) читаются и в публичной
 * версии, хотя там они всегда true — их и отбирает RLS. Так у обеих версий
 * один тип, и предпросмотр может подписать скрытые карточки, ничего не
 * доспрашивая.
 */
const MENU_ITEM_COLUMNS = 'id, name, description, price, image_url, category_id, is_available'
const PROMOTION_COLUMNS = 'id, title, description, image_url, starts_at, ends_at, is_active'
const NEWS_CARD_COLUMNS = 'id, title, slug, cover_image_url, published_at, is_published'

// --- настройки сайта ---------------------------------------------------------
// Черновиков у настроек нет: сохранил контакты — они сразу на сайте. Поэтому
// вторая версия здесь не нужна.

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

// --- меню --------------------------------------------------------------------

async function queryMenu(supabase: Client, tenantId: string): Promise<Menu> {
  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .order('sort_order')
      .order('name'),
    supabase
      .from('menu_items')
      .select(MENU_ITEM_COLUMNS)
      .eq('tenant_id', tenantId)
      .order('sort_order')
      .order('name'),
  ])

  return { categories: categories ?? [], items: items ?? [] }
}

export async function getMenu(tenantId: string): Promise<Menu> {
  'use cache'
  cacheTag(tags.menu(tenantId))
  cacheLife('hours')

  return queryMenu(createPublicClient(), tenantId)
}

/**
 * cache() из React, а не 'use cache': это дедупликация в пределах одного
 * рендера, а не кеш между запросами. Черновик спрашивают дважды — лейаут для
 * счётчика в плашке и сама страница, — и без обёртки это был бы двойной поход
 * в базу. За границу запроса такой кеш не выходит.
 */
export const getMenuDraft = cache(async (tenantId: string): Promise<Menu> => {
  return queryMenu(await createClient(), tenantId)
})

export async function readMenu(tenantId: string, preview: boolean): Promise<Menu> {
  return preview ? getMenuDraft(tenantId) : getMenu(tenantId)
}

// --- акции -------------------------------------------------------------------

async function queryPromotions(supabase: Client, tenantId: string): Promise<Promotion[]> {
  const { data } = await supabase
    .from('promotions')
    .select(PROMOTION_COLUMNS)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  return data ?? []
}

/**
 * Окно дат проверяет RLS-политика, поэтому просроченная акция исчезает сама.
 * Но кеш об этом не знает: он бы держал её ещё час. Отсюда короткая жизнь
 * кеша — акция со сроком «до 12:00» не должна висеть до вечера.
 */
export async function getActivePromotions(tenantId: string): Promise<Promotion[]> {
  'use cache'
  cacheTag(tags.promotions(tenantId))
  cacheLife('minutes')

  return queryPromotions(createPublicClient(), tenantId)
}

export const getPromotionsDraft = cache(async (tenantId: string): Promise<Promotion[]> => {
  return queryPromotions(await createClient(), tenantId)
})

export async function readPromotions(tenantId: string, preview: boolean): Promise<Promotion[]> {
  return preview ? getPromotionsDraft(tenantId) : getActivePromotions(tenantId)
}

// --- новости -----------------------------------------------------------------

export async function getNewsList(tenantId: string, limit?: number): Promise<NewsCard[]> {
  'use cache'
  cacheTag(tags.news(tenantId))
  cacheLife('hours')

  const supabase = createPublicClient()
  let query = supabase
    .from('news')
    .select(NEWS_CARD_COLUMNS)
    .eq('tenant_id', tenantId)
    .order('published_at', { ascending: false })

  if (limit) query = query.limit(limit)

  const { data } = await query
  return data ?? []
}

/**
 * nullsFirst — единственное отличие от публичного порядка. У черновика
 * published_at пустой, и при обычной сортировке он уехал бы в самый низ, то
 * есть владелец не увидел бы ровно то, ради чего открыл предпросмотр.
 */
export const getNewsListDraft = cache(async (
  tenantId: string,
  limit?: number,
): Promise<NewsCard[]> => {
  const supabase = await createClient()
  let query = supabase
    .from('news')
    .select(NEWS_CARD_COLUMNS)
    .eq('tenant_id', tenantId)
    .order('published_at', { ascending: false, nullsFirst: true })

  if (limit) query = query.limit(limit)

  const { data } = await query
  return data ?? []
})

export async function readNewsList(
  tenantId: string,
  preview: boolean,
  limit?: number,
): Promise<NewsCard[]> {
  return preview ? getNewsListDraft(tenantId, limit) : getNewsList(tenantId, limit)
}

async function queryNewsItem(
  supabase: Client,
  tenantId: string,
  slug: string,
): Promise<Row<'news'> | null> {
  const { data } = await supabase
    .from('news')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('slug', slug)
    .maybeSingle()

  return data
}

export async function getNewsItem(
  tenantId: string,
  slug: string,
): Promise<Row<'news'> | null> {
  'use cache'
  cacheTag(tags.news(tenantId))
  cacheLife('hours')

  return queryNewsItem(createPublicClient(), tenantId, slug)
}

export async function getNewsItemDraft(
  tenantId: string,
  slug: string,
): Promise<Row<'news'> | null> {
  return queryNewsItem(await createClient(), tenantId, slug)
}

export async function readNewsItem(
  tenantId: string,
  slug: string,
  preview: boolean,
): Promise<Row<'news'> | null> {
  return preview ? getNewsItemDraft(tenantId, slug) : getNewsItem(tenantId, slug)
}
