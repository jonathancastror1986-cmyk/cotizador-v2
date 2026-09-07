// ============================================================
// Página: Resumen (Dashboard)
// ============================================================

function onPageReady(profile){
  renderKpis();
  renderRecentQuotes();
}
window.onPageReady = onPageReady;

let kpisCache = null;

async function renderKpis(){
  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = '<p style="color:var(--muted); font-size:13px;">Cargando...</p>';
  kpisCache = await dbGetKpis();
  const cards = [
    { key: 'comprasSinOT', label: 'Compras sin OT asignada', value: kpisCache.comprasSinOT.length, warn: kpisCache.comprasSinOT.length > 0 },
    { key: 'comprasSinPagar', label: 'Compras sin pagar al proveedor', value: kpisCache.comprasSinPagar.length, warn: kpisCache.comprasSinPagar.length > 0 },
    { key: 'otsSinPago', label: 'OTs sin pago del cliente', value: kpisCache.otsSinPago.length, warn: kpisCache.otsSinPago.length > 0 },
    { key: 'otsSinTrabajar', label: 'OTs sin trabajar aún', value: kpisCache.otsSinTrabajar.length, warn: kpisCache.otsSinTrabajar.length > 0 },
  ];
  grid.innerHTML = cards.map(c => `
    <div class="panel kpi-card" data-kpi="${c.key}" style="margin-bottom:0; cursor:${c.value ? 'pointer' : 'default'}; ${c.warn ? 'border-color:var(--danger); background:var(--danger-soft);' : 'border-color:var(--signal); background:var(--signal-soft);'}">
      <div style="font-size:11.5px; color:var(--ink-soft); margin-bottom:6px;">${c.label}${c.value ? ' <span style="opacity:.6;">(clic para ver detalle)</span>' : ''}</div>
      <div style="font-size:26px; font-weight:700; color:${c.warn ? 'var(--danger)' : 'var(--signal)'};">${c.value}</div>
      <div class="kpi-detail" data-kpi-detail="${c.key}" style="display:none; margin-top:10px; border-top:1px solid var(--line); padding-top:8px;"></div>
    </div>
  `).join('');

  grid.querySelectorAll('.kpi-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if(e.target.closest('a')) return; // no interceptar clics en enlaces dentro del detalle
      toggleKpiDetail(card.dataset.kpi);
    });
  });
}

function toggleKpiDetail(key){
  const detailEl = document.querySelector(`[data-kpi-detail="${key}"]`);
  if(!detailEl) return;
  const isOpen = detailEl.style.display !== 'none';
  document.querySelectorAll('.kpi-detail').forEach(d => d.style.display = 'none');
  if(isOpen) return; // era el mismo que ya estaba abierto: solo lo cerramos

  const items = kpisCache[key] || [];
  if(!items.length){ detailEl.innerHTML = '<div style="font-size:12px; color:var(--muted);">Nada pendiente aquí 🎉</div>'; }
  else if(key === 'comprasSinOT' || key === 'comprasSinPagar'){
    detailEl.innerHTML = items.slice(0, 15).map(c => `
      <div style="font-size:12px; padding:4px 0; border-bottom:1px dashed var(--line);">
        <b>${escapeHtmlDash(c.proveedor || 'Sin proveedor')}</b> — ${formatCLPDash(c.monto || 0)}
        <span style="color:var(--muted);"> · ${escapeHtmlDash(c.doc_type || '')}${c.linked_ot ? ' · ' + escapeHtmlDash(c.linked_ot) : ' · sin OT asignada'}${c.tecnico_nombre ? ' · 👷 ' + escapeHtmlDash(c.tecnico_nombre) : ''}</span>
      </div>`).join('') + (items.length > 15 ? `<div style="font-size:11px; color:var(--muted); margin-top:4px;">y ${items.length - 15} más — revisa en Documentos.</div>` : '');
  } else { // otsSinPago / otsSinTrabajar
    detailEl.innerHTML = items.slice(0, 15).map(q => `
      <a href="cotizaciones.html?ot=${q.id}" style="display:block; font-size:12px; padding:4px 0; border-bottom:1px dashed var(--line); color:inherit; text-decoration:none;">
        <b>${escapeHtmlDash(q.numero)}</b> — ${escapeHtmlDash(q.clientes ? q.clientes.nombre : 'Sin cliente')}
        <span class="status-badge" data-estado="${q.estado}" style="margin-left:6px;">${q.estado}</span>
      </a>`).join('') + (items.length > 15 ? `<div style="font-size:11px; color:var(--muted); margin-top:4px;">y ${items.length - 15} más — revisa en Consultor de OTs.</div>` : '');
  }
  detailEl.style.display = 'block';
}

async function renderRecentQuotes(){
  const wrap = document.getElementById('recentQuotesList');
  wrap.innerHTML = '<p style="color:var(--muted); font-size:13px;">Cargando...</p>';
  const cotizaciones = await dbListCotizaciones();
  if(!cotizaciones.length){
    wrap.innerHTML = '<p style="color:var(--muted); font-size:13px;">Sin cotizaciones guardadas aún. <a href="cotizaciones.html">Crea la primera</a>.</p>';
    return;
  }
  const recent = cotizaciones.slice(0, 8);
  wrap.innerHTML = recent.map(q => {
    const { total } = computeTotalConDescuento(q);
    return `
      <a href="cotizaciones.html?ot=${q.id}" class="hist-row" style="text-decoration:none; color:inherit; cursor:pointer;">
        <div>
          <span class="num">${q.numero}</span> — ${escapeHtmlDash(q.clientes ? q.clientes.nombre : 'Sin cliente')}
          <div style="font-size:11.5px; color:var(--muted); font-family:var(--font-mono);">${(q.items||[]).length} ítem(s) · ${formatCLPDash(total)}</div>
        </div>
        <span class="status-badge" data-estado="${q.estado}">${q.estado}</span>
      </a>`;
  }).join('');
}

function formatCLPDash(n){ return '$' + Math.round(n).toLocaleString('es-CL'); }
function escapeHtmlDash(s){ const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
