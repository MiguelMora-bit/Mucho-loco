output "repository_url" {
  description = "Destino del docker push. Ver el README de infra/ para el flujo completo."
  value       = aws_ecr_repository.backend.repository_url
}

output "repository_arn" {
  value = aws_ecr_repository.backend.arn
}

output "repository_name" {
  value = aws_ecr_repository.backend.name
}
