// ============================================================
// Acceso a datos: COMPRAS (facturas/boletas de proveedores)
// ============================================================

async function dbListCompras(filtros = {}) {
  let query = sb.from('compras').select('*').order('created_at', { ascending: false });
  if (filtros.linkedOt) query = query.eq('linked_ot', filtros.linkedOt);
  const { data, error } = await query;
  if (error) { console.error(error); return []; }
  return data || [];
}

async function dbCreateCompra(payload) {
  const { data, error } = await sb.from('compras').insert(payload).select().single();
  if (error) { console.error(error); return null; }
  return data;
}

async function dbUpdateCompra(id, payload) {
  const { data, error } = await sb.from('compras').update(payload).eq('id', id).select().single();
  if (error) { console.error(error); return null; }
  return data;
}

async function dbDeleteCompra(id) {
  const { error } = await sb.from('compras').delete().eq('id', id);
  if (error) console.error(error);
  return !error;
}
