// ============================================================
// Página: Clientes
// ============================================================

let allClientesCache = [];
let allCotizacionesCache = [];

function onPageReady(profile){
  renderClientes();
  document.getElementById('addClienteBtn').addEventListener('click', agregarClienteManual);
  document.getElementById('clienteSearch').addEventListener('input', (e) => filterClientes(e.target.value));
  document.getElementById('closeClientDetailBtn').addEventListener('click', ()=>{
    document.getElementById('clientDetailModal').style.display = 'none';
  });
  document.getElementById('deleteClienteBtn').addEventListener('click', eliminarClienteActual);
  document.getElementById('toggleAddUbicacionBtn').addEventListener('click', ()=>{
    const wrap = document.getElementById('addUbicacionFields');
    wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('saveNewUbicacionBtn').addEventListener('click', guardarNuevaUbicacion);
}
window.onPageReady = onPageReady;

async function guardarNuevaUbicacion(){
  if(!currentDetailClienteId) return;
  const nombre = document.getElementById('newUbicNombre').value.trim();
  if(!nombre){ alert('Escribe el nombre de la ubicación.'); return; }
  const result = await dbSaveUbicacion(currentDetailClienteId, {
    ubicacion: nombre,
    contacto: document.getElementById('newUbicContacto').value.trim() || null,
    telefono: document.getElementById('newUbicTelefono').value.trim() || null,
    email: document.getElementById('newUbicEmail').value.trim() || null,
    direccion: document.getElementById('newUbicDireccion').value.trim() || null,
  });
  if(result){
    ['newUbicNombre','newUbicContacto','newUbicTelefono','newUbicEmail','newUbicDireccion'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('addUbicacionFields').style.display = 'none';
    toast('Ubicación guardada.');
    await renderClientes();
    abrirDetalleCliente(currentDetailClienteId);
  } else {
    alert('No se pudo guardar. Revisa la consola (F12).');
  }
}

async function eliminarUbicacion(ubicacionId){
  const ok = confirm('¿Eliminar esta ubicación? Esta acción no se puede deshacer.');
  if(!ok) return;
  const result = await dbDeleteUbicacion(ubicacionId);
  if(result.success){
    toast('Ubicación eliminada.');
    await renderClientes();
    abrirDetalleCliente(currentDetailClienteId);
  } else {
    alert('No se pudo eliminar — puede que tenga cotizaciones que la usan. Revisa la consola (F12).');
  }
}
window.eliminarUbicacion = eliminarUbicacion;

async function agregarClienteManual(){
  const nombre = document.getElementById('newClienteNombre').value.trim();
  const rut = document.getElementById('newClienteRut').value.trim();
  if(!nombre){ alert('Escribe el nombre del cliente.'); return; }
  const cliente = await dbGetOrCreateCliente(nombre, rut || null);
  if(cliente){
    document.getElementById('newClienteNombre').value = '';
    document.getElementById('newClienteRut').value = '';
    renderClientes();
  } else {
    alert('No se pudo agregar. Revisa la consola (F12).');
  }
}

async function renderClientes(){
  const wrap = document.getElementById('clientesList');
  wrap.innerHTML = '<p style="color:var(--muted); font-size:13px;">Cargando...</p>';
  allClientesCache = await dbListClientes();
  allCotizacionesCache = await dbListCotizaciones();
  filterClientes('');
}

function filterClientes(query){
  const wrap = document.getElementById('clientesList');
  const q = (query||'').toLowerCase().trim();
  let list = allClientesCache;
  if(q){
    list = list.filter(c => {
      const enNombre = c.nombre.toLowerCase().includes(q);
      const enRut = (c.rut||'').toLowerCase().includes(q);
      const enUbicaciones = (c.ubicaciones||[]).some(u => (u.ubicacion||'').toLowerCase().includes(q));
      return enNombre || enRut || enUbicaciones;
    });
  }

  if(!list.length){
    wrap.innerHTML = '<p style="color:var(--muted); font-size:13px;">Sin clientes que coincidan con la búsqueda.</p>';
    return;
  }
  wrap.innerHTML = list.map(c => {
    const ubicaciones = c.ubicaciones || [];
    const cotizacionesDelCliente = allCotizacionesCache.filter(q => q.cliente_id === c.id);
    return `
      <div class="hist-row" style="cursor:pointer;" onclick="abrirDetalleCliente('${c.id}')">
        <div>
          <b>${escapeHtml(c.nombre)}</b>${c.rut ? ' <span style="color:var(--muted); font-family:var(--font-mono); font-size:11.5px;">' + escapeHtml(c.rut) + '</span>' : ''}
          <div style="font-size:11.5px; color:var(--muted); margin-top:2px;">
            ${ubicaciones.length} ubicaci${ubicaciones.length===1?'ón':'ones'} · ${cotizacionesDelCliente.length} cotización${cotizacionesDelCliente.length===1?'':'es'}
          </div>
        </div>
        <a href="cotizaciones.html" class="btn-ghost" style="padding:6px 12px; font-size:12px; text-decoration:none; color:var(--ink);" onclick="event.stopPropagation()">Nueva cotización</a>
      </div>`;
  }).join('');
}

let currentDetailClienteId = null;

function abrirDetalleCliente(clienteId){
  currentDetailClienteId = clienteId;
  const c = allClientesCache.find(x => x.id === clienteId);
  if(!c) return;

  document.getElementById('detailClienteNombre').textContent = c.nombre;
  document.getElementById('detailClienteRut').textContent = c.rut || 'Sin RUT registrado';

  const ubicaciones = c.ubicaciones || [];
  const ubicWrap = document.getElementById('detailClienteUbicaciones');
  ubicWrap.innerHTML = ubicaciones.length
    ? ubicaciones.map(u => `
        <div class="hist-row" style="align-items:flex-start;">
          <div>
            <b>${escapeHtml(u.ubicacion)}</b>
            <div style="font-size:11.5px; color:var(--muted); margin-top:2px;">
              ${u.contacto ? '👤 ' + escapeHtml(u.contacto) + '<br>' : ''}
              ${u.telefono ? '📞 ' + escapeHtml(u.telefono) + '<br>' : ''}
              ${u.email ? '✉️ ' + escapeHtml(u.email) + '<br>' : ''}
              ${u.direccion ? '📍 ' + escapeHtml(u.direccion) : ''}
              ${!u.contacto && !u.telefono && !u.email && !u.direccion ? 'Sin datos de contacto adicionales.' : ''}
            </div>
          </div>
          <button type="button" class="btn-danger" data-ubic-id="${u.id}" onclick="eliminarUbicacion('${u.id}')" style="padding:5px 10px;">✕</button>
        </div>`).join('')
    : '<p style="color:var(--muted); font-size:12.5px;">Sin ubicaciones registradas.</p>';

  const cotizacionesDelCliente = allCotizacionesCache.filter(q => q.cliente_id === c.id);
  const cotWrap = document.getElementById('detailClienteCotizaciones');
  cotWrap.innerHTML = cotizacionesDelCliente.length
    ? cotizacionesDelCliente.map(q => {
        const { total } = computeTotalConDescuento(q);
        return `
          <div class="hist-row">
            <div>
              <span class="num">${q.numero}</span>
              <div style="font-size:11.5px; color:var(--muted); font-family:var(--font-mono);">${formatCLP(total)}</div>
            </div>
            <span class="status-badge" data-estado="${q.estado}">${q.estado}</span>
          </div>`;
      }).join('')
    : '<p style="color:var(--muted); font-size:12.5px;">Sin cotizaciones registradas para este cliente aún.</p>';

  document.getElementById('clientDetailModal').style.display = 'flex';
}
window.abrirDetalleCliente = abrirDetalleCliente;

function formatCLP(n) { return '$' + Math.round(n).toLocaleString('es-CL'); }

function escapeHtml(s) { const div = document.createElement('div'); div.textContent = s || ''; return div.innerHTML; }

async function eliminarClienteActual(){
  if(!currentDetailClienteId) return;
  const c = allClientesCache.find(x => x.id === currentDetailClienteId);
  const cotizacionesDelCliente = allCotizacionesCache.filter(q => q.cliente_id === currentDetailClienteId);

  let mensaje = '¿Eliminar a "' + (c ? c.nombre : 'este cliente') + '" por completo? Esto también borra sus ubicaciones guardadas. Esta acción no se puede deshacer.';
  if(cotizacionesDelCliente.length){
    mensaje = 'Este cliente tiene ' + cotizacionesDelCliente.length + ' cotización(es) guardada(s). No se puede eliminar mientras tenga cotizaciones — primero elimina o reasigna esas cotizaciones.';
    alert(mensaje);
    return;
  }

  const ok = confirm(mensaje);
  if(!ok) return;

  const result = await dbDeleteCliente(currentDetailClienteId);
  if(result.success){
    document.getElementById('clientDetailModal').style.display = 'none';
    toast('Cliente eliminado.');
    renderClientes();
  } else {
    alert('No se pudo eliminar. Revisa la consola (F12) para más detalles.');
  }
}
