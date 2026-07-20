'use client'

import { useActionState } from 'react'

import { ImageUpload } from '@/components/admin/image-upload'
import { DeleteButton, LinkButton, SubmitButton } from '@/components/ui/buttons'
import { Card, Checkbox, Field, FormError, Input, Textarea } from '@/components/ui/form'
import { toDateTimeLocal } from '@/lib/format'
import type { Row } from '@/lib/types'
import { EMPTY_FORM_STATE } from '@/lib/validation'

import { deletePromotion, savePromotion } from './actions'

export function PromotionForm({
  tenantId,
  item,
}: {
  tenantId: string
  item?: Row<'promotions'>
}) {
  const [state, formAction] = useActionState(savePromotion, EMPTY_FORM_STATE)
  const [deleteState, deleteAction] = useActionState(deletePromotion, EMPTY_FORM_STATE)
  const err = (field: string) => state.fieldErrors?.[field]

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-5">
        {item ? <input type="hidden" name="id" value={item.id} /> : null}

        <FormError>{state.error}</FormError>

        <Card className="flex flex-col gap-5 p-5">
          <Field label="Заголовок" htmlFor="title" error={err('title')}>
            <Input
              id="title"
              name="title"
              defaultValue={item?.title ?? ''}
              invalid={!!err('title')}
              required
              autoFocus={!item}
              placeholder="Второй кофе бесплатно"
            />
          </Field>

          <Field label="Описание" htmlFor="description" error={err('description')}>
            <Textarea
              id="description"
              name="description"
              defaultValue={item?.description ?? ''}
              invalid={!!err('description')}
              placeholder="По будням до 12:00"
            />
          </Field>

          <ImageUpload
            name="image_url"
            tenantId={tenantId}
            folder="promotions"
            initialUrl={item?.image_url}
            label="Картинка"
          />
        </Card>

        <Card className="flex flex-col gap-5 p-5">
          <h2 className="font-medium">Когда действует</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Начало"
              htmlFor="starts_at"
              error={err('starts_at')}
              hint="Пусто — уже идёт."
            >
              <Input
                id="starts_at"
                name="starts_at"
                type="datetime-local"
                defaultValue={toDateTimeLocal(item?.starts_at)}
                invalid={!!err('starts_at')}
              />
            </Field>

            <Field
              label="Окончание"
              htmlFor="ends_at"
              error={err('ends_at')}
              hint="Пусто — без срока."
            >
              <Input
                id="ends_at"
                name="ends_at"
                type="datetime-local"
                defaultValue={toDateTimeLocal(item?.ends_at)}
                invalid={!!err('ends_at')}
              />
            </Field>
          </div>

          <Checkbox
            name="is_active"
            label="Показывать на сайте"
            hint="Когда срок выйдет, акция исчезнет с сайта сама."
            defaultChecked={item?.is_active ?? true}
          />
        </Card>

        <div className="flex gap-3">
          <SubmitButton>{item ? 'Сохранить' : 'Создать'}</SubmitButton>
          <LinkButton href="/admin/promotions">Отмена</LinkButton>
        </div>
      </form>

      {item ? (
        <form action={deleteAction} className="border-t border-[var(--border)] pt-5">
          <input type="hidden" name="id" value={item.id} />
          <FormError>{deleteState.error}</FormError>
          <div className="mt-2">
            <DeleteButton confirmText={`Удалить акцию «${item.title}»? Это необратимо.`}>
              Удалить акцию
            </DeleteButton>
          </div>
        </form>
      ) : null}
    </div>
  )
}
