import { ComingSoon } from '@/components/admin/coming-soon'

export const metadata = { title: 'Новости — панель управления' }

export default function NewsPage() {
  return (
    <ComingSoon
      title="Новости"
      description="Заголовок, адрес страницы, текст, обложка, черновик или публикация."
    />
  )
}
