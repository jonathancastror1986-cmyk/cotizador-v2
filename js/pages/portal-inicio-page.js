// ============================================================
// Página: Portal de clientes — Mis OTs
// ============================================================

const PORTAL_ESTADO_LABELS = {
  solicitud: { label: '📩 Solicitud enviada, en revisión', color: 'var(--copper)' },
  borrador: { label: 'En preparación', color: 'var(--muted)' },
  enviada: { label: 'Cotización enviada', color: 'var(--copper)' },
  aceptada: { label: '✓ Aceptada', color: 'var(--signal)' },
  rechazada: { label: 'Rechazada', color: 'var(--danger)' },
  en_espera: { label: 'En espera', color: 'var(--copper)' },
  cancelada: { label: 'Cancelada', color: 'var(--danger)' },
};

function renderPortalOtCard(q){
  const estado = PORTAL_ESTADO_LABELS[q.estado] || { label: q.estado, color: 'var(--muted)' };
  const ubicacion = q.ubicaciones ? q.ubicaciones.ubicacion : '';
  const fecha = q.fecha ? new Date(q.fecha).toLocaleDateString('es-CL') : '';
  const fechaVisita = q.fecha_compromiso_ot ? new Date(q.fecha_compromiso_ot).toLocaleDateString('es-CL') : null;

  let docLinks = '';
  if(q.fee_receipt_pdf_url){
    docLinks += `<a href="${q.fee_receipt_pdf_url}" target="_blank" class="btn-ghost" style="font-size:11.5px; padding:5px 10px; text-decoration:none;">📄 Ver documento</a>`;
  }
  if(q.payment_proof_url){
    docLinks += `<a href="${q.payment_proof_url}" target="_blank" class="btn-ghost" style="font-size:11.5px; padding:5px 10px; text-decoration:none;">💳 Ver comprobante de pago</a>`;
  }

  return `
    <div class="panel" style="margin:0; padding:14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span class="num">${q.numero}</span>
        <span class="mini-badge" style="color:${estado.color};">${estado.label}</span>
      </div>
      <div style="font-size:12.5px; color:var(--muted); margin-bottom:8px;">
        ${ubicacion ? ubicacion + ' · ' : ''}${fecha}
        ${fechaVisita ? '<br>📅 Visita agendada: ' + fechaVisita : ''}
      </div>
      ${q.notas ? `<div style="font-size:12.5px; margin-bottom:8px;">${escapePortalHtml(q.notas)}</div>` : ''}
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
        ${badgeFormaPago(q)}
        ${badgeDocumento(q)}
        ${badgePagadoCliente(q)}
      </div>
      ${docLinks ? `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">${docLinks}</div>` : ''}
    </div>
  `;
}

function escapePortalHtml(s){
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

async function onPageReady(profile){
  renderPortalSidebar('inicio');

  const empresa = await dbPortalGetMiEmpresa();
  if(empresa){
    document.getElementById('empresaNombre').textContent = empresa.nombre;
  } else {
    document.getElementById('empresaNombre').textContent = 'Tu cuenta aún no está vinculada a una empresa';
  }

  const ots = await dbPortalListMisOts();
  const listEl = document.getElementById('misOtsList');
  const emptyEl = document.getElementById('misOtsEmpty');

  if(!ots.length){
    emptyEl.style.display = 'block';
    return;
  }
  listEl.innerHTML = ots.map(renderPortalOtCard).join('');
}
