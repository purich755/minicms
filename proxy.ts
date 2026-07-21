import { NextResponse, type NextRequest } from 'next/server'

import { isAuthCallback, isPublicAdminPage, requiresSession } from '@/lib/admin-paths'
import { HOST_MODE_HEADER } from '@/lib/base-path'
import { isPlatformHost, normalizeHost, subdomainSlug } from '@/lib/host'
import { updateSession } from '@/lib/supabase/proxy'

/**
 * Две задачи: пускать или не пускать в админку, и понять, чей сайт запрошен.
 *
 * ВАЖНО про админку: proxy — не единственный рубеж. Server actions приходят
 * POST-запросом на тот маршрут, где объявлены, и матчер их может не накрыть.
 * Поэтому каждое действие само зовёт getCurrentTenant(). Полагаться только на
 * proxy нельзя.
 *
 * ВАЖНО про публичные сайты: здесь принципиально нет обращений к базе. Резолв
 * по поддомену — чистая работа со строкой, а свой домен клиента разбирается
 * уже внутри страницы, где результат кешируется. Иначе каждый просмотр любой
 * страницы стоил бы лишнего запроса в Supabase.
 *
 * В Next 16 этот файл раньше назывался middleware.ts.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    return guardAdmin(request)
  }

  return routeToTenant(request)
}

async function guardAdmin(request: NextRequest) {
  const { response, userId } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Обмен кода из письма на сессию не редиректим ни в какую сторону: он
  // обязан отработать и без сессии, и с ней.
  if (isAuthCallback(pathname)) return response

  const isPublicPage = isPublicAdminPage(pathname)

  if (!userId && requiresSession(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.search = ''
    // Куда вернуть человека после входа. Значение приходит из адресной строки,
    // поэтому signIn отдельно проверяет, что оно ведёт внутрь /admin.
    if (pathname !== '/admin') {
      url.searchParams.set('next', pathname)
    }
    return NextResponse.redirect(url)
  }

  if (userId && isPublicPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

/**
 * Определяет тенанта по адресу и переписывает путь.
 *
 * flora.домен.рф/menu   → /flora/menu       (поддомен)
 * flora-cafe.ru/menu    → /flora-cafe.ru/menu  (свой домен; страница найдёт
 *                                               тенанта по custom_domain)
 * домен.рф/flora/menu   → без изменений      (запасной путь, работает всегда)
 */
function routeToTenant(request: NextRequest) {
  const host = normalizeHost(request.headers.get('host'))
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? ''

  // Без настроенного корневого домена работает только путь /slug. То же на
  // служебных адресах платформы — localhost и превью-деплои Vercel: считать
  // их доменом клиента нельзя, иначе превью целиком уедет в 404.
  if (!rootDomain || isPlatformHost(host)) {
    return NextResponse.next()
  }

  const slug = subdomainSlug(host, rootDomain)
  const segment = slug ?? (host !== rootDomain ? host : null)

  // Сам корневой домен — это витрина сервиса, а не сайт клиента.
  if (!segment) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = `/${segment}${pathnameWithoutLeadingSlash(request.nextUrl.pathname)}`

  const response = NextResponse.rewrite(url)
  // Сообщаем странице, что слага в адресной строке нет и внутренние ссылки
  // не должны его добавлять.
  response.headers.set(HOST_MODE_HEADER, '1')
  return response
}

function pathnameWithoutLeadingSlash(pathname: string): string {
  return pathname === '/' ? '' : pathname
}

export const config = {
  // Статику и картинки не трогаем: рерайт и проверка сессии им ни к чему,
  // а расход на каждый файл был бы заметным.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
