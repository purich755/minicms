/**
 * Заглушки на время подгрузки.
 *
 * При включённом cacheComponents Next отдаёт статическую оболочку страницы
 * мгновенно, а содержимое подтекает следом. Эти блоки — то, что посетитель
 * видит в первые миллисекунды: они держат высоту, чтобы страница не прыгала,
 * когда приедут настоящие данные.
 */

function Bar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-black/8 ${className}`} />
}

export function HeaderSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
      <Bar className="h-6 w-40" />
      <Bar className="h-4 w-52" />
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <Bar className="h-9 w-56" />
      <div className="mt-10 flex flex-col gap-4">
        <Bar className="h-5 w-full" />
        <Bar className="h-5 w-4/5" />
        <Bar className="h-5 w-2/3" />
      </div>
    </div>
  )
}

export function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
      <Bar className="h-12 w-2/3" />
      <Bar className="mt-5 h-5 w-1/2" />
      <Bar className="mt-8 h-12 w-44" />
    </div>
  )
}
