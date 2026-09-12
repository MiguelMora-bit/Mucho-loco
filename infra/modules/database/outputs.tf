output "security_group_id" {
  value = aws_security_group.db.id
}

output "endpoint" {
  value = aws_db_instance.this.address
}

output "database_url_secret_arn" {
  description = "ARN del secreto con la DATABASE_URL completa — lo consume la task definition de ECS."
  value       = aws_secretsmanager_secret.db_url.arn
}

output "db_name" {
  value = aws_db_instance.this.db_name
}
