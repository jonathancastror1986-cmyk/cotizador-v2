// ============================================================
// Acceso a datos: TÉCNICOS (usuarios con role='tecnico')
// ============================================================

async function dbListTecnicos(){
  let { data, error } = await sb.from('profiles').select('id, nombre, codigo, role').in('role', ['tecnico', 'admin']);
  if (error && error.message && error.message.indexOf('codigo') >= 0) {
    const retry = await sb.from('profiles').select('id, nombre, role').in('role', ['tecnico', 'admin']);
    data = retry.data; error = retry.error;
  }
  if(error){ console.error(error); return []; }
  return data || [];
}

async function dbUpdateTecnicoCodigo(id, codigo){
  const { data, error } = await sb.from('profiles').update({ codigo: codigo || null }).eq('id', id).select().single();
  if(error){
    if(error.message && error.message.indexOf('codigo') >= 0){
      alert('No se puede guardar el código todavía — falta correr migration_005_codigo_tecnico.sql en Supabase.');
    }
    console.error(error); return null;
  }
  return data;
}

async function dbListAllProfiles(){
  let { data, error } = await sb.from('profiles').select('id, nombre, role, codigo').order('nombre');
  if (error && error.message && error.message.indexOf('codigo') >= 0) {
    const retry = await sb.from('profiles').select('id, nombre, role').order('nombre');
    data = retry.data; error = retry.error;
  }
  if(error){ console.error(error); return []; }
  return data || [];
}

async function dbUpdateProfileRoleAndCodigo(id, role, codigo){
  let { data, error } = await sb.from('profiles').update({ role, codigo: codigo || null }).eq('id', id).select().single();
  if (error && error.message && error.message.indexOf('codigo') >= 0) {
    const retry = await sb.from('profiles').update({ role }).eq('id', id).select().single();
    data = retry.data; error = retry.error;
    if(!error) alert('El rol se guardó bien, pero el código no se pudo guardar todavía — falta correr migration_005_codigo_tecnico.sql en Supabase.');
  }
  if(error){ console.error(error); return null; }
  return data;
}

async function dbGetTecnicoByCodigo(codigo){
  if(!codigo) return null;
  const { data, error } = await sb.from('profiles').select('id, nombre').eq('codigo', codigo).eq('role', 'tecnico').maybeSingle();
  if(error){ console.error(error); return null; }
  return data;
}
