-- ============================================================
-- MIGRACIÓN: agrega el historial de cambios a cotizaciones
-- ============================================================
-- Pega esto en Supabase → SQL Editor → New query → Run
-- (es aditivo, no borra nada de lo que ya tienes)

alter table cotizaciones add column if not exists historial_cambios jsonb default '[]';
