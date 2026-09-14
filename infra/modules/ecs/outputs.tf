output "alb_dns_name" {
  description = "URL pública del API. http://<esto>/health debe responder 200."
  value       = aws_lb.this.dns_name
}

output "cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "service_name" {
  value = aws_ecs_service.app.name
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.app.name
}

output "cluster_arn" {
  value = aws_ecs_cluster.this.arn
}

output "service_arn" {
  value = aws_ecs_service.app.id
}

output "task_role_arns" {
  description = "El pipeline necesita iam:PassRole sobre estos para registrar una task definition nueva."
  value       = [aws_iam_role.execution.arn, aws_iam_role.task.arn]
}
