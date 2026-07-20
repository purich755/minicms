-- =============================================================================
-- Заглушки того, что Supabase даёт из коробки.
--
-- Нужны ТОЛЬКО локальному прогону (npm run test:rls) на PGlite — Postgres,
-- скомпилированном в WASM. В самом Supabase этот файл не запускается: там
-- схемы auth и storage уже есть.
--
-- Если Supabase поменяет реализацию auth.uid() или storage.foldername(),
-- заглушки надо будет подтянуть — иначе локальный прогон начнёт расходиться
-- с боевой средой.
-- =============================================================================

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

-- ---------------- auth ----------------
create schema if not exists auth;

create table auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- Копия реализации Supabase: достаёт sub из JWT-претензий запроса.
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

-- ---------------- storage ----------------
create schema if not exists storage;

create table storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id        uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name      text,
  owner     uuid
);

alter table storage.objects enable row level security;

-- Возвращает сегменты пути без имени файла: 'uuid/menu/x.jpg' → {uuid, menu}
create or replace function storage.foldername(name text) returns text[]
language plpgsql immutable
as $$
declare
  _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end
$$;

grant usage on schema storage to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;
