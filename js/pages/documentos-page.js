// ============================================================
// Página: Documentos (Compras)
// ============================================================

const ESTADO_SII_LABELS = { borrador: 'Sin declarar', declarada: 'Declarada', pagada: 'IVA pagado' };
let editingCompraId = null;

function onPageReady(profile){
  renderCompras();
  renderCompraOTOptions();
  renderVentaOTOptions();
  document.getElementById('addCompraBtn').addEventListener('click', agregarCompra);
  document.getElementById('siiExcelInput').addEventListener('change', handleSiiExcelUpload);

  document.getElementById('showCompraFormBtn').addEventListener('click', () => {
    document.getElementById('compraFormSection').style.display = 'block';
    document.getElementById('ventaFormSection').style.display = 'none';
    document.getElementById('showCompraFormBtn').className = 'btn-primary';
    document.getElementById('showVentaFormBtn').className = 'btn-ghost';
  });
  document.getElementById('showVentaFormBtn').addEventListener('click', () => {
    document.getElementById('compraFormSection').style.display = 'none';
    document.getElementById('ventaFormSection').style.display = 'block';
    document.getElementById('showCompraFormBtn').className = 'btn-ghost';
    document.getElementById('showVentaFormBtn').className = 'btn-primary';
  });

  document.getElementById('ventaOtSelect').addEventListener('change', cargarDocumentoVenta);
  document.getElementById('ventaCalcIvaBtn').addEventListener('click', () => {
    const neto = parseFloat(document.getElementById('ventaDocNeto').value) || 0;
    if(neto <= 0){ alert('Ingresa el monto neto primero.'); return; }
    document.getElementById('ventaDocIva').value = Math.round(neto * 0.19);
  });
  document.getElementById('saveVentaDocBtn').addEventListener('click', guardarDocumentoVenta);
}
window.onPageReady = onPageReady;

async function renderVentaOTOptions(){
  const sel = document.getElementById('ventaOtSelect');
  const cotizaciones = await dbListCotizaciones();
  sel.innerHTML = '<option value="">Elige una OT...</option>' +
    cotizaciones.map(q => `<option value="${q.id}">${q.numero} — ${escapeHtml(q.clientes ? q.clientes.nombre : 'Sin cliente')}</option>`).join('');
}

async function cargarDocumentoVenta(e){
  const id = e.target.value;
  if(!id){ document.getElementById('ventaFormFields').style.display = 'none'; return; }
  const q = await dbGetCotizacion(id);
  if(!q) return;
  document.getElementById('ventaDocTipo').value = q.fee_receipt_doc_type || 'boleta_honorarios';
  document.getElementById('ventaDocNumero').value = q.fee_receipt_number || '';
  document.getElementById('ventaDocRut').value = q.fee_receipt_rut || '';
  document.getElementById('ventaDocRazonSocial').value = q.fee_receipt_razon_social || '';
  document.getElementById('ventaDocNeto').value = q.fee_receipt_neto || '';
  document.getElementById('ventaDocIva').value = q.fee_receipt_iva || '';
  document.getElementById('ventaDocIvaNoRec').value = q.fee_receipt_iva_no_rec || '';
  document.getElementById('ventaFormFields').style.display = 'block';
}

async function guardarDocumentoVenta(){
  const id = document.getElementById('ventaOtSelect').value;
  if(!id){ alert('Elige una OT primero.'); return; }
  const updated = await dbUpdateCotizacion(id, {
    requires_fee_receipt: true,
    fee_receipt_doc_type: document.getElementById('ventaDocTipo').value,
    fee_receipt_number: document.getElementById('ventaDocNumero').value || null,
    fee_receipt_rut: document.getElementById('ventaDocRut').value || null,
    fee_receipt_razon_social: document.getElementById('ventaDocRazonSocial').value || null,
    fee_receipt_neto: parseFloat(document.getElementById('ventaDocNeto').value) || null,
    fee_receipt_iva: parseFloat(document.getElementById('ventaDocIva').value) || null,
    fee_receipt_iva_no_rec: parseFloat(document.getElementById('ventaDocIvaNoRec').value) || null,
  });
  if(updated){
    toast('Documento de venta guardado en ' + updated.numero + '.');
  } else {
    alert('No se pudo guardar. Revisa la consola (F12).');
  }
}

function normalizeHeader(h){
  return (h||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
}
function normalizeFolio(v){
  return (v||'').toString().trim().replace(/^0+/, '') || (v||'').toString().trim();
}

function parseSiiExcelRows(workbook){
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  if(!rows.length) return [];
  const headers = rows[0].map(normalizeHeader);
  const findCol = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));
  const folioIdx = findCol(['folio', 'numero doc', 'nro doc', 'n doc']);
  const fechaIdx = findCol(['fecha']);
  const montoIdx = findCol(['monto total', 'monto', 'total']);
  const tipoIdx = findCol(['tipo doc', 'tipo']);
  const razonIdx = findCol(['razon social', 'rzn social', 'proveedor', 'cliente']);

  const out = [];
  for(let i=1; i<rows.length; i++){
    const r = rows[i];
    if(!r || r.every(c => c === '' || c == null)) continue;
    const folio = folioIdx >= 0 ? normalizeFolio(r[folioIdx]) : '';
    if(!folio) continue;
    out.push({
      folio,
      fecha: fechaIdx >= 0 ? (r[fechaIdx]||'').toString().trim() : '',
      monto: montoIdx >= 0 ? parseFloat((r[montoIdx]||'0').toString().replace(/[^0-9.-]/g,'')) || 0 : 0,
      tipo: tipoIdx >= 0 ? (r[tipoIdx]||'').toString().trim() : '',
      razon: razonIdx >= 0 ? (r[razonIdx]||'').toString().trim() : '',
    });
  }
  return out;
}

async function handleSiiExcelUpload(e){
  const file = e.target.files[0];
  if(!file) return;
  const resEl = document.getElementById('siiCompareResults');
  resEl.innerHTML = '<p style="color:var(--muted); font-size:12.5px;">Leyendo archivo...</p>';

  const reader = new FileReader();
  reader.onload = async (ev) => {
    const data = new Uint8Array(ev.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const excelRows = parseSiiExcelRows(workbook);
    await runSiiComparison(excelRows);
  };
  reader.readAsArrayBuffer(file);
}

async function runSiiComparison(excelRows){
  const resEl = document.getElementById('siiCompareResults');
  const cotizaciones = (await dbListCotizaciones()).filter(q => q.fee_receipt_number);
  const compras = (await dbListCompras()).filter(c => c.doc_number);

  const ownDocs = [
    ...cotizaciones.map(q => ({ folio: normalizeFolio(q.fee_receipt_number), label: 'Venta ' + q.numero + ' — ' + (q.clientes ? q.clientes.nombre : 'Sin cliente'), monto: q.fee_receipt_neto || 0 })),
    ...compras.map(c => ({ folio: normalizeFolio(c.doc_number), label: 'Compra ' + (c.proveedor||'Sin proveedor'), monto: c.monto || 0 })),
  ];
  const ownFolios = new Set(ownDocs.map(d => d.folio));
  const excelFolios = new Set(excelRows.map(r => r.folio));

  const faltanEnSistema = excelRows.filter(r => !ownFolios.has(r.folio));
  const faltanEnSII = ownDocs.filter(d => !excelFolios.has(d.folio));

  let html = `<div style="font-size:12.5px; margin-bottom:10px;"><b>${excelRows.length}</b> documentos en el Excel del SII · <b>${ownDocs.length}</b> documentos en tu sistema.</div>`;

  if(faltanEnSistema.length){
    html += `<div style="font-weight:600; font-size:12.5px; color:var(--danger); margin:10px 0 6px;">⚠ En el SII pero no en tu sistema:</div>`;
    html += faltanEnSistema.map(r => `<div class="hist-row"><div>${escapeHtml(r.tipo||'Documento')} N° ${escapeHtml(r.folio)}<div style="font-size:11px; color:var(--muted);">${escapeHtml(r.razon||'')} · ${formatCLP(r.monto)} · ${escapeHtml(r.fecha)}</div></div></div>`).join('');
  } else {
    html += `<div style="font-size:12.5px; color:var(--signal); margin:10px 0;">✓ Todos los documentos del SII ya están en tu sistema.</div>`;
  }

  if(faltanEnSII.length){
    html += `<div style="font-weight:600; font-size:12.5px; color:var(--copper); margin:14px 0 6px;">⚠ En tu sistema pero no aparecen en el Excel del SII:</div>`;
    html += faltanEnSII.map(d => `<div class="hist-row"><div>N° ${escapeHtml(d.folio)} — ${escapeHtml(d.label)}<div style="font-size:11px; color:var(--muted);">${formatCLP(d.monto)}</div></div></div>`).join('');
  } else {
    html += `<div style="font-size:12.5px; color:var(--signal); margin:10px 0;">✓ Todos tus documentos aparecen también en el Excel del SII.</div>`;
  }

  resEl.innerHTML = html;
}

async function agregarCompra() {
  const proveedor = document.getElementById('compraProveedor').value.trim();
  const tipo = document.getElementById('compraTipo').value;
  const monto = parseFloat(document.getElementById('compraMonto').value) || 0;
  const ivaManual = parseFloat(document.getElementById('compraIvaRecuperable').value) || null;
  const ivaNoRec = parseFloat(document.getElementById('compraIvaNoRecuperable').value) || 0;
  const linkedOt = document.getElementById('compraLinkedOt').value || null;
  if (!proveedor || monto <= 0) { alert('Completa proveedor y monto.'); return; }

  let compra;
  if(editingCompraId){
    compra = await dbUpdateCompra(editingCompraId, {
      proveedor, doc_type: tipo, monto, iva_manual: ivaManual, iva_no_recuperable: ivaNoRec, linked_ot: linkedOt,
    });
  } else {
    compra = await dbCreateCompra({
      proveedor, doc_type: tipo, monto,
      iva_manual: ivaManual, iva_no_recuperable: ivaNoRec, linked_ot: linkedOt,
      status: 'borrador', payment_method: 'efectivo', purchase_payment_status: 'pendiente',
    });
  }

  if (compra) {
    cancelarEdicionCompra();
    renderCompras();
  } else {
    alert('Hubo un error al guardar la compra. Revisa la consola (F12).');
  }
}

function cancelarEdicionCompra(){
  editingCompraId = null;
  document.getElementById('compraProveedor').value = '';
  document.getElementById('compraMonto').value = '';
  document.getElementById('compraIvaRecuperable').value = '';
  document.getElementById('compraIvaNoRecuperable').value = '';
  document.getElementById('compraLinkedOt').value = '';
  document.getElementById('compraTipo').value = 'factura';
  document.getElementById('addCompraBtn').textContent = '+ Agregar';
  const cancelBtn = document.getElementById('cancelEditCompraBtn');
  if(cancelBtn) cancelBtn.style.display = 'none';
}
window.cancelarEdicionCompra = cancelarEdicionCompra;

function editarCompra(id){
  const compra = comprasCacheParaEditar.find(c => c.id === id);
  if(!compra) return;
  editingCompraId = id;
  document.getElementById('compraProveedor').value = compra.proveedor || '';
  document.getElementById('compraTipo').value = compra.doc_type || 'factura';
  document.getElementById('compraMonto').value = compra.monto || '';
  document.getElementById('compraIvaRecuperable').value = compra.iva_manual || '';
  document.getElementById('compraIvaNoRecuperable').value = compra.iva_no_recuperable || '';
  document.getElementById('compraLinkedOt').value = compra.linked_ot || '';
  document.getElementById('addCompraBtn').textContent = 'Guardar cambios';
  const cancelBtn = document.getElementById('cancelEditCompraBtn');
  if(cancelBtn) cancelBtn.style.display = 'inline-block';
  document.getElementById('compraProveedor').scrollIntoView({ behavior:'smooth', block:'center' });
}
window.editarCompra = editarCompra;

async function renderCompraOTOptions() {
  const sel = document.getElementById('compraLinkedOt');
  if (!sel) return;
  const cotizaciones = await dbListCotizaciones();
  sel.innerHTML = '<option value="">Sin asignar a OT</option>' +
    cotizaciones.map(q => `<option value="${q.numero}">${q.numero} — ${escapeHtml(q.clientes ? q.clientes.nombre : 'Sin cliente')}</option>`).join('');
}

let comprasCacheParaEditar = [];

async function renderCompras() {
  const wrap = document.getElementById('comprasList');
  wrap.innerHTML = '<p style="color:var(--muted); font-size:13px;">Cargando...</p>';
  const [compras, cotizaciones] = await Promise.all([dbListCompras(), dbListCotizaciones()]);
  comprasCacheParaEditar = compras;
  if (!compras.length) {
    wrap.innerHTML = '<p style="color:var(--muted); font-size:13px;">Sin compras registradas aún.</p>';
    return;
  }
  const tecnicoPorOt = {};
  cotizaciones.forEach(q => { if(q.tecnico) tecnicoPorOt[q.numero] = q.tecnico.nombre; });

  wrap.innerHTML = compras.map(c => {
    const pagadaProveedor = (c.purchase_payment_status || 'pendiente') === 'pagada';
    const tecnico = c.linked_ot ? tecnicoPorOt[c.linked_ot] : null;
    return `
    <div class="hist-row" style="flex-wrap:wrap;">
      <div>
        <b>${escapeHtml(c.proveedor)}</b>
        <div style="font-size:11.5px; color:var(--muted); font-family:var(--font-mono);">
          ${c.doc_type} · ${formatCLP(c.monto)}${c.iva_manual ? ' · IVA recup: ' + formatCLP(c.iva_manual) : ''}${c.iva_no_recuperable ? ' · IVA no recup: ' + formatCLP(c.iva_no_recuperable) : ''}${c.linked_ot ? ' · ' + escapeHtml(c.linked_ot) : ' · sin OT'}${tecnico ? ' · 👷 ' + escapeHtml(tecnico) : ''}
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <label class="compra-paid-toggle" data-id="${c.id}" style="display:flex; align-items:center; gap:5px; font-size:11.5px; cursor:pointer; padding:5px 8px; border-radius:6px; ${pagadaProveedor ? 'background:var(--signal-soft); color:var(--signal);' : 'background:var(--danger-soft); color:var(--danger);'}">
          <input type="checkbox" class="compra-paid-checkbox" data-id="${c.id}" ${pagadaProveedor ? 'checked' : ''}> Pagada al proveedor
        </label>
        <select class="compra-status-select" data-id="${c.id}" style="width:auto; font-size:11.5px; padding:5px 8px;">
          <option value="borrador" ${c.status==='borrador'?'selected':''}>Sin declarar</option>
          <option value="declarada" ${c.status==='declarada'?'selected':''}>Declarada</option>
          <option value="pagada" ${c.status==='pagada'?'selected':''}>IVA pagado</option>
        </select>
        <button type="button" class="btn-ghost" onclick="editarCompra('${c.id}')" style="padding:5px 10px;">✏️</button>
        <button type="button" class="btn-danger" onclick="eliminarCompra('${c.id}', '${c.status}')" style="padding:5px 10px;">✕</button>
      </div>
    </div>
  `;}).join('');
  wrap.querySelectorAll('.compra-status-select').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      await dbUpdateCompra(e.target.dataset.id, { status: e.target.value });
      renderCompras();
    });
  });
  wrap.querySelectorAll('.compra-paid-checkbox').forEach(chk => {
    chk.addEventListener('change', async (e) => {
      await dbUpdateCompra(e.target.dataset.id, { purchase_payment_status: e.target.checked ? 'pagada' : 'pendiente' });
      renderCompras();
    });
  });
}

async function eliminarCompra(id, status) {
  if (status !== 'borrador') {
    const ok = confirm('Esta compra ya está "' + (ESTADO_SII_LABELS[status] || status) + '" ante el SII. ¿Seguro que quieres eliminarla?');
    if (!ok) return;
  }
  const success = await dbDeleteCompra(id);
  if (success) renderCompras();
  else alert('No se pudo eliminar. Revisa la consola (F12).');
}
window.eliminarCompra = eliminarCompra;

function formatCLP(n) { return '$' + Math.round(n).toLocaleString('es-CL'); }
function escapeHtml(s) { const div = document.createElement('div'); div.textContent = s || ''; return div.innerHTML; }
