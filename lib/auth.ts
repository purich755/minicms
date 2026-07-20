import 'server-only'

import { cache } from 'react'

import { createClient } from './supabase/server'

export type CurrentTenant = {
  id: string
  slug: string
  name: string
  customDomain: string | null
  role: string
}

/**
 * Текущий пользователь или null.
 *
 * getUser(), а не getSession(): второй верит cookie на слово, первый
 * проверяет токен на сервере Supabase. Для решений о доступе годится только
 * второй вариант.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

/**
 * Тенант текущего пользователя, или null если пользователь не залогинен либо
 * его аккаунт ни к какому бизнесу не привязан.
 *
 * Пока берём первое членство: один владелец — один бизнес. Когда появятся
 * агентства с несколькими точками, здесь понадобится выбор активного тенанта
 * (например, через cookie), а не limit(1).
 *
 * Обёрнуто в cache(): за один рендер страницы функцию зовут и layout, и сама
 * страница, а это два запроса к Supabase на ровном месте. cache() схлопывает
 * их в один в пределах запроса.
 */
export const getCurrentTenant = cache(async (): Promise<CurrentTenant | null> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('tenant_members')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!membership) return null

  // Колонки перечислены явно: plan и owner_user_id грантами наружу не выданы,
  // select('*') упрётся в permission denied.
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, name, custom_domain')
    .eq('id', membership.tenant_id)
    .maybeSingle()

  if (!tenant) return null

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    customDomain: tenant.custom_domain,
    role: membership.role,
  }
})

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
