import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { InvoiceFile } from '@mucho-loco/customer-core/contract';

/** UTI de iOS por tipo: sin él, la hoja de compartir no ofrece "Guardar en Archivos" como PDF. */
const UTI: Record<string, string> = {
  'application/pdf': 'com.adobe.pdf',
  'application/xml': 'public.xml',
};

/** El nombre viene del backend: nunca debe poder salirse de la carpeta de caché. */
export function safeFilename(name: string): string {
  return name.split(/[\\/]+/).filter((part) => part && part !== '.' && part !== '..').join('_') || 'factura';
}

/**
 * Abre un PDF/XML de factura con la hoja de compartir del sistema (guardar en
 * Archivos, mandarlo por correo o WhatsApp). Es lo normal en un teléfono; y
 * no sirve abrir una URL en el navegador: la descarga necesita el token de la
 * sesión, que el navegador no lleva. El archivo queda en la caché, que el
 * sistema limpia solo. En web, `share-file.web.ts` lo descarga.
 */
export async function shareInvoiceFile(file: InvoiceFile): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Este dispositivo no puede compartir archivos');
  }
  const name = safeFilename(file.filename);
  const target = new File(Paths.cache, name);
  target.create({ overwrite: true });
  target.write(file.data);
  await Sharing.shareAsync(target.uri, {
    mimeType: file.contentType,
    UTI: UTI[file.contentType],
    dialogTitle: name,
  });
}
