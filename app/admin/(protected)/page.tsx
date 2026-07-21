import Link from 'next/link'

import { startPreview } from '@/app/admin/preview-actions'
import { getCurrentTenant } from '@/lib/auth'
import { plural } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Обзор — панель управления' }

async function counts() {
  const supabase = await createClient()

  // Фильтр по tenant_id не нужен: RLS сам отдаёт только строки своего тенанта.
  // head: true — считаем строки, не вытаскивая их.
  const [menu, promotions, news, categories, settings] = await Promise.all([
    supabase.from('menu_items').select('id', { count: 'exact', head: true }),
    supabase.from('promotions').select('id', { count: 'exact', head: true }),
    supabase.from('news').select('id', { count: 'exact', head: true }),
    supabase.from('menu_categories').select('id', { count: 'exact', head: true }),
    supabase.from('site_settings').select('phone, address, working_hours').maybeSingle(),
  ])

  return {
    menu: menu.count ?? 0,
    promotions: promotions.count ?? 0,
    news: news.count ?? 0,
    categories: categories.count ?? 0,
    // «Контакты заполнены» — это телефон и адрес. Часы работы желательны, но
    // без них сайт всё ещё выглядит живым, а без телефона — нет.
    hasContacts: Boolean(settings.data?.phone && settings.data?.address),
  }
}

/**
 * Что осталось сделать, пока сайт пустой.
 *
 * Показывается только новичку и исчезает сам, когда всё сделано. Смысл в
 * том, чтобы клиент запустился без звонка: пустая панель с пятью разделами
 * не подсказывает, с чего начать, и человек закрывает её до лучших времён.
 *
 * Порядок неслучаен: сначала контакты (сайт сразу перестаёт выглядеть
 * заготовкой), потом категория, потом позиции — иначе позицию некуда класть.
 */
function Onboarding({
  hasContacts,
  categories,
  menu,
}: {
  hasContacts: boolean
  categories: number
  menu: number
}) {
  const steps = [
    { done: hasContacts, label: 'Заполнить телефон и адрес', href: '/admin/settings' },
    { done: categories > 0, label: 'Завести категорию меню', href: '/admin/menu/categories/new' },
    { done: menu > 0, label: 'Добавить первые позиции', href: '/admin/menu/items/new' },
  ]

  if (steps.every((step) => step.done)) return null

  const left = steps.filter((step) => !step.done).length

  return (
    <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] p-5">
      <h2 className="font-medium">С чего начать</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Осталось {left} {plural(left, 'шаг', 'шага', 'шагов')}. Подсказка исчезнет, когда
        всё будет готово.
      </p>

      <ol className="mt-4 flex flex-col gap-1">
        {steps.map((step) => (
          <li key={step.href}>
            {step.done ? (
              <span className="flex items-center gap-3 px-2 py-2 text-sm text-[var(--muted)]">
                <span aria-hidden className="text-[var(--ok)]">
                  ✓
                </span>
                <span className="line-through">{step.label}</span>
              </span>
            ) : (
              <Link
                href={step.href}
                className="group flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-white"
              >
                <span
                  aria-hidden
                  className="size-4 shrink-0 rounded-full border border-[var(--muted)]/50"
                />
                <span className="font-medium">{step.label}</span>
                <span className="text-[var(--muted)] transition-transform duration-200 group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

function Stat({ value, label, href }: { value: number; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="group flex items-baseline gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--accent-soft)]"
    >
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-sm text-[var(--muted)] transition-colors group-hover:text-[var(--foreground)]">
        {label}
      </span>
    </Link>
  )
}

function QuickAction({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-[var(--border)] bg-white px-4 py-2.5 text-sm transition-colors hover:border-[var(--foreground)]"
    >
      {children}
    </Link>
  )
}

export default async function DashboardPage() {
  // Тенант уже проверен в layout; здесь cache() отдаёт его без нового запроса.
  const tenant = await getCurrentTenant()
  const { menu, promotions, news, categories, hasContacts } = await counts()

  return (
    <>
      <h1 className="text-2xl font-semibold">{tenant?.name}</h1>
      <p className="mt-1.5 text-[var(--muted)]">
        Всё, что вы здесь измените, окажется на сайте сразу.
      </p>

      {/* Выключенный сайт нельзя не заметить: иначе владелец будет править
          меню и не понимать, почему гости жалуются, что сайт не открывается. */}
      {tenant && !tenant.isActive ? (
        <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <span className="font-medium">Сайт сейчас выключен и гостям не открывается.</span>{' '}
          Ваши данные на месте, панель работает как обычно. Напишите нам, чтобы включить обратно.
        </p>
      ) : null}

      {/* Адрес сайта — главное на этой странице: именно его владелец
          отправляет гостям. Поэтому отдельным блоком, а не строкой в углу. */}
      <section className="mt-8 rounded-xl border border-[var(--border)] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
              Адрес сайта
            </p>
            <p className="mt-1.5 truncate font-medium">/{tenant?.slug}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            {/* Предпросмотр — это запись cookie, поэтому форма, а не ссылка. */}
            <form action={startPreview}>
              <input type="hidden" name="returnTo" value={`/${tenant?.slug}`} />
              <button
                type="submit"
                className="rounded-lg border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-medium transition-colors hover:border-[var(--foreground)]"
              >
                Предпросмотр
              </button>
            </form>

            <Link
              href={`/${tenant?.slug}`}
              target="_blank"
              className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              Открыть сайт
            </Link>
          </div>
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">
          «Открыть сайт» — то, что видят посетители. «Предпросмотр» — то же самое, но
          вместе с черновиками и выключенными акциями: видно только вам.
        </p>
      </section>

      <Onboarding hasContacts={hasContacts} categories={categories} menu={menu} />

      <section className="mt-6 rounded-xl border border-[var(--border)] bg-white p-2.5">
        {/* Не три одинаковые плитки: цифры в строку читаются быстрее и не
            притворяются важнее, чем они есть. */}
        <div className="flex flex-wrap">
          <Stat
            value={menu}
            label={plural(menu, 'позиция', 'позиции', 'позиций')}
            href="/admin/menu"
          />
          <Stat
            value={promotions}
            label={plural(promotions, 'акция', 'акции', 'акций')}
            href="/admin/promotions"
          />
          <Stat
            value={news}
            label={plural(news, 'новость', 'новости', 'новостей')}
            href="/admin/news"
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm tracking-[0.14em] text-[var(--muted)] uppercase">
          Быстрые действия
        </h2>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <QuickAction href="/admin/menu/items/new">Добавить позицию</QuickAction>
          <QuickAction href="/admin/promotions/new">Создать акцию</QuickAction>
          <QuickAction href="/admin/news/new">Написать новость</QuickAction>
          <QuickAction href="/admin/settings">Изменить контакты</QuickAction>
        </div>
      </section>
    </>
  )
}
