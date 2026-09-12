variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "alb_security_group_id" {
  description = "Creado en el módulo network para romper el ciclo database ↔ ecs — ver la nota ahí."
  type        = string
}

variable "app_security_group_id" {
  type = string
}

variable "public_subnet_ids" {
  description = "Donde viven el ALB y las tareas. Ver la nota de costo (sin NAT) en el módulo network."
  type        = list(string)
}

variable "image" {
  description = <<-EOT
    Imagen a correr, con tag. En el primer apply el repositorio de ECR está
    vacío, así que la tarea no va a poder arrancar hasta el primer
    `docker push` — es esperado, ver el README de infra/.
  EOT
  type        = string
}

variable "container_port" {
  description = "El backend escucha aquí (PORT en su .env)."
  type        = number
  default     = 3000
}

variable "desired_count" {
  description = "Una sola tarea en dev. El ALB igual exige dos AZ, pero no dos tareas."
  type        = number
  default     = 1
}

variable "cpu" {
  description = "256 = 0.25 vCPU, el mínimo de Fargate."
  type        = string
  default     = "256"
}

variable "memory" {
  description = "512 MiB, el mínimo que acepta Fargate con cpu=256."
  type        = string
  default     = "512"
}

variable "database_url_secret_arn" {
  description = "Secreto con la DATABASE_URL — se inyecta como `secrets`, nunca como `environment`."
  type        = string
}

variable "cognito_region" {
  type = string
}

variable "cognito_user_pool_id" {
  type = string
}

variable "cognito_client_ids" {
  description = "Los 3 app clients (web/owner_panel/branch_app), coma-separados — el backend acepta el ID token de cualquiera."
  type        = string
}

variable "cors_origins" {
  description = "Orígenes que pueden llamar al API (Vercel y los dev servers locales)."
  type        = string
}

variable "log_retention_days" {
  description = "7 días en dev: CloudWatch cobra por GB retenido y aquí nadie va a auditar logs viejos."
  type        = number
  default     = 7
}
