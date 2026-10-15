import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { createFailFastFetch } from '@/lib/fail-fast-fetch'
import type { Database } from '@/lib/types'

import { supabaseAnonKey, supabaseUrl } from './env'

/**
 * Клиент Supabase для публичных страниц клиентских сайтов.
 *
 * Принципиально не читает cookies и не знает ни о какой сессии: запрос всегда
 * уходит под ролью anon. Это даёт две вещи сразу.
 *
 * 1. Изоляция. RLS-политики публичного чтения выписаны на anon, поэтому
 *    залогиненный владелец одного кафе не прочитает строки другого даже
 *    случайно — ни через баг в коде, ни через свою же сессию.
 * 2. Кешируемость. Ответ не зависит от того, кто смотрит, поэтому страницу
 *    можно спокойно держать в кеше и сбрасывать точечно по тегу (Фаза 4).
 *
 * Никогда не используй этот клиент в админке — он не увидит черновики
 * и не даст ничего записать. Там нужен createClient() из ./server.
 */
/** Сколько ждать ответа базы, прежде чем сдаться. */
const TIMEOUT_MS = 5000

/**
 * Один на процесс, а не на каждый клиент: в нём живёт память о том, что база
 * недавно не отвечала. Создавай его заново на каждый запрос — и каждый гость
 * снова ждал бы таймаут по каждому запросу страницы. Подробности в
 * lib/fail-fast-fetch.ts.
 *
 * Сессии в нём нет и быть не может — общий fetch здесь безопасен.
 */
const publicFetch = createFailFastFetch(TIMEOUT_MS)

export function createPublicClient() {
  return createSupabaseClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { fetch: publicFetch },
  })
}
