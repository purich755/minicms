import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/ui/form'
import { getCurrentTenant } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

import { PromotionForm } from '../promotion-form'

export const metadata = { title: 'Акция — панель управления' }

export default async function EditPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const tenant = await getCurrentTenant()
  if (!tenant) notFound()

  const supabase = await createClient()
  const { data: item } = await supabase.from('promotions').select('*').eq('id', id).maybeSingle()

  if (!item) notFound()

  return (
    <>
      <PageHeader title="Акция" />
      <PromotionForm tenantId={tenant.id} item={item} />
    </>
  )
}
