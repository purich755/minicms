/**
 * Проверка подключения к Supabase и состояния схемы.
 *
 *   npm run check:supabase
 *
 * Отвечает на вопросы: ключи вообще рабочие? от того ли они проекта?
 * применены ли миграции? выданы ли гранты? Ничего не меняет и не пишет.
 *
 * Секретные значения наружу не печатаются — только длина и маска.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const ok = (m) => console.log(`  + ${m}`)
const bad = (m) => {
  console.log(`  ! ОШИБКА: ${m}`)
  process.exitCode = 1
}
const warn = (m) => console.log(`  ~ ${m}`)

const mask = (s) => (s.length <= 12 ? '…' : `${s.slice(0, 6)}…${s.slice(-4)} (${s.length} симв.)`)

console.log('\n=== Переменные окружения ===')

if (!url) bad('NEXT_PUBLIC_SUPABASE_URL не задан')
if (!key) bad('NEXT_PUBLIC_SUPABASE_ANON_KEY не задан')
if (!url || !key) {
  console.log('\nЗаполни .env.local и запусти снова.')
  process.exit(1)
}

let host
let base
try {
  host = new URL(url).host
  base = url.replace(/\/+$/, '')
} catch {
  bad(`URL непохож на адрес: ${url}`)
  process.exit(1)
}

// Частая ошибка при копировании из панели: в поле уезжает не адрес проекта,
// а адрес Data API. Тогда все запросы идут на /rest/v1/rest/v1/... и отвечают
// 404 — выглядит как «миграции не применены», хотя схема на месте.
if (/\/(rest|auth|storage)\/v1$/.test(base)) {
  base = base.replace(/\/(rest|auth|storage)\/v1$/, '')
  warn(`в URL попал путь Data API. Для проверки отрезал, но исправь .env.local на: ${base}`)
}

ok(`проект: ${base}`)
console.log(`  · ключ: ${mask(key)}`)

// --- Что за ключ и от того ли он проекта ---------------------------------
console.log('\n=== Ключ ===')

const projectRef = host.split('.')[0]

// Ключ, обходящий RLS. Ниже это меняет не только вердикт, но и то, какие
// выводы вообще позволено делать: под таким ключом видно всё, и фраза
// «аноним читает» была бы враньём.
let keyIsSecret = false

if (key.startsWith('sb_publishable_')) {
  ok('тип: publishable (новый формат Supabase) — годится для браузера')
} else if (key.startsWith('sb_secret_')) {
  keyIsSecret = true
  bad('это СЕКРЕТНЫЙ ключ, а лежит он в NEXT_PUBLIC_ — то есть уедет в браузер')
  console.log(
    '\n  Такой ключ обходит RLS полностью: кто его получит, тот читает и правит\n' +
      '  данные всех клиентов сразу. А NEXT_PUBLIC_* Next вшивает в javascript,\n' +
      '  который скачивает каждый посетитель.\n' +
      '\n  Считай этот ключ скомпрометированным: отзови его в панели Supabase\n' +
      '  (Project Settings → API Keys → Revoke) и выпусти новый.\n' +
      '  В .env.local нужен publishable-ключ вида sb_publishable_…\n',
  )
} else if (key.split('.').length === 3) {
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString())

    if (payload.role === 'anon') {
      ok('тип: анонимный JWT — годится для браузера')
    } else if (payload.role === 'service_role') {
      keyIsSecret = true
      bad('это service_role! Он обходит RLS и в браузер попадать не должен. Нужен anon.')
    } else {
      warn(`роль в ключе: ${payload.role ?? 'не указана'}`)
    }

    if (payload.ref && payload.ref !== projectRef) {
      bad(`ключ от проекта «${payload.ref}», а URL ведёт на «${projectRef}» — не совпадают`)
    } else if (payload.ref) {
      ok(`проект в ключе совпадает с URL: ${payload.ref}`)
    }

    if (payload.exp) {
      const left = Math.round((payload.exp * 1000 - Date.now()) / 86400000)
      if (left < 0) bad('срок действия ключа истёк')
      else ok(`срок действия: ещё ${left} дн.`)
    }
    // Подпись HS256 в base64url — ровно 43 символа. Другая длина означает,
    // что ключ скопирован не целиком, а это совсем другая причина отказа,
    // чем отключённые в проекте legacy-ключи.
    const signature = key.split('.')[2]
    if (signature.length === 43) {
      ok('ключ скопирован целиком (подпись нужной длины)')
    } else {
      bad(`подпись длиной ${signature.length} вместо 43 — ключ скопирован не полностью`)
    }
  } catch {
    warn('не удалось разобрать JWT — проверю его боем')
  }
} else {
  warn('формат ключа незнакомый — проверю его боем')
}

// --- Живые запросы -------------------------------------------------------
const headers = { apikey: key, Authorization: `Bearer ${key}` }

async function get(path) {
  try {
    const response = await fetch(`${base}${path}`, { headers })
    const text = await response.text()
    let body = null
    try {
      body = JSON.parse(text)
    } catch {
      /* не JSON — и ладно */
    }
    return { status: response.status, body }
  } catch (error) {
    return { status: 0, body: null, network: error.message }
  }
}

console.log('\n=== Связь с проектом ===')

// Пробуем НАСТОЯЩУЮ таблицу, а не корень /rest/v1/. Корень отдаёт описание
// всей схемы, и Supabase закрывает его секретным ключом — publishable там
// отвергается по замыслу. Проба по корню объявила бы нерабочим совершенно
// рабочий ключ.
const probe = await get('/rest/v1/tenants?select=id&limit=1')

if (probe.status === 0) {
  bad(`не достучаться до ${host}: ${probe.network}`)
  console.log('\nПроверь URL и интернет. Дальше проверять нечего.\n')
  process.exit(1)
}

const probeReason = String(probe.body?.message ?? probe.body?.error ?? '')
const keyRejected = probe.status === 401 || probe.status === 403

if (keyRejected) {
  bad(`ключ отвергнут (${probe.status}): ${probeReason || '(без пояснения)'}`)

  if (/secret/i.test(probeReason)) {
    console.log(
      '\n  Проект требует секретный ключ даже для чтения таблиц — значит,\n' +
        '  в Project Settings → Data API выключен публичный доступ.\n' +
        '  Этому движку он нужен: публичные сайты читают данные под ролью anon,\n' +
        '  а от чужого их закрывает RLS, а не отсутствие ключа.',
    )
  } else if (key.split('.').length === 3) {
    console.log(
      '\n  Похоже, в проекте отключены legacy JWT-ключи.\n' +
        '  Возьми publishable-ключ: Project Settings → API Keys → вкладка «API keys».',
    )
  }
} else {
  ok(`Data API принимает ключ (${probe.status})`)
}

const health = await get('/auth/v1/health')
if (health.status === 200) ok('сервис авторизации жив')
else warn(`сервис авторизации ответил ${health.status}`)

// --- Применены ли миграции -----------------------------------------------
// При отвергнутом ключе смысла нет: всё ответит 401, и это будет выглядеть
// как отсутствующая схема. Лучше молчать, чем врать.
if (keyRejected) {
  console.log('\nСхему не проверял — сначала нужен рабочий ключ.\n')
  process.exit(1)
}

console.log('\n=== Схема ===')

// Для tenants колонки перечислены явно: plan и owner_user_id грантами анониму
// не выданы, и select=* обязан упереться в отказ — это проверяется ниже.
const TABLES = [
  ['tenants', 'id,slug,name,custom_domain'],
  ['site_settings', '*'],
  ['menu_categories', '*'],
  ['menu_items', '*'],
  ['promotions', '*'],
  ['news', '*'],
]

let missing = 0
for (const [table, select] of TABLES) {
  const res = await get(`/rest/v1/${table}?select=${select}&limit=1`)

  if (res.status === 200) {
    // Под секретным ключом видно всё независимо от политик, поэтому про
    // доступ анонима здесь сказать нечего — только про наличие таблицы.
    ok(keyIsSecret ? `${table}: таблица есть` : `${table}: есть, аноним читает`)
  } else if (res.body?.code === 'PGRST205' || res.status === 404) {
    bad(`${table}: таблицы нет — миграции не применены`)
    missing++
  } else if (res.status === 401 || res.status === 403) {
    bad(`${table}: аноним не допущен (${res.body?.code ?? res.status}) — не выданы гранты`)
  } else {
    bad(`${table}: ${res.status} ${res.body?.message ?? ''}`)
  }
}

if (missing === 0 && keyIsSecret) {
  warn('проверки прав анонима пропущены: под секретным ключом они бессмысленны')
} else if (missing === 0) {
  // tenant_members анониму не выдан вовсе — ожидаем отказ или пустоту.
  const members = await get('/rest/v1/tenant_members?select=user_id&limit=1')
  if (members.status >= 400) {
    ok(`tenant_members: аноним не допущен (${members.status}) — как и задумано`)
  } else if (Array.isArray(members.body) && members.body.length === 0) {
    ok('tenant_members: аноним видит пусто — как и задумано')
  } else {
    bad('tenant_members: аноним видит строки — это дыра')
  }

  // Колоночные гранты: select=* по tenants обязан упасть.
  const wide = await get('/rest/v1/tenants?select=*&limit=1')
  if (wide.status >= 400) {
    ok('гранты по колонкам работают: select=* по tenants отклонён')
  } else {
    warn('select=* по tenants прошёл — колоночные гранты не применились')
  }
}

// --- Сверка колонок с lib/types.ts ---------------------------------------
//
// Типы в lib/types.ts написаны руками по миграциям, потому что генератор
// Supabase требует живого проекта. Разойтись с реальной схемой они могут
// молча: код соберётся, а запрос упадёт уже у клиента.
//
// Список ниже намеренно повторяет lib/types.ts — в этом и смысл проверки.
// Правишь типы — правь и здесь, иначе сверять будет не с чем.
//
// PostgREST отвергает запрос несуществующей колонки, поэтому проверить можно
// поимённо и на пустой таблице: limit=0 не требует ни одной строки.
const EXPECTED_COLUMNS = {
  tenants: 'id,slug,name,custom_domain,is_active',
  site_settings:
    'tenant_id,logo_url,hero_image_url,primary_color,phone,address,working_hours,socials,about,yandex_map_url,updated_at',
  menu_categories: 'id,tenant_id,name,sort_order,created_at',
  menu_items:
    'id,tenant_id,category_id,name,description,price,image_url,is_available,sort_order,created_at',
  promotions:
    'id,tenant_id,title,description,image_url,starts_at,ends_at,is_active,created_at',
  news: 'id,tenant_id,title,slug,body,cover_image_url,is_published,published_at,created_at',
}

if (missing === 0) {
  console.log('\n=== Сверка колонок с lib/types.ts ===')

  for (const [table, columns] of Object.entries(EXPECTED_COLUMNS)) {
    const res = await get(`/rest/v1/${table}?select=${columns}&limit=0`)

    if (res.status === 200) {
      ok(`${table}: все ${columns.split(',').length} колонок на месте`)
    } else {
      bad(
        `${table}: схема разошлась с типами — ${res.body?.message ?? res.status}` +
          `${res.body?.hint ? ` (${res.body.hint})` : ''}`,
      )
    }
  }
}

// --- Хранилище -----------------------------------------------------------
console.log('\n=== Хранилище ===')

// Запрашиваем заведомо отсутствующий файл в публичном бакете. Ответ различает
// два случая: «нет бакета» и «нет файла». Списком файлов проверять нельзя —
// тот эндпоинт принимает POST и на GET ответит 404 при живом бакете.
const bucketProbe = await get('/storage/v1/object/public/tenant-media/__probe__')
const bucketReason = String(bucketProbe.body?.error ?? bucketProbe.body?.message ?? '')

if (/bucket not found/i.test(bucketReason)) {
  bad('бакета tenant-media нет — миграция 20260720120200 не применена')
} else if (
  /not.?found/i.test(bucketReason) ||
  bucketProbe.status === 404 ||
  bucketProbe.status === 400
) {
  ok('бакет tenant-media на месте (файла нет — так и должно быть)')
} else {
  warn(`бакет проверить не вышло: ${bucketProbe.status} ${bucketReason || '(без пояснения)'}`)
}

// --- Тестовые данные -----------------------------------------------------
if (missing === 0) {
  console.log('\n=== Тестовые данные ===')

  const tenants = await get('/rest/v1/tenants?select=slug,name&order=slug')
  if (tenants.status === 200 && Array.isArray(tenants.body)) {
    if (tenants.body.length === 0) {
      warn('тенантов нет — прогони supabase/checks/01_test_data.sql')
    } else {
      for (const t of tenants.body) ok(`тенант: ${t.slug} — ${t.name}`)

      if (!keyIsSecret) {
        const drafts = await get('/rest/v1/news?select=id&is_published=eq.false')
        if (drafts.status === 200 && Array.isArray(drafts.body)) {
          if (drafts.body.length === 0) ok('черновики анониму не видны — RLS работает')
          else bad(`анониму видно черновиков: ${drafts.body.length} — RLS не работает!`)
        }
      }
    }
  }
}

console.log(
  process.exitCode === 1
    ? '\nЕсть проблемы — смотри строки с «ОШИБКА» выше.\n'
    : '\nВсё в порядке.\n',
)
