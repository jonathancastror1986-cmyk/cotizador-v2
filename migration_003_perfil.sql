-- ============================================================
-- MIGRACIÓN: agrega los datos del perfil de la empresa
-- ============================================================
-- Pega esto en Supabase → SQL Editor → New query → Run
-- (es aditivo, no borra nada de lo que ya tienes)

alter table profiles add column if not exists rut text;
alter table profiles add column if not exists tagline text;
alter table profiles add column if not exists retention_pct numeric;
alter table profiles add column if not exists default_payment_method text default 'transferencia';
alter table profiles add column if not exists default_doc_type text default 'boleta_honorarios';
