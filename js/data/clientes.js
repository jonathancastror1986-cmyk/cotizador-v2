// ============================================================
// Acceso a datos: CLIENTES (reemplaza al antiguo loadLocations/saveLocations)
// ============================================================

async function dbListClientes() {
  const { data, error } = await sb.from('clientes').select('*, ubicaciones(*)').order('nombre');
  if (error) { console.error(error); return []; }
  return data || [];
}

async function dbGetOrCreateCliente(nombre, rut) {
  let { data: existing } = await sb.from('clientes').select('*').eq('nombre', nombre).maybeSingle();
  if (existing) {
    if (rut && rut !== existing.rut) {
      const { data: updated } = await sb.from('clientes').update({ rut }).eq('id', existing.id).select().single();
      return updated || existing;
    }
    return existing;
  }
  const { data, error } = await sb.from('clientes').insert({ nombre, rut }).select().single();
  if (error) { console.error(error); return null; }
  return data;
}

async function dbSaveUbicacion(clienteId, ubicacionData, ubicacionId) {
  const payload = { cliente_id: clienteId, ...ubicacionData };
  let targetId = ubicacionId;

  if (!targetId && ubicacionData.ubicacion) {
    const { data: existing } = await sb.from('ubicaciones').select('id').eq('cliente_id', clienteId).eq('ubicacion', ubicacionData.ubicacion).maybeSingle();
    if (existing) targetId = existing.id;
  }

  if (targetId) {
    let { data, error } = await sb.from('ubicaciones').update(payload).eq('id', targetId).select().single();
    if (error && error.message && error.message.indexOf('sector') >= 0) {
      // falta correr migration_006_agenda.sql todavía — reintenta sin el campo sector
      const { sector, ...sinSector } = payload;
      const retry = await sb.from('ubicaciones').update(sinSector).eq('id', targetId).select().single();
      data = retry.data; error = retry.error;
    }
    if (error) console.error(error);
    return data;
  }
  let { data, error } = await sb.from('ubicaciones').insert(payload).select().single();
  if (error && error.message && error.message.indexOf('sector') >= 0) {
    const { sector, ...sinSector } = payload;
    const retry = await sb.from('ubicaciones').insert(sinSector).select().single();
    data = retry.data; error = retry.error;
  }
  if (error) console.error(error);
  return data;
}

async function dbUpdateUbicacionCoords(id, lat, lon) {
  const { data, error } = await sb.from('ubicaciones').update({ lat, lon }).eq('id', id).select().single();
  if (error) { console.error(error); return null; }
  return data;
}

async function dbDeleteUbicacion(id) {
  const { error } = await sb.from('ubicaciones').delete().eq('id', id);
  if (error) { console.error(error); return { success: false, error }; }
  return { success: true };
}

async function dbDeleteCliente(id) {
  const { error } = await sb.from('clientes').delete().eq('id', id);
  if (error) { console.error(error); return { success: false, error }; }
  return { success: true };
}
