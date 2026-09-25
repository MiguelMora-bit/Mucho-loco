import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Cfdi as CfdiRow, FiscalReceipt } from '@prisma/client';
import type {
  Cfdi,
  CfdiCancellationMotive,
  FiscalProfile,
  InvoicingSummary,
  MemberCharge,
} from '@mucho-loco/types';
import {
  FacturapiError,
  type BinaryDownload,
  type CancellationMotive,
  type Invoice,
} from 'facturapi';
import { PrismaService } from '../prisma/prisma.service';
import {
  cancellationRejected,
  cfdiAlreadyCanceled,
  cfdiNotFound,
  chargeAlreadyInvoiced,
  chargeNotFound,
  chargeNotInvoiceable,
  fiscalDataRejected,
  fiscalProfileNotFound,
  fiscalProfileRequired,
  invoicingProviderError,
  invoicingUnavailable,
  invoicingWindowClosed,
} from '../common/error-codes';
import { FacturapiService } from './facturapi.provider';
import { FiscalReceiptsService } from './fiscal-receipts.service';
import {
  customerFromProfile,
  toCfdi,
  toFiscalProfile,
  toMemberCharge,
} from './fiscal-mapping';
import type { FiscalProfileDto } from './dto/fiscal-profile.dto';

export type CfdiFormat = 'pdf' | 'xml';

export interface CfdiFile {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

/** Un 4xx del PAC es un "no" con motivo (datos, estado); cualquier otra cosa es que no respondió. */
const isRejection = (e: unknown): e is FacturapiError =>
  e instanceof FacturapiError && e.status >= 400 && e.status < 500;

/**
 * Facturación desde la app (socio) y desde HQ (dueño). Lo que se factura es
 * el RECIBO de un cobro (ver FiscalReceipt): el socio lo convierte en su CFDI;
 * lo que nadie factura entra solo a la factura global del periodo, que emite
 * Facturapi y llega por webhook.
 */
@Injectable()
export class InvoicingService {
  constructor(
    private prisma: PrismaService,
    private facturapi: FacturapiService,
    private receipts: FiscalReceiptsService,
  ) {}

  async getFiscalProfile(userId: string): Promise<FiscalProfile> {
    const row = await this.prisma.fiscalProfile.findUnique({
      where: { userId },
    });
    if (!row) throw new NotFoundException(fiscalProfileNotFound());
    return toFiscalProfile(row);
  }

  async saveFiscalProfile(
    userId: string,
    dto: FiscalProfileDto,
  ): Promise<FiscalProfile> {
    const data = {
      taxId: dto.taxId,
      legalName: dto.legalName,
      taxSystem: dto.taxSystem,
      zip: dto.zip,
      cfdiUse: dto.cfdiUse,
      email: dto.email ?? null,
    };
    const row = await this.prisma.fiscalProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return toFiscalProfile(row);
  }

  async getCharges(userId: string): Promise<MemberCharge[]> {
    const rows = await this.prisma.charge.findMany({
      where: { userId },
      include: { lines: true, fiscalReceipt: { include: { cfdi: true } } },
      orderBy: { paidAt: 'desc' },
      take: 100,
    });
    return rows.map(toMemberCharge);
  }

  /**
   * Convierte el recibo de un cobro del socio en su CFDI, con sus datos
   * fiscales guardados. Facturapi manda el PDF y el XML a su correo.
   */
  async invoiceCharge(userId: string, chargeId: string): Promise<Cfdi> {
    if (!this.facturapi.configured)
      throw new ServiceUnavailableException(invoicingUnavailable());

    const charge = await this.prisma.charge.findFirst({
      // Un cobro ajeno responde igual que uno que no existe: no se confirma cuál existe.
      where: { id: chargeId, userId },
      include: { fiscalReceipt: true, user: true },
    });
    if (!charge) throw new NotFoundException(chargeNotFound(chargeId));
    if (!charge.fiscalReceipt)
      throw new ConflictException(chargeNotInvoiceable(chargeId));

    const profile = await this.prisma.fiscalProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new BadRequestException(fiscalProfileRequired());

    let receipt = charge.fiscalReceipt;
    // El socio llegó antes que el worker (o el alta falló): se intenta ahora.
    if (receipt.status === 'pending' || receipt.status === 'failed') {
      receipt = (await this.receipts.createReceipt(chargeId)) ?? receipt;
    }
    const receiptId = this.invoiceableReceiptId(receipt);

    let invoice: Invoice;
    try {
      invoice = await this.facturapi.client.receipts.invoice(receiptId, {
        customer: customerFromProfile(profile, charge.user?.email ?? null),
        use: profile.cfdiUse,
      });
    } catch (e) {
      if (!isRejection(e))
        throw new BadGatewayException(invoicingProviderError());
      // Antes de culpar a los datos: quizá el recibo ya no está abierto — entró
      // a la global, o el socio lo autofacturó en el portal con el ticket.
      const fresh = await this.receipts.syncReceipt(receiptId);
      if (fresh && fresh.status !== 'open') this.invoiceableReceiptId(fresh);
      throw new UnprocessableEntityException(fiscalDataRejected(e.message));
    }

    const cfdi = await this.receipts.recordInvoice(chargeId, invoice, userId);
    if (!cfdi) throw new BadGatewayException(invoicingProviderError());
    return toCfdi(cfdi);
  }

  /** El id del recibo en Facturapi si se puede facturar; si no, el error que explica por qué. */
  private invoiceableReceiptId(receipt: FiscalReceipt): string {
    switch (receipt.status) {
      case 'open':
        if (receipt.facturapiId) return receipt.facturapiId;
        break;
      case 'invoiced_to_customer':
        throw new ConflictException(
          chargeAlreadyInvoiced(receipt.chargeId, receipt.cfdiId),
        );
      case 'invoiced_globally':
        throw new ConflictException(invoicingWindowClosed(receipt.chargeId));
      case 'canceled':
        throw new ConflictException(chargeNotInvoiceable(receipt.chargeId));
      case 'pending':
      case 'failed':
        break;
    }
    // Sigue sin alta en Facturapi: el PAC no respondió.
    throw new ServiceUnavailableException(invoicingUnavailable());
  }

  /**
   * El socio baja lo suyo: una factura que pidió él, o la que se hizo en el
   * portal con el ticket de un cobro suyo. Nunca la global.
   */
  async downloadForMember(
    userId: string,
    cfdiId: string,
    format: CfdiFormat,
  ): Promise<CfdiFile> {
    const cfdi = await this.prisma.cfdi.findFirst({
      where: {
        id: cfdiId,
        kind: 'individual',
        OR: [{ userId }, { receipts: { some: { charge: { userId } } } }],
      },
    });
    if (!cfdi) throw new NotFoundException(cfdiNotFound(cfdiId));
    return this.download(cfdi, format);
  }

  async downloadForOwner(
    cfdiId: string,
    format: CfdiFormat,
  ): Promise<CfdiFile> {
    const cfdi = await this.prisma.cfdi.findUnique({ where: { id: cfdiId } });
    if (!cfdi) throw new NotFoundException(cfdiNotFound(cfdiId));
    return this.download(cfdi, format);
  }

  /** El PDF y el XML viven en Facturapi: se piden cada vez, no se guardan. */
  private async download(cfdi: CfdiRow, format: CfdiFormat): Promise<CfdiFile> {
    if (!this.facturapi.configured)
      throw new ServiceUnavailableException(invoicingUnavailable());
    const file =
      format === 'pdf'
        ? await this.facturapi.client.invoices.downloadPdf(cfdi.facturapiId)
        : await this.facturapi.client.invoices.downloadXml(cfdi.facturapiId);
    return {
      buffer: await toBuffer(file),
      filename: `${cfdi.uuid}.${format}`,
      contentType: format === 'pdf' ? 'application/pdf' : 'application/xml',
    };
  }

  /**
   * Sin mes: las 200 más recientes (la vista rápida). Con mes: TODAS las de
   * ese mes en hora de CDMX — es lo que se exporta al contador, y cortar en
   * 200 le escondería facturas.
   */
  async listCfdis(range?: { from: Date; to: Date }): Promise<Cfdi[]> {
    const rows = await this.prisma.cfdi.findMany({
      where: range ? { issuedAt: { gte: range.from, lt: range.to } } : undefined,
      orderBy: { issuedAt: 'desc' },
      take: range ? undefined : 200,
    });
    return rows.map(toCfdi);
  }

  /**
   * Cancela ante el SAT. Puede quedar en `pending` si el receptor tiene que
   * aceptarla; el webhook avisa cuando se resuelve.
   */
  async cancelCfdi(
    cfdiId: string,
    motive: CfdiCancellationMotive,
  ): Promise<Cfdi> {
    if (!this.facturapi.configured)
      throw new ServiceUnavailableException(invoicingUnavailable());
    const cfdi = await this.prisma.cfdi.findUnique({ where: { id: cfdiId } });
    if (!cfdi) throw new NotFoundException(cfdiNotFound(cfdiId));
    if (cfdi.status === 'canceled')
      throw new ConflictException(cfdiAlreadyCanceled(cfdiId));

    let invoice: Invoice;
    try {
      invoice = await this.facturapi.client.invoices.cancel(cfdi.facturapiId, {
        motive: motive as string as CancellationMotive,
      });
    } catch (e) {
      if (isRejection(e))
        throw new UnprocessableEntityException(
          cancellationRejected(cfdiId, e.message),
        );
      throw new BadGatewayException(invoicingProviderError());
    }
    const updated = (await this.receipts.upsertCfdi(invoice)) ?? cfdi;

    // Cancelada la factura, sus recibos pueden volver a quedar abiertos: se releen.
    const linked = await this.prisma.fiscalReceipt.findMany({
      where: { cfdiId, facturapiId: { not: null } },
      select: { facturapiId: true },
    });
    for (const { facturapiId } of linked) {
      if (facturapiId) await this.receipts.syncReceipt(facturapiId);
    }
    return toCfdi(updated);
  }

  async summary(): Promise<InvoicingSummary> {
    const groups = await this.prisma.fiscalReceipt.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const count = (status: FiscalReceipt['status']) =>
      groups.find((g) => g.status === status)?._count._all ?? 0;
    return {
      receipts: {
        pending: count('pending'),
        open: count('open'),
        invoicedToCustomer: count('invoiced_to_customer'),
        invoicedGlobally: count('invoiced_globally'),
        canceled: count('canceled'),
        failed: count('failed'),
      },
    };
  }
}

/** En Node el SDK entrega un stream; en el navegador, un Blob. */
async function toBuffer(file: BinaryDownload): Promise<Buffer> {
  if (typeof Blob !== 'undefined' && file instanceof Blob) {
    return Buffer.from(await file.arrayBuffer());
  }
  const stream = file as Exclude<BinaryDownload, Blob>;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk as Uint8Array)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
