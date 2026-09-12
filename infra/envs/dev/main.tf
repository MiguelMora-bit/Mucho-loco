# ---------------------------------------------------------------------------
# Entorno dev completo: red, base de datos, registro de imágenes, el backend
# corriendo en Fargate detrás de un ALB, y el User Pool de Cognito que ya
# existía.
#
# ORDEN DE DEPENDENCIAS (Terraform lo resuelve solo, pero conviene tenerlo en
# la cabeza al leer):
#   network → (SGs, subredes) → database → (secreto con la DATABASE_URL) → ecs
#   ecr     → (URL del repo)                                             → ecs
#   cognito → (pool + 3 clients)                                         → ecs
#
# ANTES DE `terraform apply`, leer la "Nota operativa" del CLAUDE.md raíz:
# esto CUESTA DINERO mientras esté arriba y hay pasos manuales previos (las
# apps OAuth de Google/Facebook). El flujo completo está en infra/README.md.
# ---------------------------------------------------------------------------

module "cognito" {
  source = "../../modules/cognito"

  project     = var.project
  environment = "dev"

  domain_prefix = var.domain_prefix
  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  google_client_id     = var.google_client_id
  google_client_secret = var.google_client_secret
  facebook_app_id      = var.facebook_app_id
  facebook_app_secret  = var.facebook_app_secret
}

module "network" {
  source = "../../modules/network"

  project     = var.project
  environment = "dev"
  app_port    = var.container_port
}

module "ecr" {
  source = "../../modules/ecr"

  project     = var.project
  environment = "dev"
}

module "database" {
  source = "../../modules/database"

  project                    = var.project
  environment                = "dev"
  vpc_id                     = module.network.vpc_id
  private_subnet_ids         = module.network.private_subnet_ids
  allowed_security_group_ids = [module.network.app_security_group_id]
}

module "ecs" {
  source = "../../modules/ecs"

  project     = var.project
  environment = "dev"

  vpc_id                = module.network.vpc_id
  public_subnet_ids     = module.network.public_subnet_ids
  alb_security_group_id = module.network.alb_security_group_id
  app_security_group_id = module.network.app_security_group_id

  # En el PRIMER apply el repositorio está vacío y esta imagen no existe
  # todavía: la tarea va a reintentar y fallar hasta el primer `docker push`.
  # Es lo esperado — ver infra/README.md, "Primer despliegue".
  image          = "${module.ecr.repository_url}:${var.image_tag}"
  container_port = var.container_port

  database_url_secret_arn = module.database.database_url_secret_arn

  cognito_region       = var.aws_region
  cognito_user_pool_id = module.cognito.user_pool_id
  cognito_client_ids = join(",", [
    module.cognito.web_client_id,
    module.cognito.owner_panel_client_id,
    module.cognito.branch_app_client_id,
  ])
  cors_origins = join(",", var.cors_origins)
}
