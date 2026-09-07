// ============================================================
// Acceso a datos: FAVORITOS de ítems (por cliente)
// ============================================================

async function dbListFavoritos(clienteId) {
  if (!clienteId) return [];
  const { data, error } = await sb.from('favoritos').select('*').eq('cliente_id', clienteId);
  if (error) { console.error(error); return []; }
  return data || [];
}

async function dbToggleFavorito(clienteId, categoria, descripcion, precio) {
  const existentes = await dbListFavoritos(clienteId);
  const match = existentes.find(f => f.categoria === categoria && f.descripcion === descripcion && f.precio === precio);
  if (match) {
    const { error } = await sb.from('favoritos').delete().eq('id', match.id);
    if (error) console.error(error);
    return { action: 'removed' };
  }
  const { data, error } = await sb.from('favoritos').insert({
    cliente_id: clienteId, categoria, descripcion, precio,
  }).select().single();
  if (error) { console.error(error); return { action: 'error' }; }
  return { action: 'added', data };
}
