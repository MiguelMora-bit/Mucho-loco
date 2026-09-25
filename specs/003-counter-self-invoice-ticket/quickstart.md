# Quickstart: ticket con clave de autofactura

```bash
pnpm --filter @mucho-loco/backend test -- tickets
pnpm --filter @mucho-loco/backend test:e2e -- tickets
pnpm --filter branch-app test
pnpm --filter branch-app exec tsc -b
pnpm --filter branch-app lint
pnpm --filter branch-app build
```

A mano (requiere User Pool vivo para iniciar sesión en branch-app):
1. `/counter` → vender → ticket con "clave en proceso" → a los segundos, clave + QR.
2. "Imprimir" → vista de impresión solo con el ticket, angosto.
3. Alta y renovación de membresía → mismo ticket.
4. `/cash-register` → "Ver ticket" en una venta del turno.
