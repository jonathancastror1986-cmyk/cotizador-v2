// ============================================================
// Cálculo de totales CON descuento — replica la lógica de la versión offline
// ============================================================

function formatCLP(n) { return '$' + Math.round(n||0).toLocaleString('es-CL'); }

function computeTotalConDescuento(q){
  const subtotal = (q.items || []).reduce((s, it) => s + it.cantidad * it.precio, 0);
  let total = subtotal;
  if (q.disc_type === 'percent') {
    total = subtotal - subtotal * (q.disc_percent || 0) / 100;
  } else if (q.disc_type === 'round_step') {
    const step = q.disc_round_step || 10000;
    total = step > 0 ? Math.floor(subtotal / step) * step : subtotal;
  } else if (q.disc_type === 'round') {
    total = q.disc_round || subtotal;
  }

  // si la cotización requiere un documento tributario con IVA cargado, ese IVA (y otros
  // impuestos del documento) se suman al total — pero solo si no hay ya un ajuste manual
  // (disc_type distinto de "none"), para no sumarlo dos veces.
  let ivaDocumento = 0;
  if (q.requires_fee_receipt && (!q.disc_type || q.disc_type === 'none')) {
    ivaDocumento += q.fee_receipt_iva || 0;
    ivaDocumento += q.fee_receipt_iva_no_rec || 0;
    ivaDocumento += (q.fee_receipt_otros_impuestos || []).reduce((s, o) => s + (o.monto || 0), 0);
  }
  if (ivaDocumento > 0) total += ivaDocumento;

  return { subtotal, total, ivaDocumento };
}
