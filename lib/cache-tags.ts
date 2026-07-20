/**
 * Имена тегов кеша — в одном месте.
 *
 * Публичные страницы помечают ими закешированные данные, админка после правки
 * сбрасывает их через updateTag. Если тег написать строкой в двух местах и
 * где-то опечататься, сброс молча перестанет работать: сайт будет показывать
 * старое, и никакой ошибки при этом не возникнет. Поэтому только отсюда.
 *
 * Модуль без зависимостей — прогоняется тестами (npm run test:lib).
 */

export const tags = {
  /** Сам тенант: имя, слаг, домен. Ключ — слаг, он же в адресе. */
  tenant: (slug: string) => `tenant:${slug}`,
  /** Настройки сайта: контакты, часы, соцсети, логотип. */
  settings: (tenantId: string) => `settings:${tenantId}`,
  /** Категории и позиции меню целиком. */
  menu: (tenantId: string) => `menu:${tenantId}`,
  /** Все акции тенанта. */
  promotions: (tenantId: string) => `promotions:${tenantId}`,
  /** Список новостей и каждая новость. */
  news: (tenantId: string) => `news:${tenantId}`,
} as const

/** Всё, что зависит от контента тенанта. Для правок, задевающих сразу многое. */
export function allContentTags(tenantId: string): string[] {
  return [
    tags.settings(tenantId),
    tags.menu(tenantId),
    tags.promotions(tenantId),
    tags.news(tenantId),
  ]
}
