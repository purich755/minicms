/**
 * Перевод ошибок Postgres на человеческий русский.
 *
 * База — последний рубеж защиты, и когда она срабатывает, наружу лезет текст
 * вида «insert or update on table violates foreign key constraint». Владельцу
 * кафе это ни о чём не говорит.
 */

type DbError = { code?: string; message?: string } | null

const DEFAULT_MESSAGES: Record<string, string> = {
  // foreign_key_violation
  '23503': 'Нельзя выполнить: на эту запись ссылаются другие данные.',
  // unique_violation
  '23505': 'Такое значение уже есть.',
  // check_violation
  '23514': 'Значение не прошло проверку.',
  // not_null_violation
  '23502': 'Не заполнено обязательное поле.',
  // insufficient_privilege — обычно это RLS: попытка тронуть чужого тенанта
  '42501': 'Нет доступа к этим данным.',
}

/**
 * @param overrides — сообщения под конкретную операцию. Например, при удалении
 * категории код 23503 значит «в категории ещё есть позиции», и это стоит
 * сказать прямо, а не общей фразой.
 */
export function dbErrorMessage(error: DbError, overrides: Record<string, string> = {}): string {
  if (!error) return 'Не удалось сохранить. Попробуйте ещё раз.'

  const code = error.code ?? ''
  return (
    overrides[code] ??
    DEFAULT_MESSAGES[code] ??
    'Не удалось сохранить. Попробуйте ещё раз.'
  )
}

/**
 * База не ответила или ответила ошибкой — в отличие от «такой записи нет».
 *
 * Разница принципиальная. Раньше обе ситуации превращались в null, и сбой
 * связи выглядел для гостя как «Страница не найдена»: заведение будто
 * закрылось. Хуже того, этот null ложился в кеш на час, и сайт продолжал
 * показывать 404 ещё долго после того, как база поднялась.
 *
 * Исключение изнутри 'use cache' в кеш не попадает — следующий запрос
 * сходит в базу заново. А снаружи его ловит error.tsx и честно пишет
 * «временно недоступен».
 */
export class DatabaseUnavailable extends Error {
  constructor(what: string, detail: string) {
    super(`База недоступна при чтении ${what}: ${detail}`)
    this.name = 'DatabaseUnavailable'
  }
}
