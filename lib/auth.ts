import 'server-only'

import { cache } from 'react'

import { DatabaseUnavailable } from './db-errors'
import { createClient } from './supabase/server'

export type CurrentUser = {
  id: string
  email: string | null
}

export type CurrentTenant = {
  id: string
  slug: string
  name: string
  customDomain: string | null
  /** false — публичный сайт выключен. Доступ в панель при этом сохраняется. */
  isActive: boolean
  role: string
}

/**
 * Текст отказа для server actions.
 *
 * Каждое действие начинается с
 *
 *   const tenant = await getCurrentTenant()
 *   if (!tenant) return { ok: false, error: NO_ACCESS }
 *
 * Именно так, а не редиректом: редирект на /admin/login для залогиненного
 * пользователя без привязки к бизнесу закольцевал бы навигацию — proxy увидит
 * живую сессию и вернёт его обратно на /admin.
 *
 * И именно внутри действия, а не только в proxy: server actions приходят
 * POST-запросом на маршрут, где объявлены, и матчер proxy их может не
 * накрыть. Эта проверка — единственная, на которую можно положиться.
 */
export const NO_ACCESS = 'Нет доступа. Войдите заново.'

/**
 * Текущий пользователь или null.
 *
 * getClaims(), а не getUser(): оба честно проверяют подпись токена, но
 * getUser ради этого ходит на сервер Supabase, а getClaims сверяет подпись
 * локально по публичному ключу проекта. На каждый переход внутри админки это
 * экономит около 400 мс.
 *
 * getSession() не годится: он читает cookie и верит ей на слово.
 *
 * cache() схлопывает повторные вызовы в пределах одного рендера — за него
 * дёргают и лейаут, и страница.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()

  try {
    const { data } = await supabase.auth.getClaims()
    const claims = data?.claims
    if (!claims?.sub) return null

    return {
      id: claims.sub,
      email: typeof claims.email === 'string' ? claims.email : null,
    }
  } catch {
    // Supabase недоступен — считаем, что пользователя нет. Падаем закрыто.
    return null
  }
})

/**
 * Тенант текущего пользователя, или null если пользователь не залогинен либо
 * его аккаунт ни к какому бизнесу не привязан.
 *
 * Одним запросом со связанной таблицей, а не двумя подряд: раньше сначала
 * читалось членство, потом по его tenant_id — сам тенант, и это был лишний
 * поход в базу на каждый рендер страницы админки.
 *
 * Колонки тенанта перечислены явно: plan и owner_user_id грантами наружу не
 * выданы, и select('*') упрётся в permission denied.
 *
 * Пока берём первое членство: один владелец — один бизнес. Когда появятся
 * агентства с несколькими точками, здесь понадобится выбор активного тенанта
 * (например, через cookie), а не limit(1).
 */
export const getCurrentTenant = cache(async (): Promise<CurrentTenant | null> => {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_members')
    .select('role, tenant:tenants(id, slug, name, custom_domain, is_active)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // «Членства нет» и «запрос не выполнился» — разные вещи, и путать их
  // нельзя. Раньше обе давали null, и при сбое базы владелец видел «аккаунт
  // не привязан к заведению» — сообщение, которое уводит в противоположную
  // сторону. Теперь сбой — это исключение: его ловит app/admin/error.tsx и
  // пишет «сервис временно недоступен».
  //
  // Частые причины: проект Supabase на паузе (бесплатный тариф усыпляет его
  // после недели без запросов) или код выкатили раньше миграции и запрос
  // просит несуществующую колонку. Проверка: npm run check:supabase
  if (error) throw new DatabaseUnavailable('tenant_members', error.message)

  const tenant = data?.tenant
  if (!tenant) return null

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    customDomain: tenant.custom_domain,
    isActive: tenant.is_active,
    role: data.role,
  }
})
