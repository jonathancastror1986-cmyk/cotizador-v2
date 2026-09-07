-- ============================================================
-- LIMPIEZA PUNTUAL: borra los ítems duplicados de OT-0002
-- ============================================================
-- Corre esto en Supabase → SQL Editor. Primero el SELECT para
-- confirmar qué se va a borrar, después el DELETE.

-- 1) Revisa qué hay hoy en esa OT (deberías ver 6 filas, 2 de cada ítem)
select i.id, i.categoria, i.descripcion, i.cantidad, i.precio, i.created_at
from items i
join cotizaciones c on c.id = i.cotizacion_id
where c.numero = 'OT-0002'
order by i.categoria, i.descripcion, i.created_at;

-- 2) Borra los duplicados, dejando SOLO la fila más antigua de cada
--    combinación (categoria + descripcion + cantidad + precio) por OT.
delete from items
where id in (
  select id from (
    select
      i.id,
      row_number() over (
        partition by i.cotizacion_id, i.categoria, i.descripcion, i.cantidad, i.precio
        order by i.created_at asc
      ) as rn
    from items i
    join cotizaciones c on c.id = i.cotizacion_id
    where c.numero = 'OT-0002'
  ) t
  where t.rn > 1
);

-- 3) Verifica que hayan quedado solo 3 ítems (sin duplicados)
select i.id, i.categoria, i.descripcion, i.cantidad, i.precio
from items i
join cotizaciones c on c.id = i.cotizacion_id
where c.numero = 'OT-0002'
order by i.categoria, i.descripcion;
