import Link from 'next/link'

import type { PublicTenant } from '@/lib/tenant'
import type { Row } from '@/lib/types'

type Settings = Row<'site_settings'> | null

const SOCIAL_LABELS: Record<string, string> = {
  telegram: 'Telegram',
  vk: 'ВКонтакте',
  whatsapp: 'WhatsApp',
}

export function SiteHeader({
  tenant,
  settings,
  basePath,
}: {
  tenant: PublicTenant
  settings: Settings
  basePath: string
}) {
  const nav = [
    { href: basePath || '/', label: 'Главная' },
    { href: `${basePath}/menu`, label: 'Меню' },
    { href: `${basePath}/news`, label: 'Новости' },
  ]

  // Тег <header> и рамку рисует лейаут — они часть статической оболочки,
  // которая отдаётся до того, как приедут эти данные.
  return (
    <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-4">
      <Link href={basePath || '/'} className="flex items-center gap-3">
        {settings?.logo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element -- логотип
             произвольного размера из Storage; на клиентском сайте важнее
             отсутствие лишней обработки, чем оптимизация одной картинки */
          <img src={settings.logo_url} alt="" className="h-9 w-auto object-contain" />
        ) : null}
        <span className="text-lg font-semibold">{tenant.name}</span>
      </Link>

      <nav className="flex gap-5 text-sm">
        {nav.map((link) => (
          <Link key={link.href} href={link.href} className="hover:opacity-70">
            {link.label}
          </Link>
        ))}
      </nav>

      {settings?.phone ? (
        <a
          href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}
          className="text-sm font-medium hover:opacity-70"
        >
          {settings.phone}
        </a>
      ) : null}
    </div>
  )
}

export function SiteFooter({
  tenant,
  settings,
}: {
  tenant: PublicTenant
  settings: Settings
}) {
  const socials = Object.entries(settings?.socials ?? {}).filter(([, url]) => Boolean(url))

  return (
    <footer className="mt-16 border-t border-black/8 bg-black/2">
      <div className="mx-auto grid max-w-5xl gap-6 px-5 py-10 sm:grid-cols-3">
        <div>
          <p className="font-semibold">{tenant.name}</p>
          {settings?.address ? (
            <p className="mt-1.5 text-sm opacity-70">{settings.address}</p>
          ) : null}
          {settings?.yandex_map_url ? (
            <a
              href={settings.yandex_map_url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1.5 inline-block text-sm underline underline-offset-2 opacity-70 hover:opacity-100"
            >
              Показать на карте
            </a>
          ) : null}
        </div>

        <div>
          {settings?.working_hours ? (
            <>
              <p className="text-sm font-medium">Часы работы</p>
              <p className="mt-1.5 text-sm opacity-70">{settings.working_hours}</p>
            </>
          ) : null}
          {settings?.phone ? (
            <a
              href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}
              className="mt-3 inline-block text-sm opacity-70 hover:opacity-100"
            >
              {settings.phone}
            </a>
          ) : null}
        </div>

        {socials.length > 0 ? (
          <div>
            <p className="text-sm font-medium">Мы в сети</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {socials.map(([key, url]) => (
                <li key={key}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm underline underline-offset-2 opacity-70 hover:opacity-100"
                  >
                    {SOCIAL_LABELS[key] ?? key}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </footer>
  )
}
