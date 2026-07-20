/**
 * Переменные окружения Supabase.
 *
 * Важно: обращаться к process.env нужно строго полным литералом
 * (process.env.NEXT_PUBLIC_SUPABASE_URL), иначе Next не подставит значение
 * в браузерный бандл — динамический доступ вида process.env[name] не работает.
 *
 * Значения читаются функциями, а не константами модуля: так пустой .env.local
 * роняет запрос с понятной ошибкой, а не весь импорт при сборке.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Не задана переменная окружения ${name}. ` +
        'Скопируй .env.example в .env.local и заполни ключи из панели Supabase (Project Settings → API).',
    )
  }
  return value
}

export function supabaseUrl(): string {
  return required(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL')
}

export function supabaseAnonKey(): string {
  return required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
}
