import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/ui/form'
import { getCurrentTenant } from '@/lib/auth'

import { PromotionForm } from '../promotion-form'

export const metadata = { title: 'Новая акция — панель управления' }

export default async function NewPromotionPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) notFound()

  return (
    <>
      <PageHeader title="Новая акция" />
      <PromotionForm tenantId={tenant.id} />
    </>
  )
}
