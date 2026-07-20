import type { Metadata } from 'next'

import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Вход — панель управления',
}

export default async function LoginPage({
  searchParams,
}: {
  // В Next 16 searchParams — промис, синхронный доступ убран.
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Вход в панель</h1>
        <p className="mt-1.5 mb-6 text-sm text-[var(--muted)]">
          Управление меню, акциями и новостями вашего заведения.
        </p>

        <LoginForm next={next} />

        <p className="mt-6 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
          Доступ выдаёт администратор сервиса. Забыли пароль — напишите нам.
        </p>
      </div>
    </main>
  )
}
