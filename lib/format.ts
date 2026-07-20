/**
 * Форматирование для русского интерфейса: цены в рублях, даты по-русски.
 *
 * Без зависимостей и без обращений к БД — прогоняется тестами
 * (npm run test:lib).
 */

const PRICE_FORMATTER = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** 220 → «220 ₽», 1500.5 → «1 500,5 ₽» (пробел неразрывный). */
export function formatPrice(value: number): string {
  return `${PRICE_FORMATTER.format(value)} ₽`
}

/**
 * ISO-строка → «20 июля 2026». Пустой вход даёт пустую строку.
 *
 * Intl для ru-RU дописывает « г.» — на сайте кофейни это лишний канцелярит,
 * и он же расходился бы с formatDateTime, который суффикс не выводит.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return DATE_FORMATTER.format(date).replace(' г.', '')
}

/** ISO-строка → «20 июля 2026, 14:30». */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return DATE_TIME_FORMATTER.format(date).replace(' г.', '')
}

/**
 * ISO-строка → значение для <input type="datetime-local">.
 *
 * Этот input не понимает ни таймзону, ни суффикс Z: ему нужен ровно
 * «YYYY-MM-DDTHH:mm» в местном времени. Поэтому собираем руками, а не через
 * toISOString() — тот вернул бы UTC и время в форме уехало бы на часовой пояс.
 */
export function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/** Склонение существительного: 1 позиция, 2 позиции, 5 позиций. */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
