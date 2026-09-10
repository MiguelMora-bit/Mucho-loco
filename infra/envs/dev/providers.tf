terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # State local a propósito por ahora — prioridad es levantar/tirar rápido
  # mientras se experimenta. Migrar a backend S3 + DynamoDB lock (ver
  # CLAUDE.md raíz) antes de que haya recursos reales que proteger.
}

provider "aws" {
  region = var.aws_region
}
