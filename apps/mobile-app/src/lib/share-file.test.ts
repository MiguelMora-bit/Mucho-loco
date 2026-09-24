import { beforeEach, describe, expect, it, vi } from 'vitest';

// Los módulos nativos no existen en Node: se simulan con lo mínimo que usa
// share-file (un archivo en la caché y la hoja de compartir).
const written: { name: string; bytes: Uint8Array | null; overwrite: boolean | undefined }[] = [];
vi.mock('expo-file-system', () => {
  class File {
    name: string;
    uri: string;
    constructor(_dir: unknown, name: string) {
      this.name = name;
      this.uri = `file:///cache/${name}`;
      written.push({ name, bytes: null, overwrite: undefined });
    }
    create(options?: { overwrite?: boolean }) {
      written[written.length - 1].overwrite = options?.overwrite;
    }
    write(bytes: Uint8Array) {
      written[written.length - 1].bytes = bytes;
    }
  }
  return { File, Paths: { cache: { uri: 'file:///cache/' } } };
});

const shareAsync = vi.fn(async (_uri: string, _opts: unknown) => undefined);
const isAvailableAsync = vi.fn(async () => true);
vi.mock('expo-sharing', () => ({ shareAsync, isAvailableAsync }));

const { shareInvoiceFile } = await import('./share-file');

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

beforeEach(() => {
  written.length = 0;
  shareAsync.mockClear();
  isAvailableAsync.mockResolvedValue(true);
});

describe('shareInvoiceFile', () => {
  it('writes the bytes to the cache (overwriting) and opens the share sheet as a PDF', async () => {
    await shareInvoiceFile({ data: PDF, contentType: 'application/pdf', filename: 'factura-ABC.pdf' });

    expect(written).toEqual([{ name: 'factura-ABC.pdf', bytes: PDF, overwrite: true }]);
    expect(shareAsync).toHaveBeenCalledWith('file:///cache/factura-ABC.pdf', {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'factura-ABC.pdf',
    });
  });

  it('shares an XML as XML', async () => {
    await shareInvoiceFile({ data: PDF, contentType: 'application/xml', filename: 'factura-ABC.xml' });
    expect(shareAsync).toHaveBeenCalledWith('file:///cache/factura-ABC.xml', expect.objectContaining({
      mimeType: 'application/xml',
      UTI: 'public.xml',
    }));
  });

  it('never lets a filename escape the cache folder', async () => {
    await shareInvoiceFile({ data: PDF, contentType: 'application/pdf', filename: '../../secretos/x.pdf' });
    expect(written[0].name).toBe('secretos_x.pdf');
  });

  it('fails when the device cannot share', async () => {
    isAvailableAsync.mockResolvedValue(false);
    await expect(
      shareInvoiceFile({ data: PDF, contentType: 'application/pdf', filename: 'f.pdf' }),
    ).rejects.toThrow();
    expect(shareAsync).not.toHaveBeenCalled();
  });
});
