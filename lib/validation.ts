/**
 * Разбор и проверка полей форм админки.
 *
 * Без зависимостей и без обращений к БД — прогоняется тестами
 * (npm run test:lib).
 *
 * Ограничения здесь намеренно повторяют ограничения из миграций (длины, формат
 * цвета, неотрицательная цена). База — последний рубеж и вернёт невнятную
 * ошибку Postgres; задача этого модуля — объяснить человеку по-русски, что не
 * так, до того как запрос уйдёт.
 */

export type FieldErrors = Record<string, string>

/** Состояние, которое server action возвращает в форму. */
export type FormState = {
  ok: boolean
  /** Общая ошибка: нет доступа, база недоступна и т. п. */
  error?: string
  /** Ошибки по конкретным полям: { name: 'Укажите название' } */
  fieldErrors?: FieldErrors
}

export const EMPTY_FORM_STATE: FormState = { ok: false }

function raw(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

export function takeText(
  formData: FormData,
  name: string,
  errors: FieldErrors,
  options: { label: string; required?: boolean; max?: number },
): string {
  const { label, required = false, max = 500 } = options
  const value = raw(formData, name)

  if (required && !value) {
    errors[name] = `Укажите: ${label.toLowerCase()}`
    return ''
  }
  if (value.length > max) {
    errors[name] = `${label}: слишком длинно, максимум ${max} символов`
    return value.slice(0, max)
  }
  return value
}

/**
 * Цена в рублях. Принимает и «220», и «220,50», и «1 500» — люди пишут
 * по-разному, и отвергать запятую как десятичный разделитель было бы
 * издевательством в русском интерфейсе.
 */
export function takePrice(formData: FormData, name: string, errors: FieldErrors): number {
  const value = raw(formData, name).replace(/\s/g, '').replace(',', '.')

  if (!value) {
    errors[name] = 'Укажите цену'
    return 0
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    errors[name] = 'Цена должна быть числом'
    return 0
  }
  if (parsed < 0) {
    errors[name] = 'Цена не может быть отрицательной'
    return 0
  }
  if (parsed > 99_999_999.99) {
    errors[name] = 'Слишком большая цена'
    return 0
  }

  // numeric(10,2) в базе: округляем сами, иначе Postgres сделает это молча.
  return Math.round(parsed * 100) / 100
}

export function takeBoolean(formData: FormData, name: string): boolean {
  // Невыставленный чекбокс не приходит в FormData вообще.
  return formData.get(name) !== null
}

export function takeInteger(
  formData: FormData,
  name: string,
  errors: FieldErrors,
  options: { label: string; fallback?: number },
): number {
  const value = raw(formData, name)
  if (!value) return options.fallback ?? 0

  const parsed = Number(value)
  if (!Number.isInteger(parsed)) {
    errors[name] = `${options.label}: нужно целое число`
    return options.fallback ?? 0
  }
  return parsed
}

/**
 * Значение из <input type="datetime-local"> в ISO-строку.
 * Пустое поле — это null, а не ошибка: даты у акций необязательные.
 */
export function takeDateTime(
  formData: FormData,
  name: string,
  errors: FieldErrors,
  options: { label: string },
): string | null {
  const value = raw(formData, name)
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    errors[name] = `${options.label}: непонятная дата`
    return null
  }
  return date.toISOString()
}

export function takeHexColor(
  formData: FormData,
  name: string,
  errors: FieldErrors,
  fallback: string,
): string {
  const value = raw(formData, name)
  if (!value) return fallback

  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    errors[name] = 'Цвет должен быть в формате #RRGGBB'
    return fallback
  }
  return value.toLowerCase()
}

/**
 * Необязательный адрес ссылки. Пускаем только http и https: значения вида
 * javascript:… попадают потом в href на публичном сайте.
 */
export function takeUrl(
  formData: FormData,
  name: string,
  errors: FieldErrors,
  options: { label: string },
): string | null {
  const value = raw(formData, name)
  if (!value) return null

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    errors[name] = `${options.label}: нужен полный адрес, начиная с https://`
    return null
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    errors[name] = `${options.label}: допустимы только ссылки http и https`
    return null
  }
  return parsed.toString()
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0
}
