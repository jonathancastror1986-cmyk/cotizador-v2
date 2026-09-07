// ============================================================
// Navegación lateral del PORTAL DE CLIENTES (distinta del menú admin)
// ============================================================

const PORTAL_NAV_LINKS = [
  { id: 'inicio', label: 'Mis OTs', icon: 'fa-list-check', href: 'portal-inicio.html' },
  { id: 'solicitar', label: 'Solicitar servicio', icon: 'fa-circle-plus', href: 'portal-solicitar.html' },
  { id: 'perfil', label: 'Mi perfil', icon: 'fa-user-gear', href: 'portal-perfil.html' },
];

function renderPortalSidebar(activePage){
  const sidebarEl = document.getElementById('appSidebar');
  if(!sidebarEl) return;
  sidebarEl.innerHTML = `
    <div class="app-sidebar-brand">
      <span class="brand-badge"><i class="fa-solid fa-bolt"></i></span>
      <span>Servicios Informáticos</span>
    </div>
    <nav class="app-sidebar-nav">
      ${PORTAL_NAV_LINKS.map(link => `
        <a class="app-nav-link ${link.id === activePage ? 'active' : ''}" href="${link.href}">
          <i class="fa-solid ${link.icon}"></i> ${link.label}
        </a>
      `).join('')}
    </nav>
    <div class="app-sidebar-footer">Portal de clientes</div>
  `;
}

document.addEventListener('DOMContentLoaded', ()=>{
  const toggle = document.getElementById('mobileNavToggle');
  const sidebar = document.getElementById('appSidebar');
  if(toggle && sidebar){
    toggle.addEventListener('click', ()=> sidebar.classList.toggle('open'));
  }
});
