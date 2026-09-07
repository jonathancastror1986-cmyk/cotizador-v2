// ============================================================
// Notificaciones tipo "toast" — reemplaza los alert() feos
// ============================================================

function ensureToastEl(){
  let el = document.getElementById('appToast');
  if(!el){
    el = document.createElement('div');
    el.id = 'appToast';
    document.body.appendChild(el);
  }
  return el;
}

let toastTimer = null;
function toast(msg){
  const el = ensureToastEl();
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove('show'), 3200);
}
