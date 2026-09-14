variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "github_repository" {
  description = "owner/repo — solo este repositorio puede asumir el rol."
  type        = string
}

variable "allowed_branches" {
  description = <<-EOT
    Ramas desde las que se puede desplegar. Es la mitad importante de la
    condición de confianza: sin esto, un pull request de cualquiera podría
    asumir el rol y desplegar.
  EOT
  type        = list(string)
  default     = ["main"]
}

variable "ecr_repository_arn" {
  type = string
}

variable "ecs_cluster_arn" {
  type = string
}

variable "ecs_service_arn" {
  type = string
}

variable "task_role_arns" {
  description = "Roles que la task definition usa — el pipeline necesita poder pasárselos a ECS."
  type        = list(string)
}
