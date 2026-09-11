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
