'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { requestPasswordReset, type ResetRequestState } from '@/app/admin/actions'

const initialState: ResetRequestState = { sent: false, error: null }

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState)

  // Успех показываем вместо формы, а не над ней: иначе человек по привычке
  // жмёт кнопку второй раз и упирается в ограничение частоты.
  if (state.sent) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-800">
          Если такая почта у нас есть, письмо со ссылкой уже отправлено.
        </p>
        <p className="text-sm text-[var(--muted)]">
          Проверьте папку «Спам» — письма от новых отправителей часто попадают туда.
          Ссылка действует час.
        </p>
        <Link
          href="/admin/login"
          className="text-sm text-[var(--accent)] underline underline-offset-4"
        >
          Вернуться ко входу
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Почта</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          placeholder="you@example.com"
          className="rounded-lg border border-[var(--border)] px-3 py-2.5 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
        />
      </label>

      {state.error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-lg bg-[var(--accent)] px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? 'Отправляем…' : 'Прислать ссылку'}
      </button>

      <Link
        href="/admin/login"
        className="text-center text-sm text-[var(--muted)] underline underline-offset-4 hover:text-[var(--foreground)]"
      >
        Вспомнил пароль
      </Link>
    </form>
  )
}
