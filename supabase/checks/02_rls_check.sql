-- =============================================================================
-- Фаза 1 · Проверка изоляции тенантов
--
-- Запускать в Supabase → SQL Editor ПОСЛЕ 01_test_data.sql.
-- Скрипт ничего не меняет: попытки записи либо затрагивают 0 строк, либо
-- отклоняются политиками. В конце выводится одна таблица с вердиктом.
--
-- Как это работает: мы подменяем роль и JWT-претензии ровно так, как это делает
-- PostgREST при запросе из приложения. То есть проверяем настоящий путь доступа,
-- а не «как бы оно выглядело».
--
-- ЛЮБОЙ «ПРОВАЛ» в итоговой таблице — это дыра в изоляции. Дальше Фазы 1 идти
-- нельзя, пока все строки не станут «ОК».
-- =============================================================================

drop table if exists rls_check;
create temp table rls_check (
  n         int,
  сценарий  text,
  проверка  text,
  ожидание  text,
  факт      text
);

-- -----------------------------------------------------------------------------
-- Сценарий 1: владелец «Флоры», роль authenticated
-- -----------------------------------------------------------------------------
do $$
declare
  v_user  uuid;
  v_zarya uuid;
  c_news int; c_news_foreign int;
  c_items int; c_items_foreign int;
  c_promos int; c_promos_foreign int;
  c_tenants int;
  c_upd int; c_del int;
  v_insert text;
begin
  select id into v_user  from auth.users where email = 'flora@mini-cms.test';
  select id into v_zarya from public.tenants where slug = 'zarya';

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into c_news    from public.news;
  select count(*) into c_items   from public.menu_items;
  select count(*) into c_promos  from public.promotions;
  select count(*) into c_tenants from public.tenants;

  select count(*) into c_news_foreign   from public.news        where tenant_id = v_zarya;
  select count(*) into c_items_foreign  from public.menu_items  where tenant_id = v_zarya;
  select count(*) into c_promos_foreign from public.promotions  where tenant_id = v_zarya;

  -- Попытка изменить чужую новость
  update public.news set title = 'взлом' where tenant_id = v_zarya;
  get diagnostics c_upd = row_count;

  -- Попытка удалить чужую позицию меню
  delete from public.menu_items where tenant_id = v_zarya;
  get diagnostics c_del = row_count;

  -- Попытка создать строку от имени чужого тенанта
  begin
    insert into public.news (tenant_id, title, slug) values (v_zarya, 'взлом', 'vzlom-test');
    v_insert := 'ЗАПИСЬ ПРОШЛА';
  exception when others then
    v_insert := 'отклонено';
  end;

  execute 'reset role';

  insert into rls_check values
    (1, 'Владелец «Флоры»', 'Всего новостей видно (свои: 1 опубл. + 1 черновик)', '2', c_news::text),
    (2, 'Владелец «Флоры»', 'Из них новостей «Зари»',                             '0', c_news_foreign::text),
    (3, 'Владелец «Флоры»', 'Всего позиций меню видно (вкл. снятую с продажи)',   '2', c_items::text),
    (4, 'Владелец «Флоры»', 'Из них позиций «Зари»',                              '0', c_items_foreign::text),
    (5, 'Владелец «Флоры»', 'Всего акций видно',                                  '1', c_promos::text),
    (6, 'Владелец «Флоры»', 'Из них акций «Зари»',                                '0', c_promos_foreign::text),
    (7, 'Владелец «Флоры»', 'Тенантов видно (только свой)',                       '1', c_tenants::text),
    (8, 'Владелец «Флоры»', 'UPDATE чужой новости затронул строк',                '0', c_upd::text),
    (9, 'Владелец «Флоры»', 'DELETE чужой позиции затронул строк',                '0', c_del::text),
    (10,'Владелец «Флоры»', 'INSERT с чужим tenant_id',                    'отклонено', v_insert);
end;
$$;

-- -----------------------------------------------------------------------------
-- Сценарий 2: аноним, роль anon — так публичный сайт ходит в базу
-- -----------------------------------------------------------------------------
do $$
declare
  c_tenants int; c_news int; c_items int; c_promos int;
  c_drafts int; c_unavailable int;
  v_insert text;
  v_flora uuid;
begin
  select id into v_flora from public.tenants where slug = 'flora';

  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';

  select count(*) into c_tenants from public.tenants;
  select count(*) into c_news    from public.news;
  select count(*) into c_items   from public.menu_items;
  select count(*) into c_promos  from public.promotions;

  select count(*) into c_drafts      from public.news       where is_published = false;
  select count(*) into c_unavailable from public.menu_items where is_available = false;

  begin
    insert into public.news (tenant_id, title, slug) values (v_flora, 'аноним', 'anon-test');
    v_insert := 'ЗАПИСЬ ПРОШЛА';
  exception when others then
    v_insert := 'отклонено';
  end;

  execute 'reset role';

  insert into rls_check values
    (11, 'Аноним (публичный сайт)', 'Тенантов видно (нужно для резолва по слагу)', '2', c_tenants::text),
    (12, 'Аноним (публичный сайт)', 'Новостей видно (только опубликованные)',      '2', c_news::text),
    (13, 'Аноним (публичный сайт)', 'Черновиков видно',                            '0', c_drafts::text),
    (14, 'Аноним (публичный сайт)', 'Позиций меню видно (только в наличии)',        '2', c_items::text),
    (15, 'Аноним (публичный сайт)', 'Снятых с продажи позиций видно',               '0', c_unavailable::text),
    (16, 'Аноним (публичный сайт)', 'Акций видно (выключенная не считается)',       '1', c_promos::text),
    (17, 'Аноним (публичный сайт)', 'INSERT новости',                       'отклонено', v_insert);
end;
$$;

-- -----------------------------------------------------------------------------
-- Итог
-- -----------------------------------------------------------------------------
select
  n as "№",
  сценарий,
  проверка,
  ожидание,
  факт,
  case when факт = ожидание then 'ОК' else 'ПРОВАЛ' end as итог
from rls_check
order by n;
