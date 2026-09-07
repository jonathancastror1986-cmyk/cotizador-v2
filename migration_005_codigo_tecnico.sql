-- ============================================================
-- MIGRACIÓN: código corto para cada técnico
-- ============================================================
-- Pega esto en Supabase → SQL Editor → New query → Run

alter table profiles add column if not exists codigo text unique;
