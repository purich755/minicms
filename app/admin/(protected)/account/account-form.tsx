'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/ui/buttons'
import { Card, Field, FormError, Input } from '@/components/ui/form'
import { EMPTY_FORM_STATE, PASSWORD_MIN_LENGTH } from '@/lib/validation'

import { changePassword } from './actions'

export function PasswordForm() {
  const [state, formAction] = useActionState(changePassword, EMPTY_FORM_STATE)
  const err = (field: string) => state.fieldErrors?.[field]

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      <FormError>{state.error}</FormError>

      {state.ok ? (
        <p className="rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-800">
          Пароль изменён. В следующий раз входите с новым.
        </p>
      ) : null}

      <Card className="flex flex-col gap-5 p-5">
        <Field label="Текущий пароль" htmlFor="current_password" error={err('current_password')}>
          <Input
            id="current_password"
            name="current_password"
            type="password"
            autoComplete="current-password"
            required
            invalid={!!err('current_password')}
          />
        </Field>

        <Field
          label="Новый пароль"
          htmlFor="password"
          error={err('password')}
          hint={`Не короче ${PASSWORD_MIN_LENGTH} символов.`}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            invalid={!!err('password')}
          />
        </Field>

        <Field label="Новый пароль ещё раз" htmlFor="password_confirmation">
          <Input
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>
      </Card>

      <div>
        <SubmitButton pendingText="Меняем…">Сменить пароль</SubmitButton>
      </div>
    </form>
  )
}
