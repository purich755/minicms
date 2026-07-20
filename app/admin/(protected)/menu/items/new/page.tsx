import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/ui/form'
import { getCurrentTenant } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

import { ItemForm } from '../../item-form'

export const metadata = { title: 'Новая позиция — панель управления' }

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams

  const tenant = await getCurrentTenant()
  if (!tenant) notFound()

  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('id, name')
    .eq('tenant_id', tenant.id)
    .order('sort_order')
    .order('name')

  return (
    <>
      <PageHeader title="Новая позиция" />
      <ItemForm
        tenantId={tenant.id}
        categories={categories ?? []}
        defaultCategoryId={category}
      />
    </>
  )
}
