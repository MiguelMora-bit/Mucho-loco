-- Spec 016: el heatmap de Rendimiento sale de las visitas reales del socio
-- (tabla "visits", spec 012). La cuadrícula sembrada, igual para todos, se va.

-- DropTable
DROP TABLE "heatmap_cells";

-- DropEnum
DROP TYPE "HeatmapLevel";
