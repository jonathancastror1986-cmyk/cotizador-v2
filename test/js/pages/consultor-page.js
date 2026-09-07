// ============================================================
// Página: Consultor de OTs — listado enriquecido + modal de detalle
// ============================================================

let consultorCache = [];
let otDetailId = null;

function onPageReady(profile){
  cargarConsultor();
  document.getElementById('consultorSearch').addEventListener('input', renderConsultorList);
  document.getElementById('consultorEstadoFilter').addEventListener('change', renderConsultorList);
  document.getElementById('consultorPagoFilter').addEventListener('change', renderConsultorList);
  document.getElementById('closeOtDetailBtn').addEventListener('click', () => {
    document.getElementById('otDetailModal').style.display = 'none';
  });
  document.getElementById('saveOtDetailBtn').addEventListener('click', guardarOtDetail);
  document.getElementById('otGeneratePdfBtn').addEventListener('click', generarPdfDesdeConsultor);
}
window.onPageReady = onPageReady;

async function cargarConsultor(){
  const wrap = document.getElementById('consultorList');
  wrap.innerHTML = '<p style="color:var(--muted); font-size:13px;">Cargando...</p>';
  consultorCache = await dbListCotizaciones();
  renderConsultorList();
}

function renderConsultorList(){
  const wrap = document.getElementById('consultorList');
  const q = (document.getElementById('consultorSearch').value || '').toLowerCase().trim();
  const estadoFilter = document.getElementById('consultorEstadoFilter').value;
  const pagoFilter = document.getElementById('consultorPagoFilter').value;

  let list = consultorCache;
  if(q){
    list = list.filter(x => x.numero.toLowerCase().includes(q) || (x.clientes && x.clientes.nombre.toLowerCase().includes(q)));
  }
  if(estadoFilter) list = list.filter(x => x.estado === estadoFilter);
  if(pagoFilter) list = list.filter(x => (x.forma_pago || 'transferencia') === pagoFilter);

  if(!list.length){
    wrap.innerHTML = '<p style="color:var(--muted); font-size:13px;">Sin cotizaciones que coincidan.</p>';
    return;
  }

  wrap.innerHTML = list.map(item => {
    const { total } = computeTotalConDescuento(item);
    return `
      <div class="hist-row" style="cursor:pointer; flex-wrap:wrap; gap:8px;" onclick="abrirOtDetalle('${item.id}')">
        <div style="flex:1; min-width:200px;">
          <span class="num">${item.numero}</span> — ${escapeHtml(item.clientes ? item.clientes.nombre : 'Sin cliente')}
          <div style="font-size:11.5px; color:var(--muted); font-family:var(--font-mono); margin-top:2px;">${formatCLP(total)}</div>
          <div style="display:flex; gap:5px; flex-wrap:wrap; margin-top:6px;">
            <span class="status-badge" data-estado="${item.estado}">${item.estado}</span>
            ${badgeFormaPago(item)}
            ${badgeDocumento(item)}
            ${badgePagadoCliente(item)}
          </div>
        </div>
      </div>`;
  }).join('');
}

function escapeHtml(s) { const div = document.createElement('div'); div.textContent = s || ''; return div.innerHTML; }

async function abrirOtDetalle(id){
  otDetailId = id;
  const q = await dbGetCotizacion(id);
  if(!q){ alert('No se pudo cargar la cotización.'); return; }

  document.getElementById('otDetailTitle').textContent = q.numero;
  const cliente = q.clientes, ubic = q.ubicaciones;
  document.getElementById('otDetailInfo').textContent =
    (cliente ? cliente.nombre : 'Sin cliente') + (cliente && cliente.rut ? ' (' + cliente.rut + ')' : '') + ' · ' + (ubic ? ubic.ubicacion : 'sin ubicación') + ' · ' + (q.fecha || '');

  document.getElementById('otDetailBadges').innerHTML = badgeFormaPago(q) + badgeDocumento(q) + badgePagadoCliente(q);

  const items = q.items || [];
  const puedeEditarItems = (q.estado || 'borrador') === 'borrador';
  document.getElementById('otDetailItemsList').innerHTML = items.length
    ? items.map(it => `
        <div class="item-row">
          <span class="desc">${escapeHtml(it.descripcion)}</span>
          <span class="qty">x${it.cantidad}</span>
          <span class="price">${formatCLP(it.precio)}</span>
          <span class="sub">${formatCLP(it.cantidad * it.precio)}</span>
          ${puedeEditarItems ? `<button type="button" class="btn-danger" onclick="eliminarItemConsultor('${it.id}')" style="padding:4px 9px;">✕</button>` : ''}
        </div>`).join('') + (!puedeEditarItems ? '<div style="font-size:11px; color:var(--muted); margin-top:6px;">Los ítems solo se pueden borrar mientras la cotización está en borrador.</div>' : '')
    : '<div style="color:var(--muted); font-size:12.5px;">Sin ítems.</div>';

  const { subtotal, total, ivaDocumento } = computeTotalConDescuento(q);
  document.getElementById('otDetailTotalDisplay').textContent = formatCLP(total);
  const huboAjuste = total !== subtotal;
  document.getElementById('otDetailSubtotalLine').style.display = huboAjuste ? 'flex' : 'none';
  document.getElementById('otDetailDiscLine').style.display = huboAjuste ? 'flex' : 'none';
  if(huboAjuste){
    document.getElementById('otDetailSubtotalDisplay').textContent = formatCLP(subtotal);
    const diff = total - subtotal;
    let label = 'Ajuste';
    if(ivaDocumento > 0) label = 'IVA / impuestos del documento';
    else if(q.disc_type === 'percent') label = 'Descuento (' + (q.disc_percent||0) + '%)';
    else if(q.disc_type === 'round_step') label = 'Redondeo a múltiplos de ' + formatCLP(q.disc_round_step||10000);
    else if(q.disc_type === 'round') label = 'Ajuste redondeo';
    document.getElementById('otDetailDiscLabel').textContent = label;
    document.getElementById('otDetailDiscDisplay').textContent = (diff >= 0 ? '+' : '-') + formatCLP(Math.abs(diff));
  }

  document.getElementById('otDetailEstado').value = q.estado || 'borrador';
  document.getElementById('otDetailFormaPago').value = q.forma_pago || 'transferencia';
  document.getElementById('otDetailPaid').checked = !!q.paid;
  document.getElementById('otDetailWorkExecuted').checked = !!q.work_executed;
  document.getElementById('otDetailFechaCompromiso').value = q.fecha_compromiso_ot || '';
  document.getElementById('otDetailDocStage').value = q.fee_receipt_stage || 'borrador';
  document.getElementById('otOpenInCotizacionesBtn').href = 'cotizaciones.html?ot=' + id;
  document.getElementById('otDetailDocStageField').style.display = q.requires_fee_receipt ? 'block' : 'none';

  document.getElementById('otDetailModal').style.display = 'flex';
}
window.abrirOtDetalle = abrirOtDetalle;

async function eliminarItemConsultor(itemId){
  if(!otDetailId) return;
  if(!confirm('¿Borrar este ítem de la cotización?')) return;
  const ok = await dbDeleteItem(itemId);
  if(!ok){ alert('No se pudo borrar el ítem. Revisa la consola (F12).'); return; }
  toast('Ítem borrado.');
  await abrirOtDetalle(otDetailId); // refresca el modal con los ítems actualizados
  cargarConsultor();
}
window.eliminarItemConsultor = eliminarItemConsultor;

async function guardarOtDetail(){
  if(!otDetailId) return;
  const updated = await dbUpdateCotizacion(otDetailId, {
    estado: document.getElementById('otDetailEstado').value,
    forma_pago: document.getElementById('otDetailFormaPago').value,
    paid: document.getElementById('otDetailPaid').checked,
    work_executed: document.getElementById('otDetailWorkExecuted').checked,
    fee_receipt_stage: document.getElementById('otDetailDocStage').value,
    fecha_compromiso_ot: document.getElementById('otDetailFechaCompromiso').value || null,
  });
  if(updated){
    toast('Guardado.');
    document.getElementById('otDetailModal').style.display = 'none';
    cargarConsultor();
  } else {
    alert('No se pudo guardar. Revisa la consola (F12).');
  }
}

async function generarPdfDesdeConsultor(){
  if(!otDetailId) return;
  const q = await dbGetCotizacion(otDetailId);
  if(!q){ alert('No se pudo cargar la cotización.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(14);
  doc.text('Cotización ' + q.numero, 15, y); y += 8;
  doc.setFontSize(10);
  doc.text('Cliente: ' + (q.clientes ? q.clientes.nombre : 'Sin cliente'), 15, y); y += 10;
  (q.items || []).forEach(it => {
    doc.text(it.descripcion + ' x' + it.cantidad, 15, y);
    doc.text(formatCLP(it.cantidad * it.precio), 180, y, { align: 'right' });
    y += 6;
  });
  y += 4;
  const { total } = computeTotalConDescuento(q);
  doc.setFontSize(12);
  doc.text('Total: ' + formatCLP(total), 15, y);
  doc.save('Cotizacion_' + q.numero + '.pdf');
}
