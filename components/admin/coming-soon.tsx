/**
 * Заглушка для разделов, которые появятся в Фазе 3.
 * Нужна, чтобы навигация была рабочей, а не вела в 404.
 */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-[var(--border)] bg-white p-8">
        <p className="text-sm text-[var(--muted)]">{description}</p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Раздел появится в Фазе 3 — редактирование содержимого.
        </p>
      </div>
    </>
  )
}
