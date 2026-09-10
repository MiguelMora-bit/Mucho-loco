output "user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "user_pool_arn" {
  value = aws_cognito_user_pool.this.arn
}

output "web_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "owner_panel_client_id" {
  value = aws_cognito_user_pool_client.owner_panel.id
}

output "staff_group_names" {
  value = [for g in aws_cognito_user_group.staff : g.name]
}
