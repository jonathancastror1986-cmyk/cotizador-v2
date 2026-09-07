# Cotizador — Servicios Informáticos (v3, sitio multi-página)

## Estructura

```
cotizador-v3/
  index.html              — login (redirige a pages/dashboard.html)
  legacy-cotizador.html   — versión completa offline (con sincronización a la nube)
  css/styles.css
  js/
    supabase-config.js
    auth-guard.js          — protege cada página, redirige si no hay sesión
    nav.js                 — dibuja la barra lateral en cada página
    data/                  — funciones de acceso a Supabase (una por módulo)
      clientes.js
      cotizaciones.js
      compras.js
      plantillas.js
      favoritos.js
      dashboard.js
      perfil.js
    pages/                 — lógica específica de cada página
      dashboard-page.js
      cotizaciones-page.js
      documentos-page.js
      clientes-page.js
      perfil-page.js
  pages/
    dashboard.html
    cotizaciones.html
    documentos.html
    clientes.html
    perfil.html
  supabase_schema.sql        — esquema completo (ya lo corriste)
  migration_002_historial.sql — historial de cambios (ya lo corriste)
  migration_003_perfil.sql    — NUEVO: perfil de la empresa (correr en Supabase)
```

## Cómo probarlo en local

```
python3 -m http.server 8000
```
o Live Server en VS Code, abriendo `index.html`.

## Antes de usar el Perfil

Corre `migration_003_perfil.sql` en Supabase → SQL Editor (agrega los campos nuevos a la tabla `profiles`).
