# Mucho Loco Gym

Monorepo del sistema completo de "Mucho Loco Gym" — tienda en línea, membresías, app de sucursal y panel del dueño. Proyecto de aprendizaje fullstack (Next.js + AWS), un único desarrollador.

Visión de negocio completa, reglas confirmadas y fases del proyecto: ver [`CLAUDE.md`](CLAUDE.md).

## Estructura

```
apps/
  customer-app/     # Next.js 14 — tienda + app del socio (activo)
  branch-app/       # futuro
  owner-panel/      # futuro
  backend/          # futuro
packages/
  types/            # @mucho-loco/types — tipos de dominio compartidos
```

## Setup

```bash
pnpm install
pnpm dev              # corre dev de todos los apps vía Turborepo
pnpm --filter customer-app dev   # o solo un app
```

Requiere [pnpm](https://pnpm.io).
