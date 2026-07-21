/**
 * Доступ к Supabase под секретным ключом — для скриптов обслуживания.
 *
 * Секретный ключ обходит RLS полностью: под ним видны и правятся данные всех
 * клиентов сразу. Поэтому пользуются им только скрипты, которые запускают
 * руками с своей машины, и никогда — код приложения. В приложении ключ
 * называется SUPABASE_SERVICE_ROLE_KEY и не имеет префикса NEXT_PUBLIC_,
 * иначе Next вшил бы его в javascript для каждого посетителя.
 */

/** Порядок важен: по нему же идёт восстановление, а там родитель раньше ребёнка. */
export const TABLES = [
  'tenants',
  'tenant_members',
  'site_settings',
  'menu_categories',
  'menu_items',
  'promotions',
  'news',
]

export const BUCKET = 'tenant-media'

export const ok = (m) => console.log(`  + ${m}`)
export const warn = (m) => console.log(`  ~ ${m}`)
export const bad = (m) => {
  console.log(`  ! ОШИБКА: ${m}`)
  process.exitCode = 1
}

/**
 * Читает и проверяет окружение.
 *
 * Отдельная функция, потому что ошибиться здесь легко и дорого: в поле URL
 * часто уезжает адрес Data API вместо адреса проекта, и тогда всё отвечает
 * 404 — выглядит как пустая база.
 */
export function readEnv() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!rawUrl) {
    console.log('\nНе задан NEXT_PUBLIC_SUPABASE_URL в .env.local\n')
    process.exit(1)
  }

  if (!key) {
    console.log(
      '\nНе задан SUPABASE_SERVICE_ROLE_KEY в .env.local\n\n' +
        '  Это секретный ключ проекта: Supabase → Project Settings → API Keys,\n' +
        '  значение вида sb_secret_… Добавь в .env.local строкой\n\n' +
        '      SUPABASE_SERVICE_ROLE_KEY=sb_secret_...\n\n' +
        '  Без префикса NEXT_PUBLIC_ — с ним ключ уехал бы в браузер.\n',
    )
    process.exit(1)
  }

  const base = rawUrl.replace(/\/+$/, '').replace(/\/(rest|auth|storage)\/v1$/, '')

  return { base, key }
}

export function headers(key, extra = {}) {
  return { apikey: key, authorization: `Bearer ${key}`, ...extra }
}

/**
 * Все строки таблицы.
 *
 * Постранично: PostgREST по умолчанию отдаёт не больше тысячи строк за раз, и
 * без цикла бэкап молча обрезался бы на тысяче — худший вид поломки, потому
 * что файл выглядит целым.
 */
export async function fetchAll(base, key, table) {
  const PAGE = 1000
  const rows = []

  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${base}/rest/v1/${table}?select=*&order=id`, {
      headers: headers(key, { range: `${from}-${from + PAGE - 1}` }),
    })

    if (!res.ok) {
      throw new Error(`${table}: ${res.status} ${await res.text()}`)
    }

    const page = await res.json()
    rows.push(...page)

    if (page.length < PAGE) return rows
  }
}

/** Список файлов бакета: сначала папки тенантов, потом файлы внутри каждой. */
export async function listMedia(base, key) {
  const list = async (prefix) => {
    const res = await fetch(`${base}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers: headers(key, { 'content-type': 'application/json' }),
      body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
    })

    if (!res.ok) throw new Error(`storage list ${prefix}: ${res.status} ${await res.text()}`)
    return res.json()
  }

  const paths = []

  // У папки id === null: так Storage отличает настоящий объект от префикса.
  for (const entry of await list('')) {
    if (entry.id !== null) {
      paths.push(entry.name)
      continue
    }

    for (const file of await list(`${entry.name}/`)) {
      if (file.id !== null) paths.push(`${entry.name}/${file.name}`)
    }
  }

  return paths
}
