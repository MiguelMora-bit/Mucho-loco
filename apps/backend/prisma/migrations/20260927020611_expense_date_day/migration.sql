-- Spec 054: el gasto es de un día de CDMX, no de un instante.
-- Las filas sembradas guardaban medianoche UTC (una fecha sola): se quedan en
-- su día. Las que creó el backend con `new Date()` eran un instante: pasan al
-- día de CDMX en que ocurrieron (una captura a las 20:00 no es del día siguiente).
-- AlterTable
ALTER TABLE "expenses" ALTER COLUMN "date" SET DATA TYPE DATE USING (
  CASE
    WHEN "date"::time = '00:00:00' THEN "date"::date
    ELSE ("date" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::date
  END
);
