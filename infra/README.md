# infra/ — Terraform de Mucho Loco Gym

Infraestructura AWS del backend (`apps/backend`). El frontend NO vive aquí: `customer-app` se despliega en Vercel (ver "Arquitectura de backend" en el [`CLAUDE.md`](../CLAUDE.md) raíz).

> **Esto cuesta dinero mientras esté arriba.** El entorno está destruido a propósito entre sesiones de trabajo. Antes de `terraform apply`, leer "Nota operativa" en el CLAUDE.md raíz.

## Qué hay

```
envs/dev/          El entorno completo: conecta los 5 módulos. Es donde se corre terraform.
modules/
  network/         VPC, 2 AZ, subredes públicas y privadas, y los security groups.
  database/        Postgres en RDS + su contraseña en Secrets Manager.
  ecr/             Registro de la imagen del backend, con política de retención.
  ecs/             Cluster Fargate + task definition + servicio + ALB.
  cognito/         User Pool, 3 app clients, grupos staff/manager/owner, IdPs sociales.
```

Dependencias entre módulos (Terraform las resuelve solo):

```
network ──► (subredes, security groups) ──► database ──► (secreto DATABASE_URL) ──┐
                                        └────────────────────────────────────────► ecs
ecr     ──► (URL del repositorio) ───────────────────────────────────────────────►
cognito ──► (user pool + 3 client ids) ──────────────────────────────────────────►
```

## Decisiones que cuestan (o ahorran) dinero

| Decisión | Por qué |
|---|---|
| **Sin NAT Gateway** | ~$32 USD/mes por AZ solo por existir — más que todo lo demás junto. Las tareas viven en subredes públicas con IP pública; lo que las protege es su security group (solo el ALB entra), no la falta de IP. La base de datos sí está en privadas. |
| `db.t4g.micro`, single-AZ, `skip_final_snapshot` | Perfil de dev: se tira y se levanta. Antes de producción: `multi_az`, `deletion_protection`, retención real de backups. |
| Fargate 0.25 vCPU / 512 MiB, 1 tarea | El mínimo que acepta Fargate. |
| Retención de logs 7 días, Container Insights apagado | CloudWatch cobra por GB retenido y por Insights aparte. |
| ECR conserva 5 imágenes | La imagen del backend pesa ~934MB (ver `apps/backend/CLAUDE.md`); sin la política de ciclo de vida el costo crece para siempre. |

## Primer despliegue

**1. Antes del apply** — crear las apps OAuth reales y llenar `envs/dev/terraform.tfvars` (copiar de `terraform.tfvars.example`, gitignored). Sin esto el apply funciona igual, pero sin login de Google/Facebook.

**2. Levantar la infraestructura.**

```bash
cd envs/dev
terraform init
terraform plan     # revisar SIEMPRE antes de aplicar
terraform apply
```

El servicio de ECS va a quedar en falla: el repositorio de ECR está vacío y la imagen `:latest` todavía no existe. Es lo esperado.

**3. Construir y subir la imagen.** El build context es la raíz del monorepo (workspace de pnpm), no `apps/backend`:

```bash
cd ../../..                                    # raíz del monorepo
ECR=$(terraform -chdir=infra/envs/dev output -raw ecr_repository_url)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "${ECR%%/*}"
docker build --platform linux/arm64 -f apps/backend/Dockerfile -t "$ECR:latest" .
docker push "$ECR:latest"
```

`--platform linux/arm64` importa: la task definition declara `ARM64` (es lo que construye un Mac con Apple Silicon y sale más barato en Fargate). Una imagen x86 ahí muere con `exec format error`.

**4. Forzar el despliegue y esperar a que el health check pase.**

```bash
aws ecs update-service \
  --cluster "$(terraform -chdir=infra/envs/dev output -raw ecs_cluster_name)" \
  --service "$(terraform -chdir=infra/envs/dev output -raw ecs_service_name)" \
  --force-new-deployment

curl "$(terraform -chdir=infra/envs/dev output -raw api_url)/health"
```

**5. Migrar y sembrar la base.** RDS no es alcanzable desde fuera de la VPC a propósito, así que las migraciones se corren desde dentro — con ECS Exec sobre la tarea que ya está arriba:

```bash
aws ecs execute-command --cluster <cluster> --task <task-id> \
  --container backend --interactive --command "/bin/sh"
# dentro: npx prisma migrate deploy && npx prisma db seed
```

> ECS Exec necesita `enable_execute_command = true` en el servicio y permisos de SSM en el rol de tarea — **todavía no están puestos**. La alternativa mientras tanto es un bastión temporal o abrir RDS a tu IP por un rato. Es el primer pendiente de este módulo.

**6. Apuntar los frontends al API.** `terraform output` da los ids nuevos de Cognito y la URL del backend:

```bash
terraform -chdir=infra/envs/dev output
```

En `apps/customer-app/.env.local`:

```
NEXT_PUBLIC_DATA_SOURCE=http
NEXT_PUBLIC_API_URL=<api_url>
```

Y los `COGNITO_*` de los tres apps con los ids nuevos — el User Pool se recrea con ids distintos cada vez.

## Tirar todo

```bash
cd envs/dev && terraform destroy
```

Borra también el User Pool y con él los 6 usuarios de prueba; recrearlos es el paso 4 de la "Nota operativa" del CLAUDE.md raíz.

## Pendientes conocidos

1. **ECS Exec no está habilitado** — sin él no hay forma limpia de correr migraciones contra RDS (ver paso 5).
2. **State local.** Vive en `envs/dev/terraform.tfstate`, en esta máquina. Migrar a S3 + DynamoDB para el lock antes de que haya recursos que de verdad importe no perder.
3. **Solo HTTP.** El ALB escucha en :80 sin TLS. Necesita un dominio y un certificado de ACM para :443 — sin eso el ID token de Cognito viaja en claro, así que no se puede usar con datos reales.
4. **Sin CI/CD**: los pasos 3 y 4 son manuales.
