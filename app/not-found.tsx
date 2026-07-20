import Link from 'next/link'

export const metadata = {
  title: 'Страница не найдена',
  // Частичный пререндер отдаёт оболочку страницы раньше, чем становится
  // известно, что тенанта нет, — статус ответа к этому моменту уже 200.
  // Поэтому просим поисковики не индексировать: иначе несуществующее
  // заведение осело бы в выдаче как живая страница.
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-5 text-center text-neutral-900">
      <p className="text-sm font-medium opacity-50">404</p>
      <h1 className="mt-3 text-2xl font-semibold">Такой страницы нет</h1>
      <p className="mt-2 max-w-md opacity-70">
        Возможно, адрес набран с опечаткой, или заведение сменило адрес сайта.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg border border-black/12 px-5 py-2.5 text-sm transition hover:bg-black/4"
      >
        На главную
      </Link>
    </main>
  )
}
