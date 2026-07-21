import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { IfHidden } from '@/components/public/hidden-badge'
import { HomeSkeleton } from '@/components/public/skeletons'
import { getBasePath } from '@/lib/base-path'
import { formatDate, formatPrice } from '@/lib/format'
import { isPreviewFor } from '@/lib/preview'
import {
  getSiteSettings,
  readMenu,
  readNewsList,
  readPromotions,
  type Promotion,
} from '@/lib/public-data'
import { resolveTenant } from '@/lib/tenant'
import { menuItemHidden, newsHidden, promotionHidden } from '@/lib/visibility'

type Params = Promise<{ tenant: string }>

export default function TenantHomePage({ params }: { params: Params }) {
  // Не async и params не разворачивается: иначе статическая оболочка исчезнет
  // и страница целиком будет ждать ответа базы.
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent params={params} />
    </Suspense>
  )
}

function SectionTitle({ children, href }: { children: string; href?: string }) {
  return (
    <div className="mb-8 flex items-baseline justify-between gap-4 border-b border-hairline pb-4">
      <h2 className="display text-2xl sm:text-3xl">{children}</h2>
      {href ? (
        <Link
          href={href}
          className="shrink-0 text-sm text-stone-600 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-900 hover:decoration-stone-900"
        >
          Смотреть все
        </Link>
      ) : null}
    </div>
  )
}

/** Крупная карточка первой акции: она и есть главное предложение. */
function LeadPromo({ promo, preview }: { promo: Promotion; preview: boolean }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-[var(--brand-wash)] ring-1 ring-[var(--brand-line)]">
      {promo.image_url ? (
        /* eslint-disable-next-line @next/next/no-img-element -- картинка
           произвольного размера из Storage */
        <img
          src={promo.image_url}
          alt={promo.title}
          className="h-56 w-full object-cover sm:h-64"
        />
      ) : null}
      <div className="flex flex-1 flex-col p-7">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="display text-2xl">{promo.title}</h3>
          <IfHidden preview={preview} of={promotionHidden(promo)} />
        </div>
        {promo.description ? (
          <p className="mt-3 max-w-prose text-stone-700">{promo.description}</p>
        ) : null}
        {promo.ends_at ? (
          <p className="mt-auto pt-5 text-sm text-stone-500">до {formatDate(promo.ends_at)}</p>
        ) : null}
      </div>
    </article>
  )
}

function SidePromo({ promo, preview }: { promo: Promotion; preview: boolean }) {
  return (
    <article className="rounded-xl border border-hairline p-5 transition-colors hover:border-[var(--brand-line)]">
      <div className="flex flex-wrap items-center gap-2.5">
        <h3 className="font-semibold">{promo.title}</h3>
        <IfHidden preview={preview} of={promotionHidden(promo)} />
      </div>
      {promo.description ? (
        <p className="mt-1.5 text-sm text-stone-600">{promo.description}</p>
      ) : null}
      {promo.ends_at ? (
        <p className="mt-3 text-xs text-stone-500">до {formatDate(promo.ends_at)}</p>
      ) : null}
    </article>
  )
}

async function HomeContent({ params }: { params: Params }) {
  const { tenant: slug } = await params

  const tenant = await resolveTenant(slug)
  if (!tenant) notFound()

  // Владелец в предпросмотре читает свои данные под своей сессией и видит всё,
  // включая неопубликованное. Обычному посетителю флаг всегда false, и всё
  // идёт по обычному кешируемому пути.
  const preview = await isPreviewFor(tenant.id)

  const [settings, promotions, menu, news, base] = await Promise.all([
    getSiteSettings(tenant.id),
    readPromotions(tenant.id, preview),
    readMenu(tenant.id, preview),
    readNewsList(tenant.id, preview, 4),
    getBasePath(tenant.slug),
  ])

  const [leadPromo, ...restPromos] = promotions
  const previewItems = menu.items.slice(0, 6)
  const [leadNews, ...restNews] = news

  return (
    <>
      {/* Герой. Заголовок уходит за пределы колонки текста — так он читается
          как вывеска, а не как ещё один абзац. */}
      <section className="mx-auto max-w-5xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24 sm:pb-28">
        <p className="text-xs tracking-[0.18em] text-stone-500 uppercase">
          {settings?.address ?? 'Заведение'}
        </p>

        <h1 className="display mt-5 text-[clamp(2.75rem,9vw,5.5rem)]">{tenant.name}</h1>

        {settings?.about ? (
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-stone-700 text-pretty">
            {settings.about}
          </p>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href={`${base}/menu`}
            className="rounded-xl bg-brand px-6 py-3.5 font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            Смотреть меню
          </Link>
          {settings?.phone ? (
            <a
              href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}
              className="rounded-xl border border-[var(--brand-line)] px-6 py-3.5 font-medium tabular-nums transition-colors hover:bg-[var(--brand-wash)]"
            >
              {settings.phone}
            </a>
          ) : null}
        </div>

        {settings?.working_hours ? (
          <p className="mt-8 text-sm text-stone-600">
            <span className="text-stone-400">Работаем</span> {settings.working_hours}
          </p>
        ) : null}
      </section>

      {leadPromo ? (
        <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
          <SectionTitle>Сейчас действует</SectionTitle>

          {/* Не три равные колонки: первое предложение крупное, остальные —
              компактным столбцом рядом. */}
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <LeadPromo promo={leadPromo} preview={preview} />
            </div>
            {restPromos.length > 0 ? (
              <div className="flex flex-col gap-4 lg:col-span-5">
                {restPromos.map((promo) => (
                  <SidePromo key={promo.id} promo={promo} preview={preview} />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {previewItems.length > 0 ? (
        <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
          <SectionTitle href={`${base}/menu`}>Из меню</SectionTitle>

          {/* Отточие между названием и ценой — как в печатном меню. */}
          <ul className="grid gap-x-14 gap-y-5 sm:grid-cols-2">
            {previewItems.map((item) => (
              <li key={item.id} className="flex items-baseline gap-3">
                <span className="shrink-0">{item.name}</span>
                <IfHidden preview={preview} of={menuItemHidden(item)} />
                <span
                  aria-hidden
                  className="min-w-6 flex-1 translate-y-[-0.3em] border-b border-dotted border-stone-300"
                />
                <span className="shrink-0 tabular-nums text-stone-600">
                  {formatPrice(item.price)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {leadNews ? (
        <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
          <SectionTitle href={`${base}/news`}>Новости</SectionTitle>

          <div className="grid gap-10 lg:grid-cols-12">
            <article className="lg:col-span-7">
              <Link href={`${base}/news/${leadNews.slug}`} className="group block">
                {leadNews.cover_image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- обложка
                     произвольного размера из Storage */
                  <img
                    src={leadNews.cover_image_url}
                    alt=""
                    className="mb-5 h-64 w-full rounded-2xl object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                  />
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="display text-2xl transition-colors group-hover:text-brand">
                    {leadNews.title}
                  </h3>
                  <IfHidden preview={preview} of={newsHidden(leadNews)} />
                </div>
                {leadNews.published_at ? (
                  <p className="mt-2 text-sm text-stone-500">
                    {formatDate(leadNews.published_at)}
                  </p>
                ) : null}
              </Link>
            </article>

            {restNews.length > 0 ? (
              <ul className="flex flex-col divide-y divide-hairline lg:col-span-5">
                {restNews.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`${base}/news/${item.slug}`}
                      className="group block py-4 first:pt-0"
                    >
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-medium transition-colors group-hover:text-brand">
                          {item.title}
                        </h3>
                        <IfHidden preview={preview} of={newsHidden(item)} />
                      </div>
                      {item.published_at ? (
                        <p className="mt-1 text-sm text-stone-500">
                          {formatDate(item.published_at)}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  )
}
