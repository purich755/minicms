/**
 * Резервная копия содержимого всех сайтов.
 *
 *   npm run backup
 *
 * Складывает в backups/<дата>/ два предмета: data.json со всеми строками
 * контентных таблиц и папку media/ с картинками из Storage.
 *
 * Зачем вообще: на бесплатном тарифе Supabase резервных копий не делает
 * никаких. Клиент, который потратил вечер на меню, потеряет его без следа —
 * и восстанавливать будет неоткуда.
 *
 * Чего копия НЕ содержит: учётных записей из auth.users. Их пароли хранятся
 * хешами, выгрузить и вернуть их через API нельзя. Для обычной беды —
 * «клиент удалил свои позиции» — это неважно: пользователи на месте, вернуть
 * надо строки. Для потери проекта целиком пользователей придётся завести
 * заново через npm run tenant:create. Список почт кладём рядом, чтобы было
 * от чего оттолкнуться.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { BUCKET, TABLES, bad, fetchAll, headers, listMedia, ok, readEnv, warn } from './lib/supabase-admin.mjs'

const { base, key } = readEnv()

/** 2026-07-21_1530 — сортируется по алфавиту в хронологическом порядке. */
function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`
}

const dir = join('backups', stamp())

console.log(`\n=== Резервная копия → ${dir} ===\n`)

await mkdir(join(dir, 'media'), { recursive: true })

// --- Таблицы -----------------------------------------------------------------

const tables = {}
let rowCount = 0

for (const table of TABLES) {
  try {
    const rows = await fetchAll(base, key, table)
    tables[table] = rows
    rowCount += rows.length
    ok(`${table}: ${rows.length}`)
  } catch (error) {
    bad(`${table}: ${error.message}`)
    console.log('\n  Копия неполная, файл не сохранён.\n')
    process.exit(1)
  }
}

// --- Список пользователей (только для справки) -------------------------------

let users = []
try {
  const res = await fetch(`${base}/auth/v1/admin/users?per_page=1000`, { headers: headers(key) })
  if (res.ok) {
    const data = await res.json()
    users = (data.users ?? []).map((u) => ({ id: u.id, email: u.email }))
    ok(`учётных записей: ${users.length} (только почты, пароли не выгружаются)`)
  } else {
    warn(`список пользователей не прочитан: ${res.status}. На данные это не влияет.`)
  }
} catch (error) {
  warn(`список пользователей не прочитан: ${error.message}`)
}

// --- Картинки ----------------------------------------------------------------

let mediaCount = 0
let mediaBytes = 0

try {
  const paths = await listMedia(base, key)

  for (const path of paths) {
    const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, { headers: headers(key) })
    if (!res.ok) {
      warn(`картинка не скачалась: ${path} (${res.status})`)
      continue
    }

    const bytes = Buffer.from(await res.arrayBuffer())
    const target = join(dir, 'media', path)

    await mkdir(join(target, '..'), { recursive: true })
    await writeFile(target, bytes)

    mediaCount++
    mediaBytes += bytes.length
  }

  ok(`картинок: ${mediaCount} (${(mediaBytes / 1024 / 1024).toFixed(1)} МБ)`)
} catch (error) {
  warn(`картинки не скопированы: ${error.message}. Строки в data.json уже сохранены.`)
}

// --- Файлы -------------------------------------------------------------------

await writeFile(
  join(dir, 'data.json'),
  JSON.stringify({ version: 1, createdAt: new Date().toISOString(), project: base, users, tables }, null, 2),
  'utf8',
)

await writeFile(
  join(dir, 'README.txt'),
  [
    'Резервная копия mini-cms',
    `Снята: ${new Date().toLocaleString('ru-RU')}`,
    `Проект: ${base}`,
    '',
    `Строк: ${rowCount}. Картинок: ${mediaCount}.`,
    '',
    'Что внутри:',
    '  data.json  — содержимое всех сайтов: тенанты, меню, акции, новости, настройки',
    '  media/     — картинки из Storage, путь как в бакете',
    '',
    'Как вернуть:',
    `  npm run restore -- ${dir}`,
    '',
    'Пароли пользователей сюда не попадают — их нельзя выгрузить.',
    'Если потерян весь проект Supabase, владельцев придётся завести заново',
    'через npm run tenant:create, а потом восстановить содержимое.',
  ].join('\n'),
  'utf8',
)

console.log(`\nГотово. Строк: ${rowCount}, картинок: ${mediaCount}.`)
console.log(`Вернуть: npm run restore -- ${dir}\n`)
