# Feature Specification: Infraestructura y despliegue

**Feature Branch**: `049-deploy-infra` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo de la infraestructura en AWS con Terraform, la imagen Docker del backend y el CI/CD (2026-08-30 a 2026-09-12).

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- AWS nativo (no Amplify): NestJS en ECS Fargate detrás de un ALB, Postgres en RDS, imágenes en ECR, Cognito para auth — el stack de un backend de producción típico, como objetivo de aprendizaje.
- Terraform (reemplazó a CDK, 2026-09-09): módulos `network`, `database`, `ecr`, `ecs`, `cognito`, `cicd` en `infra/modules`, un entorno `infra/envs/dev`; prioridad: levantar y destruir rápido.
- Docker multi-stage con el contexto en la raíz del monorepo; entrypoint `dist/src/main.js`; `TZ=America/Mexico_City` (la lógica de "hoy" depende de CDMX).
- CI (`test.yml`): typecheck + lint, unit, e2e del backend contra Postgres real, contrato customer-app ↔ backend y build. Deploy (`deploy.yml`): manual, construye, sube a ECR y redespliega ECS vía OIDC (sin llaves de larga vida).
- El frontend web va a Vercel, no a AWS.
- `terraform apply` solo con OK explícito del dueño (cuesta dinero); la infra se levantó para demos y se destruyó (última vez 2026-09-26, solo Cognito).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Levantar y destruir el entorno (Priority: P1)

Un `terraform apply` crea todo el entorno de dev y un `destroy` lo borra sin dejar recursos.

**Independent Test**: `terraform plan` limpio (51 recursos); demo completa el 2026-09-18 (backend en Fargate, migrado y sembrado, login real) y destrucción verificada (state vacío, 0 User Pools).

**Acceptance Scenarios**:

1. **Given** la cuenta vacía, **When** se aplica `infra/envs/dev`, **Then** quedan VPC, RDS, ECR, ECS + ALB y Cognito con sus 4 app clients.
2. **Given** el entorno arriba, **When** se destruye, **Then** state vacío y ningún recurso en la cuenta.

### User Story 2 - Probar y desplegar (Priority: P2)

Cada push corre las pruebas; el despliegue construye y publica la imagen.

**Independent Test**: `.github/workflows/test.yml` y `deploy.yml`; imagen construida y corriendo localmente contra Postgres (2026-09-12).

**Acceptance Scenarios**:

1. **Given** un push, **When** corre el CI, **Then** pasan typecheck, lint, unit, e2e del backend, contrato y build.
2. **Given** un deploy manual, **When** corre, **Then** la imagen sube a ECR y ECS la despliega.

### Edge Cases

- `npx prisma db seed` fallaba en silencio dentro del contenedor: se usa `tsx prisma/seed.ts` directo (2026-09-18).
- Build desde una Mac ARM: `--platform linux/arm64` para Fargate.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La infraestructura MUST definirse completa en Terraform y poder destruirse sin residuos.
- **FR-002**: La imagen del backend MUST construirse desde la raíz del monorepo y correr en hora de CDMX.
- **FR-003**: El CI MUST correr pruebas contra un Postgres real.
- **FR-004**: El deploy MUST autenticarse a AWS por OIDC, sin llaves guardadas.
- **FR-005**: Ningún secreto MUST vivir en el repo (tfvars y .env fuera de git).

## Success Criteria *(mandatory)*

- **SC-001**: Entorno completo arriba o abajo con un comando.

## Assumptions

- Cuenta de AWS del dueño; costos solo mientras el entorno está arriba.

## Fuera de alcance / pendiente conocido

- Reducir la imagen (~934 MB) con `pnpm deploy`/`prune --prod` (no hay Docker en la máquina actual).
- Backend remoto del state (S3 + DynamoDB) cuando haya recursos permanentes.
- Correr el walkthrough del móvil en CI.
- Sacar los crons del proceso al escalar a varias tareas.
