import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/ui/form'
import { getCurrentTenant } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

import { NewsForm } from '../news-form'

export const metadata = { title: 'Новость — панель управления' }

export default async function EditNewsPage({
  params,
}: {
  // В Next 16 params — промис.
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const tenant = await getCurrentTenant()
  if (!tenant) notFound()

  const supabase = await createClient()
  const { data: item } = await supabase.from('news').select('*').eq('id', id).maybeSingle()

  // RLS не отдаст чужую новость, поэтому сюда попадаем и когда записи нет,
  // и когда она принадлежит другому тенанту. Снаружи это одно и то же: 404.
  if (!item) notFound()

  return (
    <>
      <PageHeader title="Новость" />
      <NewsForm tenantId={tenant.id} item={item} />
    </>
  )
}
