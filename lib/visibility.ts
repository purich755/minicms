/**
 * Видно ли содержимое обычному посетителю прямо сейчас.
 *
 * Настоящий фильтр — RLS-политики публичного чтения в Postgres, и они здесь ни
 * на что не влияют: посетителю скрытая строка просто не приедет. Эти функции
 * нужны в предпросмотре, где владелец читает свои данные под своей сессией и
 * видит всё подряд — включая то, что на сайт ещё не вышло. Их задача — честно
 * подписать такие карточки: «черновик», «не в наличии», «запланировано».
 *
 * Предикаты повторяют политики из 20260720120100_rls_policies.sql дословно.
 * Если меняешь политику — меняй и здесь, иначе предпросмотр начнёт врать:
 * покажет как скрытое то, что посетители уже видят, или наоборот.
 *
 * Модуль без зависимостей — прогоняется тестами (npm run test:lib).
 */

export type Hidden =
  | { hidden: false }
  | { hidden: true; reason: 'draft' | 'unavailable' | 'scheduled' | 'expired' | 'disabled' }

const VISIBLE: Hidden = { hidden: false }

/** Ярлык для карточки в предпросмотре. */
export const HIDDEN_LABEL: Record<Extract<Hidden, { hidden: true }>['reason'], string> = {
  draft: 'Черновик',
  unavailable: 'Нет в наличии',
  scheduled: 'Ещё не началась',
  expired: 'Закончилась',
  disabled: 'Выключена',
}

/**
 * Позиция меню. Политика: `is_available = true`.
 */
export function menuItemHidden(item: { is_available: boolean }): Hidden {
  return item.is_available ? VISIBLE : { hidden: true, reason: 'unavailable' }
}

/**
 * Акция. Политика: включена И попадает в окно дат.
 * Пустая дата начала — «уже идёт», пустая дата конца — «без срока».
 */
export function promotionHidden(
  promo: { is_active: boolean; starts_at: string | null; ends_at: string | null },
  now: Date = new Date(),
): Hidden {
  if (!promo.is_active) return { hidden: true, reason: 'disabled' }
  if (promo.starts_at && new Date(promo.starts_at) > now) {
    return { hidden: true, reason: 'scheduled' }
  }
  if (promo.ends_at && new Date(promo.ends_at) < now) {
    return { hidden: true, reason: 'expired' }
  }
  return VISIBLE
}

/**
 * Новость. Политика: опубликована И время публикации уже наступило.
 * Пустое published_at у опубликованной новости — «видна сразу».
 */
export function newsHidden(
  item: { is_published: boolean; published_at: string | null },
  now: Date = new Date(),
): Hidden {
  if (!item.is_published) return { hidden: true, reason: 'draft' }
  if (item.published_at && new Date(item.published_at) > now) {
    return { hidden: true, reason: 'scheduled' }
  }
  return VISIBLE
}
