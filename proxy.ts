import { NextResponse, type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/proxy'

/**
 * Первый рубеж защиты админки и продление сессии.
 *
 * ВАЖНО: это не единственный рубеж. Server actions приходят POST-запросом на
 * тот маршрут, где объявлены, и матчер их не обязательно накрывает. Поэтому
 * каждое действие обязано само звать requireTenant() из lib/auth.ts.
 * Полагаться только на proxy нельзя.
 *
 * В Next 16 этот файл раньше назывался middleware.ts.
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isLoginPage = pathname === '/admin/login'

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.search = ''
    // Куда вернуть человека после входа. Читается только внутри /admin —
    // см. проверку в signIn(), иначе это был бы открытый редирект.
    if (pathname !== '/admin') {
      url.searchParams.set('next', pathname)
    }
    return NextResponse.redirect(url)
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Только админка. Публичные сайты клиентов сюда не заходят: они читают базу
  // без сессии, и лишний запрос к Supabase на каждый просмотр страницы им
  // не нужен — это прямо влияет на скорость публичных страниц.
  matcher: ['/admin/:path*'],
}
