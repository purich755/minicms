'use client'

import { useActionState } from 'react'

import { DeleteButton, LinkButton, SubmitButton } from '@/components/ui/buttons'
import { Card, Field, FormError, Input } from '@/components/ui/form'
import type { Row } from '@/lib/types'
import { EMPTY_FORM_STATE } from '@/lib/validation'

import { deleteCategory, saveCategory } from './actions'

export function CategoryForm({ item }: { item?: Row<'menu_categories'> }) {
  const [state, formAction] = useActionState(saveCategory, EMPTY_FORM_STATE)
  const [deleteState, deleteAction] = useActionState(deleteCategory, EMPTY_FORM_STATE)
  const err = (field: string) => state.fieldErrors?.[field]

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-5">
        {item ? <input type="hidden" name="id" value={item.id} /> : null}

        <FormError>{state.error}</FormError>

        <Card className="flex flex-col gap-5 p-5">
          <Field label="Название" htmlFor="name" error={err('name')}>
            <Input
              id="name"
              name="name"
              defaultValue={item?.name ?? ''}
              invalid={!!err('name')}
              required
              autoFocus={!item}
              placeholder="Кофе"
            />
          </Field>

          <Field
            label="Порядок"
            htmlFor="sort_order"
            error={err('sort_order')}
            hint="Чем меньше число, тем выше категория в меню."
          >
            <Input
              id="sort_order"
              name="sort_order"
              type="number"
              step="10"
              defaultValue={item?.sort_order ?? 0}
              invalid={!!err('sort_order')}
              className="max-w-32"
            />
          </Field>
        </Card>

        <div className="flex gap-3">
          <SubmitButton>{item ? 'Сохранить' : 'Создать'}</SubmitButton>
          <LinkButton href="/admin/menu">Отмена</LinkButton>
        </div>
      </form>

      {item ? (
        <form action={deleteAction} className="border-t border-[var(--border)] pt-5">
          <input type="hidden" name="id" value={item.id} />
          <FormError>{deleteState.error}</FormError>
          <div className="mt-2">
            <DeleteButton confirmText={`Удалить категорию «${item.name}»?`}>
              Удалить категорию
            </DeleteButton>
          </div>
        </form>
      ) : null}
    </div>
  )
}
