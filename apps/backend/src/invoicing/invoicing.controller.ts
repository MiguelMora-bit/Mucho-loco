import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseEnumPipe,
  Post,
  Req,
  StreamableFile,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Cfdi, InvoicingSummary } from '@mucho-loco/types';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { FacturapiService } from './facturapi.provider';
import { FiscalReceiptsService } from './fiscal-receipts.service';
import { InvoicingService, type CfdiFormat } from './invoicing.service';
import { CancelCfdiDto } from './dto/fiscal-profile.dto';

const FORMATS = { pdf: 'pdf', xml: 'xml' } as const;

/**
 * Facturación vista desde HQ — solo dueño: ve las facturas de todos los
 * socios, con su RFC — más el webhook de Facturapi.
 */
@Controller('invoicing')
export class InvoicingController {
  constructor(
    private invoicing: InvoicingService,
    private receipts: FiscalReceiptsService,
    private facturapi: FacturapiService,
  ) {}

  @Roles('owner')
  @Get('cfdis')
  listCfdis(): Promise<Cfdi[]> {
    return this.invoicing.listCfdis();
  }

  @Roles('owner')
  @Post('cfdis/:cfdiId/cancel')
  @HttpCode(200)
  cancel(
    @Param('cfdiId') cfdiId: string,
    @Body() dto: CancelCfdiDto,
  ): Promise<Cfdi> {
    return this.invoicing.cancelCfdi(cfdiId, dto.motive);
  }

  @Roles('owner')
  @Get('cfdis/:cfdiId/:format')
  async download(
    @Param('cfdiId') cfdiId: string,
    @Param('format', new ParseEnumPipe(FORMATS)) format: CfdiFormat,
  ): Promise<StreamableFile> {
    const file = await this.invoicing.downloadForOwner(cfdiId, format);
    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  /** Cuántos recibos hay en cada estado: `failed` es lo que hay que revisar. */
  @Roles('owner')
  @Get('summary')
  summary(): Promise<InvoicingSummary> {
    return this.invoicing.summary();
  }

  /**
   * Lo llama Facturapi: autofacturas del portal, factura global, cambios de
   * estado y cancelaciones. Público por necesidad; lo protege la firma.
   */
  @Public()
  @Post('facturapi/webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('facturapi-signature') signature?: string,
  ): Promise<{ received: true }> {
    if (!signature)
      throw new BadRequestException('Falta la cabecera facturapi-signature');
    if (!req.rawBody)
      throw new BadRequestException('Falta el cuerpo crudo de la petición');

    const event = await this.facturapi
      .verifyWebhook(req.rawBody, signature)
      .catch((e: unknown) => {
        // 400 y no 500: una firma inválida es culpa de quien llamó, y un 5xx
        // haría que se reintentara un evento falso.
        throw new BadRequestException(
          `Firma de webhook inválida: ${e instanceof Error ? e.message : String(e)}`,
        );
      });

    // Si esto falla (Facturapi no respondió al releer), el 500 hace que
    // Facturapi reintente el evento, que es justo lo que se quiere.
    await this.receipts.handleEvent(event);
    return { received: true };
  }
}
