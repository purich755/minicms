'use client'

import { useActionState } from 'react'

import { ImageUpload } from '@/components/admin/image-upload'
import { DeleteButton, LinkButton, SubmitButton } from '@/components/ui/buttons'
import { Card, Checkbox, Field, FormError, Input, Select, Textarea } from '@/components/ui/form'
import type { Row } from '@/lib/types'
import { EMPTY_FORM_STATE } from '@/lib/validation'

import { deleteItem, saveItem } from './actions'

export function ItemForm({
  tenantId,
  categories,
  item,
  defaultCategoryId,
}: {
  tenantId: string
  categories: Pick<Row<'menu_categories'>, 'id' | 'name'>[]
  item?: Row<'menu_items'>
  defaultCategoryId?: string
}) {
  const [state, formAction] = useActionState(saveItem, EMPTY_FORM_STATE)
  const [deleteState, deleteAction] = useActionState(deleteItem, EMPTY_FORM_STATE)
  const err = (field: string) => state.fieldErrors?.[field]

  return (
    <div className="flex max-w-2xl flex-col gap-5">
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
              placeholder="Капучино"
            />
          </Field>

          <Field label="Описание" htmlFor="description" error={err('description')}>
            <Textarea
              id="description"
              name="description"
              defaultValue={item?.description ?? ''}
              invalid={!!err('description')}
              placeholder="На молоке из местной фермы"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Цена, ₽" htmlFor="price" error={err('price')}>
              <Input
                id="price"
                name="price"
                inputMode="decimal"
                defaultValue={item ? String(item.price) : ''}
                invalid={!!err('price')}
                required
                placeholder="220"
              />
            </Field>

            <Field label="Категория" htmlFor="category_id" error={err('category_id')}>
              <Select
                id="category_id"
                name="category_id"
                defaultValue={item?.category_id ?? defaultCategoryId ?? ''}
                invalid={!!err('category_id')}
              >
                <option value="">Без категории</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <ImageUpload
            name="image_url"
            tenantId={tenantId}
            folder="menu"
            initialUrl={item?.image_url}
            label="Фото"
          />
        </Card>

        <Card className="flex flex-col gap-5 p-5">
          <Checkbox
            name="is_available"
            label="В наличии"
            hint="Снимете галку — позиция пропадёт с сайта, но останется здесь."
            defaultChecked={item?.is_available ?? true}
          />

          <Field
            label="Порядок"
            htmlFor="sort_order"
            error={err('sort_order')}
            hint="Чем меньше число, тем выше позиция в категории."
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
            <DeleteButton confirmText={`Удалить «${item.name}»? Это необратимо.`}>
              Удалить позицию
            </DeleteButton>
          </div>
        </form>
      ) : null}
    </div>
  )
}
