import Link from 'next/link'

export const metadata = {
  title: 'Сайт и личный кабинет для вашего заведения',
  description:
    'Сайт с меню, акциями и новостями, который вы правите сами — без программиста и без ожидания.',
}

const FEATURES = [
  {
    title: 'Меню, которое вы меняете сами',
    text: 'Изменили цену или убрали позицию — на сайте это видно сразу, без звонка разработчику.',
  },
  {
    title: 'Акции с датами',
    text: 'Указали срок — акция сама появится и сама пропадёт, когда закончится.',
  },
  {
    title: 'Новости заведения',
    text: 'Открытие, новый мастер, смена часов работы. Черновик виден только вам.',
  },
]

export default function ServiceLandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="border-b border-black/8">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <span className="font-semibold">Мини-CMS</span>
          <Link href="/admin" className="text-sm underline-offset-2 hover:underline">
            Войти в панель
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5">
        <section className="py-20 sm:py-28">
          <h1 className="max-w-2xl text-4xl font-semibold sm:text-5xl">
            Сайт заведения, который вы правите сами
          </h1>
          <p className="mt-5 max-w-xl text-lg opacity-70">
            Меню, акции и новости — из личного кабинета. Без вёрстки, без программиста
            и без ожидания правок.
          </p>
        </section>

        <section className="grid gap-8 border-t border-black/8 py-14 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title}>
              <h2 className="font-medium">{feature.title}</h2>
              <p className="mt-2 text-sm opacity-70">{feature.text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-black/8">
        <div className="mx-auto max-w-4xl px-5 py-8 text-sm opacity-60">
          Сайты для локального бизнеса.
        </div>
      </footer>
    </div>
  )
}
