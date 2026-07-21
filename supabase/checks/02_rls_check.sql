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
-- Сценарий 3: выключенный сайт (неоплата)
--
-- Выключенного тенанта аноним не должен находить вообще — иначе публичная
-- страница отрисуется и сайт продолжит работать, хотя за него не платят.
-- А владелец обязан по-прежнему видеть свой тенант: иначе он не заберёт
-- собственные данные и не поймёт, что произошло.
-- -----------------------------------------------------------------------------
do $$
declare
  v_user uuid;
  c_anon_all int; c_anon_zarya int; c_owner int;
begin
  update public.tenants set is_active = false where slug = 'zarya';

  execute 'set local role anon';
  select count(*) into c_anon_all   from public.tenants;
  select count(*) into c_anon_zarya from public.tenants where slug = 'zarya';
  execute 'reset role';

  select id into v_user from auth.users where email = 'zarya@mini-cms.test';
  execute format(
    'set local request.jwt.claims = %L',
    json_build_object('sub', v_user, 'role', 'authenticated')::text
  );
  execute 'set local role authenticated';
  select count(*) into c_owner from public.tenants where slug = 'zarya';
  execute 'reset role';

  -- Возвращаем как было: следующие сценарии рассчитывают на два живых сайта.
  update public.tenants set is_active = true where slug = 'zarya';

  insert into rls_check values
    (18, 'Выключенный сайт', 'Аноним видит выключенный',              '0', c_anon_zarya::text),
    (19, 'Выключенный сайт', 'Аноним видит остальные',                '1', c_anon_all::text),
    (20, 'Выключенный сайт', 'Владелец видит свой выключенный',       '1', c_owner::text);
end;
$$;

-- -----------------------------------------------------------------------------
-- Сценарий 4: service_role — под ним работают скрипты обслуживания
--
-- Эта роль обязана видеть всё и у всех: на ней держатся резервные копии.
-- Проверка появилась после того, как первая же попытка снять копию упала с
-- «permission denied for table tenants»: гранты выдавались поимённо, и
-- service_role в списке не оказалось.
--
-- Поломка тут особенно неприятная — тихая. Приложение продолжает работать,
-- просто копии перестают сниматься, и выясняется это в тот день, когда копия
-- понадобилась.
-- -----------------------------------------------------------------------------
do $$
declare
  c_tenants int; c_news int; c_items int;
  v_write text;
begin
  execute 'set local role service_role';

  select count(*) into c_tenants from public.tenants;
  select count(*) into c_news    from public.news;
  select count(*) into c_items   from public.menu_items;

  -- Восстановление обязано уметь писать, иначе копия односторонняя.
  begin
    update public.news set title = title where false;
    v_write := 'разрешено';
  exception when others then
    v_write := 'отклонено';
  end;

  execute 'reset role';

  insert into rls_check values
    -- Числа больше, чем у анонима (12 и 14): аноним не видит черновик и
    -- снятую с продажи позицию, а копия обязана забрать и их.
    (21, 'service_role (бэкапы)', 'Тенантов видно (все, а не только свои)', '2', c_tenants::text),
    (22, 'service_role (бэкапы)', 'Новостей видно (включая черновик)',      '3', c_news::text),
    (23, 'service_role (бэкапы)', 'Позиций меню видно (включая снятую)',    '3', c_items::text),
    (24, 'service_role (бэкапы)', 'UPDATE для восстановления',      'разрешено', v_write);
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
