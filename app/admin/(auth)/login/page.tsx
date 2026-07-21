import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Вход — панель управления',
}

type Params = Promise<{ next?: string; reset?: string }>

/**
 * Что пошло не так со ссылкой из письма.
 *
 * Без этого человек, кликнувший по просроченной ссылке, просто оказывался бы
 * на странице входа и не понимал, почему.
 */
async function ResetNotice({ searchParams }: { searchParams: Params }) {
  const { reset } = await searchParams
  if (!reset) return null

  const text =
    reset === 'expired'
      ? 'Ссылка устарела или уже была использована. Запросите новую.'
      : 'Ссылка не сработала. Запросите новую.'

  return (
    <p className="mb-5 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
      {text}
    </p>
  )
}

/**
 * Адрес, куда вернуть человека после входа.
 *
 * Вынесен в отдельный компонент, потому что searchParams — данные запроса,
 * а при включённом cacheComponents к ним нельзя обращаться вне <Suspense>.
 * Так вся страница входа остаётся статической, а подтекает только это поле.
 *
 * Проверку, что адрес ведёт внутрь админки, делает не он, а сам signIn:
 * значение приходит из адресной строки, и доверять ему нельзя.
 */
async function ReturnPathInput({ searchParams }: { searchParams: Params }) {
  const { next } = await searchParams
  if (!next) return null
  return <input type="hidden" name="next" value={next} />
}

export default function LoginPage({ searchParams }: { searchParams: Params }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Вход в панель</h1>
        <p className="mt-1.5 mb-6 text-sm text-[var(--muted)]">
          Управление меню, акциями и новостями вашего заведения.
        </p>

        <Suspense fallback={null}>
          <ResetNotice searchParams={searchParams} />
        </Suspense>

        <LoginForm>
          <Suspense fallback={null}>
            <ReturnPathInput searchParams={searchParams} />
          </Suspense>
        </LoginForm>

        <p className="mt-5 text-center text-sm">
          <Link
            href="/admin/forgot"
            className="text-[var(--muted)] underline underline-offset-4 transition-colors hover:text-[var(--foreground)]"
          >
            Забыли пароль?
          </Link>
        </p>

        <p className="mt-6 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
          Доступ выдаёт администратор сервиса.
        </p>
      </div>
    </main>
  )
}
