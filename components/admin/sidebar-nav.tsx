'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/admin', label: 'Дашборд' },
  { href: '/admin/menu', label: 'Меню' },
  { href: '/admin/promotions', label: 'Акции' },
  { href: '/admin/news', label: 'Новости' },
  { href: '/admin/settings', label: 'Настройки' },
] as const

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {LINKS.map(({ href, label }) => {
        // Дашборд подсвечиваем только на точном совпадении, иначе он остался бы
        // активным на всех вложенных страницах админки.
        const active = href === '/admin' ? pathname === href : pathname.startsWith(href)

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm transition ${
              active
                ? 'bg-white font-medium text-[var(--foreground)] shadow-sm'
                : 'text-[var(--muted)] hover:bg-white/60 hover:text-[var(--foreground)]'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
