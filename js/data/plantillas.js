// ============================================================
// Acceso a datos: PLANTILLAS de ítems
// ============================================================

async function dbListPlantillas(clienteId) {
  let query = sb.from('plantillas').select('*').order('created_at', { ascending: false });
  if (clienteId) {
    // trae las de este cliente + las generales (sin cliente asignado)
    query = query.or(`cliente_id.eq.${clienteId},cliente_id.is.null`);
  }
  const { data, error } = await query;
  if (error) { console.error(error); return []; }
  return data || [];
}

async function dbSavePlantilla(nombre, items, clienteId) {
  const { data, error } = await sb.from('plantillas').insert({
    nombre, items, cliente_id: clienteId || null,
  }).select().single();
  if (error) { console.error(error); return null; }
  return data;
}

async function dbDeletePlantilla(id) {
  const { error } = await sb.from('plantillas').delete().eq('id', id);
  if (error) console.error(error);
  return !error;
}
