import 'server-only'

import { headers } from 'next/headers'

/** Заголовок, которым proxy сообщает, что тенант определён по домену. */
export const HOST_MODE_HEADER = 'x-tenant-host-mode'

/**
 * Префикс для внутренних ссылок публичного сайта.
 *
 * Один и тот же сайт открывается двумя способами:
 *   flora.домен.рф/menu     → proxy переписал на /flora/menu, но в адресной
 *                             строке слага нет, значит ссылки — просто /menu
 *   домен.рф/flora/menu     → слаг в адресе есть, ссылки должны его сохранять
 *
 * Если перепутать, ссылки на своём домене клиента поедут на
 * flora-cafe.ru/flora/menu — то есть в никуда.
 *
 * Звать только из некешируемого кода: headers() — данные запроса, внутри
 * 'use cache' они недоступны.
 */
export async function getBasePath(slug: string): Promise<string> {
  const headerList = await headers()
  return headerList.get(HOST_MODE_HEADER) === '1' ? '' : `/${slug}`
}
