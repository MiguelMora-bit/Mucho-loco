variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "keep_last_images" {
  description = "Cuántas imágenes conservar. ECR cobra por GB almacenado y la imagen del backend pesa ~934MB."
  type        = number
  default     = 5
}
