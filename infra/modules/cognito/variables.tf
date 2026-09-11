variable "project" {
  description = "Nombre corto del proyecto, usado como prefijo de recursos."
  type        = string
}

variable "environment" {
  description = "Entorno (dev, prod, etc.)."
  type        = string
}

variable "domain_prefix" {
  description = "Prefijo del dominio Hosted UI de Cognito (<prefix>.auth.<region>.amazoncognito.com). Único a nivel global en AWS — si terraform apply falla por conflicto, cambiar este valor."
  type        = string
}

variable "callback_urls" {
  description = "URLs permitidas de redirect tras login (incluye login social vía Hosted UI)."
  type        = list(string)
}

variable "logout_urls" {
  description = "URLs permitidas de redirect tras logout vía Hosted UI."
  type        = list(string)
}

variable "google_client_id" {
  description = "OAuth Client ID de Google Cloud Console. Vacío = el IdP de Google no se crea."
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "OAuth Client Secret de Google Cloud Console."
  type        = string
  default     = ""
  sensitive   = true
}

variable "facebook_app_id" {
  description = "App ID de Meta for Developers. Vacío = el IdP de Facebook no se crea."
  type        = string
  default     = ""
}

variable "facebook_app_secret" {
  description = "App Secret de Meta for Developers."
  type        = string
  default     = ""
  sensitive   = true
}

variable "staff_groups" {
  description = "Grupos de Cognito para roles internos (staff/gerente/dueño). Los clientes NO tienen grupo — su ausencia de grupo staff/manager/owner IMPLICA rol customer."
  type = map(object({
    description = string
    precedence  = number
  }))
  default = {
    staff = {
      description = "Mostrador de sucursal: pedidos, cobro, QR."
      precedence  = 30
    }
    manager = {
      description = "Gerente de sucursal: caja, reportes, inventario local."
      precedence  = 20
    }
    owner = {
      description = "Dueño / HQ: acceso a todas las sucursales."
      precedence  = 10
    }
  }
}
