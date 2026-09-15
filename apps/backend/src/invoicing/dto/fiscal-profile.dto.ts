import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import type { CfdiCancellationMotive, CfdiUse } from '@mucho-loco/types';

/** c_RegimenFiscal vigentes para el receptor de un CFDI 4.0. */
export const TAX_SYSTEMS = [
  '601',
  '603',
  '605',
  '606',
  '607',
  '608',
  '610',
  '611',
  '612',
  '614',
  '615',
  '616',
  '620',
  '621',
  '622',
  '623',
  '624',
  '625',
  '626',
] as const;

export const CFDI_USES: readonly CfdiUse[] = ['G01', 'G03', 'S01'];

const trimUpper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

/**
 * Aquí solo se valida la FORMA. Que el RFC exista y que nombre, régimen y
 * código postal coincidan con la constancia lo valida el SAT al timbrar, y su
 * rechazo llega como FISCAL_DATA_REJECTED con el motivo.
 */
export class FiscalProfileDto {
  /** Persona moral: 3 letras; física: 4. Luego la fecha AAMMDD y la homoclave. */
  @Transform(trimUpper)
  @Matches(/^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/, {
    message: 'taxId no tiene forma de RFC',
  })
  taxId!: string;

  /** CFDI 4.0 exige el nombre EXACTO de la constancia, que viene en mayúsculas. */
  @Transform(trimUpper)
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  legalName!: string;

  @IsIn(TAX_SYSTEMS)
  taxSystem!: string;

  @Matches(/^\d{5}$/, { message: 'zip debe ser un código postal de 5 dígitos' })
  zip!: string;

  @IsIn(CFDI_USES)
  cfdiUse!: CfdiUse;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;
}

export class CancelCfdiDto {
  @IsIn(['02', '03'])
  motive!: CfdiCancellationMotive;
}
