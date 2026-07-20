import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/ui/form'
import { getCurrentTenant } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

import { ItemForm } from '../../item-form'

export const metadata = { title: 'Позиция меню — панель управления' }

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const tenant = await getCurrentTenant()
  if (!tenant) notFound()

  const supabase = await createClient()
  const [{ data: item }, { data: categories }] = await Promise.all([
    supabase.from('menu_items').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('menu_categories')
      .select('id, name')
      .eq('tenant_id', tenant.id)
      .order('sort_order')
      .order('name'),
  ])

  if (!item) notFound()

  return (
    <>
      <PageHeader title="Позиция меню" />
      <ItemForm tenantId={tenant.id} categories={categories ?? []} item={item} />
    </>
  )
}
