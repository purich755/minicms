/**
 * Включить или выключить сайт клиента.
 *
 *   npm run tenant:list                показать всех и их состояние
 *   npm run tenant:disable -- flora    выключить сайт
 *   npm run tenant:enable  -- flora    включить обратно
 *
 * Выключение — рычаг для подписки: перестал платить, сайт погас. Данные при
 * этом целы, владелец по-прежнему заходит в панель и всё видит, а на обзоре
 * ему написано, что сайт выключен. Включили — вернулось как было.
 *
 * Удаления здесь намеренно нет. Стирать меню и новости человека, который
 * может вернуться через месяц, несоразмерно, а необратимая команда рядом с
 * обратимой рано или поздно запускается по ошибке. Если удалять всё-таки
 * надо — сначала npm run backup, потом строка в Table Editor.
 */

import { bad, headers, ok, readEnv } from './lib/supabase-admin.mjs'

const { base, key } = readEnv()

// Режим приходит первым аргументом из package.json, слаг — вторым, от
// пользователя: npm run tenant:disable -- flora
const [mode, ...rest] = process.argv.slice(2)
const slug = rest.find((a) => !a.startsWith('--'))

const COLUMNS = 'slug,name,is_active,custom_domain'

async function list() {
  const res = await fetch(`${base}/rest/v1/tenants?select=${COLUMNS}&order=slug`, {
    headers: headers(key),
  })

  if (!res.ok) {
    bad(`не прочитать список: ${res.status} ${await res.text()}`)
    process.exitCode = 1
    return
  }

  const rows = await res.json()

  if (rows.length === 0) {
    console.log('\nКлиентов пока нет. Подключить: npm run tenant:create\n')
    return
  }

  console.log('\n=== Клиенты ===\n')
  for (const t of rows) {
    const state = t.is_active ? 'работает ' : 'ВЫКЛЮЧЕН '
    const domain = t.custom_domain ? `  ${t.custom_domain}` : ''
    console.log(`  ${state} /${t.slug.padEnd(20)} ${t.name}${domain}`)
  }
  console.log('')
}

async function toggle(active) {
  if (!slug) {
    console.log(
      `\nУкажи адрес заведения:\n\n  npm run tenant:${active ? 'enable' : 'disable'} -- flora\n\n` +
        'Список: npm run tenant:list\n',
    )
    process.exitCode = 1
    return
  }

  const res = await fetch(`${base}/rest/v1/tenants?slug=eq.${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    headers: headers(key, {
      'content-type': 'application/json',
      prefer: 'return=representation',
    }),
    body: JSON.stringify({ is_active: active }),
  })

  if (!res.ok) {
    bad(`${res.status} ${await res.text()}`)
    process.exitCode = 1
    return
  }

  const rows = await res.json()

  // PATCH по несуществующему слагу отвечает 200 и пустым массивом — если это
  // не проверить, скрипт бодро отрапортует об успехе, ничего не сделав.
  if (rows.length === 0) {
    bad(`заведения со слагом «${slug}» нет. Список: npm run tenant:list`)
    process.exitCode = 1
    return
  }

  ok(
    active
      ? `сайт /${slug} включён — «${rows[0].name}» снова открывается`
      : `сайт /${slug} выключен — гостям не открывается, данные целы`,
  )
}

if (mode === 'list') await list()
else await toggle(mode === 'enable')
