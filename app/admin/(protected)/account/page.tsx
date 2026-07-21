import { Suspense } from 'react'

import { PageHeader } from '@/components/ui/form'
import { getCurrentUser } from '@/lib/auth'

import { PasswordForm } from './account-form'

export const metadata = { title: 'Учётная запись — панель управления' }

type Params = Promise<{ reset?: string }>

/**
 * Подсказка после перехода по ссылке из письма.
 *
 * Отдельным компонентом за Suspense: searchParams — данные запроса, а при
 * включённом cacheComponents к ним нельзя обращаться вне границы.
 */
async function ResetNotice({ searchParams }: { searchParams: Params }) {
  const { reset } = await searchParams
  if (!reset) return null

  return (
    <p className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
      Вы вошли по ссылке из письма. Задайте новый пароль — старый продолжит
      работать, пока вы этого не сделаете.
    </p>
  )
}

async function CurrentEmail() {
  const user = await getCurrentUser()
  if (!user?.email) return null

  return (
    <p className="mb-6 text-[var(--muted)]">
      Вход выполняется по адресу <span className="text-[var(--foreground)]">{user.email}</span>
    </p>
  )
}

export default function AccountPage({ searchParams }: { searchParams: Params }) {
  return (
    <>
      <PageHeader title="Учётная запись" />

      <Suspense fallback={null}>
        <ResetNotice searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={null}>
        <CurrentEmail />
      </Suspense>

      <PasswordForm />

      <p className="mt-8 max-w-md text-sm text-[var(--muted)]">
        Адрес почты сменить самостоятельно нельзя — напишите нам, поменяем.
      </p>
    </>
  )
}
