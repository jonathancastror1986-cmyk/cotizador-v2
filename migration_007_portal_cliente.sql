-- ============================================================
-- MIGRACIÓN 007: Portal de clientes (fase 1 — páginas y datos)
-- ============================================================
-- Pega esto en Supabase → SQL Editor → New query → Run
-- (es aditivo, no borra nada de lo que ya tienes)

-- 1. Nuevo estado para solicitudes creadas por el propio cliente
--    (el admin las revisa y las transforma en una cotización normal)
alter table cotizaciones drop constraint if exists cotizaciones_estado_check;
alter table cotizaciones add constraint cotizaciones_estado_check
  check (estado in ('borrador','enviada','aceptada','rechazada','en_espera','cancelada','solicitud'));

-- 2. Numeración de OT generada en el servidor, no en el navegador.
--    Necesario porque un cliente solo ve SUS propias OTs (por RLS), así
--    que si el número lo calculara mirando la lista visible, chocaría
--    con números ya usados por otros clientes.
create or replace function siguiente_numero_ot() returns text as $$
declare
  last_num integer;
begin
  select coalesce(max(cast(substring(numero from 'OT-(\d+)') as integer)), 0)
    into last_num from cotizaciones;
  return 'OT-' || lpad((last_num + 1)::text, 4, '0');
end;
$$ language plpgsql security definer;

create or replace function trg_asignar_numero_ot() returns trigger as $$
begin
  if new.numero is null or new.numero = '' then
    new.numero := siguiente_numero_ot();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists asignar_numero_ot on cotizaciones;
create trigger asignar_numero_ot before insert on cotizaciones
  for each row execute function trg_asignar_numero_ot();

-- 3. El cliente puede ver los datos de su propia empresa
create policy "cliente_ve_su_empresa" on clientes for select using (
  id = (select cliente_id from profiles where id = auth.uid())
);

-- 4. El cliente puede ver y actualizar sus propias ubicaciones/contactos
--    (no puede crear ni eliminar ubicaciones, solo editar las existentes)
create policy "cliente_ve_sus_ubicaciones" on ubicaciones for select using (
  cliente_id = (select cliente_id from profiles where id = auth.uid())
);
create policy "cliente_actualiza_sus_ubicaciones" on ubicaciones for update using (
  cliente_id = (select cliente_id from profiles where id = auth.uid())
) with check (
  cliente_id = (select cliente_id from profiles where id = auth.uid())
);

-- 5. El cliente puede crear una "solicitud" (nueva OT en estado especial)
--    únicamente para su propia empresa, y siempre en estado 'solicitud'
--    (no puede crear una OT ya aceptada o con otro cliente_id).
create policy "cliente_crea_solicitud" on cotizaciones for insert with check (
  cliente_id = (select cliente_id from profiles where id = auth.uid())
  and estado = 'solicitud'
);

-- Fuerza que Supabase se entere de las funciones/políticas nuevas de inmediato
NOTIFY pgrst, 'reload schema';
