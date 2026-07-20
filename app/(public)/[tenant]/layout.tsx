import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { SiteFooter, SiteHeader } from '@/components/public/site-chrome'
import { HeaderSkeleton } from '@/components/public/skeletons'
import { getBasePath } from '@/lib/base-path'
import { getSiteSettings } from '@/lib/public-data'
import { resolveTenant } from '@/lib/tenant'

type Params = Promise<{ tenant: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { tenant: slug } = await params
  const tenant = await resolveTenant(slug)

  if (!tenant) return { title: 'Страница не найдена' }

  const settings = await getSiteSettings(tenant.id)

  return {
    title: { default: tenant.name, template: `%s — ${tenant.name}` },
    description: settings?.about ?? undefined,
    openGraph: {
      title: tenant.name,
      description: settings?.about ?? undefined,
      images: settings?.logo_url ? [settings.logo_url] : undefined,
      type: 'website',
      locale: 'ru_RU',
    },
  }
}

/**
 * Фирменный цвет приезжает из БД, то есть уже после статической оболочки.
 * Поэтому отдаём его отдельным <style>, а не инлайном на обёртке — иначе
 * обёртка стала бы динамической и утащила за собой всю страницу.
 *
 * Заодно считаем приглушённый вариант через color-mix: для подложек и
 * ховеров нужен тот же оттенок, но тише, а второй цвет в палитре завести
 * нельзя — он у каждого заведения свой.
 *
 * Значение прогоняем через регулярку, хотя в базе на него есть check-ограничение:
 * это строка, которая попадает прямо в CSS, и полагаться на одну проверку тут
 * не стоит.
 */
function BrandColor({ color }: { color: string | undefined }) {
  const safe = color && /^#[0-9a-f]{6}$/i.test(color) ? color : '#1c1917'
  return (
    <style>{`:root{--brand:${safe};--brand-wash:color-mix(in oklab,${safe} 8%,transparent);--brand-line:color-mix(in oklab,${safe} 22%,transparent)}`}</style>
  )
}

async function Header({ params }: { params: Params }) {
  const { tenant: slug } = await params
  const tenant = await resolveTenant(slug)
  if (!tenant) notFound()

  const [settings, basePath] = await Promise.all([
    getSiteSettings(tenant.id),
    getBasePath(tenant.slug),
  ])

  return (
    <>
      <BrandColor color={settings?.primary_color} />
      <SiteHeader tenant={tenant} settings={settings} basePath={basePath} />
    </>
  )
}

async function Footer({ params }: { params: Params }) {
  const { tenant: slug } = await params
  const tenant = await resolveTenant(slug)
  if (!tenant) return null

  const [settings, basePath] = await Promise.all([
    getSiteSettings(tenant.id),
    getBasePath(tenant.slug),
  ])

  return <SiteFooter tenant={tenant} settings={settings} basePath={basePath} />
}

export default function PublicSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Params
}) {
  // Функция намеренно НЕ async и params здесь не разворачивается: как только
  // лейаут дождётся данных запроса, статическая оболочка перестанет
  // существовать и вся страница будет ждать базу.
  return (
    <div className="grain flex min-h-screen flex-col bg-paper text-stone-900">
      <a href="#content" className="skip-link">
        К содержимому
      </a>

      <header className="sticky top-0 z-20 border-b border-hairline bg-paper/85 backdrop-blur-md">
        <Suspense fallback={<HeaderSkeleton />}>
          <Header params={params} />
        </Suspense>
      </header>

      <main id="content" className="flex-1">
        {children}
      </main>

      <Suspense fallback={null}>
        <Footer params={params} />
      </Suspense>
    </div>
  )
}
