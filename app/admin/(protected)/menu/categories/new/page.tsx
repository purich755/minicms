import { PageHeader } from '@/components/ui/form'

import { CategoryForm } from '../../category-form'

export const metadata = { title: 'Новая категория — панель управления' }

export default function NewCategoryPage() {
  return (
    <>
      <PageHeader title="Новая категория" />
      <CategoryForm />
    </>
  )
}
