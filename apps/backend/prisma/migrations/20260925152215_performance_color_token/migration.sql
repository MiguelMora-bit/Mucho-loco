-- Spec 010: el color de una cifra de rendimiento es un nombre de la paleta,
-- no CSS. Convierte `var(--x)` a `x` y los dos hex históricos del seed.
UPDATE "performance_stats"
SET "color" = CASE
  WHEN "color" ~ '^var\(--[a-z-]+\)$' THEN regexp_replace("color", '^var\(--([a-z-]+)\)$', '\1')
  WHEN lower("color") = '#6dd56d' THEN 'green'
  WHEN lower("color") = '#ffe066' THEN 'gold'
  ELSE "color"
END;
