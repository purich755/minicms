-- =============================================================================
-- Фаза 1 · Миграция 2/3 — Row-Level Security
--
-- Это главный рубеж изоляции тенантов. Фильтрация по tenant_id в коде — удобство;
-- защита — вот эти политики. Даже если в приложении будет баг и запрос уйдёт без
-- .eq('tenant_id', ...), Postgres не отдаст чужие строки.
--
-- Модель ролей:
--   anon          — публичный сайт. Видит только опубликованное, писать не может.
--   authenticated — владелец бизнеса. Видит и правит ТОЛЬКО свои строки.
--   service_role  — обходит RLS полностью. Только серверный код провижининга.
--
-- Важно: публичное чтение выписано на роль anon, а НЕ на «anon, authenticated».
-- Поэтому публичные страницы обязаны ходить в базу без сессии — этим занимается
-- lib/supabase/public.ts. Если бы публичные политики распространялись и на
-- authenticated, залогиненный владелец одного кафе мог бы прочитать строки
-- другого (пусть и только опубликованные). Сейчас — не может ни одной.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Какие тенанты принадлежат текущему пользователю
--
-- security definer здесь обязателен: функция читает tenant_members, на которой
-- тоже включён RLS. Без definer политика, ссылающаяся на эту таблицу, ушла бы
-- в бесконечную рекурсию.
--
-- set search_path = '' — защита от подмены search_path: внутри definer-функции
-- все имена обязаны быть полными (public.*, auth.*).
--
-- stable — результат не меняется в пределах запроса, планировщик вычислит его
-- один раз, а не на каждую строку.
-- -----------------------------------------------------------------------------
create or replace function public.user_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tm.tenant_id
  from public.tenant_members tm
  where tm.user_id = (select auth.uid())
$$;

comment on function public.user_tenant_ids() is
  'Тенанты текущего пользователя. Используется во всех RLS-политиках владельца.';

revoke all on function public.user_tenant_ids() from public;
grant execute on function public.user_tenant_ids() to authenticated;

-- -----------------------------------------------------------------------------
-- Включаем RLS. Без политик это означает «не видно ничего» — то есть отказ
-- по умолчанию, а доступ появляется только там, где выписан явно.
-- -----------------------------------------------------------------------------
alter table public.tenants         enable row level security;
alter table public.tenant_members  enable row level security;
alter table public.site_settings   enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items      enable row level security;
alter table public.promotions      enable row level security;
alter table public.news            enable row level security;

-- =============================================================================
-- tenants
-- =============================================================================

-- Публичный сайт должен уметь найти тенанта по слагу или домену.
-- Наружу уходят только адресные колонки — это ограничено грантами в миграции 1.
drop policy if exists "tenants: публичное чтение" on public.tenants;
create policy "tenants: публичное чтение"
  on public.tenants for select
  to anon
  using (true);

-- Админке нужен свой тенант (название, слаг). Чужие — нет.
drop policy if exists "tenants: владелец читает свой" on public.tenants;
create policy "tenants: владелец читает свой"
  on public.tenants for select
  to authenticated
  using (id in (select t from public.user_tenant_ids() t));

drop policy if exists "tenants: владелец правит свой" on public.tenants;
create policy "tenants: владелец правит свой"
  on public.tenants for update
  to authenticated
  using      (id in (select t from public.user_tenant_ids() t))
  with check (id in (select t from public.user_tenant_ids() t));

-- =============================================================================
-- tenant_members
--
-- Читаем строго свои членства напрямую по user_id, а не через user_tenant_ids():
-- иначе политика на таблице ссылалась бы на функцию, читающую эту же таблицу.
-- Запись с клиента не предусмотрена — владельцы заводятся под service role.
-- =============================================================================
drop policy if exists "tenant_members: свои членства" on public.tenant_members;
create policy "tenant_members: свои членства"
  on public.tenant_members for select
  to authenticated
  using (user_id = (select auth.uid()));

-- =============================================================================
-- site_settings — настройки сайта публичны целиком (телефон, адрес, часы)
-- =============================================================================
drop policy if exists "site_settings: публичное чтение" on public.site_settings;
create policy "site_settings: публичное чтение"
  on public.site_settings for select
  to anon
  using (true);

drop policy if exists "site_settings: владелец правит свои" on public.site_settings;
create policy "site_settings: владелец правит свои"
  on public.site_settings for all
  to authenticated
  using      (tenant_id in (select t from public.user_tenant_ids() t))
  with check (tenant_id in (select t from public.user_tenant_ids() t));

-- =============================================================================
-- menu_categories — категории показываем все
-- =============================================================================
drop policy if exists "menu_categories: публичное чтение" on public.menu_categories;
create policy "menu_categories: публичное чтение"
  on public.menu_categories for select
  to anon
  using (true);

drop policy if exists "menu_categories: владелец правит свои" on public.menu_categories;
create policy "menu_categories: владелец правит свои"
  on public.menu_categories for all
  to authenticated
  using      (tenant_id in (select t from public.user_tenant_ids() t))
  with check (tenant_id in (select t from public.user_tenant_ids() t));

-- =============================================================================
-- menu_items
--
-- Снятая галка «в наличии» убирает позицию с публичного сайта.
-- Владелец при этом видит её в админке — своя политика отдаёт все свои строки
-- независимо от is_available.
-- =============================================================================
drop policy if exists "menu_items: публично только доступные" on public.menu_items;
create policy "menu_items: публично только доступные"
  on public.menu_items for select
  to anon
  using (is_available = true);

drop policy if exists "menu_items: владелец правит свои" on public.menu_items;
create policy "menu_items: владелец правит свои"
  on public.menu_items for all
  to authenticated
  using      (tenant_id in (select t from public.user_tenant_ids() t))
  with check (tenant_id in (select t from public.user_tenant_ids() t));

-- =============================================================================
-- promotions
--
-- Публично видна акция, которая включена И попадает в текущее окно дат.
-- Просроченная акция исчезает с сайта сама, без крона.
-- =============================================================================
drop policy if exists "promotions: публично только активные" on public.promotions;
create policy "promotions: публично только активные"
  on public.promotions for select
  to anon
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >= now())
  );

drop policy if exists "promotions: владелец правит свои" on public.promotions;
create policy "promotions: владелец правит свои"
  on public.promotions for all
  to authenticated
  using      (tenant_id in (select t from public.user_tenant_ids() t))
  with check (tenant_id in (select t from public.user_tenant_ids() t));

-- =============================================================================
-- news
--
-- Черновик наружу не уходит. Отложенная публикация (published_at в будущем)
-- тоже не уходит — новость появится сама, когда время придёт.
-- =============================================================================
drop policy if exists "news: публично только опубликованные" on public.news;
create policy "news: публично только опубликованные"
  on public.news for select
  to anon
  using (
    is_published = true
    and (published_at is null or published_at <= now())
  );

drop policy if exists "news: владелец правит свои" on public.news;
create policy "news: владелец правит свои"
  on public.news for all
  to authenticated
  using      (tenant_id in (select t from public.user_tenant_ids() t))
  with check (tenant_id in (select t from public.user_tenant_ids() t));
