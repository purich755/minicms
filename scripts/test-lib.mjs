/**
 * Тесты чистой логики админки: слаги, форматирование, разбор полей форм.
 *
 *   npm run test:lib
 *
 * Здесь проверяется всё, что можно проверить без Supabase. Работа с базой
 * тестами не покрыта — её проверяют руками на живом проекте.
 */

import { isAuthCallback, isPublicAdminPage, requiresSession } from '../lib/admin-paths.ts'
import { allContentTags, tags } from '../lib/cache-tags.ts'
import { formatDate, formatDateTime, formatPrice, plural, toDateTimeLocal } from '../lib/format.ts'
import { isLocalHost, isPlatformHost, normalizeHost, subdomainSlug } from '../lib/host.ts'
import { isValidSlug, isValidTenantSlug, slugify, tenantSlugify } from '../lib/slug.ts'
import { buildMediaPath, storagePathFromUrl, validateImage } from '../lib/storage.ts'
import {
  HIDDEN_LABEL,
  menuItemHidden,
  newsHidden,
  promotionHidden,
} from '../lib/visibility.ts'
import {
  hasErrors,
  takeBoolean,
  takeDateTime,
  takeHexColor,
  takePrice,
  takeText,
  takeUrl,
} from '../lib/validation.ts'

let passed = 0
const failures = []

function check(name, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    passed++
  } else {
    failures.push(`${name}\n      получили: ${a}\n      ожидали:  ${e}`)
  }
}

function form(entries) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

/** Пробелы в русских числах неразрывные — для сравнения приводим к обычным. */
const nbsp = (s) => s.replace(/ /g, ' ')

// ---------------------------------------------------------------- слаги
check('слаг: простой заголовок', slugify('Мы открылись'), 'my-otkrylis')
check('слаг: восклицательный знак отбрасывается', slugify('Новые мастера!'), 'novye-mastera')
check('слаг: цифры сохраняются', slugify('Кофе 3 в 1'), 'kofe-3-v-1')
check('слаг: ё приводится к e, пробелы по краям срезаются', slugify('  Ёлка  '), 'elka')
check('слаг: щ даёт sch', slugify('Щи да каша'), 'schi-da-kasha')
check('слаг: твёрдый и мягкий знаки выпадают', slugify('Съешь ещё'), 'sesh-esche')
check('слаг: латиница проходит насквозь', slugify('Coffee Break'), 'coffee-break')
check('слаг: подряд идущие разделители схлопываются', slugify('А  —  Б'), 'a-b')
check('слаг: из одних символов ничего не выходит', slugify('!!! ??? ...'), '')
check('слаг: пустая строка', slugify(''), '')
check(
  'слаг: длина режется до 128',
  slugify('а'.repeat(200)).length,
  128,
)
check('слаг: после обрезки нет дефиса на конце', slugify('аб '.repeat(100)).endsWith('-'), false)
check('слаг: результат проходит ограничение БД', isValidSlug(slugify('Мы открылись')), true)
check('слаг: пустой не проходит ограничение БД', isValidSlug(''), false)
check('слаг: заглавные не проходят ограничение БД', isValidSlug('Abc'), false)

// Слаг заведения строже слага новости: он же адрес сайта, и им можно
// перекрыть маршрут админки. Проверки повторяют tenants_slug_format.
check('слаг заведения: из названия', tenantSlugify('Кофейня «Флора»'), 'kofeinya-flora')
check('слаг заведения: ведущая цифра срезается', tenantSlugify('1-я Кофейня'), 'ya-kofeinya')
check('слаг заведения: из одних цифр ничего не выходит', tenantSlugify('2024'), '')
check('слаг заведения: односимвольный не годится', tenantSlugify('А'), '')
check('слаг заведения: admin занят', isValidTenantSlug('admin'), false)
check('слаг заведения: api занят', isValidTenantSlug('api'), false)
check('слаг заведения: обычный проходит', isValidTenantSlug('flora'), true)
check('слаг заведения: с цифры начинаться нельзя', isValidTenantSlug('1flora'), false)
check('слаг заведения: 63 символа — предел', isValidTenantSlug('a'.repeat(63)), true)
check('слаг заведения: 64 символа — уже нет', isValidTenantSlug('a'.repeat(64)), false)
check('слаг заведения: подсказка либо пуста, либо валидна',
  ['Кофейня «Флора»', 'Барбершоп ZARYA', 'Салон 5 звёзд', '!!!', '2024', 'admin']
    .map(tenantSlugify)
    .every((s) => s === '' || isValidTenantSlug(s)),
  true)

// ------------------------------------------------------------ цены и даты
check('цена: целое', nbsp(formatPrice(220)), '220 ₽')
check('цена: дробное с запятой', nbsp(formatPrice(1500.5)), '1 500,5 ₽')
check('цена: ноль', nbsp(formatPrice(0)), '0 ₽')

check('склонение: 1', plural(1, 'позиция', 'позиции', 'позиций'), 'позиция')
check('склонение: 2', plural(2, 'позиция', 'позиции', 'позиций'), 'позиции')
check('склонение: 5', plural(5, 'позиция', 'позиции', 'позиций'), 'позиций')
check('склонение: 11 — исключение', plural(11, 'позиция', 'позиции', 'позиций'), 'позиций')
check('склонение: 21', plural(21, 'позиция', 'позиции', 'позиций'), 'позиция')
check('склонение: 112', plural(112, 'позиция', 'позиции', 'позиций'), 'позиций')
check('склонение: 0', plural(0, 'позиция', 'позиции', 'позиций'), 'позиций')

check('дата: без канцелярского « г.»', formatDate('2026-07-17T10:00:00Z'), '17 июля 2026')
check('дата: пустой вход', formatDate(null), '')
check('дата: мусор', formatDate('не дата'), '')
check('дата со временем: тоже без « г.»',
  formatDateTime('2026-07-17T10:00:00Z').includes(' г.'), false)

check('datetime-local: пустой вход', toDateTimeLocal(null), '')
check('datetime-local: мусор', toDateTimeLocal('не дата'), '')
check(
  'datetime-local: формат без таймзоны',
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(toDateTimeLocal(new Date().toISOString())),
  true,
)

// -------------------------------------------------------- разбор полей формы
{
  const errors = {}
  check('текст: обязательное пустое поле', takeText(form({ name: '  ' }), 'name', errors, {
    label: 'Название',
    required: true,
  }), '')
  check('текст: ошибка записана', errors.name, 'Укажите: название')
}
{
  const errors = {}
  takeText(form({ name: 'x'.repeat(20) }), 'name', errors, { label: 'Название', max: 10 })
  check('текст: превышение длины', errors.name, 'Название: слишком длинно, максимум 10 символов')
}
{
  const errors = {}
  check('текст: пробелы срезаются', takeText(form({ name: '  Раф  ' }), 'name', errors, {
    label: 'Название',
    required: true,
  }), 'Раф')
  check('текст: ошибок нет', hasErrors(errors), false)
}

{
  const errors = {}
  check('цена: обычная', takePrice(form({ price: '220' }), 'price', errors), 220)
  check('цена: запятая как разделитель', takePrice(form({ price: '220,50' }), 'price', errors), 220.5)
  check('цена: пробел как разделитель тысяч', takePrice(form({ price: '1 500' }), 'price', errors), 1500)
  check('цена: округление до копеек', takePrice(form({ price: '10,999' }), 'price', errors), 11)
  check('цена: ошибок пока нет', hasErrors(errors), false)
}
{
  const errors = {}
  takePrice(form({ price: 'дорого' }), 'price', errors)
  check('цена: не число', errors.price, 'Цена должна быть числом')
}
{
  const errors = {}
  takePrice(form({ price: '-5' }), 'price', errors)
  check('цена: отрицательная', errors.price, 'Цена не может быть отрицательной')
}
{
  const errors = {}
  takePrice(form({ price: '' }), 'price', errors)
  check('цена: пустая', errors.price, 'Укажите цену')
}

check('чекбокс: отсутствует', takeBoolean(form({}), 'is_active'), false)
check('чекбокс: присутствует', takeBoolean(form({ is_active: 'on' }), 'is_active'), true)

{
  const errors = {}
  check('дата: пустая — это null, не ошибка', takeDateTime(form({ d: '' }), 'd', errors, { label: 'Начало' }), null)
  check('дата: ошибок нет', hasErrors(errors), false)
}
{
  const errors = {}
  takeDateTime(form({ d: 'вчера' }), 'd', errors, { label: 'Начало' })
  check('дата: мусор', errors.d, 'Начало: непонятная дата')
}

{
  const errors = {}
  check('цвет: корректный', takeHexColor(form({ c: '#A1B2C3' }), 'c', errors, '#111827'), '#a1b2c3')
  check('цвет: пустой берёт запасной', takeHexColor(form({ c: '' }), 'c', errors, '#111827'), '#111827')
  check('цвет: ошибок нет', hasErrors(errors), false)
}
{
  const errors = {}
  takeHexColor(form({ c: '#FFF' }), 'c', errors, '#111827')
  check('цвет: короткая запись не проходит', errors.c, 'Цвет должен быть в формате #RRGGBB')
}

{
  const errors = {}
  check('ссылка: https', takeUrl(form({ u: 'https://ok.ru/flora' }), 'u', errors, { label: 'Ссылка' }), 'https://ok.ru/flora')
  check('ссылка: пустая — null', takeUrl(form({ u: '' }), 'u', errors, { label: 'Ссылка' }), null)
  check('ссылка: ошибок нет', hasErrors(errors), false)
}
{
  const errors = {}
  takeUrl(form({ u: 'javascript:alert(1)' }), 'u', errors, { label: 'Ссылка' })
  check('ссылка: javascript: отвергается', errors.u, 'Ссылка: допустимы только ссылки http и https')
}
{
  const errors = {}
  takeUrl(form({ u: 'просто текст' }), 'u', errors, { label: 'Ссылка' })
  check('ссылка: не адрес', errors.u, 'Ссылка: нужен полный адрес, начиная с https://')
}

// -------------------------------------------------------------- хранилище
{
  const path = buildMediaPath('11111111-2222-3333-4444-555555555555', 'menu', 'image/jpeg')
  check('путь: начинается с id тенанта — на этом держится политика Storage',
    path.startsWith('11111111-2222-3333-4444-555555555555/menu/'), true)
  check('путь: расширение из mime-типа, а не из имени файла', path.endsWith('.jpg'), true)
  check('путь: два вызова не совпадают',
    buildMediaPath('t', 'menu', 'image/png') === buildMediaPath('t', 'menu', 'image/png'), false)
}
{
  let threw = false
  try {
    buildMediaPath('t', 'menu', 'image/svg+xml')
  } catch {
    threw = true
  }
  check('путь: SVG отвергается — он умеет исполнять скрипты', threw, true)
}

check('файл: слишком большой', validateImage({ type: 'image/png', size: 6 * 1024 * 1024 }),
  'Файл слишком большой (6.0 МБ). Максимум 5 МБ.')
check('файл: неподдерживаемый тип', validateImage({ type: 'application/pdf', size: 1000 }),
  'Подойдёт JPG, PNG, WebP или AVIF.')
check('файл: подходящий', validateImage({ type: 'image/webp', size: 1000 }), null)
check('файл: ровно на границе размера',
  validateImage({ type: 'image/png', size: 5 * 1024 * 1024 }), null)

check('ссылка→путь: обычная публичная ссылка',
  storagePathFromUrl('https://abc.supabase.co/storage/v1/object/public/tenant-media/t1/menu/a.jpg'),
  't1/menu/a.jpg')
check('ссылка→путь: с query-строкой',
  storagePathFromUrl('https://abc.supabase.co/storage/v1/object/public/tenant-media/t1/menu/a.jpg?v=2'),
  't1/menu/a.jpg')
check('ссылка→путь: экранированные символы разворачиваются',
  storagePathFromUrl('https://abc.supabase.co/storage/v1/object/public/tenant-media/t1/menu/a%20b.jpg'),
  't1/menu/a b.jpg')
check('ссылка→путь: чужой домен — удалять нечего',
  storagePathFromUrl('https://example.com/foo.jpg'), null)
check('ссылка→путь: другой бакет — не наш',
  storagePathFromUrl('https://abc.supabase.co/storage/v1/object/public/other/t1/a.jpg'), null)
check('ссылка→путь: пусто', storagePathFromUrl(null), null)
check('ссылка→путь: пустая строка', storagePathFromUrl(''), null)

// ----------------------------------------------------------------- домены
check('хост: порт отрезается', normalizeHost('Flora.RF:3000'), 'flora.rf')
check('хост: регистр приводится', normalizeHost('FLORA.example.RU'), 'flora.example.ru')
check('хост: пусто', normalizeHost(null), '')

check('поддомен: обычный', subdomainSlug('flora.example.ru', 'example.ru'), 'flora')
check('поддомен: с портом', subdomainSlug('flora.example.ru:3000', 'example.ru'), 'flora')
check('поддомен: сам корневой домен — не тенант', subdomainSlug('example.ru', 'example.ru'), null)
check('поддомен: www зарезервирован', subdomainSlug('www.example.ru', 'example.ru'), null)
check('поддомен: admin зарезервирован', subdomainSlug('admin.example.ru', 'example.ru'), null)
check('поддомен: чужой домен — не наш поддомен',
  subdomainSlug('flora-cafe.ru', 'example.ru'), null)
check('поддомен: вложенный не считается',
  subdomainSlug('a.b.example.ru', 'example.ru'), null)
check('поддомен: похожий домен не проходит',
  subdomainSlug('notexample.ru', 'example.ru'), null)
check('поддомен: слаг обязан начинаться с буквы',
  subdomainSlug('1flora.example.ru', 'example.ru'), null)
check('поддомен: без корневого домена ничего не резолвится',
  subdomainSlug('flora.example.ru', ''), null)

check('localhost опознаётся', isLocalHost('localhost:3200'), true)
check('127.0.0.1 опознаётся', isLocalHost('127.0.0.1'), true)
check('обычный домен — не localhost', isLocalHost('example.ru'), false)

check('превью Vercel — служебный адрес, а не сайт клиента',
  isPlatformHost('mini-cms-git-master-artem.vercel.app'), true)
check('localhost — тоже служебный', isPlatformHost('localhost:3200'), true)
check('домен клиента служебным не считается', isPlatformHost('flora-cafe.ru'), false)
check('поддомен сервиса служебным не считается',
  isPlatformHost('flora.example.ru'), false)

// ------------------------------------------------- открытые адреса админки
//
// Ошибка здесь — это открытая настежь админка, и в условии внутри proxy её
// глазами не видно. Поэтому список проверяется поимённо.

check('вход открыт без сессии', requiresSession('/admin/login'), false)
check('восстановление открыто без сессии', requiresSession('/admin/forgot'), false)
check('ссылка из письма не требует сессии', requiresSession('/admin/auth/callback'), false)

check('обзор требует входа', requiresSession('/admin'), true)
check('меню требует входа', requiresSession('/admin/menu'), true)
check('новости требуют входа', requiresSession('/admin/news'), true)
check('настройки требуют входа', requiresSession('/admin/settings'), true)
check('учётная запись требует входа', requiresSession('/admin/account'), true)
check('неизвестный адрес требует входа', requiresSession('/admin/что-то-новое'), true)

// Приписка к открытому адресу не должна его открывать.
check('подстрока «login» не открывает адрес', requiresSession('/admin/login/steal'), true)
check('подстрока «forgot» не открывает адрес', requiresSession('/admin/forgotten'), true)
check('подстрока callback не открывает адрес', requiresSession('/admin/auth/callback/x'), true)

// Залогиненного уводим со страниц входа, но НЕ с обмена кода: иначе
// восстановление пароля сломается у тех, кто уже вошёл на другом устройстве.
check('вход — страница, с которой уводим', isPublicAdminPage('/admin/login'), true)
check('обмен кода — не страница входа', isPublicAdminPage('/admin/auth/callback'), false)
check('обмен кода опознаётся', isAuthCallback('/admin/auth/callback'), true)

// ------------------------------------------------------------- теги кеша
check('тег тенанта', tags.tenant('flora'), 'tenant:flora')
check('тег меню', tags.menu('t1'), 'menu:t1')
check('теги контента: все четыре', allContentTags('t1').length, 4)
check('теги контента: без пересечений', new Set(allContentTags('t1')).size, 4)
check('теги разных тенантов не совпадают', tags.menu('a') === tags.menu('b'), false)

// ------------------------------------------------------------- видимость
//
// Эти проверки сторожат совпадение lib/visibility.ts с политиками публичного
// чтения в 20260720120100_rls_policies.sql. Разъедутся — предпросмотр начнёт
// врать: подпишет «черновик» то, что посетители уже видят, или наоборот
// промолчит про скрытое. Тихая ошибка, руками её не заметишь.

const NOW = new Date('2026-07-21T12:00:00Z')
const BEFORE = '2026-07-20T12:00:00Z'
const AFTER = '2026-07-22T12:00:00Z'

check('меню: доступная позиция видна',
  menuItemHidden({ is_available: true }), { hidden: false })
check('меню: снятая с продажи скрыта',
  menuItemHidden({ is_available: false }), { hidden: true, reason: 'unavailable' })

check('акция: включённая без дат идёт',
  promotionHidden({ is_active: true, starts_at: null, ends_at: null }, NOW), { hidden: false })
check('акция: выключенная скрыта',
  promotionHidden({ is_active: false, starts_at: null, ends_at: null }, NOW),
  { hidden: true, reason: 'disabled' })
check('акция: начало в будущем — ещё не началась',
  promotionHidden({ is_active: true, starts_at: AFTER, ends_at: null }, NOW),
  { hidden: true, reason: 'scheduled' })
check('акция: конец в прошлом — закончилась',
  promotionHidden({ is_active: true, starts_at: null, ends_at: BEFORE }, NOW),
  { hidden: true, reason: 'expired' })
check('акция: внутри окна дат идёт',
  promotionHidden({ is_active: true, starts_at: BEFORE, ends_at: AFTER }, NOW), { hidden: false })
check('акция: выключенная важнее дат',
  promotionHidden({ is_active: false, starts_at: BEFORE, ends_at: AFTER }, NOW),
  { hidden: true, reason: 'disabled' })

check('новость: опубликованная без даты видна сразу',
  newsHidden({ is_published: true, published_at: null }, NOW), { hidden: false })
check('новость: черновик скрыт',
  newsHidden({ is_published: false, published_at: BEFORE }, NOW),
  { hidden: true, reason: 'draft' })
check('новость: дата публикации в прошлом — видна',
  newsHidden({ is_published: true, published_at: BEFORE }, NOW), { hidden: false })
check('новость: дата публикации в будущем — запланирована',
  newsHidden({ is_published: true, published_at: AFTER }, NOW),
  { hidden: true, reason: 'scheduled' })
check('новость: черновик с будущей датой — всё-таки черновик',
  newsHidden({ is_published: false, published_at: AFTER }, NOW),
  { hidden: true, reason: 'draft' })

check('у каждой причины есть человеческий ярлык',
  ['draft', 'unavailable', 'scheduled', 'expired', 'disabled']
    .every((r) => typeof HIDDEN_LABEL[r] === 'string' && HIDDEN_LABEL[r].length > 0),
  true)

// ---------------------------------------------------------------- итог
if (failures.length === 0) {
  console.log(`\nВсе ${passed} проверок пройдены.`)
} else {
  console.log(`\nПройдено: ${passed}. Провалено: ${failures.length}\n`)
  for (const f of failures) console.log(`  ✗ ${f}\n`)
  process.exit(1)
}
