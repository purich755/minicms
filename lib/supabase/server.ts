import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/lib/types'

import { supabaseAnonKey, supabaseUrl } from './env'

/**
 * Клиент Supabase для сервера: серверные компоненты, server actions, route handlers.
 *
 * Тоже под анонимным ключом — то есть под RLS. Сессия пользователя берётся из cookies,
 * поэтому владелец бизнеса видит только свои данные. Публичные страницы вызывают
 * этот же клиент без сессии и получают только опубликованный контент.
 *
 * Клиент создаётся заново на каждый запрос. Переиспользовать его между запросами
 * нельзя — иначе сессия одного пользователя утечёт другому.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Вызов из серверного компонента: писать cookies оттуда нельзя.
          // Это штатная ситуация — обновлением сессии займётся proxy.ts (Фаза 2).
        }
      },
    },
  })
}
