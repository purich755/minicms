/**
 * Превращение русского заголовка в адрес страницы.
 *
 * Модуль намеренно без зависимостей и без обращений к БД — так его можно
 * прогнать тестами (npm run test:lib).
 *
 * Результат обязан проходить ограничение из миграции:
 *   news_slug_format: ^[a-z0-9][a-z0-9-]{0,127}$
 */

const RU_TO_LAT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
  я: 'ya',
}

export const SLUG_MAX_LENGTH = 128

/**
 * Пустая строка на выходе означает, что осмысленного адреса не получилось
 * (например, заголовок состоял из одних символов). Вызывающий код должен
 * это обработать, а не подставлять пустоту в базу.
 */
export function slugify(input: string): string {
  const lowered = input.toLowerCase().trim()

  let out = ''
  for (const char of lowered) {
    if (char in RU_TO_LAT) {
      out += RU_TO_LAT[char]
    } else if (/[a-z0-9]/.test(char)) {
      out += char
    } else {
      // Любой прочий символ — разделитель. Схлопнем ниже.
      out += '-'
    }
  }

  out = out
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, SLUG_MAX_LENGTH)
    // Обрезка по длине могла оставить дефис на конце.
    .replace(/-+$/, '')

  // Ограничение в БД требует, чтобы первым шёл символ или цифра.
  if (out && !/^[a-z0-9]/.test(out)) return ''

  return out
}

/** Проходит ли строка ограничение news_slug_format из миграции. */
export function isValidSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,127}$/.test(value)
}
