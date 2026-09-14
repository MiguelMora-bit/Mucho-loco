variable "project" {
  description = "Nombre corto del proyecto, usado como prefijo de recursos."
  type        = string
}

variable "environment" {
  description = "dev / staging / prod."
  type        = string
}

variable "vpc_cidr" {
  description = "Rango de la VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = <<-EOT
    Cuántas zonas de disponibilidad usar. Dos es el mínimo que exigen un ALB y
    un subnet group de RDS; más solo agrega costo en dev.
  EOT
  type        = number
  default     = 2
}

variable "app_port" {
  description = "Puerto en el que escucha el backend — el ALB solo puede llegar ahí."
  type        = number
  default     = 3000
}
