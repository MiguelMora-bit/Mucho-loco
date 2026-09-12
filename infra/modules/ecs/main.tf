# ---------------------------------------------------------------------------
# El backend NestJS corriendo en ECS Fargate detrás de un Application Load
# Balancer — el patrón estándar para un servidor persistente en AWS (no Lambda,
# que es para funciones cortas; ver "Arquitectura de backend" en el CLAUDE.md
# raíz).
#
# Tres piezas y cómo se enganchan:
#   internet → ALB (:80, subredes públicas)
#            → target group (:3000, health check /health)
#            → tareas de Fargate (mismas subredes, IP pública, SG que solo
#              acepta tráfico del SG del ALB)
# ---------------------------------------------------------------------------

locals {
  name = "${var.project}-${var.environment}"
}

# --- Balanceador -----------------------------------------------------------

resource "aws_lb" "this" {
  name               = local.name
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  # En dev conviene poder destruir sin pasos manuales.
  enable_deletion_protection = false

  tags = { Name = local.name }
}

resource "aws_lb_target_group" "app" {
  name        = local.name
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip" # Fargate registra IPs, no instancias.

  health_check {
    path                = "/health"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  # Sin sesión pegajosa: el backend es stateless (la sesión vive en el JWT).
  deregistration_delay = 30
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# --- IAM -------------------------------------------------------------------

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# El rol de EJECUCIÓN es de la infraestructura de ECS (jalar la imagen,
# escribir logs, resolver secretos ANTES de arrancar el contenedor). Distinto
# del rol de TAREA, que es lo que el código de la app puede hacer una vez
# corriendo — hoy nada, y por eso está vacío.
resource "aws_iam_role" "execution" {
  name               = "${local.name}-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "read_secrets" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [var.database_url_secret_arn]
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "${local.name}-read-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.read_secrets.json
}

# El rol de TAREA es lo que puede hacer el código ya corriendo. La app en sí no
# llama a ningún servicio de AWS (Cognito se verifica contra un JWKS público,
# que es HTTP normal), así que lo único que lleva es el canal de ECS Exec.
resource "aws_iam_role" "task" {
  name               = "${local.name}-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

# ECS Exec ("entrar" a la tarea) es la única forma limpia de correr
# `prisma migrate deploy` contra RDS: la base no es alcanzable desde fuera de
# la VPC a propósito, así que las migraciones se corren desde dentro. La
# alternativa sería abrir RDS a internet o levantar un bastión — las dos peores.
data "aws_iam_policy_document" "ecs_exec" {
  statement {
    actions = [
      "ssmmessages:CreateControlChannel",
      "ssmmessages:CreateDataChannel",
      "ssmmessages:OpenControlChannel",
      "ssmmessages:OpenDataChannel",
    ]
    resources = ["*"] # El canal de SSM no se puede acotar por recurso.
  }
}

resource "aws_iam_role_policy" "task_exec" {
  name   = "${local.name}-ecs-exec"
  role   = aws_iam_role.task.id
  policy = data.aws_iam_policy_document.ecs_exec.json
}

# --- Cluster, tarea y servicio ---------------------------------------------

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.name}"
  retention_in_days = var.log_retention_days
}

resource "aws_ecs_cluster" "this" {
  name = local.name

  setting {
    name  = "containerInsights"
    value = "disabled" # Cobra aparte; en dev no se está midiendo nada.
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = local.name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    # La imagen se construye en un Mac ARM; sin esto Fargate asume X86_64 y la
    # tarea muere con "exec format error".
    cpu_architecture = "ARM64"
  }

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = var.image
      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        },
      ]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = tostring(var.container_port) },
        # La operación de sucursal depende de qué día es "hoy" en CDMX — ver
        # el Dockerfile del backend y su CLAUDE.md, sección "Zona horaria".
        { name = "TZ", value = "America/Mexico_City" },
        { name = "COGNITO_REGION", value = var.cognito_region },
        { name = "COGNITO_USER_POOL_ID", value = var.cognito_user_pool_id },
        { name = "COGNITO_CLIENT_IDS", value = var.cognito_client_ids },
        { name = "CORS_ORIGINS", value = var.cors_origins },
      ]

      # `secrets`, no `environment`: así la contraseña de la base no aparece en
      # la task definition ni en la consola de AWS.
      secrets = [
        { name = "DATABASE_URL", valueFrom = var.database_url_secret_arn },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "backend"
        }
      }
    },
  ])
}

data "aws_region" "current" {}

resource "aws_ecs_service" "app" {
  name            = local.name
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  # Ver el comentario del rol de tarea: es como se corren las migraciones.
  enable_execute_command = var.enable_execute_command

  network_configuration {
    subnets = var.public_subnet_ids
    # Sin NAT, la tarea necesita IP pública para jalar la imagen de ECR. El SG
    # es lo que la protege, no la falta de IP.
    assign_public_ip = true
    security_groups  = [var.app_security_group_id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "backend"
    container_port   = var.container_port
  }

  # Con una sola tarea, el deploy tiene que poder bajar la vieja antes de
  # levantar la nueva; el default (100% mínimo) se quedaría atorado esperando.
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 200

  # Da tiempo a que Nest arranque y conecte Prisma antes de que el ALB empiece
  # a contar fallas de health check.
  health_check_grace_period_seconds = 60

  depends_on = [aws_lb_listener.http]

  lifecycle {
    # El CI actualiza la imagen con `aws ecs update-service`, así que la
    # revisión viva puede ser más nueva que la que conoce este state — sin
    # esto, el siguiente `terraform apply` haría rollback del deploy.
    ignore_changes = [task_definition]
  }
}
