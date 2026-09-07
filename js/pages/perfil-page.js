// ============================================================
// Página: Perfil de mi empresa
// ============================================================

function onPageReady(profile){
  document.getElementById('profileNombre').value = profile.nombre || '';
  document.getElementById('profileTagline').value = profile.tagline || '';
  document.getElementById('profileRut').value = profile.rut || '';
  document.getElementById('profileRetentionPct').value = profile.retention_pct != null ? profile.retention_pct : '';
  document.getElementById('profileDefaultPaymentMethod').value = profile.default_payment_method || 'transferencia';
  document.getElementById('profileDefaultDocType').value = profile.default_doc_type || 'boleta_honorarios';

  document.getElementById('saveProfileBtn').addEventListener('click', guardarPerfil);
}
window.onPageReady = onPageReady;

function escapeHtml(s) { const div = document.createElement('div'); div.textContent = s || ''; return div.innerHTML; }

async function guardarPerfil(){
  const btn = document.getElementById('saveProfileBtn');
  const statusEl = document.getElementById('profileSaveStatus');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  const updated = await dbUpdateMyProfile({
    nombre: document.getElementById('profileNombre').value || null,
    tagline: document.getElementById('profileTagline').value || null,
    rut: document.getElementById('profileRut').value || null,
    retention_pct: parseFloat(document.getElementById('profileRetentionPct').value) || null,
    default_payment_method: document.getElementById('profileDefaultPaymentMethod').value,
    default_doc_type: document.getElementById('profileDefaultDocType').value,
  });

  btn.disabled = false;
  btn.textContent = 'Guardar perfil';
  if(updated){
    statusEl.textContent = '✅ Perfil guardado — se aplicará a las cotizaciones nuevas.';
  } else {
    statusEl.style.color = 'var(--danger)';
    statusEl.textContent = 'Hubo un error al guardar. Revisa la consola (F12).';
  }
}
