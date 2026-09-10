variable "project" {
  description = "Nombre corto del proyecto, usado como prefijo de recursos."
  type        = string
}

variable "environment" {
  description = "Entorno (dev, prod, etc.)."
  type        = string
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
