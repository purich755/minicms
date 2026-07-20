import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PageSkeleton } from '@/components/public/skeletons'
import { formatDate } from '@/lib/format'
import { getNewsList } from '@/lib/public-data'
import { getBasePath } from '@/lib/base-path'
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
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-semibold">Новости</h1>

      {news.length === 0 ? (
        <p className="mt-6 opacity-70">Пока новостей нет.</p>
      ) : (
        <div className="mt-10 flex flex-col gap-8">
          {news.map((item) => (
            <article key={item.id} className="flex gap-5 border-b border-black/8 pb-8">
              {item.cover_image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element -- обложка
                   произвольного размера из Storage */
                <img
                  src={item.cover_image_url}
                  alt=""
                  className="size-28 shrink-0 rounded-xl object-cover"
                />
              ) : null}

              <div className="min-w-0">
                <h2 className="text-lg font-medium">
                  <Link href={`${base}/news/${item.slug}`} className="hover:underline">
                    {item.title}
                  </Link>
                </h2>
                {item.published_at ? (
                  <p className="mt-1 text-sm opacity-60">{formatDate(item.published_at)}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
