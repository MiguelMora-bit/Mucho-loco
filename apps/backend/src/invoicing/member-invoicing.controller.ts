import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Put,
  StreamableFile,
} from '@nestjs/common';
import type { Cfdi, FiscalProfile, MemberCharge } from '@mucho-loco/types';
import { CurrentUser } from '../auth/current-user.decorator';
import type { IdTokenClaims } from '../auth/cognito';
import { UsersService } from '../users/users.service';
import { InvoicingService, type CfdiFormat } from './invoicing.service';
import { FiscalProfileDto } from './dto/fiscal-profile.dto';

const FORMATS = { pdf: 'pdf', xml: 'xml' } as const;

/** Facturar desde la app del socio. "me" es siempre quien mandó el token, como en UsersController. */
@Controller('users/me')
export class MemberInvoicingController {
  constructor(
    private users: UsersService,
    private invoicing: InvoicingService,
  ) {}

  /** 404 FISCAL_PROFILE_NOT_FOUND si todavía no los captura. */
  @Get('fiscal-profile')
  async getFiscalProfile(
    @CurrentUser() user: IdTokenClaims,
  ): Promise<FiscalProfile> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.invoicing.getFiscalProfile(dbUser.id);
  }

  @Put('fiscal-profile')
  async saveFiscalProfile(
    @CurrentUser() user: IdTokenClaims,
    @Body() dto: FiscalProfileDto,
  ): Promise<FiscalProfile> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.invoicing.saveFiscalProfile(dbUser.id, dto);
  }

  /** Sus cobros — de cualquier canal —, cada uno con si se puede facturar todavía. */
  @Get('charges')
  async getCharges(
    @CurrentUser() user: IdTokenClaims,
  ): Promise<MemberCharge[]> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.invoicing.getCharges(dbUser.id);
  }

  @Post('charges/:chargeId/invoice')
  async invoiceCharge(
    @CurrentUser() user: IdTokenClaims,
    @Param('chargeId') chargeId: string,
  ): Promise<Cfdi> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.invoicing.invoiceCharge(dbUser.id, chargeId);
  }

  @Get('invoices/:cfdiId/:format')
  async download(
    @CurrentUser() user: IdTokenClaims,
    @Param('cfdiId') cfdiId: string,
    @Param('format', new ParseEnumPipe(FORMATS)) format: CfdiFormat,
  ): Promise<StreamableFile> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    const file = await this.invoicing.downloadForMember(
      dbUser.id,
      cfdiId,
      format,
    );
    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }
}
