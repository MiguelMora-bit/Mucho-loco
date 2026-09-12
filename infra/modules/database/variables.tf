variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  description = "Subredes SIN salida a internet — la base no debe ser alcanzable desde fuera."
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security groups que pueden conectarse al puerto de Postgres (el de las tareas de ECS)."
  type        = list(string)
}

variable "instance_class" {
  description = "db.t4g.micro entra en la capa gratuita y alcanza de sobra para dev."
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage_gb" {
  type    = number
  default = 20
}

variable "db_name" {
  type    = string
  default = "mucho_loco"
}

variable "db_username" {
  type    = string
  default = "mucholoco"
}
