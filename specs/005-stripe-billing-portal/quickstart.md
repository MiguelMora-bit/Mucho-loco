# Quickstart: portal de Stripe

```bash
pnpm --filter @mucho-loco/backend test && pnpm --filter @mucho-loco/backend test:e2e -- membership-billing
pnpm --filter @mucho-loco/customer-core test
pnpm --filter customer-app test && pnpm --filter customer-app lint
pnpm --filter @mucho-loco/mobile-app test && ./node_modules/.bin/playwright test   # (en apps/mobile-app, servidor caliente)
```
Contra Stripe real: configurar el Customer Portal en el dashboard; contratar mensual con `4242…`; "Administrar suscripción" → cancelar → `customer.subscription.updated` → el panel dice "Cancelaste la renovación…".
