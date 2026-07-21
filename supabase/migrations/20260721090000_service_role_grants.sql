-- =============================================================================
-- Права service_role на контентные таблицы
--
-- Зачем понадобилось: первая же попытка снять резервную копию упёрлась в
--
--   permission denied for table tenants
--
-- Причина в том, что миграция 20260720120000 выдавала гранты поимённо —
-- anon и authenticated, — и на service_role их не оказалось. Обходить RLS
-- (bypassrls) и иметь право на таблицу — разные вещи: первое у service_role
-- есть по умолчанию, второе выдаётся грантом, как всем прочим.
--
-- Кто под этой ролью работает: только скрипты обслуживания, которые
-- запускают руками с машины разработчика, — backup, restore, tenant:create.
-- Приложение под service_role не ходит никогда: в Vercel этого ключа нет.
--
-- Права полные и осознанно: смысл резервной копии в том, чтобы прочитать
-- всё, а смысл восстановления — записать всё обратно.
-- =============================================================================

grant usage on schema public to service_role;

grant select, insert, update, delete on public.tenants         to service_role;
grant select, insert, update, delete on public.tenant_members  to service_role;
grant select, insert, update, delete on public.site_settings   to service_role;
grant select, insert, update, delete on public.menu_categories to service_role;
grant select, insert, update, delete on public.menu_items      to service_role;
grant select, insert, update, delete on public.promotions      to service_role;
grant select, insert, update, delete on public.news            to service_role;

-- Таблицы, которые появятся позже, тоже должны быть доступны бэкапу: без
-- этого новая таблица молча выпадет из копии, а обнаружится это в тот день,
-- когда копия понадобится.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
