import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { signOut } from '@/app/admin/actions'
import { SidebarNav } from '@/components/admin/sidebar-nav'
import { getCurrentTenant, getCurrentUser } from '@/lib/auth'

/**
 * Оболочка админки на время загрузки.
 *
 * Админка вся построена на данных запроса — сессии и тенанте, — поэтому
 * статически отрисовать её содержимое нельзя. Отдаём каркас, чтобы страница
 * не была пустой, пока проверяется сессия.
 */
function AdminSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface)] md:flex-row">
      <aside className="shrink-0 border-b border-[var(--border)] p-4 md:w-60 md:border-r md:border-b-0 md:p-5">
        <div className="h-5 w-32 animate-pulse rounded bg-black/8" />
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-8 w-full animate-pulse rounded bg-black/6" />
          ))}
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-black/8" />
      </main>
    </div>
  )
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  // Обычно сюда не доходит — незалогиненных заворачивает proxy. Но проверка
  // на месте: если матчер proxy когда-нибудь изменят, страницы не должны
  // внезапно открыться всем подряд.
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const tenant = await getCurrentTenant()

  // Человек вошёл, но его аккаунт не привязан ни к какому бизнесу.
  // Редиректить нельзя: proxy увидит живую сессию и вернёт его обратно сюда.
  if (!tenant) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Аккаунт не привязан к заведению</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Вы вошли как {user.email}, но за этим аккаунтом пока не закреплён ни один
            бизнес. Напишите администратору сервиса — он привяжет.
          </p>
          <form action={signOut} className="mt-6">
            <button
              type="submit"
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm transition hover:bg-[var(--surface)]"
            >
              Выйти
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface)] md:flex-row">
      <aside className="flex shrink-0 flex-col gap-5 border-b border-[var(--border)] bg-[var(--surface)] p-4 md:w-60 md:border-r md:border-b-0 md:p-5">
        <div className="min-w-0">
          <p className="truncate font-semibold">{tenant.name}</p>
          <Link
            href={`/${tenant.slug}`}
            target="_blank"
            className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
          >
            /{tenant.slug} — открыть сайт
          </Link>
        </div>

        <SidebarNav />

        <form action={signOut} className="md:mt-auto">
          <button
            type="submit"
            className="text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            Выйти
          </button>
        </form>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  )
}

export default function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  // Функция намеренно не async: при включённом cacheComponents любое обращение
  // к данным запроса обязано быть за <Suspense>, иначе сборка падает. Страницы
  // внутри тоже читают сессию, и эта граница накрывает их заодно.
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  )
}
