import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PageSkeleton } from '@/components/public/skeletons'
import { getBasePath } from '@/lib/base-path'
import { formatDate } from '@/lib/format'
import { getNewsList } from '@/lib/public-data'
import { resolveTenant } from '@/lib/tenant'

export const metadata = { title: 'Новости' }

type Params = Promise<{ tenant: string }>

export default function NewsPage({ params }: { params: Params }) {
  // Не async и params не разворачивается: иначе статическая оболочка исчезнет
  // и страница целиком будет ждать ответа базы.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewsContent params={params} />
    </Suspense>
  )
}

async function NewsContent({ params }: { params: Params }) {
  const { tenant: slug } = await params

  const tenant = await resolveTenant(slug)
  if (!tenant) notFound()

  const [news, base] = await Promise.all([getNewsList(tenant.id), getBasePath(tenant.slug)])

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
      <h1 className="display text-[clamp(2.5rem,7vw,4rem)]">Новости</h1>

      {news.length === 0 ? (
        <p className="mt-8 text-stone-600">Пока новостей нет.</p>
      ) : (
        <div className="mt-12 divide-y divide-hairline">
          {news.map((item) => (
            <article key={item.id}>
              {/* Вся карточка — одна ссылка: попасть в неё легче, чем в
                  заголовок, особенно пальцем на телефоне. */}
              <Link href={`${base}/news/${item.slug}`} className="group flex gap-6 py-7">
                {item.cover_image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- обложка
                     произвольного размера из Storage */
                  <img
                    src={item.cover_image_url}
                    alt=""
                    className="size-28 shrink-0 rounded-xl object-cover sm:size-36"
                  />
                ) : null}

                <div className="min-w-0 flex-1">
                  {item.published_at ? (
                    <p className="text-xs tracking-[0.14em] text-stone-500 uppercase">
                      {formatDate(item.published_at)}
                    </p>
                  ) : null}
                  <h2 className="display mt-2 text-xl transition-colors group-hover:text-brand sm:text-2xl">
                    {item.title}
                  </h2>
                  <span className="mt-3 inline-block text-sm text-stone-500 transition-transform duration-200 group-hover:translate-x-1">
                    Читать →
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
