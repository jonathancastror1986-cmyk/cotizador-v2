// ============================================================
// Página: Portal de clientes — Solicitar servicio
// ============================================================

let portalMiClienteId = null;

async function onPageReady(profile){
  renderPortalSidebar('solicitar');

  const empresa = await dbPortalGetMiEmpresa();
  if(!empresa){
    document.getElementById('solicitudStatus').style.color = 'var(--danger)';
    document.getElementById('solicitudStatus').textContent = 'Tu cuenta aún no está vinculada a una empresa. Contacta a Servicios Informáticos.';
    document.getElementById('enviarSolicitudBtn').disabled = true;
    return;
  }
  portalMiClienteId = empresa.id;

  const ubicaciones = await dbPortalListMisUbicaciones();
  const sel = document.getElementById('solicitudUbicacion');
  sel.innerHTML = '<option value="">Sin especificar</option>' +
    ubicaciones.map(u => `<option value="${u.id}">${u.ubicacion}</option>`).join('');

  document.getElementById('enviarSolicitudBtn').addEventListener('click', async () => {
    const notas = document.getElementById('solicitudNotas').value.trim();
    if(!notas){
      document.getElementById('solicitudStatus').style.color = 'var(--danger)';
      document.getElementById('solicitudStatus').textContent = 'Cuéntanos brevemente qué necesitas.';
      return;
    }
    const btn = document.getElementById('enviarSolicitudBtn');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    const result = await dbPortalCrearSolicitud({
      cliente_id: portalMiClienteId,
      ubicacion_id: document.getElementById('solicitudUbicacion').value || null,
      notas,
      fecha_preferida: document.getElementById('solicitudFecha').value || null,
    });

    btn.disabled = false;
    btn.textContent = 'Enviar solicitud';

    if(result.success){
      toast('✅ Solicitud enviada. Te contactaremos pronto.');
      document.getElementById('solicitudNotas').value = '';
      document.getElementById('solicitudFecha').value = '';
      document.getElementById('solicitudStatus').style.color = 'var(--signal)';
      document.getElementById('solicitudStatus').textContent = 'Solicitud N° ' + result.data.numero + ' enviada. Puedes ver su estado en "Mis OTs".';
    } else {
      document.getElementById('solicitudStatus').style.color = 'var(--danger)';
      document.getElementById('solicitudStatus').textContent = 'No se pudo enviar la solicitud. Intenta de nuevo o contáctanos directo.';
    }
  });
}
