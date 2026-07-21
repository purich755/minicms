'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { stopPreview } from '@/app/admin/preview-actions'

/**
 * Плашка «вы смотрите черновик».
 *
 * Обязательна, а не украшение: в предпросмотре сайт выглядит ровно как
 * настоящий, и без явной пометки владелец решит, что неопубликованная акция
 * уже висит на витрине.
 *
 * Клиентский компонент из-за usePathname: адрес возврата нужно взять тот,
 * что видит браузер, — при заходе по своему домену клиента путь в адресной
 * строке и путь внутри приложения не совпадают.
 */
export function PreviewBar({ hiddenCount }: { hiddenCount: number }) {
  const pathname = usePathname()

  return (
    <div className="sticky bottom-0 z-40 border-t border-white/10 bg-stone-900 text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 sm:px-8">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden className="size-2 rounded-full bg-amber-400" />
          Предпросмотр
        </span>

        <span className="text-sm text-white/60">
          {hiddenCount > 0
            ? `Скрытого от посетителей: ${hiddenCount}. Отмечено жёлтым.`
            : 'Всё на этой странице уже видно посетителям.'}
        </span>

        <div className="ml-auto flex items-center gap-4 text-sm">
          <Link
            href="/admin"
            prefetch={false}
            className="text-white/70 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white"
          >
            В панель
          </Link>

          {/* prefetch тут ни при чём, а вот форма важна: выключение
              предпросмотра — это запись cookie, ссылкой её не сделать. */}
          <form action={stopPreview}>
            <input type="hidden" name="returnTo" value={pathname} />
            <button
              type="submit"
              className="rounded-lg bg-white px-4 py-2 font-medium text-stone-900 transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              Выйти
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
