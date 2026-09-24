import type { CfdiUse, FiscalProfile, LocalizedString } from '@mucho-loco/types';

/**
 * Catálogos del SAT para los datos fiscales del socio (receptor de un CFDI 4.0).
 * Vive aquí y no en el componente porque lo comparten la web y el móvil, y
 * porque es lógica que se prueba.
 *
 * El backend solo valida la FORMA (`FiscalProfileDto`) y el SAT el fondo al
 * timbrar. El filtro régimen ↔ uso de abajo es comodidad para el socio, no una
 * frontera de seguridad: si el catálogo cambia y esta tabla queda vieja, el
 * rechazo del SAT se sigue mostrando con su motivo.
 *
 * Fuente: catálogos c_RegimenFiscal y c_UsoCFDI del Anexo 20 (CFDI 4.0). Tabla
 * escrita el 2026-09-23 — revisarla contra el catálogo vigente del SAT si el
 * SAT publica cambios.
 */

interface CatalogEntry<K extends string = string> {
  key: K;
  name: LocalizedString;
}

/** Los mismos 19 regímenes que acepta `FiscalProfileDto` del backend. */
export const TAX_SYSTEMS: readonly CatalogEntry[] = [
  { key: '601', name: { es: 'General de Ley Personas Morales', en: 'General corporate regime' } },
  { key: '603', name: { es: 'Personas Morales con Fines no Lucrativos', en: 'Non-profit legal entities' } },
  { key: '605', name: { es: 'Sueldos y Salarios e Ingresos Asimilados a Salarios', en: 'Wages and salaries' } },
  { key: '606', name: { es: 'Arrendamiento', en: 'Leasing' } },
  { key: '607', name: { es: 'Régimen de Enajenación o Adquisición de Bienes', en: 'Sale or acquisition of goods' } },
  { key: '608', name: { es: 'Demás ingresos', en: 'Other income' } },
  { key: '610', name: { es: 'Residentes en el Extranjero sin Establecimiento Permanente en México', en: 'Foreign residents without a permanent establishment in Mexico' } },
  { key: '611', name: { es: 'Ingresos por Dividendos (socios y accionistas)', en: 'Dividend income' } },
  { key: '612', name: { es: 'Personas Físicas con Actividades Empresariales y Profesionales', en: 'Individuals with business and professional activities' } },
  { key: '614', name: { es: 'Ingresos por intereses', en: 'Interest income' } },
  { key: '615', name: { es: 'Régimen de los ingresos por obtención de premios', en: 'Prize income' } },
  { key: '616', name: { es: 'Sin obligaciones fiscales', en: 'No tax obligations' } },
  { key: '620', name: { es: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos', en: 'Production cooperatives deferring income' } },
  { key: '621', name: { es: 'Incorporación Fiscal', en: 'Tax incorporation regime' } },
  { key: '622', name: { es: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', en: 'Agriculture, livestock, forestry and fishing' } },
  { key: '623', name: { es: 'Opcional para Grupos de Sociedades', en: 'Optional regime for corporate groups' } },
  { key: '624', name: { es: 'Coordinados', en: 'Coordinated entities' } },
  { key: '625', name: { es: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', en: 'Business income through digital platforms' } },
  { key: '626', name: { es: 'Régimen Simplificado de Confianza', en: 'Simplified trust regime (RESICO)' } },
];

export const CFDI_USES: readonly CatalogEntry<CfdiUse>[] = [
  { key: 'G01', name: { es: 'Adquisición de mercancías', en: 'Purchase of goods' } },
  { key: 'G03', name: { es: 'Gastos en general', en: 'General expenses' } },
  { key: 'S01', name: { es: 'Sin efectos fiscales', en: 'No tax effects' } },
];

/**
 * Regímenes con actividad empresarial: pueden deducir (G01/G03). El resto
 * (sueldos, sin obligaciones, dividendos…) solo admite "sin efectos fiscales".
 */
const DEDUCTING = new Set(['601', '603', '606', '612', '620', '621', '622', '623', '624', '625', '626']);
const KNOWN = new Set(TAX_SYSTEMS.map((t) => t.key));

/** Los usos de CFDI que el SAT admite para un régimen; vacío si el régimen no existe. */
export function allowedCfdiUses(taxSystem: string): CfdiUse[] {
  if (!KNOWN.has(taxSystem)) return [];
  return DEDUCTING.has(taxSystem) ? ['G01', 'G03', 'S01'] : ['S01'];
}

/** Como viene en la Constancia de Situación Fiscal: mayúsculas, sin espacios de más. */
export function normalizeFiscalText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

// Mismas expresiones que FiscalProfileDto del backend.
const RFC = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;
const ZIP = /^\d{5}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEGAL_NAME = 254;

/** Persona moral: 3 letras; física: 4. Luego la fecha AAMMDD y la homoclave. */
export function isRfcShape(value: string): boolean {
  return RFC.test(value);
}

export function isZipShape(value: string): boolean {
  return ZIP.test(value);
}

export type FiscalProfileField = keyof FiscalProfile;
export type FiscalProfileErrors = Partial<Record<FiscalProfileField, true>>;

/**
 * Qué campos tienen mala FORMA, normalizando primero (el socio puede escribir
 * en minúsculas). `{}` = se puede mandar. Correo vacío = el de la cuenta.
 */
export function validateFiscalProfile(input: FiscalProfile): FiscalProfileErrors {
  const errors: FiscalProfileErrors = {};
  const legalName = normalizeFiscalText(input.legalName);
  if (!isRfcShape(normalizeFiscalText(input.taxId))) errors.taxId = true;
  if (!legalName || legalName.length > MAX_LEGAL_NAME) errors.legalName = true;
  if (!KNOWN.has(input.taxSystem)) errors.taxSystem = true;
  if (!isZipShape(input.zip.trim())) errors.zip = true;
  if (!allowedCfdiUses(input.taxSystem).includes(input.cfdiUse)) errors.cfdiUse = true;
  const email = input.email?.trim();
  if (email && !EMAIL.test(email)) errors.email = true;
  return errors;
}

/** Lo que se guarda: normalizado igual que el backend, correo vacío como `null`. */
export function normalizeFiscalProfile(input: FiscalProfile): FiscalProfile {
  return {
    taxId: normalizeFiscalText(input.taxId),
    legalName: normalizeFiscalText(input.legalName),
    taxSystem: input.taxSystem,
    zip: input.zip.trim(),
    cfdiUse: input.cfdiUse,
    email: input.email?.trim() || null,
  };
}
