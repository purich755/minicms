import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LinkButton } from '@/components/ui/buttons'
import { Card, EmptyState, PageHeader } from '@/components/ui/form'
import { getCurrentTenant } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Акции — панель управления' }

/** Тот же расчёт, что в RLS-политике публичного чтения promotions. */
function statusOf(item: {
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
}): { label: string; tone: string } {
  if (!item.is_active) return { label: 'Выключена', tone: 'bg-[var(--surface)] text-[var(--muted)]' }

  const now = new Date()
  if (item.starts_at && new Date(item.starts_at) > now) {
    return { label: 'Ещё не началась', tone: 'bg-amber-50 text-amber-800' }
  }
  if (item.ends_at && new Date(item.ends_at) < now) {
    return { label: 'Завершилась', tone: 'bg-[var(--surface)] text-[var(--muted)]' }
  }
  return { label: 'Идёт', tone: 'bg-green-50 text-green-800' }
}

function period(starts: string | null, ends: string | null): string {
  if (!starts && !ends) return 'Без ограничения по датам'
  if (starts && ends) return `${formatDate(starts)} — ${formatDate(ends)}`
  if (starts) return `с ${formatDate(starts)}`
  return `до ${formatDate(ends)}`
}

export default async function PromotionsListPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) notFound()

  const supabase = await createClient()
  const { data: promotions } = await supabase
    .from('promotions')
    .select('id, title, is_active, starts_at, ends_at')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  return (
    <>
      <PageHeader
        title="Акции"
        action={
          <LinkButton href="/admin/promotions/new" variant="primary">
            Добавить акцию
          </LinkButton>
        }
      />

      {!promotions || promotions.length === 0 ? (
        <EmptyState
          title="Акций пока нет"
          hint="Скидка, комплимент к заказу, специальное предложение по будням."
        />
      ) : (
        <Card className="divide-y divide-[var(--border)]">
          {promotions.map((item) => {
            const status = statusOf(item)
            return (
              <Link
                key={item.id}
                href={`/admin/promotions/${item.id}`}
                className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-[var(--surface)]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {period(item.starts_at, item.ends_at)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${status.tone}`}>
                  {status.label}
                </span>
              </Link>
            )
          })}
        </Card>
      )}
    </>
  )
}
