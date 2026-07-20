import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { HomeSkeleton } from '@/components/public/skeletons'
import { formatDate, formatPrice } from '@/lib/format'
import { getActivePromotions, getMenu, getNewsList, getSiteSettings } from '@/lib/public-data'
import { getBasePath } from '@/lib/base-path'
import { resolveTenant } from '@/lib/tenant'

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

async function HomeContent({ params }: { params: Params }) {
  const { tenant: slug } = await params

  const tenant = await resolveTenant(slug)
  if (!tenant) notFound()

  const [settings, promotions, menu, news, base] = await Promise.all([
    getSiteSettings(tenant.id),
    getActivePromotions(tenant.id),
    getMenu(tenant.id),
    getNewsList(tenant.id, 3),
    getBasePath(tenant.slug),
  ])
  const previewItems = menu.items.slice(0, 6)

  return (
    <>
      <section className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
        <h1 className="text-4xl font-semibold sm:text-5xl">{tenant.name}</h1>
        {settings?.about ? (
          <p className="mt-4 max-w-2xl text-lg opacity-70">{settings.about}</p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`${base}/menu`}
            className="rounded-lg px-5 py-3 font-medium text-white transition hover:opacity-90"
            style={{ background: 'var(--brand)' }}
          >
            Смотреть меню
          </Link>
          {settings?.phone ? (
            <a
              href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}
              className="rounded-lg border border-black/12 px-5 py-3 font-medium transition hover:bg-black/4"
            >
              Позвонить
            </a>
          ) : null}
        </div>

        {settings?.working_hours || settings?.address ? (
          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-3 text-sm">
            {settings?.working_hours ? (
              <div>
                <dt className="opacity-60">Часы работы</dt>
                <dd className="mt-0.5 font-medium">{settings.working_hours}</dd>
              </div>
            ) : null}
            {settings?.address ? (
              <div>
                <dt className="opacity-60">Адрес</dt>
                <dd className="mt-0.5 font-medium">{settings.address}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </section>

      {promotions.length > 0 ? (
        <section className="mx-auto max-w-5xl px-5 py-10">
          <h2 className="text-2xl font-semibold">Сейчас действует</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {promotions.map((promo) => (
              <article
                key={promo.id}
                className="overflow-hidden rounded-2xl border border-black/8"
              >
                {promo.image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- картинка
                     произвольного размера из Storage */
                  <img
                    src={promo.image_url}
                    alt=""
                    className="h-40 w-full object-cover"
                  />
                ) : null}
                <div className="p-5">
                  <h3 className="font-medium">{promo.title}</h3>
                  {promo.description ? (
                    <p className="mt-1.5 text-sm opacity-70">{promo.description}</p>
                  ) : null}
                  {promo.ends_at ? (
                    <p className="mt-3 text-xs opacity-60">до {formatDate(promo.ends_at)}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {previewItems.length > 0 ? (
        <section className="mx-auto max-w-5xl px-5 py-10">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold">Из меню</h2>
            <Link
              href={`${base}/menu`}
              className="text-sm underline underline-offset-2 opacity-70 hover:opacity-100"
            >
              Всё меню
            </Link>
          </div>

          <ul className="mt-6 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {previewItems.map((item) => (
              <li
                key={item.id}
                className="flex items-baseline justify-between gap-4 border-b border-dashed border-black/12 pb-3"
              >
                <span>{item.name}</span>
                <span className="shrink-0 tabular-nums opacity-70">
                  {formatPrice(item.price)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {news.length > 0 ? (
        <section className="mx-auto max-w-5xl px-5 py-10">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold">Новости</h2>
            <Link
              href={`${base}/news`}
              className="text-sm underline underline-offset-2 opacity-70 hover:opacity-100"
            >
              Все новости
            </Link>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {news.map((item) => (
              <Link
                key={item.id}
                href={`${base}/news/${item.slug}`}
                className="group block"
              >
                {item.cover_image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- обложка
                     произвольного размера из Storage */
                  <img
                    src={item.cover_image_url}
                    alt=""
                    className="mb-3 h-36 w-full rounded-xl object-cover"
                  />
                ) : null}
                <h3 className="font-medium group-hover:underline">{item.title}</h3>
                {item.published_at ? (
                  <p className="mt-1 text-xs opacity-60">{formatDate(item.published_at)}</p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}
