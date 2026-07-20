import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/ui/form'
import { createClient } from '@/lib/supabase/server'

import { CategoryForm } from '../../category-form'

export const metadata = { title: 'Категория — панель управления' }

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: item } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  // RLS не отдаст чужую категорию — снаружи «нет такой» и «чужая» неразличимы.
  if (!item) notFound()

  return (
    <>
      <PageHeader title="Категория" />
      <CategoryForm item={item} />
    </>
  )
}
