/**
 * Simula el lector de huella físico (mock-first, mismo criterio que el resto
 * del proyecto — ver CLAUDE.md raíz, "Métodos de acceso"): el hardware ya
 * está instalado en sucursal, pero todavía no se conoce el SDK/driver con el
 * que le habla el navegador (WebUSB, agente local, etc.). Esta es la costura
 * a reemplazar cuando se tenga ese detalle — mismo patrón "Swap this line..."
 * que ya usan los repositories de este app.
 *
 * A diferencia de validar acceso (donde SÍ importa que dos lecturas del mismo
 * dedo produzcan el mismo id — por eso /qr usa ids fijos de demo), aquí se
 * está enrolando a alguien nuevo: cualquier id sin colisión sirve.
 */
export async function captureFingerprint(): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 900)); // tiempo simulado de lectura del sensor
  return `FP-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}
