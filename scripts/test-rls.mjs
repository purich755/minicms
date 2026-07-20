/**
 * Прогон RLS-политик на настоящем Postgres, без Supabase и без интернета.
 *
 *   npm run test:rls          17 проверок изоляции тенантов
 *   npm run test:rls:mutate   то же + доказательство, что проверки умеют краснеть
 *
 * Как это работает: PGlite — это Postgres, скомпилированный в WASM. На него
 * накатываются заглушки auth/storage, затем все миграции проекта по порядку,
 * затем тестовые данные, затем supabase/checks/02_rls_check.sql — тот самый
 * файл, который потом руками прогоняется в Supabase SQL Editor.
 *
 * Запускать после ЛЮБОЙ правки политик. Регрессия в RLS — тихая: приложение
 * продолжает работать, просто один клиент начинает видеть данные другого.
 */

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { PGlite } from '@electric-sql/pglite'

const root = path.join(import.meta.dirname, '..')
const read = (rel) => readFileSync(path.join(root, rel), 'utf8')

const migrations = readdirSync(path.join(root, 'supabase/migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()

/** Чистая база со схемой, политиками и тестовыми тенантами. */
async function freshDb() {
  const db = await new PGlite()
  await db.exec(read('supabase/checks/_supabase_stubs.sql'))
  for (const file of migrations) {
    await db.exec(read(`supabase/migrations/${file}`))
  }
  // В Supabase этих пользователей заводят через дашборд, здесь — напрямую.
  await db.exec(
    `insert into auth.users (email) values ('flora@mini-cms.test'), ('zarya@mini-cms.test');`,
  )
  await db.exec(read('supabase/checks/01_test_data.sql'))
  return db
}

async function runChecks(db) {
  const results = await db.exec(read('supabase/checks/02_rls_check.sql'))
  return results.at(-1).rows
}

/** Намеренные поломки: если проверка их не заметит, она бесполезна. */
const MUTATIONS = [
  {
    name: 'публичная политика распространена на authenticated',
    sql: `
      drop policy "news: публично только опубликованные" on public.news;
      create policy "news: публично только опубликованные"
        on public.news for select to anon, authenticated
        using (is_published = true);`,
  },
  {
    name: 'политика владельца без фильтра по тенанту',
    sql: `
      drop policy "menu_items: владелец правит свои" on public.menu_items;
      create policy "menu_items: владелец правит свои"
        on public.menu_items for all to authenticated
        using (true) with check (true);`,
  },
  {
    name: 'RLS выключен на таблице новостей',
    sql: `alter table public.news disable row level security;`,
  },
]

const pad = (s, n) => String(s).padEnd(n)

// ---------------------------------------------------------------------------

const db = await freshDb()
const rows = await runChecks(db)
await db.close()

console.log(
  `\n${pad('№', 4)}${pad('сценарий', 27)}${pad('проверка', 53)}${pad('ждём', 11)}${pad('факт', 11)}итог`,
)
console.log('-'.repeat(112))
for (const r of rows) {
  console.log(
    `${pad(r['№'], 4)}${pad(r.сценарий, 27)}${pad(r.проверка, 53)}${pad(r.ожидание, 11)}${pad(r.факт, 11)}${r.итог}`,
  )
}
console.log('-'.repeat(112))

const failed = rows.filter((r) => r.итог !== 'ОК')
if (failed.length > 0) {
  console.log(`\nПРОВАЛЕНО ПРОВЕРОК: ${failed.length} из ${rows.length}. Изоляция тенантов нарушена.`)
  process.exit(1)
}
console.log(`\nВсе ${rows.length} проверок пройдены.`)

// ---------------------------------------------------------------------------

if (process.argv.includes('--mutate')) {
  console.log('\nМутационный тест — ломаю политики намеренно:\n')
  let allCaught = true

  for (const m of MUTATIONS) {
    const mdb = await freshDb()
    await mdb.exec(m.sql)
    const caught = (await runChecks(mdb)).filter((r) => r.итог !== 'ОК')
    await mdb.close()

    if (caught.length === 0) allCaught = false
    console.log(
      `  ${caught.length > 0 ? 'ловит' : 'НЕ ЛОВИТ'}  ${m.name}` +
        (caught.length > 0 ? ` (проверок сработало: ${caught.length})` : ''),
    )
  }

  if (!allCaught) {
    console.log('\nПроверка пропустила поломку — значит, она ничего не гарантирует.')
    process.exit(1)
  }
  console.log('\nПроверка рабочая: молчит на исправной схеме и краснеет на каждой поломке.')
}
