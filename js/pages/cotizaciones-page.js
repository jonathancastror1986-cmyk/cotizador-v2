// ============================================================
// Página: Cotizaciones
// ============================================================

let currentItems = [];
let currentClienteId = null;
let currentOtrosImpuestos = [];
let currentEditId = null; // si no es null, "Guardar cotización" actualiza esta OT en vez de crear una nueva

function actualizarVisibilidadOrdenPago(){
  const esOrdenPago = document.getElementById('cotFormaPago').value === 'orden_pago';
  document.getElementById('ordenPagoHint').style.display = esOrdenPago ? 'block' : 'none';
}

function actualizarVisibilidadTipoDoc(){
  const esComprobante = document.getElementById('cotDocTipo').value === 'comprobante';
  document.getElementById('comprobantePagoNota').style.display = esComprobante ? 'block' : 'none';
  document.getElementById('cotDocNumeroWrap').style.display = esComprobante ? 'none' : '';
  document.getElementById('cotDocIvaWrap').style.display = esComprobante ? 'none' : '';
  document.getElementById('cotDocIvaNoRecWrap').style.display = esComprobante ? 'none' : '';
  document.getElementById('docTributarioExtras').style.display = esComprobante ? 'none' : 'block';
  if(esComprobante){
    document.getElementById('cotDocIva').value = '';
    document.getElementById('cotDocIvaNoRec').value = '';
  }
}

let currentComprobantePago = null;

function onPageReady(profile){
  renderHistorial();
  renderItemsUI();
  renderTecnicoOptions();
  renderClienteDatalist();
  if(profile.default_doc_type) document.getElementById('cotDocTipo').value = profile.default_doc_type;
  if(profile.default_payment_method) document.getElementById('cotFormaPago').value = profile.default_payment_method;
  actualizarVisibilidadOrdenPago();
  actualizarVisibilidadTipoDoc();

  document.getElementById('cotFormaPago').addEventListener('change', actualizarVisibilidadOrdenPago);
  document.getElementById('cotDocTipo').addEventListener('change', actualizarVisibilidadTipoDoc);
  document.getElementById('cotComprobantePagoInput').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if(!f) return;
    if(f.size > 4*1024*1024){ alert('Archivo muy grande (máx. 4MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      currentComprobantePago = reader.result;
      document.getElementById('cotComprobantePagoStatus').textContent = 'Adjunto: ' + f.name;
    };
    reader.readAsDataURL(f);
  });

  document.getElementById('clienteNombre').addEventListener('blur', resolverClienteActual);
  document.getElementById('clienteNombre').addEventListener('input', (e) => renderUbicacionDatalist(e.target.value));
  document.getElementById('clienteUbicacion').addEventListener('blur', resolverUbicacionActual);
  document.getElementById('toggleClientDetailsBtn').addEventListener('click', () => {
    const wrap = document.getElementById('clientDetailsFields');
    const isOpen = wrap.style.display !== 'none';
    wrap.style.display = isOpen ? 'none' : 'block';
    document.getElementById('toggleClientDetailsBtn').textContent = isOpen ? '▸ Más datos del cliente (RUT, contacto...)' : '▾ Más datos del cliente';
  });

  document.getElementById('cotEstado').addEventListener('change', (e) => {
    document.getElementById('enEsperaFields').style.display = e.target.value === 'en_espera' ? 'flex' : 'none';
  });

  document.getElementById('cotRequiresDoc').addEventListener('change', (e) => {
    document.getElementById('docFields').style.display = e.target.checked ? 'block' : 'none';
    renderItemsUI();
  });

  document.getElementById('addItemBtn').addEventListener('click', () => {
    const cat = document.getElementById('newItemCat').value;
    const desc = document.getElementById('newItemDesc').value.trim();
    const qty = parseFloat(document.getElementById('newItemQty').value) || 1;
    const price = parseFloat(document.getElementById('newItemPrice').value) || 0;
    if (!desc || price <= 0) { alert('Completa descripción y precio.'); return; }
    currentItems.push({ categoria: cat, descripcion: desc, cantidad: qty, precio: price });
    document.getElementById('newItemDesc').value = '';
    document.getElementById('newItemPrice').value = '';
    renderItemsUI();
  });

  document.getElementById('cotDocIva').addEventListener('input', renderItemsUI);
  document.getElementById('cotDocIvaNoRec').addEventListener('input', renderItemsUI);

  document.getElementById('cotDiscType').addEventListener('change', (e) => {
    document.getElementById('cotDiscPercentField').style.display = e.target.value === 'percent' ? 'block' : 'none';
    document.getElementById('cotDiscRoundStepField').style.display = e.target.value === 'round_step' ? 'block' : 'none';
    document.getElementById('cotDiscRoundField').style.display = e.target.value === 'round' ? 'block' : 'none';
    renderItemsUI();
  });
  document.getElementById('cotDiscPercent').addEventListener('input', renderItemsUI);
  document.getElementById('cotDiscRoundStep').addEventListener('change', renderItemsUI);
  document.getElementById('cotDiscRound').addEventListener('input', renderItemsUI);

  document.getElementById('addOtroImpBtn').addEventListener('click', () => {
    const nombre = document.getElementById('otroImpNombre').value.trim();
    const monto = parseFloat(document.getElementById('otroImpMonto').value) || 0;
    if (!nombre || monto <= 0) { alert('Completa nombre y monto del impuesto.'); return; }
    currentOtrosImpuestos.push({ nombre, monto });
    document.getElementById('otroImpNombre').value = '';
    document.getElementById('otroImpMonto').value = '';
    renderOtrosImpuestos();
    renderItemsUI();
  });

  document.getElementById('calcIvaBtn').addEventListener('click', () => {
    const neto = parseFloat(document.getElementById('cotDocNeto').value) || 0;
    if (neto <= 0) { alert('Ingresa el monto neto primero.'); return; }
    const iva = Math.round(neto * 0.19);
    document.getElementById('cotDocIva').value = iva;
    toast('IVA calculado: ' + formatCLP(iva));
    renderItemsUI();
  });

  document.getElementById('saveCotizacionBtn').addEventListener('click', guardarCotizacion);
  document.getElementById('newCotizacionBtn').addEventListener('click', limpiarFormulario);
  document.getElementById('savePlantillaBtn').addEventListener('click', guardarPlantilla);
  document.getElementById('plantillaSelect').addEventListener('change', aplicarPlantillaSeleccionada);
  document.getElementById('closeQuoteDetailBtn').addEventListener('click', () => {
    document.getElementById('quoteDetailModal').style.display = 'none';
  });
  document.getElementById('saveDetailBtn').addEventListener('click', guardarDetalleCotizacion);
  document.getElementById('generatePdfBtn').addEventListener('click', generarPdfCotizacion);
  document.getElementById('emailQuoteBtn').addEventListener('click', enviarCotizacionPorCorreo);
  document.getElementById('detailDiscType').addEventListener('change', () => { actualizarCamposDescuentoDetalle(); renderDetailTotals(); });
  document.getElementById('detailDiscPercent').addEventListener('input', renderDetailTotals);
  document.getElementById('detailDiscRoundStep').addEventListener('change', renderDetailTotals);
  document.getElementById('detailDiscRound').addEventListener('input', renderDetailTotals);
  document.getElementById('whatsappQuoteBtn').addEventListener('click', enviarCotizacionPorWhatsapp);
  document.getElementById('generateCertBtn').addEventListener('click', generarCertificadoPago);
  document.getElementById('deleteQuoteBtn').addEventListener('click', eliminarCotizacionActual);
  document.getElementById('cancelEditBtn').addEventListener('click', () => {
    if(confirm('¿Cancelar la edición? Se perderán los cambios no guardados en el formulario.')) limpiarFormulario();
  });
  document.getElementById('editFullQuoteBtn').addEventListener('click', () => {
    if(!currentDetailId) return;
    document.getElementById('quoteDetailModal').style.display = 'none';
    cargarCotizacionParaEditar(currentDetailId);
  });

  const otParam = new URLSearchParams(window.location.search).get('ot');
  if(otParam) cargarCotizacionParaEditar(otParam);
}
window.onPageReady = onPageReady;

function renderOtrosImpuestos(){
  const wrap = document.getElementById('otrosImpuestosList');
  if(!currentOtrosImpuestos.length){ wrap.innerHTML = ''; return; }
  wrap.innerHTML = currentOtrosImpuestos.map((o, i) => `
    <div class="item-row">
      <span class="desc">${escapeHtml(o.nombre)}</span>
      <span class="sub">${formatCLP(o.monto)}</span>
      <button type="button" class="btn-danger" onclick="quitarOtroImpuesto(${i})" style="padding:4px 9px;">✕</button>
    </div>
  `).join('');
}
function quitarOtroImpuesto(i){ currentOtrosImpuestos.splice(i,1); renderOtrosImpuestos(); }
window.quitarOtroImpuesto = quitarOtroImpuesto;

const CAT_LABELS = { traslado:'Traslado', hardware:'Hardware', mano_obra:'Mano de obra', software:'Software' };

function renderItemsUI() {
  const wrap = document.getElementById('itemsList');
  if (!currentItems.length) {
    wrap.innerHTML = '<div class="empty-items" style="color:var(--muted); font-size:13px;">Sin ítems aún.</div>';
  } else {
    wrap.innerHTML = currentItems.map((it, i) => `
      <div class="item-row">
        <span style="font-size:10.5px; color:var(--muted); flex:0 0 75px;">${CAT_LABELS[it.categoria]||it.categoria}</span>
        <span class="desc">${escapeHtml(it.descripcion)}</span>
        <span class="qty">x${it.cantidad}</span>
        <span class="price">${formatCLP(it.precio)}</span>
        <span class="sub">${formatCLP(it.cantidad * it.precio)}</span>
        <button type="button" class="btn-ghost" onclick="marcarFavorito(${i})" title="Guardar como favorito de este cliente" style="padding:4px 8px;">⭐</button>
        <button type="button" class="btn-danger" onclick="quitarItem(${i})" style="padding:4px 9px;">✕</button>
      </div>
    `).join('');
  }
  const subtotal = currentItems.reduce((s, it) => s + it.cantidad * it.precio, 0);
  let total = subtotal;
  let discAmount = 0;
  let discLabel = 'Ajuste';
  const discType = document.getElementById('cotDiscType').value;
  if (discType === 'percent') {
    const pct = parseFloat(document.getElementById('cotDiscPercent').value) || 0;
    discAmount = subtotal * pct / 100;
    total = subtotal - discAmount;
    discLabel = 'Descuento (' + pct + '%)';
  } else if (discType === 'round_step') {
    const step = parseFloat(document.getElementById('cotDiscRoundStep').value) || 10000;
    total = step > 0 ? Math.floor(subtotal / step) * step : subtotal;
    discAmount = subtotal - total;
    discLabel = 'Redondeo a múltiplos de ' + formatCLP(step);
  } else if (discType === 'round') {
    const fijo = parseFloat(document.getElementById('cotDiscRound').value);
    total = isNaN(fijo) ? subtotal : fijo;
    discAmount = subtotal - total;
    discLabel = 'Ajuste total manual';
  }
  if (document.getElementById('cotRequiresDoc').checked) {
    const iva = parseFloat(document.getElementById('cotDocIva').value) || 0;
    const ivaNoRec = parseFloat(document.getElementById('cotDocIvaNoRec').value) || 0;
    const otros = currentOtrosImpuestos.reduce((s, o) => s + (o.monto || 0), 0);
    total += iva + ivaNoRec + otros;
  }
  const huboAjuste = total !== subtotal;
  document.getElementById('subtotalLine').style.display = huboAjuste ? 'flex' : 'none';
  document.getElementById('discLine').style.display = huboAjuste ? 'flex' : 'none';
  if(huboAjuste){
    document.getElementById('subtotalDisplay').textContent = formatCLP(subtotal);
    document.getElementById('discLineLabel').textContent = discLabel;
    const diffTotal = total - subtotal;
    document.getElementById('discDisplay').textContent = (diffTotal >= 0 ? '+' : '-') + formatCLP(Math.abs(diffTotal));
  }
  document.getElementById('totalDisplay').textContent = formatCLP(total);
}

function quitarItem(i) { currentItems.splice(i, 1); renderItemsUI(); }
window.quitarItem = quitarItem;

async function marcarFavorito(i) {
  if (!currentClienteId) {
    await resolverClienteActual();
    if (!currentClienteId) { alert('Escribe el nombre del cliente primero.'); return; }
  }
  const it = currentItems[i];
  const result = await dbToggleFavorito(currentClienteId, it.categoria, it.descripcion, it.precio);
  if (result.action === 'added') toast('⭐ Guardado como favorito.');
  else if (result.action === 'removed') toast('Quitado de favoritos.');
  renderFavoritosBar();
}
window.marcarFavorito = marcarFavorito;

let clientesAutocompleteCache = [];

async function renderClienteDatalist(){
  clientesAutocompleteCache = await dbListClientes();
  const dl = document.getElementById('clienteDatalist');
  dl.innerHTML = clientesAutocompleteCache.map(c => `<option value="${escapeHtml(c.nombre)}">`).join('');
}

function renderUbicacionDatalist(clienteNombre){
  const dl = document.getElementById('ubicacionDatalist');
  const cliente = clientesAutocompleteCache.find(c => c.nombre.toLowerCase() === (clienteNombre||'').toLowerCase());
  const ubicaciones = cliente ? (cliente.ubicaciones || []) : [];
  dl.innerHTML = ubicaciones.map(u => `<option value="${escapeHtml(u.ubicacion)}">`).join('');
}

async function resolverClienteActual() {
  const nombre = document.getElementById('clienteNombre').value.trim();
  if (!nombre) { currentClienteId = null; renderFavoritosBar(); renderPlantillaOptions(); return; }
  renderUbicacionDatalist(nombre);
  const cliente = await dbGetOrCreateCliente(nombre);
  currentClienteId = cliente ? cliente.id : null;
  if (cliente && cliente.rut && !document.getElementById('clienteRut').value) {
    document.getElementById('clienteRut').value = cliente.rut;
  }
  renderFavoritosBar();
  renderPlantillaOptions();
}

async function resolverUbicacionActual() {
  if (!currentClienteId) return;
  const nombreUbicacion = document.getElementById('clienteUbicacion').value.trim();
  if (!nombreUbicacion) return;
  const clientes = await dbListClientes();
  const cliente = clientes.find(c => c.id === currentClienteId);
  if (!cliente) return;
  const ubicacion = (cliente.ubicaciones || []).find(u => u.ubicacion.toLowerCase() === nombreUbicacion.toLowerCase());
  if (ubicacion) {
    document.getElementById('clienteContacto').value = ubicacion.contacto || '';
    document.getElementById('clienteTelefono').value = ubicacion.telefono || '';
    document.getElementById('clienteEmail').value = ubicacion.email || '';
    document.getElementById('clienteDireccion').value = ubicacion.direccion || '';
    document.getElementById('clienteTrato').value = ubicacion.trato || 'formal';
    if (ubicacion.contacto || ubicacion.telefono || ubicacion.email) {
      document.getElementById('clientDetailsFields').style.display = 'block';
      document.getElementById('toggleClientDetailsBtn').textContent = '▾ Más datos del cliente';
    }
  }
}

async function cargarCotizacionParaEditar(id){
  const q = await dbGetCotizacion(id);
  if(!q){ alert('No se pudo cargar esa cotización para editar.'); return; }

  currentEditId = q.id;
  currentClienteId = q.cliente_id || (q.clientes ? q.clientes.id : null);

  const cliente = q.clientes || {};
  const ubic = q.ubicaciones || {};
  document.getElementById('clienteNombre').value = cliente.nombre || '';
  document.getElementById('clienteUbicacion').value = ubic.ubicacion || '';
  document.getElementById('clienteRut').value = cliente.rut || '';
  document.getElementById('clienteContacto').value = ubic.contacto || '';
  document.getElementById('clienteTelefono').value = ubic.telefono || '';
  document.getElementById('clienteEmail').value = ubic.email || '';
  document.getElementById('clienteDireccion').value = ubic.direccion || '';
  document.getElementById('clienteSector').value = ubic.sector || '';
  document.getElementById('clienteTrato').value = ubic.trato || 'formal';
  document.getElementById('cotFechaCompromisoOt').value = q.fecha_compromiso_ot || '';
  if(ubic.contacto || ubic.telefono || ubic.email || ubic.direccion){
    document.getElementById('clientDetailsFields').style.display = 'block';
    document.getElementById('toggleClientDetailsBtn').textContent = '▾ Más datos del cliente';
  }

  document.getElementById('cotTecnico').value = q.tecnico_id || '';
  document.getElementById('cotFormaPago').value = q.forma_pago || 'transferencia';
  actualizarVisibilidadOrdenPago();
  document.getElementById('cotEstado').value = q.estado || 'borrador';
  document.getElementById('enEsperaFields').style.display = q.estado === 'en_espera' ? 'flex' : 'none';
  document.getElementById('cotSector').value = q.en_espera_sector || '';
  document.getElementById('cotEnEsperaNota').value = q.en_espera_nota || '';

  document.getElementById('cotRequiresDoc').checked = !!q.requires_fee_receipt;
  document.getElementById('docFields').style.display = q.requires_fee_receipt ? 'block' : 'none';
  document.getElementById('cotDocTipo').value = q.fee_receipt_doc_type || 'boleta_honorarios';
  actualizarVisibilidadTipoDoc();
  document.getElementById('cotDocNumero').value = q.fee_receipt_number || '';
  document.getElementById('cotDocRut').value = q.fee_receipt_rut || '';
  document.getElementById('cotDocRazonSocial').value = q.fee_receipt_razon_social || '';
  document.getElementById('cotDocNeto').value = q.fee_receipt_neto || '';
  document.getElementById('cotDocIva').value = q.fee_receipt_iva || '';
  document.getElementById('cotDocIvaNoRec').value = q.fee_receipt_iva_no_rec || '';
  currentOtrosImpuestos = (q.fee_receipt_otros_impuestos || []).slice();
  currentComprobantePago = q.payment_proof_url || null;
  document.getElementById('cotComprobantePagoStatus').textContent = currentComprobantePago ? 'Ya tiene un comprobante adjunto (se mantiene si no subes uno nuevo)' : 'Sin adjuntar';

  currentItems = (q.items || []).map(it => ({
    categoria: it.categoria, descripcion: it.descripcion, cantidad: it.cantidad, precio: it.precio,
    doc_type: it.doc_type || null, doc_number: it.doc_number || null,
  }));

  document.getElementById('cotDiscType').value = q.disc_type || 'none';
  document.getElementById('cotDiscPercent').value = q.disc_percent || 10;
  document.getElementById('cotDiscRoundStep').value = q.disc_round_step || 10000;
  document.getElementById('cotDiscRound').value = q.disc_round || '';
  document.getElementById('cotDiscPercentField').style.display = (q.disc_type === 'percent') ? 'block' : 'none';
  document.getElementById('cotDiscRoundStepField').style.display = (q.disc_type === 'round_step') ? 'block' : 'none';
  document.getElementById('cotDiscRoundField').style.display = (q.disc_type === 'round') ? 'block' : 'none';

  renderItemsUI();
  renderOtrosImpuestos();
  renderFavoritosBar();
  renderPlantillaOptions();

  document.getElementById('cotFormTitle').textContent = 'Editando ' + q.numero;
  document.getElementById('editModeBanner').style.display = 'flex';
  document.getElementById('editModeNumero').textContent = q.numero;
  document.getElementById('saveCotizacionBtn').textContent = 'Guardar cambios de ' + q.numero;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.cargarCotizacionParaEditar = cargarCotizacionParaEditar;

async function guardarCotizacion() {
  const nombreCliente = document.getElementById('clienteNombre').value.trim();
  const ubicacionNombre = document.getElementById('clienteUbicacion').value.trim();
  if (!nombreCliente) { alert('Ingresa el nombre del cliente.'); return; }
  if (!currentItems.length) { alert('Agrega al menos un ítem.'); return; }

  const btn = document.getElementById('saveCotizacionBtn');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  const cliente = await dbGetOrCreateCliente(nombreCliente, document.getElementById('clienteRut').value.trim() || null);
  let ubicacion = null;
  if (ubicacionNombre) {
    ubicacion = await dbSaveUbicacion(cliente.id, {
      ubicacion: ubicacionNombre,
      contacto: document.getElementById('clienteContacto').value.trim() || null,
      telefono: document.getElementById('clienteTelefono').value.trim() || null,
      email: document.getElementById('clienteEmail').value.trim() || null,
      direccion: document.getElementById('clienteDireccion').value.trim() || null,
      sector: document.getElementById('clienteSector').value || null,
      trato: document.getElementById('clienteTrato').value,
    });
  }

  const requiresDoc = document.getElementById('cotRequiresDoc').checked;

  const payloadCotizacion = {
    cliente_id: cliente.id,
    ubicacion_id: ubicacion ? ubicacion.id : null,
    tecnico_id: document.getElementById('cotTecnico').value || null,
    estado: document.getElementById('cotEstado').value,
    forma_pago: document.getElementById('cotFormaPago').value,
    payment_proof_url: currentComprobantePago,
    disc_type: document.getElementById('cotDiscType').value,
    disc_percent: parseFloat(document.getElementById('cotDiscPercent').value) || null,
    disc_round_step: parseFloat(document.getElementById('cotDiscRoundStep').value) || null,
    disc_round: parseFloat(document.getElementById('cotDiscRound').value) || null,
    en_espera_sector: document.getElementById('cotSector').value || null,
    en_espera_nota: document.getElementById('cotEnEsperaNota').value || null,
    requires_fee_receipt: requiresDoc,
    fee_receipt_doc_type: document.getElementById('cotDocTipo').value,
    fee_receipt_number: document.getElementById('cotDocNumero').value || null,
    fee_receipt_rut: document.getElementById('cotDocRut').value || null,
    fee_receipt_razon_social: document.getElementById('cotDocRazonSocial').value || null,
    fee_receipt_neto: parseFloat(document.getElementById('cotDocNeto').value) || null,
    fee_receipt_iva: parseFloat(document.getElementById('cotDocIva').value) || null,
    fee_receipt_iva_no_rec: parseFloat(document.getElementById('cotDocIvaNoRec').value) || null,
    fee_receipt_otros_impuestos: currentOtrosImpuestos,
    fecha_compromiso_ot: document.getElementById('cotFechaCompromisoOt').value || null,
  };

  let cotizacion;
  if(currentEditId){
    cotizacion = await dbUpdateCotizacion(currentEditId, payloadCotizacion);
  } else {
    cotizacion = await dbCreateCotizacion(payloadCotizacion);
  }

  if (cotizacion) {
    if(currentEditId){
      // en edición: reemplaza los ítems por completo (más simple y evita duplicados
      // por ediciones parciales — igual que hace la sincronización offline)
      await dbDeleteItemsByCotizacion(cotizacion.id);
    }
    for (const item of currentItems) await dbAddItem(cotizacion.id, item);
    toast(currentEditId ? 'Cotización ' + cotizacion.numero + ' actualizada.' : 'Cotización ' + cotizacion.numero + ' guardada.');
    limpiarFormulario();
    renderHistorial();
    renderClienteDatalist();
  } else {
    alert('Hubo un error al guardar. Revisa la consola (F12) para más detalles.');
  }

  btn.disabled = false;
  if(!currentEditId) btn.textContent = 'Guardar cotización'; // si falló en modo edición, limpiarFormulario no corrió y el label de edición debe seguir
}

function limpiarFormulario() {
  document.getElementById('clienteNombre').value = '';
  document.getElementById('clienteUbicacion').value = '';
  document.getElementById('cotTecnico').value = '';
  document.getElementById('cotEstado').value = 'borrador';
  document.getElementById('enEsperaFields').style.display = 'none';
  document.getElementById('cotRequiresDoc').checked = false;
  document.getElementById('docFields').style.display = 'none';
  document.getElementById('cotDocNumero').value = '';
  document.getElementById('cotDocRut').value = '';
  document.getElementById('cotDocRazonSocial').value = '';
  document.getElementById('cotDocNeto').value = '';
  document.getElementById('cotDocIva').value = '';
  document.getElementById('cotDocIvaNoRec').value = '';
  document.getElementById('cotComprobantePagoInput').value = '';
  document.getElementById('cotComprobantePagoStatus').textContent = 'Sin adjuntar';
  currentComprobantePago = null;
  document.getElementById('cotDiscType').value = 'none';
  document.getElementById('cotDiscPercent').value = '10';
  document.getElementById('cotDiscRoundStep').value = '10000';
  document.getElementById('cotDiscRound').value = '';
  document.getElementById('cotDiscPercentField').style.display = 'none';
  document.getElementById('cotDiscRoundStepField').style.display = 'none';
  document.getElementById('cotDiscRoundField').style.display = 'none';
  currentItems = [];
  currentClienteId = null;
  currentOtrosImpuestos = [];
  currentEditId = null;
  document.getElementById('cotFormTitle').textContent = 'Nueva cotización';
  document.getElementById('editModeBanner').style.display = 'none';
  document.getElementById('saveCotizacionBtn').textContent = 'Guardar cotización';
  document.getElementById('cotTecnico').value = '';
  document.getElementById('cotSector').value = '';
  document.getElementById('cotEnEsperaNota').value = '';
  document.getElementById('clienteRut').value = '';
  document.getElementById('clienteContacto').value = '';
  document.getElementById('clienteTelefono').value = '';
  document.getElementById('clienteEmail').value = '';
  document.getElementById('clienteDireccion').value = '';
  document.getElementById('clienteSector').value = '';
  document.getElementById('cotFechaCompromisoOt').value = '';
  document.getElementById('clienteTrato').value = 'formal';
  document.getElementById('clientDetailsFields').style.display = 'none';
  document.getElementById('toggleClientDetailsBtn').textContent = '▸ Más datos del cliente (RUT, contacto...)';
  // limpia también la URL si veníamos de un enlace ?ot= para no reabrir la edición al recargar
  if(new URLSearchParams(window.location.search).get('ot')){
    window.history.replaceState({}, '', window.location.pathname);
  }
  renderItemsUI();
  renderOtrosImpuestos();
  renderFavoritosBar();
  renderPlantillaOptions();
}

async function guardarPlantilla() {
  if (!currentItems.length) { alert('Agrega al menos un ítem antes de guardar la plantilla.'); return; }
  const nombre = prompt('Nombre para esta plantilla (ej: Visita técnica):');
  if (!nombre || !nombre.trim()) return;
  let clienteIdParaPlantilla = null;
  if (currentClienteId) {
    const ligarACliente = confirm('¿Asociar esta plantilla solo al cliente actual? (Cancelar = disponible para cualquier cliente)');
    if (ligarACliente) clienteIdParaPlantilla = currentClienteId;
  }
  const plantilla = await dbSavePlantilla(nombre.trim(), currentItems, clienteIdParaPlantilla);
  if (plantilla) { toast('Plantilla "' + nombre.trim() + '" guardada.'); renderPlantillaOptions(); }
}

async function renderPlantillaOptions() {
  const sel = document.getElementById('plantillaSelect');
  const plantillas = await dbListPlantillas(currentClienteId);
  sel.innerHTML = '<option value="">📋 Usar plantilla...</option>' +
    plantillas.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)} (${(p.items||[]).length} ítems)${p.cliente_id ? ' ⭐' : ''}</option>`).join('');
}

async function aplicarPlantillaSeleccionada(e) {
  const id = e.target.value;
  if (!id) return;
  const plantillas = await dbListPlantillas(currentClienteId);
  const plantilla = plantillas.find(p => p.id === id);
  if (!plantilla) return;
  const yaEstan = (plantilla.items || []).every(it =>
    currentItems.some(ci => ci.categoria === it.categoria && ci.descripcion === it.descripcion && ci.precio === it.precio)
  );
  if (yaEstan && currentItems.length) {
    if (!confirm('Estos ítems de la plantilla "' + plantilla.nombre + '" ya parecen estar agregados. ¿Agregarlos de nuevo igual (quedarían duplicados)?')) {
      e.target.value = '';
      return;
    }
  }
  (plantilla.items || []).forEach(it => currentItems.push(Object.assign({}, it)));
  renderItemsUI();
  e.target.value = '';
}

async function renderFavoritosBar() {
  const wrap = document.getElementById('favoritosBar');
  if (!currentClienteId) { wrap.innerHTML = ''; return; }
  const favoritos = await dbListFavoritos(currentClienteId);
  if (!favoritos.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = '<div style="font-size:11px; color:var(--muted); margin-bottom:6px;">⭐ Favoritos de este cliente:</div>' +
    favoritos.map(f => `<button type="button" class="btn-ghost fav-chip-btn" data-idx-cat="${escapeHtml(f.categoria)}" data-idx-desc="${escapeHtml(f.descripcion)}" data-idx-price="${f.precio}" style="font-size:11.5px; padding:5px 10px; margin:0 6px 6px 0;">${escapeHtml(f.descripcion)} · ${formatCLP(f.precio)}</button>`).join('');
  wrap.querySelectorAll('.fav-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentItems.push({ categoria: btn.dataset.idxCat, descripcion: btn.dataset.idxDesc, cantidad: 1, precio: parseFloat(btn.dataset.idxPrice) });
      renderItemsUI();
    });
  });
}

async function renderHistorial() {
  const wrap = document.getElementById('historialList');
  wrap.innerHTML = '<p style="color:var(--muted); font-size:13px;">Cargando...</p>';
  const cotizaciones = await dbListCotizaciones();
  if (!cotizaciones.length) {
    wrap.innerHTML = '<p style="color:var(--muted); font-size:13px;">Sin cotizaciones guardadas aún.</p>';
    return;
  }
  wrap.innerHTML = cotizaciones.map(q => {
    const { total } = computeTotalConDescuento(q);
    return `
      <div class="hist-row" style="cursor:pointer;" onclick="abrirDetalleCotizacion('${q.id}')">
        <div>
          <span class="num">${q.numero}</span> — ${escapeHtml(q.clientes ? q.clientes.nombre : 'Sin cliente')}
          <div style="font-size:11.5px; color:var(--muted); font-family:var(--font-mono);">${(q.items||[]).length} ítem(s) · ${formatCLP(total)}${q.paid?' · pagada':''}${q.work_executed?' · ejecutada':''}${q.tecnico ? ' · 👷 ' + escapeHtml(q.tecnico.nombre) : ''}</div>
        </div>
        <span class="status-badge" data-estado="${q.estado}">${q.estado}</span>
      </div>`;
  }).join('');
}

let currentDetailId = null;
let currentDetailQuote = null;

function actualizarCamposDescuentoDetalle(){
  const tipo = document.getElementById('detailDiscType').value;
  document.getElementById('detailDiscPercentField').style.display = tipo === 'percent' ? 'block' : 'none';
  document.getElementById('detailDiscRoundStepField').style.display = tipo === 'round_step' ? 'block' : 'none';
  document.getElementById('detailDiscRoundField').style.display = tipo === 'round' ? 'block' : 'none';
}

function renderDetailTotals(){
  if(!currentDetailQuote) return;
  const qConDescuentoActual = {
    ...currentDetailQuote,
    disc_type: document.getElementById('detailDiscType').value,
    disc_percent: parseFloat(document.getElementById('detailDiscPercent').value) || 0,
    disc_round_step: parseFloat(document.getElementById('detailDiscRoundStep').value) || 10000,
    disc_round: document.getElementById('detailDiscRound').value === '' ? null : parseFloat(document.getElementById('detailDiscRound').value),
  };
  const { subtotal, total, ivaDocumento } = computeTotalConDescuento(qConDescuentoActual);
  document.getElementById('detailTotalDisplay').textContent = formatCLP(total);
  const huboAjuste = total !== subtotal;
  document.getElementById('detailSubtotalLine').style.display = huboAjuste ? 'flex' : 'none';
  document.getElementById('detailDiscLine').style.display = huboAjuste ? 'flex' : 'none';
  if(huboAjuste){
    document.getElementById('detailSubtotalDisplay').textContent = formatCLP(subtotal);
    const diff = total - subtotal;
    let label = 'Ajuste';
    if(ivaDocumento > 0) label = 'IVA / impuestos del documento';
    else if(qConDescuentoActual.disc_type === 'percent') label = 'Descuento (' + (qConDescuentoActual.disc_percent||0) + '%)';
    else if(qConDescuentoActual.disc_type === 'round_step') label = 'Redondeo a múltiplos de ' + formatCLP(qConDescuentoActual.disc_round_step||10000);
    else if(qConDescuentoActual.disc_type === 'round') label = 'Ajuste total manual';
    document.getElementById('detailDiscLabel').textContent = label;
    document.getElementById('detailDiscDisplay').textContent = (diff >= 0 ? '+' : '-') + formatCLP(Math.abs(diff));
  }
}

async function abrirDetalleCotizacion(id){
  currentDetailId = id;
  const q = await dbGetCotizacion(id);
  if(!q){ alert('No se pudo cargar la cotización.'); return; }

  document.getElementById('detailQuoteTitle').textContent = q.numero;
  const cliente = q.clientes;
  const ubic = q.ubicaciones;
  const contactoBits = [];
  if(ubic && ubic.contacto) contactoBits.push('👤 ' + ubic.contacto);
  if(ubic && ubic.telefono) contactoBits.push('📞 ' + ubic.telefono);
  if(ubic && ubic.email) contactoBits.push('✉️ ' + ubic.email);
  document.getElementById('detailQuoteInfo').innerHTML =
    `${escapeHtml(cliente ? cliente.nombre : 'Sin cliente')}${cliente && cliente.rut ? ' <span style="font-family:var(--font-mono);">(' + escapeHtml(cliente.rut) + ')</span>' : ''} · ${escapeHtml(ubic ? ubic.ubicacion : 'sin ubicación')} · ${escapeHtml(q.fecha || '')}` +
    (contactoBits.length ? `<br>${contactoBits.map(escapeHtml).join(' · ')}` : '');

  const itemsWrap = document.getElementById('detailItemsList');
  const items = q.items || [];
  const puedeEditarItems = (q.estado || 'borrador') === 'borrador';
  itemsWrap.innerHTML = items.length
    ? items.map(it => `
        <div class="item-row">
          <span style="font-size:10.5px; color:var(--muted); flex:0 0 75px;">${CAT_LABELS[it.categoria]||it.categoria||''}</span>
          <span class="desc">${escapeHtml(it.descripcion)}</span>
          <span class="qty">x${it.cantidad}</span>
          <span class="price">${formatCLP(it.precio)}</span>
          <span class="sub">${formatCLP(it.cantidad * it.precio)}</span>
          ${puedeEditarItems ? `<button type="button" class="btn-danger" onclick="eliminarItemDetalle('${it.id}')" style="padding:4px 9px;">✕</button>` : ''}
        </div>`).join('')
    : '<div style="color:var(--muted); font-size:12.5px;">Sin ítems.</div>';
  if(!puedeEditarItems && items.length){
    itemsWrap.innerHTML += '<div style="font-size:11px; color:var(--muted); margin-top:6px;">Los ítems solo se pueden borrar mientras la cotización está en borrador.</div>';
  }

  currentDetailQuote = q;
  document.getElementById('detailDiscType').value = q.disc_type || 'none';
  document.getElementById('detailDiscPercent').value = q.disc_percent || 10;
  document.getElementById('detailDiscRoundStep').value = q.disc_round_step || 10000;
  document.getElementById('detailDiscRound').value = q.disc_round || '';
  actualizarCamposDescuentoDetalle();
  renderDetailTotals();

  document.getElementById('detailEstado').value = q.estado || 'borrador';
  document.getElementById('detailTecnico').value = q.tecnico_id || '';
  document.getElementById('detailPaid').checked = !!q.paid;
  document.getElementById('detailWorkExecuted').checked = !!q.work_executed;

  const log = q.historial_cambios || [];
  const logEl = document.getElementById('detailChangeLog');
  logEl.innerHTML = log.length
    ? log.slice().reverse().slice(0, 10).map(e => `<div style="margin-bottom:4px;">${escapeHtml(e.device||'—')} — ${e.when ? new Date(e.when).toLocaleString('es-CL') : ''} · ${escapeHtml(e.note||'')}</div>`).join('')
    : '<div>Sin cambios registrados aún.</div>';

  document.getElementById('quoteDetailModal').style.display = 'flex';
}
window.abrirDetalleCotizacion = abrirDetalleCotizacion;

async function eliminarItemDetalle(itemId){
  if(!currentDetailId) return;
  if(!confirm('¿Borrar este ítem de la cotización?')) return;
  const ok = await dbDeleteItem(itemId);
  if(!ok){ alert('No se pudo borrar el ítem. Revisa la consola (F12).'); return; }
  toast('Ítem borrado.');
  await abrirDetalleCotizacion(currentDetailId); // refresca el modal con los ítems actualizados
  renderHistorial();
}
window.eliminarItemDetalle = eliminarItemDetalle;

async function guardarDetalleCotizacion(){
  if(!currentDetailId) return;
  const q = await dbGetCotizacion(currentDetailId);
  const nuevoEstado = document.getElementById('detailEstado').value;
  const nuevoTecnico = document.getElementById('detailTecnico').value || null;
  const nuevoPaid = document.getElementById('detailPaid').checked;
  const nuevoEjecutado = document.getElementById('detailWorkExecuted').checked;

  const cambios = [];
  if(nuevoEstado !== q.estado) cambios.push('Estado: ' + (q.estado||'-') + ' → ' + nuevoEstado);
  if(nuevoTecnico !== (q.tecnico_id||null)){
    const tecnicos = await dbListTecnicos();
    const nombreTec = nuevoTecnico ? (tecnicos.find(t=>t.id===nuevoTecnico)||{}).nombre : 'sin asignar';
    cambios.push('Técnico asignado: ' + (nombreTec || 'sin asignar'));
  }
  if(nuevoPaid !== !!q.paid) cambios.push(nuevoPaid ? 'Marcada como pagada' : 'Desmarcada como pagada');
  if(nuevoEjecutado !== !!q.work_executed) cambios.push(nuevoEjecutado ? 'Marcada como ejecutada' : 'Desmarcada como ejecutada');

  const historial = q.historial_cambios || [];
  if(cambios.length){
    historial.push({
      device: getDeviceLabel(),
      note: cambios.join(' · '),
      when: new Date().toISOString(),
    });
  }

  const updated = await dbUpdateCotizacion(currentDetailId, {
    estado: nuevoEstado, tecnico_id: nuevoTecnico, paid: nuevoPaid, work_executed: nuevoEjecutado, historial_cambios: historial,
    disc_type: document.getElementById('detailDiscType').value,
    disc_percent: parseFloat(document.getElementById('detailDiscPercent').value) || null,
    disc_round_step: parseFloat(document.getElementById('detailDiscRoundStep').value) || null,
    disc_round: document.getElementById('detailDiscRound').value === '' ? null : parseFloat(document.getElementById('detailDiscRound').value),
  });

  if(updated){
    document.getElementById('quoteDetailModal').style.display = 'none';
    renderHistorial();
  } else {
    alert('No se pudo guardar. Revisa la consola (F12) — recuerda correr migration_002_historial.sql en Supabase si no lo has hecho.');
  }
}

async function generarPdfCotizacion(){
  if(!currentDetailId) return;
  const q = await dbGetCotizacion(currentDetailId);
  if(!q){ alert('No se pudo cargar la cotización.'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const profile = window.currentProfile || {};
  const pageW = 210;
  const marginX = 15;

  // Colores de marca (deben coincidir con la paleta de la app)
  const navy = [16, 27, 51];
  const blue = [47, 111, 237];
  const grayLine = [225, 229, 235];
  const grayText = [107, 115, 133];

  // ---- Encabezado con fondo de color ----
  doc.setFillColor(...navy);
  doc.rect(0, 0, pageW, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(16);
  const nombreEmpresa = (profile.nombre && profile.nombre.indexOf('@') === -1) ? profile.nombre : 'Servicios Informáticos';
  doc.text(nombreEmpresa, marginX, 16);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9.5);
  doc.text(profile.tagline || 'Cotización de servicios informáticos', marginX, 22);
  if(profile.rut) doc.text('RUT: ' + profile.rut, marginX, 27.5);

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text(q.numero, pageW - marginX, 20, { align: 'right' });

  // ---- Datos del cliente ----
  let y = 46;
  doc.setTextColor(...navy);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text(q.clientes ? q.clientes.nombre : 'Sin cliente', marginX, y);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...grayText);
  y += 6;
  if(q.ubicaciones) { doc.text(q.ubicaciones.ubicacion, marginX, y); y += 5; }
  doc.text('Fecha: ' + (q.fecha || ''), marginX, y);
  y += 10;

  // ---- Tabla de ítems ----
  doc.setDrawColor(...grayLine);
  doc.setFillColor(244, 246, 249);
  doc.rect(marginX, y, pageW - marginX * 2, 8, 'F');
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...navy);
  doc.text('DESCRIPCIÓN', marginX + 3, y + 5.5);
  doc.text('CANT.', pageW - marginX - 55, y + 5.5, { align: 'right' });
  doc.text('PRECIO', pageW - marginX - 30, y + 5.5, { align: 'right' });
  doc.text('SUBTOTAL', pageW - marginX - 3, y + 5.5, { align: 'right' });
  y += 8;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9.5);
  let subtotalAcum = 0;
  (q.items || []).forEach((it, i) => {
    const sub = it.cantidad * it.precio;
    subtotalAcum += sub;
    const rowH = 7;
    if(i % 2 === 1){ doc.setFillColor(250, 250, 251); doc.rect(marginX, y, pageW - marginX * 2, rowH, 'F'); }
    doc.setTextColor(60, 65, 75);
    const descLines = doc.splitTextToSize(it.descripcion, 95);
    doc.text(descLines[0], marginX + 3, y + 5);
    doc.text(String(it.cantidad), pageW - marginX - 55, y + 5, { align: 'right' });
    doc.text(formatCLP(it.precio), pageW - marginX - 30, y + 5, { align: 'right' });
    doc.text(formatCLP(sub), pageW - marginX - 3, y + 5, { align: 'right' });
    y += rowH;
  });
  doc.setDrawColor(...grayLine);
  doc.line(marginX, y, pageW - marginX, y);
  y += 8;

  // ---- Totales ----
  const { subtotal, total } = computeTotalConDescuento(q);
  const boxW = 70;
  if(q.disc_type && q.disc_type !== 'none' && total !== subtotal){
    doc.setFontSize(9.5);
    doc.setTextColor(...grayText);
    doc.text('Subtotal', pageW - marginX - boxW, y, { align: 'left' });
    doc.text(formatCLP(subtotal), pageW - marginX - 3, y, { align: 'right' });
    y += 6;
    doc.text('Ajuste / descuento', pageW - marginX - boxW, y, { align: 'left' });
    doc.text(formatCLP(total - subtotal), pageW - marginX - 3, y, { align: 'right' });
    y += 8;
  }
  doc.setFillColor(...blue);
  doc.rect(pageW - marginX - boxW, y - 6, boxW, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL', pageW - marginX - boxW + 4, y + 1.5);
  doc.text(formatCLP(total), pageW - marginX - 3, y + 1.5, { align: 'right' });

  // ---- Pie de página ----
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...grayText);
  doc.text('Generado por ' + nombreEmpresa, marginX, 285);

  doc.save('Cotizacion_' + q.numero + '.pdf');
}

async function enviarCotizacionPorCorreo(){
  if(!currentDetailId) return;
  const q = await dbGetCotizacion(currentDetailId);
  if(!q){ alert('No se pudo cargar la cotización.'); return; }
  const email = q.ubicaciones ? q.ubicaciones.email : '';
  const { total } = computeTotalConDescuento(q);
  const subject = encodeURIComponent('Cotización ' + q.numero);
  const body = encodeURIComponent(
    'Hola,\n\nTe comparto la cotización ' + q.numero + ' por un total de ' + formatCLP(total) + '.\n\nSaludos.'
  );
  if(!email){
    alert('Esta ubicación no tiene un correo guardado. Genera el PDF y envíalo manualmente.');
    return;
  }
  window.open('mailto:' + email + '?subject=' + subject + '&body=' + body, '_blank');
}

async function eliminarCotizacionActual(){
  if(!currentDetailId) return;
  const ok = confirm('¿Eliminar esta cotización por completo? Esta acción no se puede deshacer.');
  if(!ok) return;
  const success = await dbDeleteCotizacion(currentDetailId);
  if(success){
    document.getElementById('quoteDetailModal').style.display = 'none';
    renderHistorial();
  } else {
    alert('No se pudo eliminar. Revisa la consola (F12).');
  }
}

async function generarCertificadoPago(){
  if(!currentDetailId) return;
  const q = await dbGetCotizacion(currentDetailId);
  if(!q){ alert('No se pudo cargar la cotización.'); return; }
  if(!q.paid){
    const ok = confirm('Esta cotización no está marcada como pagada aún. ¿Generar el certificado de todas formas?');
    if(!ok) return;
  }

  const compras = await dbListCompras();
  const vinculadas = compras.filter(c => c.linked_ot === q.numero);
  const profile = window.currentProfile || {};

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(15);
  doc.text('Certificado de pago', 15, y); y += 10;
  doc.setFontSize(10);
  doc.text('Emitido por: ' + (profile.nombre || '-') + (profile.rut ? ' (RUT ' + profile.rut + ')' : ''), 15, y); y += 6;
  doc.text('OT: ' + q.numero, 15, y); y += 6;
  doc.text('Cliente: ' + (q.clientes ? q.clientes.nombre : 'Sin cliente'), 15, y); y += 6;
  doc.text('Fecha de emisión: ' + new Date().toLocaleDateString('es-CL'), 15, y); y += 12;

  const { total: totalOT } = computeTotalConDescuento(q);
  doc.setFontSize(11);
  doc.text('Se certifica que el trabajo de la OT ' + q.numero + ', por un monto de ' + formatCLP(totalOT) + ',', 15, y); y += 6;
  doc.text('ha sido pagado por el cliente.', 15, y); y += 12;

  if(vinculadas.length){
    doc.setFontSize(11);
    doc.text('Costos de insumos asociados a esta OT:', 15, y); y += 7;
    doc.setFontSize(10);
    vinculadas.forEach(c => {
      doc.text(c.proveedor + ' — ' + c.doc_type + ' N° ' + (c.doc_number||'-'), 15, y);
      doc.text(formatCLP(c.monto), 180, y, { align: 'right' });
      y += 6;
    });
  }

  doc.save('Certificado_' + q.numero + '.pdf');
}

async function enviarCotizacionPorWhatsapp(){
  if(!currentDetailId) return;
  const q = await dbGetCotizacion(currentDetailId);
  if(!q){ alert('No se pudo cargar la cotización.'); return; }
  const { total } = computeTotalConDescuento(q);
  const clienteNombre = q.clientes ? q.clientes.nombre : '';
  const telefono = q.ubicaciones ? (q.ubicaciones.telefono || '') : '';
  const texto = `Hola${clienteNombre ? ' ' + clienteNombre : ''}, te comparto la cotización ${q.numero} por un total de ${formatCLP(total)}. Cualquier duda me avisas.`;
  const digitos = telefono.replace(/[^0-9]/g, '');
  const url = digitos ? `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}` : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank');
}

async function renderTecnicoOptions(){
  const tecnicos = await dbListTecnicos();
  const optionsHtml = '<option value="">Sin asignar</option>' +
    tecnicos.map(t => `<option value="${t.id}">${escapeHtml(t.nombre || 'Sin nombre')}${t.role === 'admin' ? ' (Admin)' : ''}</option>`).join('');
  const selCot = document.getElementById('cotTecnico');
  const selDetail = document.getElementById('detailTecnico');
  if(selCot) selCot.innerHTML = optionsHtml;
  if(selDetail) selDetail.innerHTML = optionsHtml;
}

function getDeviceLabel(){
  const nombre = (window.currentProfile && (window.currentProfile.nombre || window.currentProfile.email)) || 'usuario';
  const ua = navigator.userAgent || '';
  const esMovil = /Mobi|Android|iPhone|iPad/i.test(ua);
  return nombre + (esMovil ? ' (celular)' : ' (computador)');
}

function formatCLP(n) { return '$' + Math.round(n).toLocaleString('es-CL'); }
function escapeHtml(s) { const div = document.createElement('div'); div.textContent = s || ''; return div.innerHTML; }

