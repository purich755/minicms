-- =============================================================================
-- Фаза 1 · Миграция 3/3 — хранилище картинок
--
-- Один бакет на весь сервис, папка на тенанта:
--   {tenant_id}/menu/...   фото позиций меню
--   {tenant_id}/news/...   обложки новостей
--   {tenant_id}/site/...   логотип и прочее из настроек
--
-- Бакет публичный на чтение: публичные страницы рендерятся на сервере и отдают
-- прямые CDN-ссылки, без подписи и без похода в Supabase из браузера посетителя.
-- Запись закрыта тем же tenant_id, что и таблицы.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-media',
  'tenant-media',
  true,
  5242880, -- 5 МБ на файл: чтобы один клиент не выел бесплатный гигабайт
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  -- image/svg+xml намеренно не разрешён: SVG умеет исполнять скрипты.
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Чтение — всем. Картинки меню и новостей по определению публичны.
-- -----------------------------------------------------------------------------
drop policy if exists "tenant-media: публичное чтение" on storage.objects;
create policy "tenant-media: публичное чтение"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'tenant-media');

-- -----------------------------------------------------------------------------
-- Запись — только в свою папку.
--
-- storage.foldername(name) разбирает путь на сегменты; первый сегмент обязан
-- быть id одного из тенантов пользователя. Сравниваем как текст, а не через
-- ::uuid — кривой путь тогда просто не пройдёт проверку вместо ошибки каста.
-- -----------------------------------------------------------------------------
drop policy if exists "tenant-media: загрузка в свою папку" on storage.objects;
create policy "tenant-media: загрузка в свою папку"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'tenant-media'
    and (storage.foldername(name))[1] in (
      select t::text from public.user_tenant_ids() t
    )
  );

drop policy if exists "tenant-media: замена своих файлов" on storage.objects;
create policy "tenant-media: замена своих файлов"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'tenant-media'
    and (storage.foldername(name))[1] in (
      select t::text from public.user_tenant_ids() t
    )
  )
  with check (
    bucket_id = 'tenant-media'
    and (storage.foldername(name))[1] in (
      select t::text from public.user_tenant_ids() t
    )
  );

drop policy if exists "tenant-media: удаление своих файлов" on storage.objects;
create policy "tenant-media: удаление своих файлов"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'tenant-media'
    and (storage.foldername(name))[1] in (
      select t::text from public.user_tenant_ids() t
    )
  );
