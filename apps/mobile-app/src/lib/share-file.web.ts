import type { InvoiceFile } from '@mucho-loco/customer-core/contract';

/**
 * Versión web (solo desarrollo y Playwright): no hay hoja de compartir, así
 * que se descarga como en cualquier sitio. Metro elige este archivo en web.
 */
export async function shareInvoiceFile(file: InvoiceFile): Promise<void> {
  const url = URL.createObjectURL(new Blob([file.data as BlobPart], { type: file.contentType }));
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Después del click: el navegador ya tomó el Blob.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
