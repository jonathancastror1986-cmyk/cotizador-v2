-- ============================================================
-- MIGRACIÓN: agenda de OTs por fecha de compromiso + sector
-- ============================================================
-- Pega esto en Supabase → SQL Editor → New query → Run
-- (es aditivo, no borra nada de lo que ya tienes)

-- 1. Fecha de compromiso de la OT (visita en terreno) — distinta de
--    committed_payment_date, que es la fecha comprometida de PAGO.
alter table cotizaciones add column if not exists fecha_compromiso_ot date;

-- 2. Sector/zona de cada ubicación, para agrupar visitas y agenda.
--    Reutiliza las mismas categorías que ya usas para el traslado:
--    cercania / medio / oriente_alto / extendido.
alter table ubicaciones add column if not exists sector text
  check (sector in ('cercania','medio','oriente_alto','extendido') or sector is null);

-- 3. Coordenadas (lat/lon) de la dirección, para no tener que geocodificar
--    la misma dirección cada vez que se abre el mapa de la Agenda.
alter table ubicaciones add column if not exists lat numeric;
alter table ubicaciones add column if not exists lon numeric;

-- Fuerza que Supabase se entere de las columnas nuevas de inmediato
NOTIFY pgrst, 'reload schema';
