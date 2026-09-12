# ---------------------------------------------------------------------------
# Rol que GitHub Actions asume para desplegar, vía OIDC.
#
# SIN llaves de acceso de larga vida en los secretos del repositorio: GitHub
# emite un token firmado por cada corrida y AWS lo cambia por credenciales
# temporales. Una llave `AKIA...` guardada en un secreto vive para siempre,
# sirve desde cualquier lado y hay que rotarla a mano; esto caduca solo y solo
# funciona desde este repositorio y estas ramas.
# ---------------------------------------------------------------------------

data "aws_caller_identity" "current" {}

# El proveedor OIDC es de la CUENTA, no de este proyecto: si ya existe (otro
# repo lo creó antes), importarlo en vez de duplicarlo —
# `terraform import module.cicd.aws_iam_openid_connect_provider.github <arn>`.
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

  # AWS dejó de validar contra esta huella para los proveedores de GitHub, pero
  # el campo sigue siendo obligatorio.
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # La condición que de verdad importa: `sub` dice qué repo y qué ref pidió
    # el token. Sin acotarla, CUALQUIER repositorio de GitHub podría asumir
    # este rol.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [for b in var.allowed_branches : "repo:${var.github_repository}:ref:refs/heads/${b}"]
    }
  }
}

resource "aws_iam_role" "deploy" {
  name               = "${var.project}-${var.environment}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.assume.json
  description        = "Asumido por GitHub Actions vía OIDC para desplegar el backend"
}

# Permisos acotados a lo que el pipeline hace de verdad: subir una imagen y
# decirle a ECS que se redespliegue. Nada de crear infraestructura — eso lo
# hace Terraform desde una máquina, a propósito.
data "aws_iam_policy_document" "deploy" {
  statement {
    sid       = "EcrAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"] # Esta acción no admite recurso.
  }

  statement {
    sid = "EcrPush"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:CompleteLayerUpload",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
    resources = [var.ecr_repository_arn]
  }

  statement {
    sid = "EcsDeploy"
    actions = [
      "ecs:DescribeServices",
      "ecs:UpdateService",
      "ecs:DescribeTaskDefinition",
      "ecs:RegisterTaskDefinition",
    ]
    resources = ["*"] # DescribeTaskDefinition/RegisterTaskDefinition no admiten recurso.
  }

  # Registrar una revisión nueva de la task definition implica "pasarle" a ECS
  # los roles que esa definición usa; sin esto, ese paso falla.
  statement {
    sid       = "PassTaskRoles"
    actions   = ["iam:PassRole"]
    resources = var.task_role_arns

    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "${var.project}-${var.environment}-github-deploy"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}
