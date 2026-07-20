/**
 * Тесты чистой логики админки: слаги, форматирование, разбор полей форм.
 *
 *   npm run test:lib
 *
 * Здесь проверяется всё, что можно проверить без Supabase. Работа с базой
 * тестами не покрыта — её проверяют руками на живом проекте.
 */

import { formatPrice, plural, toDateTimeLocal } from '../lib/format.ts'
import { isValidSlug, slugify } from '../lib/slug.ts'
import { buildMediaPath, storagePathFromUrl, validateImage } from '../lib/storage.ts'
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

// ---------------------------------------------------------------- итог
if (failures.length === 0) {
  console.log(`\nВсе ${passed} проверок пройдены.`)
} else {
  console.log(`\nПройдено: ${passed}. Провалено: ${failures.length}\n`)
  for (const f of failures) console.log(`  ✗ ${f}\n`)
  process.exit(1)
}
