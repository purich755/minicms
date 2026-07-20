import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PageSkeleton } from '@/components/public/skeletons'
import { formatPrice } from '@/lib/format'
import { getMenu, type MenuItem } from '@/lib/public-data'
import { resolveTenant } from '@/lib/tenant'

export const metadata = { title: 'Меню' }

type Params = Promise<{ tenant: string }>

export default function MenuPage({ params }: { params: Params }) {
  // Не async и params не разворачивается: иначе статическая оболочка исчезнет
  // и страница целиком будет ждать ответа базы.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MenuContent params={params} />
    </Suspense>
  )
}

function ItemCard({ item }: { item: MenuItem }) {
  return (
    <li className="flex gap-4 border-b border-dashed border-black/12 pb-4">
      {item.image_url ? (
        /* eslint-disable-next-line @next/next/no-img-element -- фото произвольного
           размера из Storage */
        <img
          src={item.image_url}
          alt=""
          className="size-20 shrink-0 rounded-xl object-cover"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 items-baseline justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">{item.name}</p>
          {item.description ? (
            <p className="mt-1 text-sm opacity-70">{item.description}</p>
          ) : null}
        </div>
        <span className="shrink-0 tabular-nums">{formatPrice(item.price)}</span>
      </div>
    </li>
  )
}

async function MenuContent({ params }: { params: Params }) {
  const { tenant: slug } = await params

  const tenant = await resolveTenant(slug)
  if (!tenant) notFound()

  const { categories, items } = await getMenu(tenant.id)
  const uncategorized = items.filter((item) => item.category_id === null)

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-semibold">Меню</h1>

      {items.length === 0 ? (
        <p className="mt-6 opacity-70">Меню скоро появится.</p>
      ) : (
        <div className="mt-10 flex flex-col gap-12">
          {categories.map((category) => {
            const categoryItems = items.filter((item) => item.category_id === category.id)
            if (categoryItems.length === 0) return null

            return (
              <section key={category.id}>
                <h2
                  className="text-xl font-semibold"
                  style={{ color: 'var(--brand)' }}
                >
                  {category.name}
                </h2>
                <ul className="mt-5 flex flex-col gap-4">
                  {categoryItems.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            )
          })}

          {uncategorized.length > 0 ? (
            <section>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--brand)' }}>
                Ещё
              </h2>
              <ul className="mt-5 flex flex-col gap-4">
                {uncategorized.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
