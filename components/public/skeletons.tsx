/**
 * Заглушки на время подгрузки.
 *
 * При включённом cacheComponents Next отдаёт статическую оболочку страницы
 * мгновенно, а содержимое подтекает следом. Эти блоки — то, что посетитель
 * видит в первые миллисекунды.
 *
 * Форма повторяет реальную разметку: заголовок там же, где будет заголовок,
 * строки той же высоты. Иначе при появлении данных страница прыгает.
 */

function Bar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-stone-900/6 ${className}`} />
}

export function HeaderSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl items-center gap-6 px-5 py-4 sm:px-8">
      <Bar className="h-6 w-44" />
      <Bar className="ml-auto h-5 w-32" />
      <Bar className="hidden h-8 w-40 sm:block" />
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
      <Bar className="h-14 w-64" />
      <div className="mt-12 flex flex-col gap-6">
        <Bar className="h-6 w-32" />
        <Bar className="h-20 w-full" />
        <Bar className="h-20 w-full" />
        <Bar className="h-20 w-5/6" />
      </div>
    </div>
  )
}

export function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24 sm:pb-28">
      <Bar className="h-4 w-52" />
      <Bar className="mt-5 h-20 w-4/5" />
      <Bar className="mt-7 h-6 w-2/3" />
      <div className="mt-10 flex gap-3">
        <Bar className="h-13 w-48" />
        <Bar className="h-13 w-52" />
      </div>
    </div>
  )
}
