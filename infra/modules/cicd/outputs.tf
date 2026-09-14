output "role_arn" {
  description = "Va en el secreto AWS_DEPLOY_ROLE_ARN del repositorio de GitHub."
  value       = aws_iam_role.deploy.arn
}

output "account_id" {
  value = data.aws_caller_identity.current.account_id
}
