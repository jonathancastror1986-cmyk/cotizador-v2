// ============================================================
// Acceso a datos: COTIZACIONES + ÍTEMS (reemplaza loadHistory/saveHistory)
// ============================================================

async function dbNextNumero() {
  const { data } = await sb
    .from('cotizaciones')
    .select('numero')
    .order('created_at', { ascending: false })
    .limit(1);
  if (!data || !data.length) return 'OT-0001';
  const lastNum = parseInt((data[0].numero || 'OT-0000').replace('OT-', ''), 10) || 0;
  return 'OT-' + String(lastNum + 1).padStart(4, '0');
}

async function dbListCotizaciones(filtros = {}) {
  let query = sb.from('cotizaciones').select('*, clientes(nombre, rut), ubicaciones(*), items(*), tecnico:profiles!tecnico_id(nombre)').order('created_at', { ascending: false });
  if (filtros.estado) query = query.eq('estado', filtros.estado);
  if (filtros.clienteId) query = query.eq('cliente_id', filtros.clienteId);
  let { data, error } = await query;
  if (error) {
    // si la relación con "tecnico" todavía no existe (falta correr migration_004), reintenta sin ella
    console.warn('Reintentando sin el embed de técnico (¿corriste migration_004_tecnicos.sql?):', error.message);
    let fallback = sb.from('cotizaciones').select('*, clientes(nombre, rut), ubicaciones(*), items(*)').order('created_at', { ascending: false });
    if (filtros.estado) fallback = fallback.eq('estado', filtros.estado);
    if (filtros.clienteId) fallback = fallback.eq('cliente_id', filtros.clienteId);
    const retry = await fallback;
    if (retry.error) { console.error(retry.error); return []; }
    return retry.data || [];
  }
  return data || [];
}

async function dbGetCotizacion(id) {
  let { data, error } = await sb.from('cotizaciones').select('*, clientes(*), ubicaciones(*), items(*), tecnico:profiles!tecnico_id(nombre)').eq('id', id).single();
  if (error) {
    console.warn('Reintentando sin el embed de técnico (¿corriste migration_004_tecnicos.sql?):', error.message);
    const retry = await sb.from('cotizaciones').select('*, clientes(*), ubicaciones(*), items(*)').eq('id', id).single();
    if (retry.error) { console.error(retry.error); return null; }
    return retry.data;
  }
  return data;
}

async function dbCreateCotizacion(payload) {
  if (!payload.numero) payload.numero = await dbNextNumero();
  payload.created_by = window.currentUser ? window.currentUser.id : null;
  let payloadActual = payload;
  let { data, error } = await sb.from('cotizaciones').insert(payloadActual).select().single();
  if (error && error.message && error.message.indexOf('tecnico_id') >= 0) {
    const { tecnico_id, ...resto } = payloadActual;
    payloadActual = resto;
    const retry = await sb.from('cotizaciones').insert(payloadActual).select().single();
    data = retry.data; error = retry.error;
    if (!error) {
      alert('Se guardó la cotización, pero el técnico asignado NO se pudo guardar todavía — falta correr migration_004_tecnicos_v2.sql en Supabase (SQL Editor).');
    }
  }
  if (error && error.message && error.message.indexOf('fecha_compromiso_ot') >= 0) {
    const { fecha_compromiso_ot, ...resto } = payloadActual; // parte de payloadActual (ya sin tecnico_id si correspondía), no del payload original
    payloadActual = resto;
    const retry = await sb.from('cotizaciones').insert(payloadActual).select().single();
    data = retry.data; error = retry.error;
    if (!error) {
      alert('Se guardó la cotización, pero la fecha de compromiso de la OT NO se pudo guardar todavía — falta correr migration_006_agenda.sql en Supabase (SQL Editor).');
    }
  }
  if (error) { console.error(error); return null; }
  return data;
}

async function dbUpdateCotizacion(id, payload) {
  payload.updated_at = new Date().toISOString();
  let payloadActual = payload;
  let { data, error } = await sb.from('cotizaciones').update(payloadActual).eq('id', id).select().single();
  if (error && error.message && error.message.indexOf('tecnico_id') >= 0) {
    const { tecnico_id, ...resto } = payloadActual;
    payloadActual = resto;
    const retry = await sb.from('cotizaciones').update(payloadActual).eq('id', id).select().single();
    data = retry.data; error = retry.error;
    if (!error) {
      alert('Se guardaron los otros cambios, pero el técnico asignado NO se pudo guardar todavía — falta correr migration_004_tecnicos_v2.sql en Supabase (SQL Editor).');
    }
  }
  if (error && error.message && error.message.indexOf('fecha_compromiso_ot') >= 0) {
    const { fecha_compromiso_ot, ...resto } = payloadActual; // parte de payloadActual, no del payload original
    payloadActual = resto;
    const retry = await sb.from('cotizaciones').update(payloadActual).eq('id', id).select().single();
    data = retry.data; error = retry.error;
    if (!error) {
      alert('Se guardaron los otros cambios, pero la fecha de compromiso de la OT NO se pudo guardar todavía — falta correr migration_006_agenda.sql en Supabase (SQL Editor).');
    }
  }
  if (error) { console.error(error); return null; }
  return data;
}

async function dbDeleteCotizacion(id) {
  const { error } = await sb.from('cotizaciones').delete().eq('id', id);
  if (error) console.error(error);
  return !error;
}

// ---- Ítems de una cotización ----

async function dbAddItem(cotizacionId, item) {
  const { data, error } = await sb.from('items').insert({ cotizacion_id: cotizacionId, ...item }).select().single();
  if (error) { console.error(error); return null; }
  return data;
}

async function dbUpdateItem(itemId, item) {
  const { data, error } = await sb.from('items').update(item).eq('id', itemId).select().single();
  if (error) { console.error(error); return null; }
  return data;
}

async function dbDeleteItem(itemId) {
  const { error } = await sb.from('items').delete().eq('id', itemId);
  if (error) console.error(error);
  return !error;
}

async function dbDeleteItemsByCotizacion(cotizacionId) {
  const { error } = await sb.from('items').delete().eq('cotizacion_id', cotizacionId);
  if (error) { console.error(error); return false; }
  return true;
}
