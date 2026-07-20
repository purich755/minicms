import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LinkButton } from '@/components/ui/buttons'
import { Card, EmptyState, PageHeader } from '@/components/ui/form'
import { getCurrentTenant } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Новости — панель управления' }

export default async function NewsListPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) notFound()

  const supabase = await createClient()
  const { data: news } = await supabase
    .from('news')
    .select('id, title, slug, is_published, published_at')
    .eq('tenant_id', tenant.id)
    .order('published_at', { ascending: false, nullsFirst: true })
    .order('created_at', { ascending: false })

  return (
    <>
      <PageHeader
        title="Новости"
        action={
          <LinkButton href="/admin/news/new" variant="primary">
            Добавить новость
          </LinkButton>
        }
      />

      {!news || news.length === 0 ? (
        <EmptyState
          title="Новостей пока нет"
          hint="Расскажите об открытии, новом меню или изменении часов работы."
        />
      ) : (
        <Card className="divide-y divide-[var(--border)]">
          {news.map((item) => {
            const scheduled =
              item.is_published &&
              item.published_at !== null &&
              new Date(item.published_at) > new Date()

            return (
              <Link
                key={item.id}
                href={`/admin/news/${item.id}`}
                className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-[var(--surface)]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                    /{item.slug}
                    {item.published_at ? ` · ${formatDateTime(item.published_at)}` : ''}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
                    !item.is_published
                      ? 'bg-[var(--surface)] text-[var(--muted)]'
                      : scheduled
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-green-50 text-green-800'
                  }`}
                >
                  {!item.is_published ? 'Черновик' : scheduled ? 'Запланирована' : 'Опубликована'}
                </span>
              </Link>
            )
          })}
        </Card>
      )}
    </>
  )
}
