import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/ui/form'
import { getCurrentTenant } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

import { SettingsForm } from './settings-form'

export const metadata = { title: 'Настройки — панель управления' }

export default async function SettingsPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) notFound()

  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('site_settings')
    .select('*')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  return (
    <>
      <PageHeader title="Настройки" />
      <SettingsForm tenantId={tenant.id} tenantName={tenant.name} settings={settings} />
    </>
  )
}
