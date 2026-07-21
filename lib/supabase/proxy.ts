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

  // getClaims(), а не getUser(): оба проверяют подпись токена по-настоящему,
  // но getUser ходит за этим на сервер Supabase, а getClaims сверяет подпись
  // локально по публичному ключу проекта. На каждый переход внутри админки
  // это экономило ~400 мс сетевого похода во Франкфурт.
  //
  // getSession() здесь не годится в принципе: он читает cookie и верит ей на
  // слово, а cookie подделывается.
  //
  // Если Supabase недоступен или ключи не заданы, считаем, что пользователя
  // нет: человек уедет на страницу входа. Падать закрыто здесь правильнее,
  // чем отдавать 500 на всю админку — и тем более чем пускать внутрь.
  let userId: string | null = null
  try {
    const { data } = await supabase.auth.getClaims()
    userId = data?.claims?.sub ?? null
  } catch {
    userId = null
  }

  return { response, userId }
}
