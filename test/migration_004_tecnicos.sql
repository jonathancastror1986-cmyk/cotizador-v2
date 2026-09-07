-- ============================================================
-- MIGRACIÓN: rol "técnico" y asignación de técnico por OT
-- ============================================================
-- Pega esto en Supabase → SQL Editor → New query → Run
-- (es aditivo, no borra nada de lo que ya tienes)

-- 1. Permite el nuevo rol "tecnico" además de admin/cliente
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('admin','cliente','tecnico'));

-- 2. Cada cotización puede tener un técnico asignado
alter table cotizaciones add column if not exists tecnico_id uuid references profiles(id);

-- 3. Un técnico puede ver y actualizar (marcar ejecutado, agregar notas) las OTs
--    que tiene asignadas — pero no ve el resto de las cotizaciones de otros clientes.
create policy "tecnico_ve_sus_ots_asignadas" on cotizaciones for select using (
  tecnico_id = auth.uid()
);
create policy "tecnico_actualiza_sus_ots_asignadas" on cotizaciones for update using (
  tecnico_id = auth.uid()
);
create policy "tecnico_ve_items_de_sus_ots" on items for select using (
  cotizacion_id in (select id from cotizaciones where tecnico_id = auth.uid())
);
