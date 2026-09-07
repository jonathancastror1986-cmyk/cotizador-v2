// ============================================================
// Conexión a Supabase — Cotizador de Servicios Informáticos
// ============================================================
// Ojo: la variable se llama "sb" (no "supabase") a propósito, para
// nunca pisar el objeto global "window.supabase" que trae la propia
// librería (si tuvieran el mismo nombre, cargar este archivo dos veces
// rompería todo). "var" además evita el error de "ya declarado" si
// por algún motivo el script se llega a ejecutar más de una vez.

var SUPABASE_URL = 'https://fanfmvpzjlisraceaqep.supabase.co';
var SUPABASE_KEY = 'sb_publishable_5MRLrWnAfeHl9ocYM4si_Q_XN98oESF';

var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
