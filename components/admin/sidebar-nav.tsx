'use client'

import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/admin', label: 'Обзор' },
  { href: '/admin/menu', label: 'Меню' },
  { href: '/admin/promotions', label: 'Акции' },
  { href: '/admin/news', label: 'Новости' },
  { href: '/admin/settings', label: 'Настройки' },
  { href: '/admin/account', label: 'Учётная запись' },
] as const

/**
 * Содержимое пункта меню.
 *
 * Вынесено в отдельный компонент не для порядка: useLinkStatus читает
 * состояние ближайшей ссылки выше по дереву и обязан вызываться ВНУТРИ
 * <Link>, а не рядом с ним.
 *
 * Пункт подсвечивается сразу по клику, не дожидаясь ответа сервера. Страницы
 * админки динамические — каждый переход это поход в базу, и без такой
 * подсветки экран на полсекунды замирает, а клик выглядит непрошедшим.
 */
function NavItem({ label, active }: { label: string; active: boolean }) {
  const { pending } = useLinkStatus()
  const selected = active || pending

  return (
    <span
      className={`relative block rounded-lg px-3 py-2 text-sm transition-colors ${
        selected
          ? 'bg-white font-medium text-[var(--foreground)] shadow-[0_1px_2px_rgba(28,25,23,0.06)]'
          : 'text-[var(--muted)] group-hover:bg-white/60 group-hover:text-[var(--foreground)]'
      }`}
    >
      {/* Засечка у активного пункта: на узкой полосе она читается быстрее,
          чем разница в фоне. */}
      {selected ? (
        <span
          aria-hidden
          className="absolute top-1.5 bottom-1.5 -left-1 hidden w-0.5 rounded-full bg-[var(--foreground)] md:block"
        />
      ) : null}

      {label}

      {/* Точка проявляется с задержкой: если переход уложился в 150 мс,
          мигать нечему. Стили — в globals.css, анимация на классе. */}
      {pending ? <span aria-hidden className="nav-pending" /> : null}
    </span>
  )
}

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:flex-col md:overflow-visible md:pb-0">
      {LINKS.map(({ href, label }) => {
        // Обзор подсвечиваем только на точном совпадении, иначе он остался бы
        // активным на всех вложенных страницах админки.
        const active = href === '/admin' ? pathname === href : pathname.startsWith(href)

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className="group shrink-0"
          >
            <NavItem label={label} active={active} />
          </Link>
        )
      })}
    </nav>
  )
}
