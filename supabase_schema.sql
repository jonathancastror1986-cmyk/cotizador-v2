-- ============================================================
-- ESQUEMA DE BASE DE DATOS — Cotizador de Servicios Informáticos
-- Jonathan Castro / Servicios Informáticos
-- VERSIÓN CORREGIDA: profiles ahora incluye RLS desde el inicio
-- ============================================================
-- Cómo usar: borra todo lo que tengas en el SQL Editor y pega
-- este archivo completo, luego dale Run.
-- ============================================================

-- 1. PERFILES (extiende auth.users con rol: admin o cliente) ----------------
create table profiles (
  id uuid references auth.users(id) primary key,
  role text not null default 'cliente' check (role in ('admin','cliente')),
  nombre text,
  cliente_id uuid,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- función auxiliar: ¿el usuario actual es admin? (se define acá arriba
-- porque las políticas de todas las tablas siguientes la usan)
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- cada usuario ve y edita solo su propio perfil; el admin ve todos
create policy "usuario_ve_su_perfil" on profiles for select using (auth.uid() = id);
create policy "usuario_actualiza_su_perfil" on profiles for update using (auth.uid() = id);
create policy "admin_ve_todos_perfiles" on profiles for select using (is_admin());
create policy "admin_actualiza_todos_perfiles" on profiles for update using (is_admin());
-- el propio usuario puede crear su fila de perfil al registrarse
create policy "usuario_crea_su_perfil" on profiles for insert with check (auth.uid() = id);

-- 2. CLIENTES (empresas) -----------------------------------------------------
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rut text,
  sector text,
  created_at timestamptz default now()
);
alter table clientes enable row level security;

-- 3. UBICACIONES (sucursales/direcciones de cada cliente) -------------------
create table ubicaciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  ubicacion text not null,
  direccion text,
  contacto text,
  email text,
  telefono text,
  trato text default 'formal' check (trato in ('formal','informal')),
  alias text,
  created_at timestamptz default now()
);
alter table ubicaciones enable row level security;

-- 4. COTIZACIONES (OTs) ------------------------------------------------------
create table cotizaciones (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null,
  cliente_id uuid references clientes(id),
  ubicacion_id uuid references ubicaciones(id),
  centro_costo text,
  fecha date default current_date,
  notas text,
  garantia text,
  validez text default '15 días',
  forma_pago text default 'transferencia',
  estado text default 'borrador' check (estado in ('borrador','enviada','aceptada','rechazada','en_espera','cancelada')),
  reject_reason text,
  cancel_reason text,
  en_espera_sector text,
  en_espera_nota text,
  paid boolean default false,
  payment_proof_url text,
  work_executed boolean default false,
  committed_payment_date date,
  disc_type text default 'none',
  disc_percent numeric,
  disc_round_step numeric,
  disc_round numeric,
  requires_fee_receipt boolean default false,
  fee_receipt_doc_type text,
  fee_receipt_number text,
  fee_receipt_rut text,
  fee_receipt_razon_social text,
  fee_receipt_neto numeric,
  fee_receipt_iva numeric,
  fee_receipt_iva_no_rec numeric,
  fee_receipt_otros_impuestos jsonb default '[]',
  fee_receipt_stage text default 'borrador',
  fee_receipt_pdf_url text,
  fee_receipt_xml text,
  fee_receipt_doc_proof_url text,
  retention_pct numeric,
  iva_declarado boolean default false,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table cotizaciones enable row level security;

-- 5. ÍTEMS de cada cotización ------------------------------------------------
create table items (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid references cotizaciones(id) on delete cascade,
  categoria text not null,
  descripcion text not null,
  cantidad numeric default 1,
  precio numeric default 0,
  doc_type text,
  doc_number text,
  provider_rut text,
  receipt_url text,
  created_at timestamptz default now()
);
alter table items enable row level security;

-- 6. COMPRAS (facturas/boletas de proveedores) -------------------------------
create table compras (
  id uuid primary key default gen_random_uuid(),
  proveedor text,
  doc_type text,
  doc_number text,
  monto numeric not null,
  iva_manual numeric,
  iva_no_recuperable numeric default 0,
  fecha date default current_date,
  status text default 'borrador' check (status in ('borrador','declarada','pagada')),
  payment_method text default 'efectivo',
  credit_paid boolean,
  purchase_payment_status text default 'pendiente',
  linked_ot text,
  linked_item_id uuid references items(id),
  pdf_url text,
  xml_content text,
  iva_payment_proof_url text,
  credit_payment_proof_url text,
  created_at timestamptz default now()
);
alter table compras enable row level security;

-- 7. PLANTILLAS de ítems (por cliente o generales) ---------------------------
create table plantillas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cliente_id uuid references clientes(id),
  items jsonb not null default '[]',
  created_at timestamptz default now()
);
alter table plantillas enable row level security;

-- 8. FAVORITOS de ítems (por cliente) ----------------------------------------
create table favoritos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  categoria text not null,
  descripcion text not null,
  precio numeric not null,
  created_at timestamptz default now()
);
alter table favoritos enable row level security;

-- 9. COMENTARIOS de clientes (testimonios para servicios.html) --------------
create table comentarios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  apodo text not null,
  empresa text,
  servicio text,
  calificacion int check (calificacion between 1 and 5),
  comentario text,
  aprobado boolean default false,
  created_at timestamptz default now()
);
alter table comentarios enable row level security;

-- ============================================================
-- POLÍTICAS DE ACCESO (admin ve todo, cliente solo lo suyo)
-- ============================================================

create policy "admin_full_access_clientes" on clientes for all using (is_admin());
create policy "admin_full_access_ubicaciones" on ubicaciones for all using (is_admin());
create policy "admin_full_access_cotizaciones" on cotizaciones for all using (is_admin());
create policy "admin_full_access_items" on items for all using (is_admin());
create policy "admin_full_access_compras" on compras for all using (is_admin());
create policy "admin_full_access_plantillas" on plantillas for all using (is_admin());
create policy "admin_full_access_favoritos" on favoritos for all using (is_admin());
create policy "admin_full_access_comentarios" on comentarios for all using (is_admin());

create policy "cliente_ve_sus_cotizaciones" on cotizaciones for select using (
  cliente_id = (select cliente_id from profiles where id = auth.uid())
);
create policy "cliente_ve_sus_items" on items for select using (
  cotizacion_id in (
    select id from cotizaciones where cliente_id = (select cliente_id from profiles where id = auth.uid())
  )
);
create policy "cliente_crea_comentario" on comentarios for insert with check (
  cliente_id = (select cliente_id from profiles where id = auth.uid())
);
create policy "publico_ve_comentarios_aprobados" on comentarios for select using (aprobado = true);

-- ============================================================
-- Fin del esquema. Después de correr esto sin errores, el siguiente
-- paso es crear tu usuario admin: te registras normal en la app,
-- y luego en Supabase → Table Editor → profiles, cambias tu fila
-- para que role = 'admin'.
-- ============================================================
