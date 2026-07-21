import { HIDDEN_LABEL, type Hidden as Visibility } from '@/lib/visibility'

/**
 * Метка «этого посетители не видят» на карточке в предпросмотре.
 *
 * Серверный компонент, отдельно от плашки предпросмотра: та обязана быть
 * клиентской из-за usePathname, а метка — просто разметка, и тащить её в
 * браузерный бандл незачем.
 *
 * Причина написана словами, а не общим «скрыто»: «черновик» и «закончилась»
 * чинятся по-разному, и владелец должен понять разницу не заходя в панель.
 */
export function HiddenBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-300">
      <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
      {children}
    </span>
  )
}

/**
 * Метка, если предпросмотр включён и карточка скрыта. Иначе ничего.
 *
 * На живом сайте всегда возвращает null: скрытых карточек там не бывает в
 * принципе — их отсекает RLS ещё в базе.
 */
export function IfHidden({ preview, of }: { preview: boolean; of: Visibility }) {
  if (!preview || !of.hidden) return null
  return <HiddenBadge>{HIDDEN_LABEL[of.reason]}</HiddenBadge>
}
