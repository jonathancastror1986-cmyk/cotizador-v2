// ============================================================
// Insignias (badges) reutilizables para mostrar el estado de una cotización
// ============================================================

const FORMA_PAGO_LABELS = {
  transferencia: { icon: '🏦', label: 'Transferencia' },
  efectivo: { icon: '💵', label: 'Efectivo' },
  tarjeta_debito: { icon: '💳', label: 'Débito' },
  tarjeta_credito: { icon: '💳', label: 'Crédito' },
  orden_pago: { icon: '📋', label: 'Orden de pago' },
  // Estos tres valores solo los genera la versión offline (vocabulario distinto);
  // se agregan acá para que las OTs creadas offline no muestren la etiqueta
  // por defecto equivocada al llegar a la nube.
  cheque: { icon: '🧾', label: 'Cheque' },
  tarjeta: { icon: '💳', label: 'Tarjeta' },
  otro: { icon: '❔', label: 'Otro' },
};

const DOC_TIPO_LABELS = {
  boleta_honorarios: 'Boleta de honorarios',
  boleta: 'Boleta',
  factura: 'Factura',
  factura_exenta: 'Factura exenta',
  comprobante: 'Comprobante de pago',
};

const DOC_STAGE_LABELS = {
  borrador: { label: 'Borrador', color: 'var(--muted)' },
  declarado: { label: 'Declarado', color: 'var(--copper)' },
  pagado: { label: 'IVA pagado', color: 'var(--signal)' },
};

function badgeFormaPago(q){
  const fp = FORMA_PAGO_LABELS[q.forma_pago] || FORMA_PAGO_LABELS.transferencia;
  return `<span class="mini-badge">${fp.icon} ${fp.label}</span>`;
}

function badgeDocumento(q){
  if(!q.requires_fee_receipt){
    return `<span class="mini-badge" style="color:var(--muted);">Sin documento</span>`;
  }
  const tipo = DOC_TIPO_LABELS[q.fee_receipt_doc_type] || 'Documento';
  const stage = DOC_STAGE_LABELS[q.fee_receipt_stage] || DOC_STAGE_LABELS.borrador;
  const numero = q.fee_receipt_number ? ' N°' + q.fee_receipt_number : '';
  return `<span class="mini-badge" style="color:${stage.color};">${tipo}${numero} · ${stage.label}</span>`;
}

function badgePagadoCliente(q){
  return q.paid
    ? `<span class="mini-badge" style="color:var(--signal);">✓ Pagado por cliente</span>`
    : `<span class="mini-badge" style="color:var(--muted);">Pendiente de pago</span>`;
}

// Separado de badgeDocumento a propósito: "pagado por el cliente" y "IVA pagado"
// son dos cosas distintas (puede estar pagado por el cliente y el IVA seguir sin
// declarar), y la página de Estados los muestra como dos badges independientes.
function ivaStatusFor(q){
  if(!q.requires_fee_receipt) return 'no_aplica';
  return q.fee_receipt_stage || 'borrador'; // 'pagado' | 'declarado' | 'borrador'(=pendiente)
}

function badgeIva(q){
  const estado = ivaStatusFor(q);
  if(estado === 'no_aplica') return `<span class="mini-badge" style="color:var(--muted);">IVA: no aplica</span>`;
  if(estado === 'pagado') return `<span class="mini-badge" style="color:var(--signal);">✓ IVA pagado</span>`;
  if(estado === 'declarado') return `<span class="mini-badge" style="color:var(--copper);">IVA declarado, no pagado</span>`;
  return `<span class="mini-badge" style="color:var(--muted);">IVA pendiente</span>`;
}
