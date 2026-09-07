// ============================================================
// Acceso a datos: DASHBOARD (KPIs)
// ============================================================

async function dbGetKpis() {
  const [comprasRes, cotizacionesRes] = await Promise.all([
    sb.from('compras').select('*'),
    sb.from('cotizaciones').select('*, clientes(nombre), tecnico:profiles!tecnico_id(nombre)'),
  ]);

  const compras = comprasRes.data || [];
  let cotizaciones = cotizacionesRes.data;
  if (cotizacionesRes.error) {
    // fallback si todavía no existe la relación técnico (falta migration_004_tecnicos_v2.sql)
    const retry = await sb.from('cotizaciones').select('*, clientes(nombre)');
    cotizaciones = retry.data || [];
  }

  // cruza cada compra con la OT vinculada (por número) para saber qué técnico la generó
  const cotizacionPorNumero = {};
  cotizaciones.forEach(q => { cotizacionPorNumero[q.numero] = q; });
  compras.forEach(c => {
    const q = c.linked_ot ? cotizacionPorNumero[c.linked_ot] : null;
    c.tecnico_nombre = q && q.tecnico ? q.tecnico.nombre : null;
  });

  const comprasSinOT = compras.filter(c => !c.linked_ot);
  const comprasSinPagar = compras.filter(c => (c.purchase_payment_status || 'pendiente') !== 'pagada');
  const otsSinPago = cotizaciones.filter(q => !q.paid && q.estado !== 'cancelada' && q.estado !== 'rechazada');
  const otsSinTrabajar = cotizaciones.filter(q => !q.work_executed && q.estado !== 'cancelada' && q.estado !== 'rechazada');

  return {
    comprasSinOT,
    comprasSinPagar,
    otsSinPago,
    otsSinTrabajar,
    totalCotizaciones: cotizaciones.length,
    totalCompras: compras.length,
  };
}
