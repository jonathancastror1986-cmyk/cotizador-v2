// ============================================================
// Guardia de autenticación — usado por TODAS las páginas protegidas
// Si no hay sesión, redirige al login. Si hay, expone window.currentUser
// y window.currentProfile, y llama a window.onPageReady(profile) si existe.
// ============================================================

async function requireAuth(){
  const { data: { session } } = await sb.auth.getSession();
  if(!session){
    window.location.href = getBasePath() + 'index.html';
    return;
  }
  const user = session.user;
  let { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
  if(!profile){
    const { data: newProfile } = await sb.from('profiles').insert({ id: user.id, role: 'cliente', nombre: user.email }).select().single();
    profile = newProfile;
  }
  window.currentUser = user;
  window.currentProfile = profile;

  const nameEl = document.getElementById('currentUserLabel');
  const roleEl = document.getElementById('currentUserRole');
  if(nameEl) nameEl.textContent = profile.nombre || user.email;
  if(roleEl) roleEl.textContent = profile.role === 'admin' ? 'Administrador' : 'Cliente';

  const logoutBtn = document.getElementById('logoutBtn');
  if(logoutBtn) logoutBtn.addEventListener('click', async ()=>{
    await sb.auth.signOut();
    window.location.href = getBasePath() + 'index.html';
  });

  if(window.onPageReady) window.onPageReady(profile);
}

// Detecta si estamos en /pages/algo.html (para saber cómo volver a index.html)
function getBasePath(){
  return window.location.pathname.includes('/pages/') ? '../' : '';
}

document.addEventListener('DOMContentLoaded', requireAuth);
