'use client'

import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

const BASE =
  'inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium ' +
  'transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ' +
  // Нажатие должно ощущаться: без этого кнопка кажется неотзывчивой, даже
  // когда работает быстро.
  'active:translate-y-0 disabled:translate-y-0'

const VARIANTS = {
  primary: 'bg-[var(--accent)] text-white hover:-translate-y-0.5',
  secondary: 'border border-[var(--border)] bg-white hover:border-[var(--foreground)]',
  danger: 'border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger)]/8',
} as const

type Variant = keyof typeof VARIANTS

/**
 * Кнопка отправки формы, которая сама знает, что форма отправляется.
 *
 * useFormStatus читает состояние ближайшей формы выше по дереву, поэтому
 * компонент обязан быть ВНУТРИ <form>, а не рядом с ней.
 */
export function SubmitButton({
  children,
  pendingText = 'Сохраняем…',
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<'button'> & {
  children: ReactNode
  pendingText?: string
  variant?: Variant
}) {
  const { pending } = useFormStatus()

  return (
    <button
      {...props}
      type="submit"
      disabled={pending || props.disabled}
      className={`${BASE} ${VARIANTS[variant]} ${className}`}
    >
      {pending ? pendingText : children}
    </button>
  )
}

/** Кнопка удаления с подтверждением: удаление необратимо, спросим один раз. */
export function DeleteButton({
  children = 'Удалить',
  confirmText,
}: {
  children?: ReactNode
  confirmText: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault()
      }}
      className={`${BASE} ${VARIANTS.danger}`}
    >
      {pending ? 'Удаляем…' : children}
    </button>
  )
}

export function LinkButton({
  href,
  children,
  variant = 'secondary',
}: {
  href: string
  children: ReactNode
  variant?: Variant
}) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTS[variant]}`}>
      {children}
    </Link>
  )
}
