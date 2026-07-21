import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Куда приводит ссылка из письма о смене пароля.
 *
 * Supabase присылает одноразовый код. Меняем его на сессию — только после
 * этого человек получает право сменить себе пароль, — и отправляем на форму
 * нового пароля.
 *
 * Route handler, а не страница: нужно записать cookies сессии в ответ, а
 * серверный компонент этого не умеет.
 *
 * Сессия здесь настоящая, со всеми правами. Это осознанно: так работает
 * восстановление доступа у Supabase. Ссылка живёт час и сгорает после первого
 * использования.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const origin = request.nextUrl.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/login?reset=invalid`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // Чаще всего это просроченная или уже использованная ссылка.
    return NextResponse.redirect(`${origin}/admin/login?reset=expired`)
  }

  return NextResponse.redirect(`${origin}/admin/account?reset=1`)
}
