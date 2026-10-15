/**
 * fetch для публичного сайта, который не заставляет гостя ждать мёртвую базу.
 *
 * Проблема, которую он решает, нашлась на настоящем простое Supabase. Сайт
 * отдавал «временно недоступен» только через 29 секунд. Причин две, и они
 * складываются:
 *
 * 1. postgrest-js сам повторяет упавший GET до трёх раз с паузами 1, 2 и 4 с.
 *    Отключить это для всего клиента нельзя — supabase-js не пробрасывает
 *    опцию, только `.retry(false)` на каждом запросе по отдельности.
 * 2. Страница читает базу несколькими запросами подряд (тенант, потом
 *    настройки, меню, акции), и каждый честно проходит все свои повторы.
 *
 * Поэтому два приёма.
 *
 * Сетевую ошибку превращаем в ответ 504 вместо исключения. Повторы в
 * postgrest-js срабатывают на исключение и на коды 503/520, а 504 он отдаёт
 * вызывающему коду сразу, как обычную ошибку.
 *
 * И запоминаем, что база лежит: следующие COOLDOWN_MS все запросы получают
 * тот же 504 мгновенно, не дожидаясь таймаута. Так весь простой обходится
 * гостю в один таймаут, а не в сумму по всем запросам страницы.
 *
 * Модуль без зависимостей — прогоняется тестами (npm run test:lib).
 */

export const COOLDOWN_MS = 30_000

export type FailFastFetch = typeof fetch & {
  /** Сколько миллисекунд ещё будем отвечать отказом не спрашивая сеть. */
  cooldownLeft(): number
}

export function createFailFastFetch(
  timeoutMs: number,
  base: typeof fetch = fetch,
  now: () => number = Date.now,
): FailFastFetch {
  let downUntil = 0

  const unavailable = (reason: string) =>
    new Response(JSON.stringify({ message: `База недоступна: ${reason}`, code: 'UNAVAILABLE' }), {
      status: 504,
      headers: { 'content-type': 'application/json' },
    })

  const wrapped = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (now() < downUntil) return unavailable('недавний сбой связи, ждём')

    try {
      return await base(input, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    } catch (error) {
      downUntil = now() + COOLDOWN_MS
      return unavailable(error instanceof Error ? error.message : String(error))
    }
  }) as FailFastFetch

  wrapped.cooldownLeft = () => Math.max(0, downUntil - now())

  return wrapped
}
