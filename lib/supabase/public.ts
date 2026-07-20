import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

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
export function createPublicClient() {
  return createSupabaseClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
