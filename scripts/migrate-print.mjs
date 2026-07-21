/**
 * Собирает все миграции в один файл для вставки в Supabase SQL Editor.
 *
 *   npm run migrate:sql
 *
 * Зачем: DDL через REST API Supabase не выполняется, а пароля от Postgres у
 * скриптов нет. Значит, схему всё равно накатывают руками — задача этого
 * скрипта в том, чтобы это была одна вставка, а не пять, и чтобы порядок не
 * пришлось держать в голове.
 *
 * Вставлять можно в любой момент и сколько угодно раз: все миграции написаны
 * идемпотентно (create ... if not exists, drop policy if exists, on conflict
 * do update). Повторный прогон ничего не ломает и данные не трогает.
 */

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const SOURCE = join('supabase', 'migrations')
const TARGET = join('supabase', 'ПРИМЕНИТЬ.sql')

const files = (await readdir(SOURCE)).filter((f) => f.endsWith('.sql')).sort()

if (files.length === 0) {
  console.log(`\nВ ${SOURCE} нет ни одной миграции.\n`)
  process.exit(1)
}

const parts = [
  '-- ============================================================================',
  '-- Все миграции mini-cms, собранные по порядку.',
  '--',
  '-- Куда: Supabase → SQL Editor → New query → вставить целиком → Run.',
  '--',
  '-- Файл создан автоматически (npm run migrate:sql). Не редактируй его:',
  '-- правки вносят в supabase/migrations/, а файл пересобирают.',
  '--',
  '-- Выполнять можно повторно: миграции идемпотентны, данные не пострадают.',
  '-- ============================================================================',
  '',
]

for (const file of files) {
  parts.push(
    '',
    `-- ####  ${file}  ${'#'.repeat(Math.max(0, 60 - file.length))}`,
    '',
    (await readFile(join(SOURCE, file), 'utf8')).trimEnd(),
    '',
  )
}

await mkdir(SOURCE, { recursive: true })
await writeFile(TARGET, parts.join('\n'), 'utf8')

console.log(`\n=== Схема собрана ===\n`)
for (const file of files) console.log(`  · ${file}`)
console.log(`\n  Файл: ${TARGET}`)
console.log('\n  Открой его, скопируй целиком и выполни в Supabase → SQL Editor.')
console.log('  Потом проверь: npm run check:supabase\n')
