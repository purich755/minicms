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

function Item({ item }: { item: MenuItem }) {
  return (
    <li className="flex gap-5 py-5">
      {item.image_url ? (
        /* eslint-disable-next-line @next/next/no-img-element -- фото произвольного
           размера из Storage */
        <img
          src={item.image_url}
          alt={item.name}
          className="size-20 shrink-0 rounded-xl object-cover sm:size-24"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        {/* Название и цена связаны отточием — как в печатном меню, где взгляд
            должен доходить от блюда до цены без сползания на соседнюю строку. */}
        <div className="flex items-baseline gap-3">
          <h3 className="shrink-0 font-medium">{item.name}</h3>
          <span
            aria-hidden
            className="min-w-6 flex-1 translate-y-[-0.3em] border-b border-dotted border-stone-300"
          />
          <span className="shrink-0 tabular-nums">{formatPrice(item.price)}</span>
        </div>

        {item.description ? (
          <p className="mt-1.5 max-w-prose text-sm text-stone-600">{item.description}</p>
        ) : null}
      </div>
    </li>
  )
}

function Category({ name, items }: { name: string; items: MenuItem[] }) {
  if (items.length === 0) return null

  return (
    <section>
      {/* Заголовок категории липнет к верху при прокрутке: в длинном меню
          посетитель всегда видит, в каком он разделе. */}
      <h2 className="display sticky top-[4.25rem] z-10 -mx-5 bg-paper/90 px-5 py-3 text-xl text-brand backdrop-blur-sm sm:-mx-8 sm:px-8">
        {name}
      </h2>
      <ul className="divide-y divide-hairline">
        {items.map((item) => (
          <Item key={item.id} item={item} />
        ))}
      </ul>
    </section>
  )
}

async function MenuContent({ params }: { params: Params }) {
  const { tenant: slug } = await params

  const tenant = await resolveTenant(slug)
  if (!tenant) notFound()

  const { categories, items } = await getMenu(tenant.id)
  const uncategorized = items.filter((item) => item.category_id === null)

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
      <h1 className="display text-[clamp(2.5rem,7vw,4rem)]">Меню</h1>

      {items.length === 0 ? (
        <p className="mt-8 text-stone-600">Меню скоро появится.</p>
      ) : (
        <div className="mt-12 flex flex-col gap-14">
          {categories.map((category) => (
            <Category
              key={category.id}
              name={category.name}
              items={items.filter((item) => item.category_id === category.id)}
            />
          ))}

          {uncategorized.length > 0 ? <Category name="Ещё" items={uncategorized} /> : null}
        </div>
      )}
    </div>
  )
}
