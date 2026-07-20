import Link from 'next/link'

import type { PublicTenant } from '@/lib/tenant'
import type { Row } from '@/lib/types'

type Settings = Row<'site_settings'> | null

const SOCIAL_LABELS: Record<string, string> = {
  telegram: 'Telegram',
  vk: 'ВКонтакте',
  whatsapp: 'WhatsApp',
}

/** Телефон для tel:, без пробелов и скобок. */
function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`
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
    { href: `${basePath}/menu`, label: 'Меню' },
    { href: `${basePath}/news`, label: 'Новости' },
  ]

  // Тег <header> и рамку рисует лейаут — они часть статической оболочки,
  // которая отдаётся до того, как приедут эти данные.
  return (
    <div className="mx-auto flex max-w-5xl items-center gap-6 px-5 py-4 sm:px-8">
      <Link
        href={basePath || '/'}
        className="group flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80"
      >
        {settings?.logo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element -- логотип
             произвольного размера из Storage; на клиентском сайте важнее
             отсутствие лишней обработки, чем оптимизация одной картинки */
          <img
            src={settings.logo_url}
            alt=""
            className="h-8 w-auto shrink-0 object-contain"
          />
        ) : null}
        <span className="display truncate text-lg">{tenant.name}</span>
      </Link>

      <nav className="ml-auto flex items-center gap-1 text-sm">
        {nav.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg px-3 py-1.5 text-stone-600 transition-colors hover:bg-[var(--brand-wash)] hover:text-stone-900"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {settings?.phone ? (
        <a
          href={telHref(settings.phone)}
          className="hidden shrink-0 rounded-lg border border-[var(--brand-line)] px-3.5 py-1.5 text-sm font-medium tabular-nums transition-colors hover:bg-[var(--brand-wash)] sm:block"
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
  basePath,
}: {
  tenant: PublicTenant
  settings: Settings
  basePath: string
}) {
  const socials = Object.entries(settings?.socials ?? {}).filter(([, url]) => Boolean(url))

  return (
    <footer className="mt-24 border-t border-hairline">
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="display text-xl">{tenant.name}</p>
            {settings?.address ? (
              <p className="mt-3 text-sm text-stone-600">{settings.address}</p>
            ) : null}
            {settings?.yandex_map_url ? (
              <a
                href={settings.yandex_map_url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-block text-sm text-stone-600 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-900 hover:decoration-stone-900"
              >
                Показать на карте
              </a>
            ) : null}
          </div>

          <div>
            {settings?.working_hours ? (
              <>
                <p className="text-xs tracking-[0.14em] text-stone-500 uppercase">Часы</p>
                <p className="mt-2.5 text-sm text-stone-700">{settings.working_hours}</p>
              </>
            ) : null}
            {settings?.phone ? (
              <a
                href={telHref(settings.phone)}
                className="mt-4 inline-block text-sm tabular-nums text-stone-700 transition-colors hover:text-stone-900"
              >
                {settings.phone}
              </a>
            ) : null}
          </div>

          <div>
            <p className="text-xs tracking-[0.14em] text-stone-500 uppercase">Разделы</p>
            <ul className="mt-2.5 flex flex-col gap-1.5 text-sm">
              <li>
                <Link
                  href={`${basePath}/menu`}
                  className="text-stone-700 transition-colors hover:text-stone-900"
                >
                  Меню
                </Link>
              </li>
              <li>
                <Link
                  href={`${basePath}/news`}
                  className="text-stone-700 transition-colors hover:text-stone-900"
                >
                  Новости
                </Link>
              </li>
            </ul>

            {socials.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                {socials.map(([key, url]) => (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-stone-700 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-900 hover:decoration-stone-900"
                    >
                      {SOCIAL_LABELS[key] ?? key}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <p className="mt-12 border-t border-hairline pt-6 text-xs text-stone-500">
          © {new Date().getFullYear()} {tenant.name}
        </p>
      </div>
    </footer>
  )
}
