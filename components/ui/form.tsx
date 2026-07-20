import type { ComponentProps, ReactNode } from 'react'

/**
 * Примитивы форм админки.
 *
 * Серверные компоненты: интерактива здесь нет, только разметка и стили.
 * Состояние формы живёт в useActionState на уровне страницы.
 */

const CONTROL =
  'w-full rounded-lg border bg-white px-3 py-2.5 outline-none transition ' +
  'focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60'

function borderClass(invalid?: boolean) {
  return invalid
    ? 'border-[var(--danger)] focus:border-[var(--danger)]'
    : 'border-[var(--border)] focus:border-[var(--accent)]'
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-[var(--muted)]">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function Input({
  invalid,
  className = '',
  ...props
}: ComponentProps<'input'> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={`${CONTROL} ${borderClass(invalid)} ${className}`}
    />
  )
}

export function Textarea({
  invalid,
  className = '',
  ...props
}: ComponentProps<'textarea'> & { invalid?: boolean }) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={`${CONTROL} ${borderClass(invalid)} min-h-24 resize-y ${className}`}
    />
  )
}

export function Select({
  invalid,
  className = '',
  ...props
}: ComponentProps<'select'> & { invalid?: boolean }) {
  return (
    <select
      {...props}
      aria-invalid={invalid || undefined}
      className={`${CONTROL} ${borderClass(invalid)} ${className}`}
    />
  )
}

export function Checkbox({
  label,
  hint,
  ...props
}: ComponentProps<'input'> & { label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        {...props}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
      />
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="block text-xs text-[var(--muted)]">{hint}</span> : null}
      </span>
    </label>
  )
}

export function FormError({ children }: { children?: string }) {
  if (!children) return null
  return (
    <p
      role="alert"
      className="rounded-lg bg-[var(--danger)]/8 px-3 py-2.5 text-sm text-[var(--danger)]"
    >
      {children}
    </p>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-white ${className}`}>
      {children}
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-white p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p>
    </div>
  )
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {action}
    </div>
  )
}
