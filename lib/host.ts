/**
 * Разбор адреса, по которому пришёл посетитель.
 *
 * Без зависимостей и без обращений к сети — прогоняется тестами
 * (npm run test:lib). Логика резолва тенанта по домену слишком легко ломается
 * молча, чтобы проверять её глазами.
 */

/** Корневой домен сервиса. Поддомены под ним считаются слагами тенантов. */
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? ''

/** Поддомены, которые тенанту принадлежать не могут. */
const RESERVED = new Set(['www', 'admin', 'api', 'app', 'static', 'assets'])

/** Отрезает порт и приводит к нижнему регистру: «Flora.RF:3000» → «flora.rf». */
export function normalizeHost(host: string | null | undefined): string {
  if (!host) return ''
  return host.trim().toLowerCase().split(':')[0]
}

/**
 * Слаг тенанта из поддомена, если адрес — поддомен корневого домена.
 *
 * flora.example.ru при rootDomain=example.ru  → 'flora'
 * example.ru                                   → null (это сам сервис)
 * www.example.ru                               → null (зарезервировано)
 * flora-cafe.ru                                → null (это свой домен клиента,
 *                                                      его ищем в БД по custom_domain)
 */
export function subdomainSlug(host: string, rootDomain: string): string | null {
  const cleanHost = normalizeHost(host)
  const cleanRoot = normalizeHost(rootDomain)

  if (!cleanHost || !cleanRoot) return null
  if (cleanHost === cleanRoot) return null
  if (!cleanHost.endsWith(`.${cleanRoot}`)) return null

  const label = cleanHost.slice(0, -(cleanRoot.length + 1))

  // Многоуровневые поддомены (a.b.example.ru) тенантами не считаем.
  if (label.includes('.')) return null
  if (RESERVED.has(label)) return null
  // Тот же формат, что у ограничения tenants_slug_format в миграции.
  if (!/^[a-z][a-z0-9-]{1,62}$/.test(label)) return null

  return label
}

/**
 * Локальная ли это разработка. На localhost поддоменов нет, и тенант
 * определяется путём /slug — иначе локально ничего не открыть.
 */
export function isLocalHost(host: string): boolean {
  const clean = normalizeHost(host)
  return clean === 'localhost' || clean === '127.0.0.1' || clean.endsWith('.localhost')
}
