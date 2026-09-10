variable "aws_region" {
  description = "Región AWS para los recursos de dev."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Nombre corto del proyecto, usado como prefijo de recursos."
  type        = string
  default     = "mucho-loco"
}
