import { connection } from 'next/server'

import { createPublicClient } from '@/lib/supabase/public'

/**
 * Будильник для бесплатного Supabase.
 *
 * Бесплатный проект Supabase ставится на паузу после недели без запросов.
 * Так и случилось: демо-сайт простоял без гостей, проект уснул, и все сайты
 * клиентов разом начали отвечать «временно недоступен». Домен проекта при этом
 * просто перестаёт резолвиться — со стороны это выглядит как пропавший сервис.
 *
 * Vercel Cron дёргает этот адрес раз в сутки (vercel.json), а он делает один
 * дешёвый запрос в базу. Сутки с большим запасом укладываются в неделю.
 *
 * Защиты нет намеренно: ответ — один публичный слаг, который и так виден на
 * любом сайте, а дёрнуть адрес лишний раз безвредно.
 */
export async function GET() {
  // Без этого Next может собрать ответ один раз при сборке и больше в базу
  // не ходить — то есть будильник перестал бы будить.
  await connection()

  const started = Date.now()
  const { error } = await createPublicClient().from('tenants').select('slug').limit(1)

  if (error) {
    return Response.json(
      { ok: false, error: error.message },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    )
  }

  return Response.json(
    { ok: true, ms: Date.now() - started },
    { headers: { 'cache-control': 'no-store' } },
  )
}
