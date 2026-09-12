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

output "api_url" {
  description = "URL pública del backend. GET <esto>/health debe dar 200 cuando la tarea esté sana."
  value       = "http://${module.ecs.alb_dns_name}"
}

output "ecr_repository_url" {
  description = "Destino del docker push — ver infra/README.md."
  value       = module.ecr.repository_url
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "ecs_service_name" {
  value = module.ecs.service_name
}

output "ecs_log_group" {
  description = "aws logs tail <esto> --follow"
  value       = module.ecs.log_group_name
}

output "database_endpoint" {
  description = "Host de RDS. No es alcanzable desde fuera de la VPC a propósito."
  value       = module.database.endpoint
}

output "database_url_secret_arn" {
  description = "Secreto con la DATABASE_URL completa (usuario y contraseña incluidos)."
  value       = module.database.database_url_secret_arn
}
