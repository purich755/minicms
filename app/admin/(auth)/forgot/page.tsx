import type { Metadata } from 'next'

import { ForgotForm } from './forgot-form'

export const metadata: Metadata = {
  title: 'Восстановление пароля — панель управления',
  // Страницам входа в поиске делать нечего.
  robots: { index: false },
}

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Забыли пароль</h1>
        <p className="mt-1.5 mb-6 text-sm text-[var(--muted)]">
          Пришлём на почту ссылку, по которой можно задать новый.
        </p>

        <ForgotForm />
      </div>
    </main>
  )
}
