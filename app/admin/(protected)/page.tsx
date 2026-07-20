import Link from 'next/link'

import { getCurrentTenant } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Дашборд — панель управления' }

async function counts() {
  const supabase = await createClient()

  // Фильтр по tenant_id не нужен: RLS сам отдаёт только строки своего тенанта.
  // head: true — считаем строки, не вытаскивая их.
  const [menu, promotions, news] = await Promise.all([
    supabase.from('menu_items').select('id', { count: 'exact', head: true }),
    supabase.from('promotions').select('id', { count: 'exact', head: true }),
    supabase.from('news').select('id', { count: 'exact', head: true }),
  ])

  return {
    menu: menu.count ?? 0,
    promotions: promotions.count ?? 0,
    news: news.count ?? 0,
  }
}

function Card({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-[var(--border)] bg-white p-5 transition hover:border-[var(--accent)]"
    >
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
    </Link>
  )
}

export default async function DashboardPage() {
  // Тенант уже проверен в layout; здесь cache() отдаёт его без нового запроса.
  const tenant = await getCurrentTenant()
  const { menu, promotions, news } = await counts()

  return (
    <>
      <h1 className="text-2xl font-semibold">{tenant?.name}</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Всё, что вы здесь измените, сразу окажется на сайте заведения.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card label="Позиций в меню" value={menu} href="/admin/menu" />
        <Card label="Акций" value={promotions} href="/admin/promotions" />
        <Card label="Новостей" value={news} href="/admin/news" />
      </div>

      <div className="mt-8 rounded-xl border border-[var(--border)] bg-white p-5">
        <h2 className="font-medium">Адрес сайта</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          По этой ссылке заведение видят посетители. Хотите свой домен — напишите нам,
          подключим.
        </p>
        <Link
          href={`/${tenant?.slug}`}
          target="_blank"
          className="mt-3 inline-block text-sm text-[var(--accent)] underline-offset-2 hover:underline"
        >
          /{tenant?.slug}
        </Link>
      </div>
    </>
  )
}
