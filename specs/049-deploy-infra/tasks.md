---

description: "Trazabilidad de Infraestructura y despliegue"
---

# Tasks: Infraestructura y despliegue

Spec retroactivo: cada tarea es un requisito ya implementado y lo que lo verifica. Una tarea abierta es un hueco real de verificación.

- [X] FR-001 · `terraform plan` limpio y ciclos apply/destroy verificados (2026-09-12, 2026-09-18, 2026-09-26).
- [X] FR-002 · imagen construida y corriendo contra Postgres (2026-09-12) y en Fargate (2026-09-18).
- [X] FR-003 · `.github/workflows/test.yml` (job de e2e con Postgres).
- [X] FR-004 · `.github/workflows/deploy.yml` + módulo `cicd` (rol OIDC).
- [X] FR-005 · `terraform.tfvars` y `.env*` en `.gitignore`.
- [ ] Reducir la imagen del backend (requiere Docker).
