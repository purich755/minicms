import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PageSkeleton } from '@/components/public/skeletons'
import { formatDate } from '@/lib/format'
import { getNewsItem } from '@/lib/public-data'
import { getBasePath } from '@/lib/base-path'
import { resolveTenant } from '@/lib/tenant'

type Params = { tenant: string; slug: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { tenant: tenantSlug, slug } = await params

  const tenant = await resolveTenant(tenantSlug)
  if (!tenant) return { title: 'Страница не найдена' }

  const item = await getNewsItem(tenant.id, slug)
  if (!item) return { title: 'Страница не найдена' }

  return {
    title: item.title,
    // Первые строки текста как описание — лучше, чем ничего.
    description: item.body?.slice(0, 160) ?? undefined,
    openGraph: {
      title: item.title,
      images: item.cover_image_url ? [item.cover_image_url] : undefined,
      type: 'article',
      publishedTime: item.published_at ?? undefined,
    },
  }
}

export default function NewsItemPage({ params }: { params: Promise<Params> }) {
  // Не async и params не разворачивается: иначе статическая оболочка исчезнет
  // и страница целиком будет ждать ответа базы.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewsItemContent params={params} />
    </Suspense>
  )
}

async function NewsItemContent({ params }: { params: Promise<Params> }) {
  const { tenant: tenantSlug, slug } = await params

  const tenant = await resolveTenant(tenantSlug)
  if (!tenant) notFound()

  // Черновик и отложенная новость сюда не приедут: их отсекает RLS-политика,
  // так что «не опубликовано» и «не существует» снаружи неразличимы.
  const [item, base] = await Promise.all([
    getNewsItem(tenant.id, slug),
    getBasePath(tenant.slug),
  ])
  if (!item) notFound()

  return (
    <article className="mx-auto max-w-2xl px-5 py-12">
      <Link
        href={`${base}/news`}
        className="text-sm underline underline-offset-2 opacity-60 hover:opacity-100"
      >
        ← Все новости
      </Link>

      <h1 className="mt-6 text-3xl font-semibold">{item.title}</h1>
      {item.published_at ? (
        <p className="mt-2 text-sm opacity-60">{formatDate(item.published_at)}</p>
      ) : null}

      {item.cover_image_url ? (
        /* eslint-disable-next-line @next/next/no-img-element -- обложка
           произвольного размера из Storage */
        <img
          src={item.cover_image_url}
          alt=""
          className="mt-8 w-full rounded-2xl object-cover"
        />
      ) : null}

      {item.body ? (
        <div className="mt-8 flex flex-col gap-4 leading-relaxed">
          {/* Текст вводят обычным полем, без разметки: разбиваем по пустым
              строкам на абзацы. Никакого dangerouslySetInnerHTML — иначе
              владелец сайта смог бы вставить скрипт себе на страницу. */}
          {item.body
            .split(/\n{2,}/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
        </div>
      ) : null}
    </article>
  )
}
