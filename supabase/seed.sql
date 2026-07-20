-- =============================================================================
-- Демо-тенант для показа клиентам: кофейня «Флора».
--
-- Запускать в Supabase → SQL Editor ПОСЛЕ миграций. Повторный запуск безопасен:
-- тенант пересоздаётся с нуля.
--
-- Это не тестовые данные для проверки RLS — те лежат в supabase/checks/.
-- Здесь заполнено всё, что видно на сайте, чтобы демка не выглядела пустой.
--
-- Владелец не привязывается: аккаунт заводится через Authentication → Users,
-- а связь добавляется в конце файла — раскомментируй и подставь почту.
-- =============================================================================

do $$
declare
  v_tenant uuid;
  v_coffee uuid;
  v_food uuid;
  v_dessert uuid;
begin
  delete from public.tenants where slug = 'flora-demo';

  insert into public.tenants (slug, name)
  values ('flora-demo', 'Кофейня «Флора»')
  returning id into v_tenant;

  insert into public.site_settings (
    tenant_id, phone, address, working_hours, about, primary_color, socials
  )
  values (
    v_tenant,
    '+7 900 123-45-67',
    'Тула, ул. Металлистов, 10',
    'Пн–Пт 08:00–22:00, Сб–Вс 09:00–23:00',
    'Небольшая кофейня в центре. Обжариваем зерно сами, печём каждое утро.',
    '#6f4e37',
    '{"telegram": "https://t.me/example", "vk": "https://vk.com/example"}'::jsonb
  );

  -- --- Меню ---------------------------------------------------------------
  insert into public.menu_categories (tenant_id, name, sort_order)
  values (v_tenant, 'Кофе', 10) returning id into v_coffee;

  insert into public.menu_categories (tenant_id, name, sort_order)
  values (v_tenant, 'Завтраки', 20) returning id into v_food;

  insert into public.menu_categories (tenant_id, name, sort_order)
  values (v_tenant, 'Десерты', 30) returning id into v_dessert;

  insert into public.menu_items
    (tenant_id, category_id, name, description, price, is_available, sort_order)
  values
    (v_tenant, v_coffee,  'Эспрессо',   'Двойной, обжарка недели',            160.00, true,  10),
    (v_tenant, v_coffee,  'Капучино',   'На фермерском молоке',               220.00, true,  20),
    (v_tenant, v_coffee,  'Раф',        'Сливочный, с ванилью',               280.00, true,  30),
    (v_tenant, v_coffee,  'Фильтр',     'Меняем зерно каждую неделю',         190.00, true,  40),
    (v_tenant, v_food,    'Сырники',    'Со сметаной и вареньем',             320.00, true,  10),
    (v_tenant, v_food,    'Овсяная каша', 'С бананом и мёдом',                 240.00, true,  20),
    (v_tenant, v_food,    'Авокадо-тост', 'На заквасочном хлебе, с яйцом',    390.00, true,  30),
    (v_tenant, v_dessert, 'Чизкейк',    'Классический нью-йоркский',          290.00, true,  10),
    (v_tenant, v_dessert, 'Медовик',    'Домашний, по бабушкиному рецепту',   260.00, true,  20),
    (v_tenant, v_dessert, 'Тирамису',   'Закончился, привезём завтра',        310.00, false, 30);

  -- --- Акции --------------------------------------------------------------
  insert into public.promotions (tenant_id, title, description, starts_at, ends_at, is_active)
  values
    (v_tenant, 'Второй кофе за половину',
     'По будням с 8:00 до 11:00 — второй напиток со скидкой 50%.',
     now() - interval '3 days', now() + interval '30 days', true),
    (v_tenant, 'Завтрак с собой',
     'Любой завтрак навынос — скидка 15%.',
     null, null, true),
    (v_tenant, 'Новогоднее меню',
     'Готовится, включим ближе к праздникам.',
     null, null, false);

  -- --- Новости ------------------------------------------------------------
  insert into public.news (tenant_id, title, slug, body, is_published, published_at)
  values
    (v_tenant, 'Мы открылись', 'my-otkrylis',
     E'Спасибо всем, кто зашёл в первый день.\n\nРаботаем каждый день с восьми утра. Заходите на завтрак — сырники и каша готовятся с утра, а зерно мы обжариваем сами.',
     true, now() - interval '14 days'),
    (v_tenant, 'Новое зерно из Эфиопии', 'novoe-zerno',
     E'Привезли партию из региона Иргачеффе.\n\nВ чашке — цитрус и цветочные ноты. Пробуйте в фильтре: так вкус раскрывается лучше всего.',
     true, now() - interval '3 days'),
    (v_tenant, 'Готовим летнее меню', 'letnee-menyu',
     E'Черновик: не публиковать до июня.',
     false, null);

  raise notice 'Демо-тенант создан. Сайт: /flora-demo';
end;
$$;

-- Привязка владельца. Заведи пользователя в Authentication → Users,
-- подставь его почту и раскомментируй:
--
-- insert into public.tenant_members (user_id, tenant_id, role)
-- select u.id, t.id, 'owner'
-- from auth.users u, public.tenants t
-- where u.email = 'ВСТАВЬ_ПОЧТУ' and t.slug = 'flora-demo'
-- on conflict do nothing;

select
  t.slug,
  t.name,
  (select count(*) from public.menu_items m where m.tenant_id = t.id) as позиций,
  (select count(*) from public.promotions p where p.tenant_id = t.id) as акций,
  (select count(*) from public.news n where n.tenant_id = t.id) as новостей
from public.tenants t
where t.slug = 'flora-demo';
