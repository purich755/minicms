/**
 * Работа с картинками в Supabase Storage.
 *
 * Модуль без зависимостей и без обращений к сети — прогоняется тестами
 * (npm run test:lib).
 */

export const MEDIA_BUCKET = 'tenant-media'

/** Должно совпадать с file_size_limit бакета из миграции 20260720120200. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** Должно совпадать с allowed_mime_types бакета. SVG не разрешён намеренно. */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

export type MediaFolder = 'menu' | 'news' | 'promotions' | 'site'

/**
 * Путь файла внутри бакета: {tenant_id}/{папка}/{случайное имя}.{ext}
 *
 * Первый сегмент обязан быть id тенанта — на этом держится политика записи
 * в Storage. Имя файла берём случайное, а не пользовательское: иначе в путь
 * приедут пробелы, кириллица и попытки выйти в чужую папку через «../».
 *
 * Расширение выводим из mime-типа, а не из имени файла: имя присылает браузер,
 * и доверять ему нечего.
 */
export function buildMediaPath(tenantId: string, folder: MediaFolder, mimeType: string): string {
  const extension = EXTENSION_BY_TYPE[mimeType]
  if (!extension) {
    throw new Error(`Неподдерживаемый тип файла: ${mimeType}`)
  }
  return `${tenantId}/${folder}/${crypto.randomUUID()}.${extension}`
}

/** Понятная причина отказа или null, если файл подходит. */
export function validateImage(file: { type: string; size: number }): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Подойдёт JPG, PNG, WebP или AVIF.'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    return `Файл слишком большой (${mb} МБ). Максимум 5 МБ.`
  }
  return null
}

/**
 * Обратная операция: из публичной ссылки достаём путь внутри бакета.
 *
 * Нужна, чтобы удалять старую картинку при замене и при удалении записи —
 * иначе бесплатный гигабайт хранилища заполнится мусором, который ниоткуда
 * не виден.
 *
 * Возвращает null, если ссылка не наша: чужой адрес удалять нечего.
 */
export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null

  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`
  const index = url.indexOf(marker)
  if (index === -1) return null

  const path = url.slice(index + marker.length).split('?')[0]
  return path ? decodeURIComponent(path) : null
}
