output "user_pool_id" {
  value = module.cognito.user_pool_id
}

output "web_client_id" {
  value = module.cognito.web_client_id
}

output "owner_panel_client_id" {
  value = module.cognito.owner_panel_client_id
}

output "branch_app_client_id" {
  value = module.cognito.branch_app_client_id
}

output "staff_group_names" {
  value = module.cognito.staff_group_names
}

output "cognito_domain" {
  value = "https://${module.cognito.cognito_domain_prefix}.auth.${var.aws_region}.amazoncognito.com"
}
