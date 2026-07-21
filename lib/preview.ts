import 'server-only'

import { draftMode } from 'next/headers'

import { getCurrentTenant } from './auth'
import { getMenuDraft, getNewsListDraft, getPromotionsDraft } from './public-data'
import { menuItemHidden, newsHidden, promotionHidden } from './visibility'

/**
 * Предпросмотр: владелец смотрит свой сайт вместе с неопубликованным.
 *
 * Двух проверок мало по отдельности, поэтому здесь обе.
 *
 * 1. Режим черновика Next (`draftMode`). Его признак — cookie со значением,
 *    которое генерируется на каждой сборке и не угадывается. Пока он включён,
 *    Next не сохраняет в кеш ничего: черновик не может осесть в кеше и уехать
 *    случайному посетителю.
 *
 * 2. Совпадение тенанта. И вот это — главное. Cookie черновика на весь деплой
 *    ОДНА: включив предпросмотр у себя, владелец «Флоры» получил бы её и для
 *    сайта «Зари». Поэтому мало знать, что режим включён, — надо убедиться,
 *    что смотрят именно свой сайт.
 *
 * Не сошлось — возвращаем false, и страница честно собирается из публичных
 * данных. Никакой ошибки: чужой человек с этой cookie просто увидит обычный
 * сайт.
 *
 * Порядок проверок важен для скорости: draftMode() — это чтение cookie, а
 * getCurrentTenant() — поход в базу. Для обычного посетителя всё
 * заканчивается на первой строке.
 */
export async function isPreviewFor(tenantId: string): Promise<boolean> {
  const { isEnabled } = await draftMode()
  if (!isEnabled) return false

  const tenant = await getCurrentTenant()
  return tenant?.id === tenantId
}

/**
 * Сколько всего на сайте спрятано от посетителей — для плашки предпросмотра.
 *
 * Считаем по всему сайту, а не по открытой странице: владелец должен видеть,
 * что у него ещё лежит неопубликованным, даже стоя на главной.
 *
 * Три запроса выглядят расточительно, но их же делают и сами страницы, а
 * черновиковые чтения обёрнуты в React cache() — в пределах одного рендера
 * база спрашивается один раз. Звать только когда предпросмотр включён.
 */
export async function countHidden(tenantId: string): Promise<number> {
  const [menu, promotions, news] = await Promise.all([
    getMenuDraft(tenantId),
    getPromotionsDraft(tenantId),
    getNewsListDraft(tenantId),
  ])

  const now = new Date()

  return (
    menu.items.filter((item) => menuItemHidden(item).hidden).length +
    promotions.filter((promo) => promotionHidden(promo, now).hidden).length +
    news.filter((item) => newsHidden(item, now).hidden).length
  )
}
