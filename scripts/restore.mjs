/**
 * Восстановление из резервной копии.
 *
 *   npm run restore -- backups/2026-07-21_1530          показать, что будет
 *   npm run restore -- backups/2026-07-21_1530 --yes    выполнить
 *
 * Без --yes ничего не пишет: печатает, сколько строк и картинок приедет, и
 * останавливается. Бэкап, который нельзя вернуть, бэкапом не является, а
 * восстановление вслепую — это способ затереть свежие данные старыми.
 *
 * Строки приезжают через upsert по id: то, что есть, обновляется, чего нет —
 * создаётся. Значит, скрипт можно запускать дважды подряд без последствий.
 *
 * Чего скрипт НЕ делает: не удаляет то, чего нет в копии. Если после снимка
 * добавили пять позиций, после восстановления они останутся. Это осознанно —
 * молча стирать данные опаснее, чем оставить лишнее.
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

import { BUCKET, TABLES, bad, headers, ok, readEnv, warn } from './lib/supabase-admin.mjs'

const args = process.argv.slice(2)
const dir = args.find((a) => !a.startsWith('--'))
const confirmed = args.includes('--yes')
const skipMedia = args.includes('--no-media')

if (!dir) {
  console.log(
    '\nУкажи папку с копией:\n\n' +
      '  npm run restore -- backups/2026-07-21_1530\n\n' +
      'Список копий — в папке backups/\n',
  )
  process.exit(1)
}

const { base, key } = readEnv()

let snapshot
try {
  snapshot = JSON.parse(await readFile(join(dir, 'data.json'), 'utf8'))
} catch (error) {
  console.log(`\nНе прочитался ${join(dir, 'data.json')}: ${error.message}\n`)
  process.exit(1)
}

console.log(`\n=== Восстановление из ${dir} ===\n`)
console.log(`  снята: ${new Date(snapshot.createdAt).toLocaleString('ru-RU')}`)
console.log(`  проект в копии: ${snapshot.project}`)
console.log(`  проект сейчас:  ${base}`)

// Копию одного проекта легко залить в другой по невнимательности, а обратно
// уже не разделишь.
if (snapshot.project !== base) {
  warn('копия снята с ДРУГОГО проекта Supabase — проверь, что это осознанно')
}

// --- Что приедет -------------------------------------------------------------

console.log('\n  Строки:')
let total = 0
for (const table of TABLES) {
  const rows = snapshot.tables?.[table] ?? []
  total += rows.length
  console.log(`    ${table}: ${rows.length}`)
}

const mediaFiles = skipMedia ? [] : await collectMedia(join(dir, 'media'))
console.log(`\n  Картинок: ${mediaFiles.length}`)

if (!confirmed) {
  console.log(
    '\n  Ничего не записано — это предварительный просмотр.\n' +
      `  Выполнить: npm run restore -- ${dir} --yes\n`,
  )
  process.exit(0)
}

// --- Строки ------------------------------------------------------------------

console.log('\n  Пишу строки…')

for (const table of TABLES) {
  const rows = snapshot.tables?.[table] ?? []
  if (rows.length === 0) continue

  // Пачками: один запрос на десять тысяч строк упирается в лимиты, а
  // построчно — это тысячи запросов подряд.
  const CHUNK = 500
  let written = 0

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)

    const res = await fetch(`${base}/rest/v1/${table}`, {
      method: 'POST',
      headers: headers(key, {
        'content-type': 'application/json',
        prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify(chunk),
    })

    if (!res.ok) {
      const text = await res.text()
      bad(`${table}: ${res.status} ${text}`)

      // Самая вероятная причина на пустом проекте — и она не очевидна.
      if (text.includes('tenant_members_user_id_fkey') || text.includes('auth.users')) {
        console.log(
          '\n  Похоже, в проекте нет учётных записей из копии. Пароли не выгружаются,\n' +
            '  поэтому владельцев надо сначала завести заново:\n\n' +
            '      npm run tenant:create\n\n' +
            '  а затем повторить восстановление.\n',
        )
      }
      process.exit(1)
    }

    written += chunk.length
  }

  ok(`${table}: ${written}`)
}

// --- Картинки ----------------------------------------------------------------

if (mediaFiles.length > 0) {
  console.log('\n  Загружаю картинки…')
  let uploaded = 0

  for (const { path, absolute } of mediaFiles) {
    const body = await readFile(absolute)

    const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: headers(key, {
        'content-type': contentType(path),
        // Файл с таким путём мог остаться на месте — перезаписываем.
        'x-upsert': 'true',
      }),
      body,
    })

    if (res.ok) uploaded++
    else warn(`${path}: ${res.status}`)
  }

  ok(`картинок загружено: ${uploaded} из ${mediaFiles.length}`)
}

console.log(`\nГотово. Строк: ${total}, картинок: ${mediaFiles.length}.\n`)

// --- Вспомогательное ---------------------------------------------------------

async function collectMedia(root) {
  const found = []

  async function walk(current) {
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      return // папки media может не быть — картинок просто не было
    }

    for (const entry of entries) {
      const absolute = join(current, entry.name)
      if (entry.isDirectory()) await walk(absolute)
      else if ((await stat(absolute)).size > 0) {
        found.push({ absolute, path: relative(root, absolute).replaceAll('\\', '/') })
      }
    }
  }

  await walk(root)
  return found
}

function contentType(path) {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
  return (
    { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' }[ext] ??
    'application/octet-stream'
  )
}
