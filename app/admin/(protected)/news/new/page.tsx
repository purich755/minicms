import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/ui/form'
import { getCurrentTenant } from '@/lib/auth'

import { NewsForm } from '../news-form'

export const metadata = { title: 'Новая новость — панель управления' }

export default async function NewNewsPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) notFound()

  return (
    <>
      <PageHeader title="Новая новость" />
      <NewsForm tenantId={tenant.id} />
    </>
  )
}
