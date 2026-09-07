// ============================================================
// Página: Agenda de OTs — por fecha de compromiso, agrupadas por
// sector, con mapa interactivo (Leaflet + OpenStreetMap).
// ============================================================

const SECTOR_LABELS_AGENDA = { cercania:'Cercanía', medio:'Sector medio', oriente_alto:'Oriente / alto', extendido:'Sector extendido' };
const SECTOR_ORDER = ['cercania','medio','oriente_alto','extendido','sin_sector'];

let agendaCache = [];
let agendaMap = null;
let agendaMarkers = {}; // ubicacionId -> marker

function escapeHtml(s) { const div = document.createElement('div'); div.textContent = s || ''; return div.innerHTML; }

function onPageReady(){
  initAgendaMap();
  cargarAgenda();
  document.getElementById('agendaSectorFilter').addEventListener('change', renderAgendaList);
  document.getElementById('agendaSoloConFecha').addEventListener('change', renderAgendaList);
  document.getElementById('geocodeAllBtn').addEventListener('click', geocodificarPendientes);
}
window.onPageReady = onPageReady;

function initAgendaMap(){
  agendaMap = L.map('agendaMap').setView([-33.4489, -70.6693], 11); // Santiago, Chile por defecto
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(agendaMap);
}

async function cargarAgenda(){
  const wrap = document.getElementById('agendaList');
  wrap.innerHTML = '<p style="color:var(--muted); font-size:13px;">Cargando...</p>';
  agendaCache = await dbListCotizaciones();
  renderAgendaList();
}

function otsPendientesFiltradas(){
  let list = agendaCache.filter(q => q.estado !== 'cancelada' && q.estado !== 'rechazada' && !q.work_executed);

  const soloConFecha = document.getElementById('agendaSoloConFecha').checked;
  if(soloConFecha) list = list.filter(q => !!q.fecha_compromiso_ot);

  const sectorFilter = document.getElementById('agendaSectorFilter').value;
  if(sectorFilter === 'sin_sector') list = list.filter(q => !(q.ubicaciones && q.ubicaciones.sector));
  else if(sectorFilter) list = list.filter(q => q.ubicaciones && q.ubicaciones.sector === sectorFilter);

  list.sort((a,b) => {
    if(!a.fecha_compromiso_ot && !b.fecha_compromiso_ot) return 0;
    if(!a.fecha_compromiso_ot) return 1;
    if(!b.fecha_compromiso_ot) return -1;
    return a.fecha_compromiso_ot.localeCompare(b.fecha_compromiso_ot);
  });
  return list;
}

function renderAgendaList(){
  const wrap = document.getElementById('agendaList');
  const list = otsPendientesFiltradas();

  // refresca los pines del mapa con lo que ya está geocodificado (guardado en ubicaciones.lat/lon)
  Object.values(agendaMarkers).forEach(m => agendaMap.removeLayer(m));
  agendaMarkers = {};
  const puntos = [];
  list.forEach(q => {
    const ubic = q.ubicaciones;
    if(ubic && ubic.lat != null && ubic.lon != null){
      const marker = L.marker([ubic.lat, ubic.lon]).addTo(agendaMap);
      const direccionEnc = encodeURIComponent(ubic.direccion || ubic.ubicacion || '');
      marker.bindPopup(`
        <b>${escapeHtml(q.numero)}</b> — ${escapeHtml(q.clientes ? q.clientes.nombre : 'Sin cliente')}<br>
        ${escapeHtml(ubic.direccion || ubic.ubicacion || '')}<br>
        ${q.fecha_compromiso_ot ? '📅 ' + escapeHtml(q.fecha_compromiso_ot) + '<br>' : ''}
        <a href="https://www.google.com/maps/dir/?api=1&destination=${direccionEnc}" target="_blank" rel="noopener">Cómo llegar →</a>
      `);
      agendaMarkers[ubic.id] = marker;
      puntos.push([ubic.lat, ubic.lon]);
    }
  });
  if(puntos.length){
    agendaMap.fitBounds(puntos, { padding: [30,30], maxZoom: 14 });
  }

  if(!list.length){
    wrap.innerHTML = '<p style="color:var(--muted); font-size:13px;">Sin OTs pendientes que coincidan con el filtro.</p>';
    return;
  }

  const groups = {};
  list.forEach(q => {
    const key = (q.ubicaciones && q.ubicaciones.sector) || 'sin_sector';
    if(!groups[key]) groups[key] = [];
    groups[key].push(q);
  });
  const keys = Object.keys(groups).sort((a,b) => SECTOR_ORDER.indexOf(a) - SECTOR_ORDER.indexOf(b));

  wrap.innerHTML = keys.map(key => {
    const label = SECTOR_LABELS_AGENDA[key] || 'Sin sector asignado';
    const rows = groups[key].map(q => {
      const ubic = q.ubicaciones;
      const fechaStr = q.fecha_compromiso_ot
        ? new Date(q.fecha_compromiso_ot + 'T00:00:00').toLocaleDateString('es-CL', { weekday:'short', day:'2-digit', month:'short' })
        : 'Sin fecha agendada';
      const tieneCoords = ubic && ubic.lat != null && ubic.lon != null;
      return `
        <div class="hist-row agenda-pin-list-item" style="flex-wrap:wrap; gap:8px;" data-ubic-id="${ubic ? escapeHtml(ubic.id) : ''}">
          <div style="flex:1; min-width:220px;">
            <span class="num">${escapeHtml(q.numero)}</span> — ${escapeHtml(q.clientes ? q.clientes.nombre : 'Sin cliente')}
            <div style="font-size:11.5px; color:var(--muted); margin-top:2px;">
              📅 ${fechaStr}${ubic ? ' · ' + escapeHtml(ubic.ubicacion || '') : ''}${ubic && ubic.direccion ? ' · ' + escapeHtml(ubic.direccion) : ''}
              ${tieneCoords ? ' · <span style="color:var(--signal);">📍 en el mapa</span>' : ' · <span style="color:var(--muted);">sin ubicar aún</span>'}
            </div>
          </div>
        </div>`;
    }).join('');
    return `
      <div style="margin-bottom:16px;">
        <div class="agenda-sector-heading">📍 ${escapeHtml(label)} (${groups[key].length})</div>
        ${rows}
      </div>`;
  }).join('');

  wrap.querySelectorAll('[data-ubic-id]').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.ubicId;
      const marker = agendaMarkers[id];
      if(marker){
        agendaMap.setView(marker.getLatLng(), 15);
        marker.openPopup();
      } else {
        toast('Esta dirección aún no está ubicada en el mapa — usa "Ubicar direcciones en el mapa".');
      }
    });
  });
}

// ------------------------------------------------------------
// Geocodificación (OpenStreetMap Nominatim) — se guarda una vez
// por ubicación en ubicaciones.lat/lon para no repetirla después.
// Nominatim pide como máximo ~1 solicitud por segundo.
// ------------------------------------------------------------
async function geocodeDireccion(direccion){
  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cl&q=' + encodeURIComponent(direccion);
  const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
  if(!res.ok) return null;
  const data = await res.json();
  if(!data || !data.length) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function geocodificarPendientes(){
  const statusEl = document.getElementById('geocodeStatus');
  const btn = document.getElementById('geocodeAllBtn');
  const list = otsPendientesFiltradas();

  // solo direcciones con texto, sin coordenadas guardadas todavía, sin repetir la misma ubicación dos veces
  const pendientes = [];
  const vistos = new Set();
  list.forEach(q => {
    const ubic = q.ubicaciones;
    if(!ubic || !ubic.id || vistos.has(ubic.id)) return;
    vistos.add(ubic.id);
    if((ubic.lat == null || ubic.lon == null) && (ubic.direccion || ubic.ubicacion)){
      pendientes.push(ubic);
    }
  });

  if(!pendientes.length){
    toast('No hay direcciones nuevas por ubicar.');
    return;
  }

  btn.disabled = true;
  let ok = 0, fail = 0;
  for(let i = 0; i < pendientes.length; i++){
    const ubic = pendientes[i];
    statusEl.textContent = `Ubicando ${i+1}/${pendientes.length}: ${ubic.direccion || ubic.ubicacion}...`;
    try{
      const coords = await geocodeDireccion(ubic.direccion || ubic.ubicacion);
      if(coords){
        await dbUpdateUbicacionCoords(ubic.id, coords.lat, coords.lon);
        ubic.lat = coords.lat; ubic.lon = coords.lon; // refleja en memoria sin recargar todo
        ok++;
      } else {
        fail++;
      }
    } catch(e){
      console.error(e);
      fail++;
    }
    await sleep(1100); // respeta el límite de ~1 request/seg de Nominatim
  }
  statusEl.textContent = `Listo: ${ok} ubicadas${fail ? ', ' + fail + ' no encontradas (revisa que la dirección tenga comuna)' : ''}.`;
  btn.disabled = false;
  renderAgendaList();
}
