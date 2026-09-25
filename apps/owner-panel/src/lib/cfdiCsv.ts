import type { Cfdi, Lang } from '@mucho-loco/types';

const HEADERS: Record<Lang, string[]> = {
  es: ['Folio fiscal', 'Tipo', 'Fecha', 'RFC', 'Nombre o razón social', 'Total', 'Estado', 'Cancelación'],
  en: ['Tax folio', 'Type', 'Date', 'Tax ID', 'Name', 'Total', 'Status', 'Cancellation'],
};

/** Un campo de CSV: entre comillas si trae coma, comilla o salto de línea; comillas dobladas. */
function field(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Fecha y hora de CDMX sin zona, ordenable: `2026-09-24 13:05`. */
function localDateTime(iso: string): string {
  const local = new Date(new Date(iso).getTime() - 6 * 3600_000);
  return local.toISOString().slice(0, 16).replace('T', ' ');
}

/**
 * Los CFDI del mes para el contador. UTF-8 con BOM para que Excel en español
 * abra bien los acentos; separador coma; montos con 2 decimales y punto.
 */
export function cfdisToCsv(cfdis: Cfdi[], lang: Lang): string {
  const rows = cfdis.map((c) =>
    [
      c.uuid,
      c.kind,
      localDateTime(c.issuedAt),
      c.customerTaxId,
      c.customerLegalName,
      c.total.toFixed(2),
      c.status,
      c.cancellationStatus,
    ].map(field).join(','),
  );
  return '﻿' + [HEADERS[lang].map(field).join(','), ...rows].join('\r\n') + '\r\n';
}
