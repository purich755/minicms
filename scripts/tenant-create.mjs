/**
 * Подключение нового клиента одной командой.
 *
 *   npm run tenant:create
 *   npm run tenant:create -- --name "Кофейня Флора" --slug flora --email owner@mail.ru
 *
 * Заводит владельца, тенанта, настройки сайта и связь между ними, после чего
 * печатает готовые доступы — их можно сразу переслать клиенту.
 *
 * Раньше это была ручная работа: создать пользователя в панели Supabase, потом
 * выполнить INSERT в SQL-редакторе, не перепутав почту. Шаг со связкой молча
 * не срабатывал, если в почте была опечатка: SQL отвечал «Success. No rows
 * returned», клиент входил и видел «аккаунт не привязан к заведению».
 *
 * Скрипт идемпотентен настолько, насколько это безопасно: существующего
 * пользователя переиспользует, существующего тенанта — нет, потому что слаг
 * это адрес сайта и занимать чужой нельзя.
 */

import { randomInt } from 'node:crypto'
import { createInterface } from 'node:readline/promises'

import { RESERVED_SLUGS, isValidTenantSlug, tenantSlugify } from '../lib/slug.ts'
import { bad, headers, ok, readEnv } from './lib/supabase-admin.mjs'

const { base, key } = readEnv()

// --- Ввод --------------------------------------------------------------------

const flags = {}
for (let i = 2; i < process.argv.length; i += 2) {
  if (process.argv[i]?.startsWith('--')) flags[process.argv[i].slice(2)] = process.argv[i + 1]
}

const rl = createInterface({ input: process.stdin, output: process.stdout })

console.log('\n=== Новый клиент ===\n')

const name = (flags.name ?? (await rl.question('Название заведения (как на сайте): '))).trim()
if (!name) {
  console.log('\nБез названия нельзя.\n')
  process.exit(1)
}

const suggested = tenantSlugify(name)
const answered = flags.slug ?? (await rl.question(`Адрес сайта${suggested ? ` [${suggested}]` : ''}: `))

// Пустой ответ означает «согласен с подсказкой».
const slug = (answered.trim() || suggested).toLowerCase()

if (!isValidTenantSlug(slug)) {
  console.log(
    `\nАдрес «${slug}» не подходит. Нужна латиница, цифры и дефис, от 2 до 63 символов,\n` +
      `первым символом буква. Занятые слова: ${RESERVED_SLUGS.join(', ')}.\n`,
  )
  process.exit(1)
}

const email = (flags.email ?? (await rl.question('Почта владельца: '))).trim().toLowerCase()
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.log('\nПохоже, это не адрес почты.\n')
  process.exit(1)
}

rl.close()

const password = generatePassword()

console.log('')

// --- Владелец ----------------------------------------------------------------

let userId = await findUser(email)
const userExisted = userId !== null

if (userId) {
  ok(`пользователь ${email} уже есть — переиспользую`)
} else {
  const res = await fetch(`${base}/auth/v1/admin/users`, {
    method: 'POST',
    headers: headers(key, { 'content-type': 'application/json' }),
    // email_confirm: письмо-подтверждение не отправляется и не требуется.
    // Свой SMTP пока не настроен, а без этого флага человек не смог бы войти.
    body: JSON.stringify({ email, password, email_confirm: true }),
  })

  if (!res.ok) {
    bad(`не удалось создать пользователя: ${res.status} ${await res.text()}`)
    process.exit(1)
  }

  userId = (await res.json()).id
  ok(`пользователь ${email} создан`)
}

// --- Тенант ------------------------------------------------------------------

const tenantRes = await fetch(`${base}/rest/v1/tenants`, {
  method: 'POST',
  headers: headers(key, {
    'content-type': 'application/json',
    prefer: 'return=representation',
  }),
  body: JSON.stringify({ slug, name, owner_user_id: userId }),
})

if (!tenantRes.ok) {
  const text = await tenantRes.text()
  if (text.includes('tenants_slug_key')) {
    bad(`адрес /${slug} уже занят другим клиентом — выбери другой`)
  } else {
    bad(`не удалось создать заведение: ${tenantRes.status} ${text}`)
  }
  process.exit(1)
}

const tenant = (await tenantRes.json())[0]
ok(`заведение «${name}» создано, адрес /${slug}`)

// --- Связь и настройки -------------------------------------------------------

for (const [what, path, body] of [
  ['доступ владельца', 'tenant_members', { user_id: userId, tenant_id: tenant.id, role: 'owner' }],
  ['настройки сайта', 'site_settings', { tenant_id: tenant.id }],
]) {
  const res = await fetch(`${base}/rest/v1/${path}`, {
    method: 'POST',
    headers: headers(key, {
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    bad(`${what}: ${res.status} ${await res.text()}`)
    console.log(
      `\n  Заведение создано, но настроено не до конца. Удалить и начать заново:\n` +
        `  в Supabase → Table Editor → tenants удали строку со слагом ${slug}.\n`,
    )
    process.exit(1)
  }

  ok(what)
}

// --- Доступы -----------------------------------------------------------------

const site = process.env.NEXT_PUBLIC_ROOT_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/${slug}`
  : `/${slug}`

const adminUrl = site.startsWith('http') ? `${new URL(site).origin}/admin` : '/admin'

console.log('\n' + '─'.repeat(58))
console.log('  Доступы для клиента — можно копировать целиком')
console.log('─'.repeat(58))
console.log(`
  Ваш сайт:  ${site}
  Панель:    ${adminUrl}

  Логин:     ${email}
  Пароль:    ${userExisted ? '(прежний — пользователь уже был заведён)' : password}
`)
console.log('─'.repeat(58))

console.log(
  userExisted
    ? '\n  Пароль не менялся: этот адрес уже был в системе. Отдай клиенту тот,\n' +
        '  что выдавал раньше, либо смени пароль в Supabase → Authentication.\n'
    : '\n  Пароль показан один раз — сохрани его сейчас.\n',
)

// --- Вспомогательное ---------------------------------------------------------

async function findUser(address) {
  const res = await fetch(
    `${base}/auth/v1/admin/users?filter=${encodeURIComponent(address)}&per_page=200`,
    { headers: headers(key) },
  )
  if (!res.ok) return null

  const data = await res.json()
  return (data.users ?? []).find((u) => u.email?.toLowerCase() === address)?.id ?? null
}

/**
 * Пароль без похожих друг на друга символов: его будут диктовать по телефону
 * и набирать с бумажки, и путаница «0 или O» здесь дороже пары бит энтропии.
 */
function generatePassword() {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 14; i++) out += alphabet[randomInt(alphabet.length)]
  return out
}
