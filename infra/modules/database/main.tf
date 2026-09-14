# ---------------------------------------------------------------------------
# Postgres en RDS.
#
# La contraseña NO se escribe en ningún .tf ni .tfvars: la genera Terraform y
# vive en Secrets Manager. La tarea de ECS la recibe como `secrets` (no como
# `environment`), así que nunca aparece en la definición de la tarea ni en los
# logs de la consola de AWS.
#
# Perfil de dev, no de producción: una sola AZ, sin réplica de lectura, backups
# de un día y `skip_final_snapshot`. Todo eso es para poder correr
# `terraform destroy` sin dejar cosas cobrando ni pedir confirmaciones — ver
# "Nota operativa" en el CLAUDE.md raíz. Antes de producción: multi_az,
# deletion_protection, retención de backups real y quitar skip_final_snapshot.
# ---------------------------------------------------------------------------

locals {
  name = "${var.project}-${var.environment}"
}

resource "aws_db_subnet_group" "this" {
  name       = local.name
  subnet_ids = var.private_subnet_ids

  tags = { Name = local.name }
}

resource "aws_security_group" "db" {
  name        = "${local.name}-db"
  description = "Postgres, alcanzable solo desde las tareas de ECS"
  vpc_id      = var.vpc_id

  tags = { Name = "${local.name}-db" }
}

# Regla aparte y no `ingress` inline: así agregar otro consumidor después no
# reescribe la regla existente (y no corta la conexión de la que ya está).
#
# `count` y no `for_each`: los ids de los security groups no se conocen hasta
# el apply, y for_each necesita conocer sus llaves en el plan. La longitud de
# la lista sí es estática, así que el índice sirve como llave.
resource "aws_vpc_security_group_ingress_rule" "postgres_from_app" {
  count = length(var.allowed_security_group_ids)

  security_group_id            = aws_security_group.db.id
  referenced_security_group_id = var.allowed_security_group_ids[count.index]
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "Postgres desde las tareas de la app"
}

resource "random_password" "db" {
  length = 32
  # RDS rechaza estos en la contraseña maestra.
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_instance" "this" {
  identifier     = local.name
  engine         = "postgres"
  engine_version = "16"
  instance_class = var.instance_class

  allocated_storage = var.allocated_storage_gb
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period = 1
  skip_final_snapshot     = true
  deletion_protection     = false
  apply_immediately       = true

  # Sin esto, AWS puede subir la versión menor sola y cambiar el entorno bajo
  # los pies en medio de una sesión de trabajo.
  auto_minor_version_upgrade = false

  tags = { Name = local.name }
}

# La URL completa, ya armada, es lo que el backend espera en DATABASE_URL —
# guardarla entera evita que la task definition tenga que concatenar cinco
# variables y equivocarse en el formato.
resource "aws_secretsmanager_secret" "db_url" {
  name = "${local.name}/database-url"

  # En dev se destruye y recrea seguido; sin esto AWS retiene el nombre 30 días
  # y el siguiente apply falla con "already scheduled for deletion".
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id = aws_secretsmanager_secret.db_url.id
  secret_string = format(
    "postgresql://%s:%s@%s:%d/%s?schema=public",
    var.db_username,
    urlencode(random_password.db.result),
    aws_db_instance.this.address,
    aws_db_instance.this.port,
    var.db_name,
  )
}
