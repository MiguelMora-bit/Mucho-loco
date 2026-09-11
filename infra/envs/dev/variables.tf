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

variable "domain_prefix" {
  description = "Prefijo del Hosted UI de Cognito. Único a nivel global en AWS — cambiar si ya está tomado."
  type        = string
  default     = "mucho-loco-gym-dev"
}

variable "callback_urls" {
  description = "URLs de redirect tras login social. Agregar el dominio de Vercel cuando exista deploy."
  type        = list(string)
  default     = ["http://localhost:3000/api/auth/social/callback"]
}

variable "logout_urls" {
  description = "URLs de redirect tras logout."
  type        = list(string)
  default     = ["http://localhost:3000/account"]
}

variable "google_client_id" {
  description = "OAuth Client ID de Google. Ver terraform.tfvars.example."
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "OAuth Client Secret de Google."
  type        = string
  default     = ""
  sensitive   = true
}

variable "facebook_app_id" {
  description = "App ID de Meta for Developers. Ver terraform.tfvars.example."
  type        = string
  default     = ""
}

variable "facebook_app_secret" {
  description = "App Secret de Meta for Developers."
  type        = string
  default     = ""
  sensitive   = true
}
