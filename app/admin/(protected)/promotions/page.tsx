import { ComingSoon } from '@/components/admin/coming-soon'

export const metadata = { title: 'Акции — панель управления' }

export default function PromotionsPage() {
  return (
    <ComingSoon
      title="Акции"
      description="Заголовок, описание, картинка, даты начала и окончания, включение и выключение."
    />
  )
}
