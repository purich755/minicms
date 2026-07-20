-- =============================================================================
-- Фаза 1 · Миграция 1/3 — таблицы, индексы, гранты
--
-- Мультитенантная схема: каждая контентная строка принадлежит тенанту через
-- tenant_id. RLS-политики живут в отдельной миграции (20260720120100).
--
-- Гранты выписаны явно: в новых проектах Supabase роли anon/authenticated не
-- получают права на новые таблицы автоматически, и без GRANT данные не будут
-- видны через Data API (PostgREST), даже если RLS всё разрешает.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- tenants — клиенты (бизнесы)
-- -----------------------------------------------------------------------------
create table if not exists public.tenants (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  custom_domain  text unique,
  plan           text not null default 'free' check (plan in ('free', 'basic', 'pro')),
  owner_user_id  uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),

  -- Слаг = адрес публичного сайта (/{slug}), поэтому только латиница, цифры,
  -- дефис. Зарезервированные слова исключены: иначе тенант со слагом "admin"
  -- перекроет маршрут админки.
  constraint tenants_slug_format check (
    slug ~ '^[a-z][a-z0-9-]{1,62}$'
    and slug not in ('admin', 'api', 'www', 'app', 'static', 'public', 'assets', '_next')
  )
);

comment on table public.tenants is 'Клиенты сервиса. Одна строка — один бизнес со своим сайтом.';
comment on column public.tenants.custom_domain is 'Свой домен клиента, например flora-cafe.ru. Используется в Фазе 5.';

-- -----------------------------------------------------------------------------
-- tenant_members — кто каким тенантом владеет
-- -----------------------------------------------------------------------------
create table if not exists public.tenant_members (
  user_id    uuid not null references auth.users (id) on delete cascade,
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  role       text not null default 'owner' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

comment on table public.tenant_members is
  'Связь пользователь → тенант. Именно эта таблица определяет, чьи данные видит владелец.';

create index if not exists tenant_members_tenant_id_idx on public.tenant_members (tenant_id);

-- -----------------------------------------------------------------------------
-- site_settings — настройки сайта, одна строка на тенанта
-- -----------------------------------------------------------------------------
create table if not exists public.site_settings (
  tenant_id      uuid primary key references public.tenants (id) on delete cascade,
  logo_url       text,
  primary_color  text not null default '#111827'
                 check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  phone          text,
  address        text,
  working_hours  text,
  socials        jsonb not null default '{}'::jsonb,
  about          text,
  yandex_map_url text,
  updated_at     timestamptz not null default now()
);

comment on column public.site_settings.socials is
  'Ссылки на соцсети: {"telegram": "...", "vk": "...", "whatsapp": "..."}';

-- -----------------------------------------------------------------------------
-- menu_categories — категории меню
-- -----------------------------------------------------------------------------
create table if not exists public.menu_categories (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  name       text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  -- Нужен для составного внешнего ключа из menu_items (см. ниже).
  constraint menu_categories_id_tenant_key unique (id, tenant_id)
);

create index if not exists menu_categories_tenant_sort_idx
  on public.menu_categories (tenant_id, sort_order);

-- -----------------------------------------------------------------------------
-- menu_items — позиции меню
-- -----------------------------------------------------------------------------
create table if not exists public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  category_id  uuid,
  name         text not null,
  description  text,
  price        numeric(10, 2) not null default 0 check (price >= 0),
  image_url    text,
  is_available boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),

  -- Составной ключ, а не просто (category_id) → (id): так позиция физически не
  -- может ссылаться на категорию чужого тенанта. Обычный FK это не ловит.
  -- category_id = null означает «без категории» (MATCH SIMPLE не проверяет
  -- ключ, если хотя бы одна колонка null).
  -- Удаление категории с позициями блокируется — в админке (Фаза 3) сначала
  -- предложим перенести или удалить позиции.
  constraint menu_items_category_same_tenant_fkey
    foreign key (category_id, tenant_id)
    references public.menu_categories (id, tenant_id)
);

create index if not exists menu_items_tenant_sort_idx
  on public.menu_items (tenant_id, sort_order);
create index if not exists menu_items_category_idx
  on public.menu_items (category_id);

comment on column public.menu_items.price is 'Цена в рублях. numeric(10,2) — до 99 999 999.99 ₽.';

-- -----------------------------------------------------------------------------
-- promotions — акции
-- -----------------------------------------------------------------------------
create table if not exists public.promotions (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  title       text not null,
  description text,
  image_url   text,
  starts_at   timestamptz,
  ends_at     timestamptz,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),

  constraint promotions_dates_order check (
    starts_at is null or ends_at is null or ends_at >= starts_at
  )
);

create index if not exists promotions_tenant_active_idx
  on public.promotions (tenant_id, is_active);

comment on column public.promotions.starts_at is
  'null = «уже идёт». ends_at null = «без даты окончания».';

-- -----------------------------------------------------------------------------
-- news — новости
-- -----------------------------------------------------------------------------
create table if not exists public.news (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  title           text not null,
  slug            text not null,
  body            text,
  cover_image_url text,
  is_published    boolean not null default false,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),

  -- Слаг уникален внутри тенанта, а не глобально: два кафе спокойно могут
  -- завести новость /news/otkrytie.
  constraint news_tenant_slug_key unique (tenant_id, slug),
  constraint news_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,127}$')
);

create index if not exists news_tenant_published_idx
  on public.news (tenant_id, is_published, published_at desc);

-- -----------------------------------------------------------------------------
-- updated_at для site_settings
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists site_settings_touch_updated_at on public.site_settings;
create trigger site_settings_touch_updated_at
  before update on public.site_settings
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- ГРАНТЫ
--
-- Сначала снимаем всё, потом выдаём точечно — чтобы не осталось прав,
-- доставшихся от дефолтных привилегий проекта.
--
-- Права на строки этим не даются: что именно увидит роль, решает RLS.
-- GRANT — это «на какие таблицы и колонки вообще можно смотреть»,
-- RLS — «какие строки из них».
-- =============================================================================

grant usage on schema public to anon, authenticated;

revoke all on public.tenants        from anon, authenticated;
revoke all on public.tenant_members from anon, authenticated;
revoke all on public.site_settings  from anon, authenticated;
revoke all on public.menu_categories from anon, authenticated;
revoke all on public.menu_items     from anon, authenticated;
revoke all on public.promotions     from anon, authenticated;
revoke all on public.news           from anon, authenticated;

-- tenants: публично нужны только адресные поля.
-- ВНИМАНИЕ: plan и owner_user_id наружу не отдаются, поэтому запросы к tenants
-- обязаны перечислять колонки явно. select('*') упрётся в permission denied.
grant select (id, slug, name, custom_domain) on public.tenants to anon, authenticated;
grant update (name, custom_domain)           on public.tenants to authenticated;
-- Создание и удаление тенантов — операция провижининга, только service role.

-- tenant_members: читаем свои членства, писать с клиента нельзя.
grant select on public.tenant_members to authenticated;

-- Контентные таблицы: аноним читает, владелец правит.
grant select                         on public.site_settings   to anon, authenticated;
grant insert, update, delete         on public.site_settings   to authenticated;

grant select                         on public.menu_categories to anon, authenticated;
grant insert, update, delete         on public.menu_categories to authenticated;

grant select                         on public.menu_items      to anon, authenticated;
grant insert, update, delete         on public.menu_items      to authenticated;

grant select                         on public.promotions      to anon, authenticated;
grant insert, update, delete         on public.promotions      to authenticated;

grant select                         on public.news            to anon, authenticated;
grant insert, update, delete         on public.news            to authenticated;
