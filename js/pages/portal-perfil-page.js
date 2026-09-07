// ============================================================
// Página: Portal de clientes — Mi perfil
// ============================================================

function renderUbicacionForm(u){
  return `
    <div class="panel" style="margin:0 0 12px; padding:14px;" data-ubic-id="${u.id}">
      <div style="font-weight:600; font-size:13px; margin-bottom:8px;">${escapePortalHtml2(u.ubicacion)}</div>
      <div class="field-row">
        <div class="field"><label>Persona de contacto</label><input type="text" class="ubicContacto" value="${escapePortalHtml2(u.contacto || '')}"></div>
        <div class="field"><label>Teléfono</label><input type="text" class="ubicTelefono" value="${escapePortalHtml2(u.telefono || '')}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Correo</label><input type="email" class="ubicEmail" value="${escapePortalHtml2(u.email || '')}"></div>
        <div class="field"><label>Dirección</label><input type="text" class="ubicDireccion" value="${escapePortalHtml2(u.direccion || '')}"></div>
      </div>
      <button type="button" class="btn-ghost guardarUbicBtn" style="margin-top:6px; font-size:12px;">Guardar cambios</button>
      <span class="ubicSaveStatus" style="font-size:11.5px; color:var(--signal); margin-left:8px;"></span>
    </div>
  `;
}

function escapePortalHtml2(s){
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

async function onPageReady(profile){
  renderPortalSidebar('perfil');

  const ubicaciones = await dbPortalListMisUbicaciones();
  const container = document.getElementById('misUbicacionesForms');
  if(!ubicaciones.length){
    container.innerHTML = '<p style="font-size:12.5px; color:var(--muted);">No hay ubicaciones registradas para tu empresa. Contacta a Servicios Informáticos.</p>';
  } else {
    container.innerHTML = ubicaciones.map(renderUbicacionForm).join('');
    container.querySelectorAll('.guardarUbicBtn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const panel = e.target.closest('[data-ubic-id]');
        const id = panel.getAttribute('data-ubic-id');
        const payload = {
          contacto: panel.querySelector('.ubicContacto').value.trim(),
          telefono: panel.querySelector('.ubicTelefono').value.trim(),
          email: panel.querySelector('.ubicEmail').value.trim(),
          direccion: panel.querySelector('.ubicDireccion').value.trim(),
        };
        const statusEl = panel.querySelector('.ubicSaveStatus');
        statusEl.textContent = 'Guardando...';
        const result = await dbPortalActualizarUbicacion(id, payload);
        statusEl.textContent = result ? '✓ Guardado' : '⚠ No se pudo guardar';
        setTimeout(()=> statusEl.textContent = '', 2500);
      });
    });
  }

  document.getElementById('cambiarPasswordBtn').addEventListener('click', async () => {
    const p1 = document.getElementById('nuevaPassword').value;
    const p2 = document.getElementById('nuevaPasswordRepeat').value;
    const statusEl = document.getElementById('passwordStatus');
    if(p1.length < 6){
      statusEl.style.color = 'var(--danger)';
      statusEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }
    if(p1 !== p2){
      statusEl.style.color = 'var(--danger)';
      statusEl.textContent = 'Las contraseñas no coinciden.';
      return;
    }
    const result = await dbPortalCambiarPassword(p1);
    if(result.success){
      statusEl.style.color = 'var(--signal)';
      statusEl.textContent = '✓ Contraseña actualizada.';
      document.getElementById('nuevaPassword').value = '';
      document.getElementById('nuevaPasswordRepeat').value = '';
    } else {
      statusEl.style.color = 'var(--danger)';
      statusEl.textContent = 'No se pudo cambiar la contraseña.';
    }
  });
}
