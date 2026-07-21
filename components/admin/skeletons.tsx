/**
 * Заглушки разделов админки.
 *
 * Нужны не для красоты. При переходе между страницами React по умолчанию
 * держит на экране старую страницу, пока грузится новая, — и клик выглядит
 * так, будто кнопка не сработала. Файлы loading.tsx дают Next явную границу,
 * которую он показывает сразу, и переход становится заметен мгновенно.
 *
 * Пропорции повторяют реальные страницы: если заглушка не совпадает по
 * высоте с тем, что придёт следом, контент прыгнет.
 */

function Bar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-black/6 ${className}`} />
}

/** Шапка раздела: заголовок слева, кнопка действия справа. */
function HeaderSkeleton() {
  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <Bar className="h-8 w-40" />
      <Bar className="h-10 w-44" />
    </div>
  )
}

function CardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white">
      <div className="border-b border-[var(--border)] p-4">
        <Bar className="h-5 w-32" />
      </div>
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 p-4">
            <Bar className="h-4 w-48" />
            <Bar className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Список карточек с вложенными строками — меню. */
export function ListSkeleton({ cards = 2, rows = 3 }: { cards?: number; rows?: number }) {
  return (
    <>
      <HeaderSkeleton />
      <div className="flex flex-col gap-5">
        {Array.from({ length: cards }, (_, i) => (
          <CardSkeleton key={i} rows={rows} />
        ))}
      </div>
    </>
  )
}

/** Одна карточка со строками — новости и акции. */
export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <>
      <HeaderSkeleton />
      <CardSkeleton rows={rows} />
    </>
  )
}

/** Обзор: адрес сайта, счётчики, быстрые действия. */
export function DashboardSkeleton() {
  return (
    <>
      <Bar className="h-8 w-56" />
      <Bar className="mt-3 h-4 w-72" />

      <div className="mt-8 rounded-xl border border-[var(--border)] bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Bar className="h-3 w-24" />
            <Bar className="mt-2 h-5 w-32" />
          </div>
          <Bar className="h-11 w-36" />
        </div>
        <Bar className="mt-4 h-4 w-full max-w-md" />
      </div>

      <div className="mt-6 flex gap-6 rounded-xl border border-[var(--border)] bg-white p-5">
        {Array.from({ length: 3 }, (_, i) => (
          <Bar key={i} className="h-8 w-28" />
        ))}
      </div>
    </>
  )
}

/** Форма: набор полей и кнопка сохранения. */
export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <>
      <div className="mb-6">
        <Bar className="h-8 w-56" />
      </div>
      <div className="flex flex-col gap-5 rounded-xl border border-[var(--border)] bg-white p-6">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Bar className="h-4 w-28" />
            <Bar className="h-11 w-full" />
          </div>
        ))}
        <Bar className="mt-1 h-11 w-36" />
      </div>
    </>
  )
}
