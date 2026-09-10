module "cognito" {
  source = "../../modules/cognito"

  project     = var.project
  environment = "dev"
}
