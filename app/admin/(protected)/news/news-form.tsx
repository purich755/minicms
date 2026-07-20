'use client'

import { useActionState } from 'react'

import { ImageUpload } from '@/components/admin/image-upload'
import { DeleteButton, LinkButton, SubmitButton } from '@/components/ui/buttons'
import { Card, Checkbox, Field, FormError, Input, Textarea } from '@/components/ui/form'
import { toDateTimeLocal } from '@/lib/format'
import type { Row } from '@/lib/types'
import { EMPTY_FORM_STATE } from '@/lib/validation'

import { deleteNews, saveNews } from './actions'

export function NewsForm({ tenantId, item }: { tenantId: string; item?: Row<'news'> }) {
  const [state, formAction] = useActionState(saveNews, EMPTY_FORM_STATE)
  const [deleteState, deleteAction] = useActionState(deleteNews, EMPTY_FORM_STATE)
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
            />
          </Field>

          <Field
            label="Адрес страницы"
            htmlFor="slug"
            error={err('slug')}
            hint="Можно не заполнять — составим из заголовка."
          >
            <Input
              id="slug"
              name="slug"
              defaultValue={item?.slug ?? ''}
              invalid={!!err('slug')}
              placeholder="my-otkrylis"
            />
          </Field>

          <ImageUpload
            name="cover_image_url"
            tenantId={tenantId}
            folder="news"
            initialUrl={item?.cover_image_url}
            label="Обложка"
          />

          <Field label="Текст" htmlFor="body" error={err('body')}>
            <Textarea
              id="body"
              name="body"
              defaultValue={item?.body ?? ''}
              invalid={!!err('body')}
              className="min-h-56"
            />
          </Field>
        </Card>

        <Card className="flex flex-col gap-5 p-5">
          <Checkbox
            name="is_published"
            label="Опубликовать"
            hint="Пока галка снята, новость видите только вы."
            defaultChecked={item?.is_published ?? false}
          />

          <Field
            label="Дата публикации"
            htmlFor="published_at"
            error={err('published_at')}
            hint="Оставьте пустым — опубликуем сразу. Дата в будущем: новость появится сама."
          >
            <Input
              id="published_at"
              name="published_at"
              type="datetime-local"
              defaultValue={toDateTimeLocal(item?.published_at)}
              invalid={!!err('published_at')}
            />
          </Field>
        </Card>

        <div className="flex gap-3">
          <SubmitButton>{item ? 'Сохранить' : 'Создать'}</SubmitButton>
          <LinkButton href="/admin/news">Отмена</LinkButton>
        </div>
      </form>

      {item ? (
        <form action={deleteAction} className="border-t border-[var(--border)] pt-5">
          <input type="hidden" name="id" value={item.id} />
          <FormError>{deleteState.error}</FormError>
          <div className="mt-2">
            <DeleteButton confirmText={`Удалить новость «${item.title}»? Это необратимо.`}>
              Удалить новость
            </DeleteButton>
          </div>
        </form>
      ) : null}
    </div>
  )
}
