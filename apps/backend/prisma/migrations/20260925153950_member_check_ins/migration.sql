-- Spec 012: la entrada que registra mostrador ES la visita. Una por socio por
-- día de CDMX, garantizado por la base (dos escaneos simultáneos no suman dos).

-- Visitas y racha se derivan de las visitas reales al leer; estas columnas
-- nunca se llenaban (siempre 0 fuera del mock).
ALTER TABLE "memberships" DROP COLUMN "streak",
DROP COLUMN "visits";

-- El día se calcula en hora de CDMX: Prisma guarda UTC en columnas sin zona.
ALTER TABLE "visits" ADD COLUMN "visitDay" DATE;
UPDATE "visits"
SET "visitDay" = (("visitedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Mexico_City')::date;
ALTER TABLE "visits" ALTER COLUMN "visitDay" SET NOT NULL;

-- Sin registro de salida no hay duración.
ALTER TABLE "visits" ALTER COLUMN "durationMinutes" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "visits_userId_visitDay_key" ON "visits"("userId", "visitDay");
