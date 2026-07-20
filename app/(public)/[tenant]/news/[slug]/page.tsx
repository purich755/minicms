import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PageSkeleton } from '@/components/public/skeletons'
import { getBasePath } from '@/lib/base-path'
import { formatDate } from '@/lib/format'
import { getNewsItem } from '@/lib/public-data'
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
      locale: 'ru_RU',
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
    <article className="mx-auto max-w-2xl px-5 py-16 sm:px-8 sm:py-20">
      <Link
        href={`${base}/news`}
        className="group inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-900"
      >
        <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
        Все новости
      </Link>

      <header className="mt-8">
        {item.published_at ? (
          <p className="text-xs tracking-[0.14em] text-stone-500 uppercase">
            {formatDate(item.published_at)}
          </p>
        ) : null}
        <h1 className="display mt-3 text-[clamp(2rem,6vw,3.25rem)]">{item.title}</h1>
      </header>

      {item.cover_image_url ? (
        /* eslint-disable-next-line @next/next/no-img-element -- обложка
           произвольного размера из Storage */
        <img
          src={item.cover_image_url}
          alt=""
          className="mt-10 w-full rounded-2xl object-cover"
        />
      ) : null}

      {item.body ? (
        // Ширина колонки ограничена: длинную строку глаз теряет при переносе.
        <div className="mt-10 flex max-w-prose flex-col gap-5 text-lg leading-relaxed text-stone-800">
          {/* Текст вводят обычным полем, без разметки: разбиваем по пустым
              строкам на абзацы. Никакого dangerouslySetInnerHTML — иначе
              владелец сайта смог бы вставить скрипт себе на страницу. */}
          {item.body
            .split(/\n{2,}/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={index} className="text-pretty">
                {paragraph}
              </p>
            ))}
        </div>
      ) : null}

      <footer className="mt-14 border-t border-hairline pt-6">
        <Link
          href={`${base}/menu`}
          className="text-sm text-stone-600 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-900 hover:decoration-stone-900"
        >
          Посмотреть меню
        </Link>
      </footer>
    </article>
  )
}
