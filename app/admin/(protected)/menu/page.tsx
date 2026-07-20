import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LinkButton } from '@/components/ui/buttons'
import { Card, EmptyState, PageHeader } from '@/components/ui/form'
import { getCurrentTenant } from '@/lib/auth'
import { formatPrice, plural } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/types'

export const metadata = { title: 'Меню — панель управления' }

type Item = Pick<Row<'menu_items'>, 'id' | 'name' | 'price' | 'is_available' | 'category_id'>

function ItemRow({ item }: { item: Item }) {
  return (
    <Link
      href={`/admin/menu/items/${item.id}`}
      className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-[var(--surface)]"
    >
      <span className={`min-w-0 truncate ${item.is_available ? '' : 'text-[var(--muted)]'}`}>
        {item.name}
        {item.is_available ? null : (
          <span className="ml-2 rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs">
            нет в наличии
          </span>
        )}
      </span>
      <span className="shrink-0 tabular-nums">{formatPrice(item.price)}</span>
    </Link>
  )
}

export default async function MenuPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) notFound()

  const supabase = await createClient()

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('id, name, sort_order')
      .eq('tenant_id', tenant.id)
      .order('sort_order')
      .order('name'),
    supabase
      .from('menu_items')
      .select('id, name, price, is_available, category_id')
      .eq('tenant_id', tenant.id)
      .order('sort_order')
      .order('name'),
  ])

  const allItems = items ?? []
  const uncategorized = allItems.filter((item) => item.category_id === null)

  return (
    <>
      <PageHeader
        title="Меню"
        action={
          <div className="flex gap-3">
            <LinkButton href="/admin/menu/categories/new">Добавить категорию</LinkButton>
            <LinkButton href="/admin/menu/items/new" variant="primary">
              Добавить позицию
            </LinkButton>
          </div>
        }
      />

      {(!categories || categories.length === 0) && allItems.length === 0 ? (
        <EmptyState
          title="Меню пока пустое"
          hint="Начните с категории — «Кофе», «Завтраки», «Десерты», — а потом добавьте в неё позиции."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {(categories ?? []).map((category) => {
            const categoryItems = allItems.filter((item) => item.category_id === category.id)

            return (
              <Card key={category.id}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] p-4">
                  <div>
                    <h2 className="font-medium">{category.name}</h2>
                    <p className="text-xs text-[var(--muted)]">
                      {categoryItems.length}{' '}
                      {plural(categoryItems.length, 'позиция', 'позиции', 'позиций')}
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <Link
                      href={`/admin/menu/items/new?category=${category.id}`}
                      className="text-[var(--accent)] hover:underline"
                    >
                      Добавить позицию
                    </Link>
                    <Link
                      href={`/admin/menu/categories/${category.id}`}
                      className="text-[var(--muted)] hover:underline"
                    >
                      Изменить
                    </Link>
                  </div>
                </div>

                {categoryItems.length === 0 ? (
                  <p className="p-4 text-sm text-[var(--muted)]">В этой категории пока пусто.</p>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {categoryItems.map((item) => (
                      <ItemRow key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </Card>
            )
          })}

          {uncategorized.length > 0 ? (
            <Card>
              <div className="border-b border-[var(--border)] p-4">
                <h2 className="font-medium">Без категории</h2>
                <p className="text-xs text-[var(--muted)]">
                  На сайте такие позиции показываются отдельным блоком в конце.
                </p>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {uncategorized.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </>
  )
}
