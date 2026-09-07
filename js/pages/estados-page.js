// ============================================================
// Página: Estados de cotizaciones — consulta de solo lectura
// Muestra por cada cotización: método de pago, documento asociado,
// si el cliente pagó, y si el IVA está pagado (dos cosas separadas).
// ============================================================

let estadosCache = [];

function onPageReady(){
  cargarEstados();
  document.getElementById('estadosSearch').addEventListener('input', renderEstadosList);
  document.getElementById('estadosPagoFilter').addEventListener('change', renderEstadosList);
  document.getElementById('estadosDocFilter').addEventListener('change', renderEstadosList);
  document.getElementById('estadosPagadoClienteFilter').addEventListener('change', renderEstadosList);
  document.getElementById('estadosIvaFilter').addEventListener('change', renderEstadosList);
}
window.onPageReady = onPageReady;

function escapeHtml(s) { const div = document.createElement('div'); div.textContent = s || ''; return div.innerHTML; }

async function cargarEstados(){
  const wrap = document.getElementById('estadosList');
  wrap.innerHTML = '<p style="color:var(--muted); font-size:13px;">Cargando...</p>';
  estadosCache = await dbListCotizaciones();
  renderEstadosList();
}

function renderEstadosList(){
  const wrap = document.getElementById('estadosList');
  const q = (document.getElementById('estadosSearch').value || '').toLowerCase().trim();
  const pagoFilter = document.getElementById('estadosPagoFilter').value;
  const docFilter = document.getElementById('estadosDocFilter').value;
  const pagadoFilter = document.getElementById('estadosPagadoClienteFilter').value;
  const ivaFilter = document.getElementById('estadosIvaFilter').value;

  let list = estadosCache;
  if(q){
    list = list.filter(x => x.numero.toLowerCase().includes(q) || (x.clientes && x.clientes.nombre.toLowerCase().includes(q)));
  }
  if(pagoFilter) list = list.filter(x => (x.forma_pago || 'transferencia') === pagoFilter);
  if(docFilter === 'sin_documento') list = list.filter(x => !x.requires_fee_receipt);
  else if(docFilter) list = list.filter(x => x.requires_fee_receipt && (x.fee_receipt_doc_type || 'boleta_honorarios') === docFilter);
  if(pagadoFilter === 'si') list = list.filter(x => !!x.paid);
  else if(pagadoFilter === 'no') list = list.filter(x => !x.paid);
  if(ivaFilter) list = list.filter(x => ivaStatusFor(x) === ivaFilter);

  if(!list.length){
    wrap.innerHTML = '<p style="color:var(--muted); font-size:13px;">Sin cotizaciones que coincidan.</p>';
    return;
  }

  wrap.innerHTML = list.map(item => `
    <div class="hist-row" style="flex-wrap:wrap; gap:8px;">
      <div style="flex:1; min-width:220px;">
        <span class="num">${escapeHtml(item.numero)}</span> — ${escapeHtml(item.clientes ? item.clientes.nombre : 'Sin cliente')}
        ${item.ubicaciones ? '<span style="color:var(--muted); font-size:11.5px;"> · ' + escapeHtml(item.ubicaciones.ubicacion || '') + '</span>' : ''}
        <div style="display:flex; gap:5px; flex-wrap:wrap; margin-top:6px;">
          <span class="status-badge" data-estado="${item.estado}">${item.estado}</span>
          ${badgeFormaPago(item)}
          ${badgeDocumento(item)}
          ${badgePagadoCliente(item)}
          ${badgeIva(item)}
        </div>
      </div>
    </div>`).join('');
}
