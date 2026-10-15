'use client'

import { useEffect } from 'react'

/**
 * Сайт клиента не смог получить данные.
 *
 * Лежит на уровне группы (public), а не внутри [tenant]: так он ловит и
 * ошибки из лейаута сайта (шапка тоже ходит в базу), а не только из страниц.
 *
 * Текст — для гостя заведения, а не для разработчика. Главное, что он должен
 * понять: заведение никуда не делось, это техническая заминка. Раньше в этой
 * ситуации гость видел «Страница не найдена» и делал противоположный вывод.
 */
export default function PublicError({
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
    document.title = 'Сайт временно недоступен'
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 text-stone-900">
      <div className="max-w-md text-center">
        <p className="text-xs tracking-[0.18em] text-stone-500 uppercase">Технический перерыв</p>
        <h1 className="display mt-4 text-[clamp(2rem,6vw,3rem)]">Сайт временно недоступен</h1>
        <p className="mt-5 text-stone-600 text-pretty">
          Заведение работает как обычно — это у сайта небольшая заминка. Попробуйте
          обновить страницу через минуту.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-8 rounded-xl bg-stone-900 px-6 py-3.5 font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          Обновить
        </button>
      </div>
    </main>
  )
}
