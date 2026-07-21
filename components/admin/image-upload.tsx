'use client'

import { useRef, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import {
  ALLOWED_IMAGE_TYPES,
  buildMediaPath,
  MEDIA_BUCKET,
  validateImage,
  type MediaFolder,
} from '@/lib/storage'

/**
 * Загрузка картинки прямо из браузера в Supabase Storage.
 *
 * Файл НЕ идёт через сервер Next: server actions ограничены размером тела
 * запроса, и пятимегабайтное фото упёрлось бы в этот лимит. Браузер грузит
 * файл в Storage сам, а в форму подставляется готовая ссылка.
 *
 * Право на запись проверяет не этот код, а политика Storage: первый сегмент
 * пути обязан быть id одного из тенантов пользователя. Проверки размера и
 * типа здесь — вежливость к пользователю, настоящий предел стоит на бакете.
 */
export function ImageUpload({
  name,
  tenantId,
  folder,
  initialUrl,
  label = 'Изображение',
  hint,
}: {
  name: string
  tenantId: string
  folder: MediaFolder
  initialUrl?: string | null
  label?: string
  hint?: string
}) {
  const [url, setUrl] = useState(initialUrl ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const problem = validateImage(file)
    if (problem) {
      setError(problem)
      return
    }

    setError('')
    setBusy(true)

    try {
      const supabase = createClient()
      const path = buildMediaPath(tenantId, folder, file.type)

      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        setError('Не удалось загрузить файл. Попробуйте ещё раз.')
        return
      }

      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
      setUrl(data.publicUrl)
    } catch {
      setError('Не удалось загрузить файл. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
      // Сбрасываем input, иначе повторный выбор того же файла не сработает.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>

      {/* Ссылка уезжает в server action вместе с остальными полями формы */}
      <input type="hidden" name={name} value={url} />

      {url ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- произвольная
              ссылка из Storage без известных размеров; это превью в админке,
              оптимизация next/image здесь ничего не даёт */}
          <img
            src={url}
            alt=""
            className="size-20 rounded-lg border border-[var(--border)] object-cover"
          />
          <button
            type="button"
            onClick={() => setUrl('')}
            className="text-sm text-[var(--danger)] hover:underline"
          >
            Убрать
          </button>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleFile(file)
        }}
        className="text-sm file:mr-3 file:rounded-lg file:border file:border-[var(--border)] file:bg-white file:px-3 file:py-1.5 file:text-sm hover:file:bg-[var(--surface)]"
      />

      {busy ? <p className="text-xs text-[var(--muted)]">Загружаем…</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      {!error && !busy ? (
        <p className="text-xs text-[var(--muted)]">
          {hint ? `${hint} ` : ''}JPG, PNG, WebP или AVIF, до 5 МБ.
        </p>
      ) : null}
    </div>
  )
}
