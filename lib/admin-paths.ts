/**
 * Какие страницы админки открыты без сессии.
 *
 * Вынесено в отдельный модуль и покрыто тестами не из аккуратности: ошибка
 * здесь означает открытую настежь админку, и заметить её глазами в условии
 * внутри proxy тяжело. Список исчерпывающий — всё, чего в нём нет, требует
 * входа.
 *
 * Модуль без зависимостей — прогоняется тестами (npm run test:lib).
 */

/** Страницы входа и восстановления пароля. Залогиненного отсюда уводим. */
const PUBLIC_PAGES = new Set(['/admin/login', '/admin/forgot'])

/**
 * Ссылка из письма о смене пароля.
 *
 * Особая: она обязана работать И без сессии (человек ещё не вошёл), И с
 * сессией (вошёл на другом устройстве). Поэтому не редиректим её никогда —
 * иначе восстановление пароля не сработает ровно у тех, кто уже залогинен.
 */
const AUTH_CALLBACK = '/admin/auth/callback'

export function isPublicAdminPage(pathname: string): boolean {
  return PUBLIC_PAGES.has(pathname)
}

export function isAuthCallback(pathname: string): boolean {
  return pathname === AUTH_CALLBACK
}

/** Нужен ли вход, чтобы открыть этот адрес. */
export function requiresSession(pathname: string): boolean {
  return !isPublicAdminPage(pathname) && !isAuthCallback(pathname)
}
