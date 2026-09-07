-- ============================================================
-- MIGRACIÓN 004 (CORREGIDA): rol "técnico" y asignación por OT
-- ============================================================
-- Esta versión se puede correr las veces que quieras sin error,
-- aunque ya hayas corrido la versión anterior antes.

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('admin','cliente','tecnico'));

alter table cotizaciones add column if not exists tecnico_id uuid references profiles(id);

drop policy if exists "tecnico_ve_sus_ots_asignadas" on cotizaciones;
create policy "tecnico_ve_sus_ots_asignadas" on cotizaciones for select using (
  tecnico_id = auth.uid()
);

drop policy if exists "tecnico_actualiza_sus_ots_asignadas" on cotizaciones;
create policy "tecnico_actualiza_sus_ots_asignadas" on cotizaciones for update using (
  tecnico_id = auth.uid()
);

drop policy if exists "tecnico_ve_items_de_sus_ots" on items;
create policy "tecnico_ve_items_de_sus_ots" on items for select using (
  cotizacion_id in (select id from cotizaciones where tecnico_id = auth.uid())
);

-- Fuerza que Supabase se entere de la columna nueva de inmediato
NOTIFY pgrst, 'reload schema';
