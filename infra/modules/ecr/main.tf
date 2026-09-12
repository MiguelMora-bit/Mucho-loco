# ---------------------------------------------------------------------------
# Registro de imágenes del backend.
#
# `force_delete` para que `terraform destroy` no falle por tener imágenes
# dentro — mismo criterio que el resto de este entorno de dev: se tira y se
# vuelve a levantar. En producción esto va en false.
# ---------------------------------------------------------------------------

resource "aws_ecr_repository" "backend" {
  name                 = "${var.project}-${var.environment}-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "${var.project}-${var.environment}-backend" }
}

# Sin esto, cada push deja atrás la imagen anterior y el costo de
# almacenamiento crece para siempre sin que nadie lo note.
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Conservar solo las ultimas ${var.keep_last_images} imagenes"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.keep_last_images
        }
        action = { type = "expire" }
      },
    ]
  })
}
