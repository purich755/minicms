import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from '@/lib/types'

import { supabaseAnonKey, supabaseUrl } from './env'

/**
 * Обновление сессии Supabase на границе запроса.
 *
 * Токен доступа живёт около часа. Если его не продлевать, владелец будет
 * вылетать из админки посреди работы. Продлить его может только тот код,
 * который умеет писать cookies в ответ, — то есть proxy, а не серверный
 * компонент.
 *
 * Возвращаем и ответ (в нём уже проставлены свежие cookies), и пользователя,
 * чтобы proxy.ts мог сразу решить, пускать его дальше или нет.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        // Сначала кладём новые значения в запрос — чтобы код ниже по цепочке
        // увидел уже обновлённую сессию, а не старую.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }

        response = NextResponse.next({ request })

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }

        // Supabase просит запретить кеширование ответа, в котором уехали
        // токены: иначе CDN может отдать сессию одного человека другому.
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value)
        }
      },
    },
  })

  // Именно getUser(), а не getSession(): getSession читает cookie и верит ей
  // на слово, а getUser проверяет токен на сервере Supabase. Для решения
  // «пускать или нет» верить cookie нельзя.
  //
  // Если Supabase недоступен или ключи не заданы, считаем, что пользователя
  // нет: человек уедет на страницу входа. Падать закрыто здесь правильнее,
  // чем отдавать 500 на всю админку — и тем более чем пускать внутрь.
  let user = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch {
    user = null
  }

  return { response, user }
}
