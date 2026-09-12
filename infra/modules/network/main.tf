# ---------------------------------------------------------------------------
# Red: una VPC con subredes públicas (ALB + tareas de Fargate) y privadas (RDS).
#
# DECISIÓN DE COSTO, deliberada: NO hay NAT Gateway.
#
# Un NAT cuesta ~$32 USD/mes por AZ solo por existir, encendido o no — más que
# todo lo demás de este entorno junto, y este proyecto se destruye entre
# sesiones justamente para no pagar (ver "Nota operativa" en el CLAUDE.md
# raíz). Sin NAT, una tarea en subred privada no puede jalar su imagen de ECR
# ni hablar con Cognito, así que las tareas viven en las subredes PÚBLICAS con
# IP pública y su security group no acepta nada que no venga del ALB.
#
# En producción esto se hace al revés: tareas en privadas y, o bien un NAT, o
# bien VPC endpoints de ECR/S3/CloudWatch (más baratos que un NAT si es lo
# único que se necesita salir a buscar). La base de datos SÍ está en privadas
# en los dos casos — eso no se negocia.
# ---------------------------------------------------------------------------

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name = "${var.project}-${var.environment}"
  azs  = slice(data.aws_availability_zones.available.names, 0, var.az_count)
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = local.name }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = { Name = local.name }
}

# /24 por subred: 10.0.0.0/24, 10.0.1.0/24 públicas; 10.0.10.0/24, 10.0.11.0/24 privadas.
resource "aws_subnet" "public" {
  count = var.az_count

  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = { Name = "${local.name}-public-${local.azs[count.index]}" }
}

resource "aws_subnet" "private" {
  count = var.az_count

  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = local.azs[count.index]

  tags = { Name = "${local.name}-private-${local.azs[count.index]}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = { Name = "${local.name}-public" }
}

resource "aws_route_table_association" "public" {
  count = var.az_count

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Las privadas se quedan sin ruta a internet a propósito (ver la nota de
# arriba): ahí solo vive RDS, al que se llega desde dentro de la VPC.
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.this.id

  tags = { Name = "${local.name}-private" }
}

resource "aws_route_table_association" "private" {
  count = var.az_count

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ---------------------------------------------------------------------------
# Security groups.
#
# Viven aquí, y no en el módulo de la app, para romper una dependencia
# circular: la base de datos necesita saber QUIÉN puede conectarse (el SG de
# las tareas) y las tareas necesitan el secreto que crea el módulo de la base.
# Si cada módulo creara su propio SG, `database` dependería de `ecs` y `ecs` de
# `database`. La red es la capa correcta para vivir: un security group es una
# frontera de red, no un detalle de la app que corre detrás.
# ---------------------------------------------------------------------------

resource "aws_security_group" "alb" {
  name        = "${local.name}-alb"
  description = "ALB publico del backend"
  vpc_id      = aws_vpc.this.id

  tags = { Name = "${local.name}-alb" }
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  description       = "HTTP publico"
}

resource "aws_vpc_security_group_egress_rule" "alb_all" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_security_group" "app" {
  name        = "${local.name}-app"
  description = "Tareas del backend"
  vpc_id      = aws_vpc.this.id

  tags = { Name = "${local.name}-app" }
}

# Solo el ALB entra. La tarea tiene IP pública (no hay NAT, ver arriba) pero
# eso NO la hace alcanzable: nadie más que el ALB pasa este SG.
resource "aws_vpc_security_group_ingress_rule" "app_from_alb" {
  security_group_id            = aws_security_group.app.id
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = var.app_port
  to_port                      = var.app_port
  ip_protocol                  = "tcp"
  description                  = "Trafico del ALB"
}

# Salida abierta: la tarea jala su imagen de ECR, escribe en CloudWatch, lee
# Secrets Manager y verifica tokens contra el JWKS de Cognito.
resource "aws_vpc_security_group_egress_rule" "app_all" {
  security_group_id = aws_security_group.app.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}
