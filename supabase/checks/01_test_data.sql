-- =============================================================================
-- Фаза 1 · Тестовые данные для проверки изоляции тенантов
--
-- ПЕРЕД ЗАПУСКОМ создай двух пользователей руками:
--   Supabase → Authentication → Users → Add user (галку «Auto Confirm User» включить)
--     flora@mini-cms.test
--     zarya@mini-cms.test
--   Пароли любые, они нужны только для теста.
--
-- Скрипт находит их по email — вставлять UUID руками не нужно.
-- Запускать в Supabase → SQL Editor. Повторный запуск безопасен: тестовые
-- тенанты пересоздаются с нуля.
--
-- Данные подобраны так, чтобы числа в 02_rls_check.sql были однозначными:
--   news        3 строки, опубликованы 2
--   menu_items  3 строки, доступны     2
--   promotions  2 строки, публично видна 1
-- =============================================================================

do $$
declare
  v_flora_user uuid;
  v_zarya_user uuid;
  v_flora uuid;
  v_zarya uuid;
  v_cat_flora uuid;
  v_cat_zarya uuid;
begin
  select id into v_flora_user from auth.users where email = 'flora@mini-cms.test';
  select id into v_zarya_user from auth.users where email = 'zarya@mini-cms.test';

  if v_flora_user is null or v_zarya_user is null then
    raise exception
      'Не найдены тестовые пользователи. Заведи flora@mini-cms.test и zarya@mini-cms.test в Authentication → Users.';
  end if;

  -- Чистим прошлый прогон. Каскад унесёт весь контент тенанта.
  delete from public.tenants where slug in ('flora', 'zarya');

  insert into public.tenants (slug, name, owner_user_id)
  values ('flora', 'Кофейня «Флора»', v_flora_user)
  returning id into v_flora;

  insert into public.tenants (slug, name, owner_user_id)
  values ('zarya', 'Барбершоп «Заря»', v_zarya_user)
  returning id into v_zarya;

  insert into public.tenant_members (user_id, tenant_id, role)
  values (v_flora_user, v_flora, 'owner'),
         (v_zarya_user, v_zarya, 'owner');

  insert into public.site_settings (tenant_id, phone, address, working_hours, about, primary_color)
  values
    (v_flora, '+7 900 000-00-01', 'Тула, ул. Ленина, 1', 'Пн–Вс 08:00–22:00',
     'Кофейня в центре города.', '#6F4E37'),
    (v_zarya, '+7 900 000-00-02', 'Тула, пр. Красноармейский, 5', 'Пн–Сб 10:00–20:00',
     'Барбершоп для тех, кто ценит время.', '#1F2937');

  -- --- Флора: 1 категория, 2 позиции (одна снята с продажи) ---
  insert into public.menu_categories (tenant_id, name, sort_order)
  values (v_flora, 'Кофе', 10)
  returning id into v_cat_flora;

  insert into public.menu_items (tenant_id, category_id, name, description, price, is_available, sort_order)
  values
    (v_flora, v_cat_flora, 'Капучино', 'На молоке из местной фермы', 220.00, true,  10),
    (v_flora, v_cat_flora, 'Раф',      'Временно недоступен',        280.00, false, 20);

  -- --- Заря: 1 категория, 1 позиция ---
  insert into public.menu_categories (tenant_id, name, sort_order)
  values (v_zarya, 'Стрижки', 10)
  returning id into v_cat_zarya;

  insert into public.menu_items (tenant_id, category_id, name, description, price, is_available, sort_order)
  values (v_zarya, v_cat_zarya, 'Модельная стрижка', 'Мытьё и укладка включены', 1500.00, true, 10);

  -- --- Акции: у Флоры активная, у Зари выключенная ---
  insert into public.promotions (tenant_id, title, description, is_active)
  values
    (v_flora, 'Второй кофе бесплатно', 'По будням до 12:00', true),
    (v_zarya, 'Скидка выходного дня',  'Пока не запущена',   false);

  -- --- Новости: у Флоры опубликованная и черновик, у Зари опубликованная ---
  insert into public.news (tenant_id, title, slug, body, is_published, published_at)
  values
    (v_flora, 'Мы открылись', 'my-otkrylis', 'Ждём вас каждый день.', true,  now() - interval '1 day'),
    (v_flora, 'Черновик',     'chernovik',   'Этого никто не должен увидеть.', false, null),
    (v_zarya, 'Новые мастера','novye-mastera','В команде пополнение.', true,  now() - interval '2 day');

  raise notice 'Тестовые тенанты созданы: flora=% zarya=%', v_flora, v_zarya;
end;
$$;

-- Что получилось
select
  t.slug,
  t.name,
  (select count(*) from public.menu_items  m where m.tenant_id = t.id) as позиций_меню,
  (select count(*) from public.promotions  p where p.tenant_id = t.id) as акций,
  (select count(*) from public.news        n where n.tenant_id = t.id) as новостей
from public.tenants t
where t.slug in ('flora', 'zarya')
order by t.slug;
