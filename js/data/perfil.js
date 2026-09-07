// ============================================================
// Acceso a datos: PERFIL DE LA EMPRESA (guardado en profiles)
// ============================================================

async function dbGetMyProfile(){
  const { data: { session } } = await sb.auth.getSession();
  if(!session) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  if(error){ console.error(error); return null; }
  return data;
}

async function dbUpdateMyProfile(payload){
  const { data: { session } } = await sb.auth.getSession();
  if(!session) return null;
  let workingPayload = { ...payload };
  let removedFields = [];

  for(let attempts = 0; attempts < 6; attempts++){
    const { data, error } = await sb.from('profiles').update(workingPayload).eq('id', session.user.id).select().single();
    if(!error){
      if(removedFields.length){
        alert('Se guardó, pero estos campos aún no existen en tu base de datos (falta correr migration_003_perfil.sql): ' + removedFields.join(', '));
      }
      return data;
    }
    // busca qué columna falta en el mensaje de error, y la saca del payload para reintentar
    const match = Object.keys(workingPayload).find(col => error.message && error.message.indexOf(col) >= 0);
    if(!match){ console.error(error); return null; }
    delete workingPayload[match];
    removedFields.push(match);
  }
  return null;
}
