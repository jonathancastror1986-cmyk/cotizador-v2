// ============================================================
// Acceso a datos: PORTAL DE CLIENTES
// Todo acá filtra automático por RLS según el cliente_id del
// perfil de la sesión — un cliente nunca puede ver datos de otro.
// ============================================================

async function dbPortalGetMiEmpresa(){
  const { data: profile } = await sb.from('profiles').select('cliente_id').eq('id', (await sb.auth.getUser()).data.user.id).single();
  if(!profile || !profile.cliente_id) return null;
  const { data, error } = await sb.from('clientes').select('*').eq('id', profile.cliente_id).single();
  if(error){ console.error(error); return null; }
  return data;
}

async function dbPortalListMisUbicaciones(){
  const { data, error } = await sb.from('ubicaciones').select('*').order('ubicacion');
  if(error){ console.error(error); return []; }
  return data || [];
}

async function dbPortalActualizarUbicacion(id, payload){
  const { data, error } = await sb.from('ubicaciones').update(payload).eq('id', id).select().single();
  if(error){ console.error(error); return null; }
  return data;
}

async function dbPortalListMisOts(){
  const { data, error } = await sb.from('cotizaciones')
    .select('*, ubicaciones(ubicacion)')
    .order('created_at', { ascending: false });
  if(error){ console.error(error); return []; }
  return data || [];
}

async function dbPortalCrearSolicitud(payload){
  const insertPayload = {
    estado: 'solicitud',
    cliente_id: payload.cliente_id,
    ubicacion_id: payload.ubicacion_id || null,
    notas: payload.notas,
    fecha_compromiso_ot: payload.fecha_preferida || null,
  };
  const { data, error } = await sb.from('cotizaciones').insert(insertPayload).select().single();
  if(error){ console.error(error); return { success:false, error }; }
  return { success:true, data };
}

async function dbPortalCambiarPassword(nuevaPassword){
  const { error } = await sb.auth.updateUser({ password: nuevaPassword });
  if(error) return { success:false, error };
  return { success:true };
}
