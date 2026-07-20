import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Вход — панель управления',
}

type Params = Promise<{ next?: string }>

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

        <LoginForm>
          <Suspense fallback={null}>
            <ReturnPathInput searchParams={searchParams} />
          </Suspense>
        </LoginForm>

        <p className="mt-6 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
          Доступ выдаёт администратор сервиса. Забыли пароль — напишите нам.
        </p>
      </div>
    </main>
  )
}
