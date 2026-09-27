-- Spec 055: quién capturó la salida de un turno que el empleado olvidó cerrar.
-- AlterTable
ALTER TABLE "attendance_entries" ADD COLUMN     "correctedAt" TIMESTAMP(3),
ADD COLUMN     "correctedBy" TEXT;
