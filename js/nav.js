// ============================================================
// Navegación lateral compartida — se inyecta en cada página
// ============================================================

const NAV_LINKS = [
  { id: 'dashboard', label: 'Resumen', icon: 'fa-gauge-high', href: 'dashboard.html' },
  { id: 'cotizaciones', label: 'Cotizaciones', icon: 'fa-file-invoice', href: 'cotizaciones.html' },
  { id: 'consultor', label: 'Consultor de OTs', icon: 'fa-magnifying-glass', href: 'consultor.html' },
  { id: 'estados', label: 'Estados', icon: 'fa-list-check', href: 'estados.html' },
  { id: 'agenda', label: 'Agenda', icon: 'fa-calendar-days', href: 'agenda.html' },
  { id: 'documentos', label: 'Documentos', icon: 'fa-folder-open', href: 'documentos.html' },
  { id: 'clientes', label: 'Clientes', icon: 'fa-users', href: 'clientes.html' },
  { id: 'equipo', label: 'Equipo', icon: 'fa-user-group', href: 'equipo.html' },
  { id: 'perfil', label: 'Perfil de mi empresa', icon: 'fa-gear', href: 'perfil.html' },
];

function renderSidebar(activePage){
  const sidebarEl = document.getElementById('appSidebar');
  if(!sidebarEl) return;
  sidebarEl.innerHTML = `
    <div class="app-sidebar-brand">
      <span class="brand-badge"><i class="fa-solid fa-bolt"></i></span>
      <span>Servicios Informáticos</span>
    </div>
    <nav class="app-sidebar-nav">
      ${NAV_LINKS.map(link => `
        <a class="app-nav-link ${link.id === activePage ? 'active' : ''}" href="${link.href}">
          <i class="fa-solid ${link.icon}"></i> ${link.label}
        </a>
      `).join('')}
    </nav>
    <div class="app-sidebar-footer">Cotizador en la nube</div>
  `;
}

document.addEventListener('DOMContentLoaded', ()=>{
  const toggle = document.getElementById('mobileNavToggle');
  const sidebar = document.getElementById('appSidebar');
  if(toggle && sidebar){
    toggle.addEventListener('click', ()=> sidebar.classList.toggle('open'));
  }
});
