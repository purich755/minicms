'use client'

import { useActionState } from 'react'

import { ImageUpload } from '@/components/admin/image-upload'
import { SubmitButton } from '@/components/ui/buttons'
import { Card, Field, FormError, Input, Textarea } from '@/components/ui/form'
import type { Row } from '@/lib/types'
import { EMPTY_FORM_STATE } from '@/lib/validation'

import { saveSettings } from './actions'

type Settings = Row<'site_settings'>

export function SettingsForm({
  tenantId,
  tenantName,
  settings,
}: {
  tenantId: string
  tenantName: string
  settings: Settings | null
}) {
  const [state, formAction] = useActionState(saveSettings, EMPTY_FORM_STATE)
  const err = (field: string) => state.fieldErrors?.[field]
  const socials = settings?.socials ?? {}

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <FormError>{state.error}</FormError>

      {state.ok ? (
        <p className="rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-800">
          Сохранено. Изменения уже на сайте.
        </p>
      ) : null}

      <Card className="flex flex-col gap-5 p-5">
        <h2 className="font-medium">Заведение</h2>

        <Field label="Название" htmlFor="name" error={err('name')}>
          <Input
            id="name"
            name="name"
            defaultValue={tenantName}
            invalid={!!err('name')}
            required
          />
        </Field>

        <ImageUpload
          name="logo_url"
          tenantId={tenantId}
          folder="site"
          initialUrl={settings?.logo_url}
          label="Логотип"
        />

        <ImageUpload
          name="hero_image_url"
          tenantId={tenantId}
          folder="site"
          initialUrl={settings?.hero_image_url}
          label="Фото на главную"
          hint="Первое, что видит гость. Лучше горизонтальное и светлое — поверх него идёт текст."
        />

        <Field
          label="Фирменный цвет"
          htmlFor="primary_color"
          error={err('primary_color')}
          hint="Им будут выкрашены кнопки и акценты на сайте."
        >
          <input
            id="primary_color"
            name="primary_color"
            type="color"
            defaultValue={settings?.primary_color ?? '#111827'}
            className="h-11 w-20 cursor-pointer rounded-lg border border-[var(--border)] bg-white p-1"
          />
        </Field>

        <Field label="О нас" htmlFor="about" error={err('about')}>
          <Textarea
            id="about"
            name="about"
            defaultValue={settings?.about ?? ''}
            invalid={!!err('about')}
            placeholder="Пара предложений о заведении — их увидят на главной."
          />
        </Field>
      </Card>

      <Card className="flex flex-col gap-5 p-5">
        <h2 className="font-medium">Контакты</h2>

        <Field label="Телефон" htmlFor="phone" error={err('phone')}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={settings?.phone ?? ''}
            invalid={!!err('phone')}
            placeholder="+7 900 000-00-00"
          />
        </Field>

        <Field label="Адрес" htmlFor="address" error={err('address')}>
          <Input
            id="address"
            name="address"
            defaultValue={settings?.address ?? ''}
            invalid={!!err('address')}
            placeholder="Тула, ул. Ленина, 1"
          />
        </Field>

        <Field
          label="Часы работы"
          htmlFor="working_hours"
          error={err('working_hours')}
          hint="Как напишете, так и покажем."
        >
          <Input
            id="working_hours"
            name="working_hours"
            defaultValue={settings?.working_hours ?? ''}
            invalid={!!err('working_hours')}
            placeholder="Пн–Вс 08:00–22:00"
          />
        </Field>

        <Field
          label="Ссылка на Яндекс.Карты"
          htmlFor="yandex_map_url"
          error={err('yandex_map_url')}
        >
          <Input
            id="yandex_map_url"
            name="yandex_map_url"
            type="url"
            defaultValue={settings?.yandex_map_url ?? ''}
            invalid={!!err('yandex_map_url')}
            placeholder="https://yandex.ru/maps/..."
          />
        </Field>
      </Card>

      <Card className="flex flex-col gap-5 p-5">
        <h2 className="font-medium">Соцсети</h2>
        <p className="-mt-3 text-sm text-[var(--muted)]">
          Пустые поля на сайте не показываются.
        </p>

        <Field label="Telegram" htmlFor="telegram" error={err('telegram')}>
          <Input
            id="telegram"
            name="telegram"
            type="url"
            defaultValue={socials.telegram ?? ''}
            invalid={!!err('telegram')}
            placeholder="https://t.me/..."
          />
        </Field>

        <Field label="ВКонтакте" htmlFor="vk" error={err('vk')}>
          <Input
            id="vk"
            name="vk"
            type="url"
            defaultValue={socials.vk ?? ''}
            invalid={!!err('vk')}
            placeholder="https://vk.com/..."
          />
        </Field>

        <Field label="WhatsApp" htmlFor="whatsapp" error={err('whatsapp')}>
          <Input
            id="whatsapp"
            name="whatsapp"
            type="url"
            defaultValue={socials.whatsapp ?? ''}
            invalid={!!err('whatsapp')}
            placeholder="https://wa.me/..."
          />
        </Field>
      </Card>

      <div>
        <SubmitButton>Сохранить</SubmitButton>
      </div>
    </form>
  )
}
