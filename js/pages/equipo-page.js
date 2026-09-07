// ============================================================
// Página: Equipo (gestionar roles: admin / técnico / cliente)
// ============================================================

let allProfilesCache = [];

function onPageReady(profile){
  if(profile.role !== 'admin'){
    document.querySelector('.app-content').innerHTML = '<p style="color:var(--muted); font-size:13px;">Solo el administrador puede gestionar el equipo.</p>';
    return;
  }
  renderEquipo();
  document.getElementById('equipoSearch').addEventListener('input', (e) => filterEquipo(e.target.value));
}
window.onPageReady = onPageReady;

async function renderEquipo(){
  allProfilesCache = await dbListAllProfiles();
  filterEquipo('');
}

const ROLE_LABELS = { admin: 'Administrador', tecnico: 'Técnico', cliente: 'Cliente' };

function filterEquipo(query){
  const wrap = document.getElementById('equipoList');
  const q = (query||'').toLowerCase().trim();
  let list = allProfilesCache;
  if(q) list = list.filter(p => (p.nombre||'').toLowerCase().includes(q));

  if(!list.length){
    wrap.innerHTML = '<p style="color:var(--muted); font-size:13px;">Sin personas registradas aún.</p>';
    return;
  }

  wrap.innerHTML = list.map(p => `
    <div class="hist-row">
      <div style="flex:1;">
        <b>${escapeHtml(p.nombre || 'Sin nombre')}</b>
        <span class="status-badge" style="margin-left:8px;">${ROLE_LABELS[p.role]||p.role}</span>
      </div>
      <select class="equipo-role-select" data-id="${p.id}" style="width:auto; font-size:12px;">
        <option value="cliente" ${p.role==='cliente'?'selected':''}>Cliente</option>
        <option value="tecnico" ${p.role==='tecnico'?'selected':''}>Técnico</option>
        <option value="admin" ${p.role==='admin'?'selected':''}>Administrador</option>
      </select>
      <input type="text" class="equipo-codigo-input" data-id="${p.id}" value="${escapeHtml(p.codigo||'')}" placeholder="Código (ej: T001)" style="width:110px; font-size:12px;">
      <button type="button" class="btn-ghost save-equipo-btn" data-id="${p.id}" style="font-size:12px; padding:6px 10px;">Guardar</button>
    </div>
  `).join('');

  wrap.querySelectorAll('.save-equipo-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const role = wrap.querySelector(`.equipo-role-select[data-id="${id}"]`).value;
      const codigo = wrap.querySelector(`.equipo-codigo-input[data-id="${id}"]`).value.trim();
      const updated = await dbUpdateProfileRoleAndCodigo(id, role, codigo);
      if(updated){
        toast('Actualizado: ' + (updated.nombre||'') + ' → ' + (ROLE_LABELS[role]||role));
        renderEquipo();
      } else {
        alert('No se pudo guardar. ¿El código ya está en uso por otra persona?');
      }
    });
  });
}

function escapeHtml(s) { const div = document.createElement('div'); div.textContent = s || ''; return div.innerHTML; }
