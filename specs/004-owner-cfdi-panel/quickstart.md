# Quickstart: facturas en owner-panel

```bash
pnpm --filter @mucho-loco/backend test -- fiscal-mapping
pnpm --filter @mucho-loco/backend test:e2e -- invoicing
pnpm --filter owner-panel test
pnpm --filter owner-panel exec tsc -b && pnpm --filter owner-panel lint && pnpm --filter owner-panel build
```
A mano (User Pool vivo): Facturas → mes → buscar folio → PDF → cancelar con 02 → exportar CSV y abrirlo en Excel.
