'use client'

import { useActionState } from 'react'

import { signIn, type LoginState } from '@/app/admin/actions'

const initialState: LoginState = { error: null }

/**
 * @param children — сюда страница подставляет скрытое поле с адресом возврата.
 * Оно приходит из searchParams, то есть из данных запроса, и при включённом
 * cacheComponents такие данные обязаны быть за <Suspense>. Пропускаем их
 * через children, чтобы сама форма осталась статической.
 */
export function LoginForm({ children }: { children?: React.ReactNode }) {
  const [state, formAction, pending] = useActionState(signIn, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {children}

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

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Пароль</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
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
        {pending ? 'Входим…' : 'Войти'}
      </button>
    </form>
  )
}
