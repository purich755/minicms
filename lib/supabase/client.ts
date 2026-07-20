import { createBrowserClient } from '@supabase/ssr'

import { supabaseAnonKey, supabaseUrl } from './env'

/**
 * Клиент Supabase для браузера (клиентские компоненты админки).
 *
 * Работает под анонимным ключом, поэтому видит ровно то, что разрешают
 * RLS-политики для текущего пользователя. Секретных ключей здесь быть не может.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey())
}
