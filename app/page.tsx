import Link from 'next/link'

export const metadata = {
  title: 'Сайт заведения, который вы правите сами',
  description:
    'Меню, акции и новости — из личного кабинета. Изменили цену — на сайте она уже другая. Без программиста и без ожидания правок.',
}

const STEPS = [
  {
    title: 'Открываете кабинет',
    text: 'Логин и пароль выдаём при подключении. Никаких настроек и установок — просто адрес в браузере.',
  },
  {
    title: 'Меняете, что нужно',
    text: 'Цену, состав, фото, часы работы. Всё обычными полями, как в анкете. Ошибиться негде.',
  },
  {
    title: 'Сохраняете',
    text: 'Сайт обновляется в ту же секунду. Ждать вечера, письма или ответа разработчика не нужно.',
  },
]

const FEATURES = [
  {
    title: 'Меню',
    text: 'Категории и позиции, описания, цены в рублях, фотографии. Закончилось блюдо — снимаете галку, и оно пропадает с сайта.',
    span: 'sm:col-span-3',
  },
  {
    title: 'Акции',
    text: 'С датами начала и окончания. Срок вышел — акция убирается сама, вспоминать о ней не надо.',
    span: 'sm:col-span-2',
  },
  {
    title: 'Новости',
    text: 'Открытие, новый мастер, изменение часов. Можно сохранить черновиком и опубликовать позже.',
    span: 'sm:col-span-2',
  },
  {
    title: 'Контакты и оформление',
    text: 'Телефон, адрес, часы, соцсети, ссылка на Яндекс.Карты, логотип и фирменный цвет — сайт выглядит вашим.',
    span: 'sm:col-span-3',
  },
]

/**
 * Витрина продукта: как правка в кабинете превращается в строку на сайте.
 * Собрана вёрсткой, а не картинкой — грузить нечего, и на любом экране
 * остаётся резкой.
 */
function ProductPreview() {
  return (
    <div className="relative select-none" aria-hidden>
      {/* Кабинет */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_18px_40px_-24px_rgba(28,25,23,0.45)]">
        <p className="text-xs tracking-[0.16em] text-stone-400 uppercase">Личный кабинет</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="size-11 shrink-0 rounded-lg bg-stone-100" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Капучино</p>
            <p className="text-sm text-stone-500">На фермерском молоке</p>
          </div>
          <div className="rounded-lg border-2 border-[#6f4e37] px-3 py-1.5 text-sm font-medium tabular-nums">
            220 ₽
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <span className="rounded-lg bg-[#6f4e37] px-4 py-2 text-sm font-medium text-white">
            Сохранить
          </span>
        </div>
      </div>

      {/* Стрелка вниз */}
      <div className="flex justify-center py-3">
        <span className="text-2xl leading-none text-stone-300">↓</span>
      </div>

      {/* Сайт. Сдвинут вбок — так видно, что это два разных экрана. */}
      <div className="rounded-2xl border border-stone-200 bg-paper p-5 shadow-[0_18px_40px_-24px_rgba(28,25,23,0.45)] sm:ml-8">
        <p className="text-xs tracking-[0.16em] text-stone-400 uppercase">Сайт заведения</p>
        <p className="display mt-4 text-lg">Кофе</p>
        <ul className="mt-3 flex flex-col gap-2.5 text-sm">
          <li className="flex items-baseline gap-3">
            <span>Эспрессо</span>
            <span className="min-w-4 flex-1 translate-y-[-0.3em] border-b border-dotted border-stone-300" />
            <span className="tabular-nums text-stone-600">160 ₽</span>
          </li>
          <li className="flex items-baseline gap-3 font-medium">
            <span>Капучино</span>
            <span className="min-w-4 flex-1 translate-y-[-0.3em] border-b border-dotted border-stone-400" />
            <span className="tabular-nums">220 ₽</span>
          </li>
          <li className="flex items-baseline gap-3">
            <span>Раф</span>
            <span className="min-w-4 flex-1 translate-y-[-0.3em] border-b border-dotted border-stone-300" />
            <span className="tabular-nums text-stone-600">280 ₽</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default function ServiceLandingPage() {
  return (
    <div className="grain flex min-h-screen flex-col bg-paper text-stone-900">
      <a href="#content" className="skip-link">
        К содержимому
      </a>

      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <span className="display text-lg">Мини-CMS</span>
          <Link
            href="/admin"
            className="rounded-lg border border-stone-300 px-4 py-1.5 text-sm transition-colors hover:bg-stone-900 hover:text-white"
          >
            Войти
          </Link>
        </div>
      </header>

      <main id="content" className="flex-1">
        <section className="mx-auto max-w-5xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <h1 className="display text-[clamp(2.5rem,7vw,4.5rem)]">
                Сайт заведения, который вы правите сами
              </h1>
              <p className="mt-7 max-w-lg text-lg leading-relaxed text-stone-700 text-pretty">
                Поменяли цену на капучино — через секунду она такая же на сайте. Без
                звонка разработчику, без «сделаю на выходных», без доплат за каждую
                правку.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/flora-demo"
                  className="rounded-xl bg-stone-900 px-6 py-3.5 font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Посмотреть пример
                </Link>
                <Link
                  href="/admin"
                  className="rounded-xl border border-stone-300 px-6 py-3.5 font-medium transition-colors hover:bg-white"
                >
                  У меня есть доступ
                </Link>
              </div>

              <p className="mt-6 text-sm text-stone-500">
                Пример — настоящий работающий сайт, а не картинка.
              </p>
            </div>

            <ProductPreview />
          </div>
        </section>

        <section className="border-y border-hairline bg-white/60">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
            <h2 className="display text-2xl sm:text-3xl">Как это работает</h2>

            {/* Крупные цифры вместо одинаковых карточек: шаги читаются как
                последовательность, а не как список одинаковых плиток. */}
            <ol className="mt-10 grid gap-10 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="display block text-4xl text-stone-300">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-3 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
          <h2 className="display text-2xl sm:text-3xl">Что можно менять</h2>

          {/* Сетка намеренно неровная: блоки разной ширины вместо трёх
              одинаковых колонок. */}
          <div className="mt-10 grid gap-5 sm:grid-cols-5">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className={`${feature.span} rounded-2xl border border-hairline p-6 transition-colors hover:border-stone-300`}
              >
                <h3 className="display text-xl">{feature.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-stone-600">
                  {feature.text}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
          <div className="rounded-2xl bg-stone-900 px-7 py-12 text-center text-stone-100 sm:px-12 sm:py-16">
            <h2 className="display text-[clamp(1.75rem,4vw,2.5rem)] text-white">
              Посмотрите, как это выглядит
            </h2>
            <p className="mx-auto mt-4 max-w-md text-stone-300 text-pretty">
              Демонстрационная кофейня со всем, что получает заведение: меню, акции,
              новости и контакты.
            </p>
            <Link
              href="/flora-demo"
              className="mt-8 inline-block rounded-xl bg-white px-7 py-3.5 font-medium text-stone-900 transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              Открыть пример
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-stone-500 sm:px-8">
          <span>Сайты для локального бизнеса</span>
          <Link href="/admin" className="transition-colors hover:text-stone-900">
            Вход для владельцев
          </Link>
        </div>
      </footer>
    </div>
  )
}
