'use client'

import { useEffect } from 'react'

/**
 * Панель не смогла достучаться до базы.
 *
 * Лежит на уровне /admin, а не внутри (protected): ошибка чаще всего
 * случается в самом лейауте панели, когда он читает тенанта пользователя, а
 * error.tsx ловит ошибки только тех лейаутов, что ниже него.
 *
 * Раньше эта же ситуация выглядела как «аккаунт не привязан к заведению», и
 * владелец шёл выяснять, кто его отвязал.
 */
export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  // Метаданные из клиентского компонента не задать, а пустая вкладка
  // выглядит как зависшая загрузка.
  useEffect(() => {
    document.title = 'Сервис временно недоступен'
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Сервис временно недоступен</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Не получилось связаться с базой данных. Ваши данные в сохранности — это
          техническая заминка. Попробуйте через минуту; если не пройдёт, напишите нам.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-6 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Попробовать снова
        </button>
      </div>
    </main>
  )
}
