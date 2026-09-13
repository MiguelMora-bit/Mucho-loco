resource "aws_cognito_user_pool" "this" {
  name = "${var.project}-${var.environment}"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
  }

  mfa_configuration = "OFF"

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # false = self-signup abierto (clientes). Staff/gerente/dueño se siguen creando
  # vía AdminCreateUser sin importar este flag — solo bloquea el registro público.
  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  # INACTIVE a propósito: prioridad es poder tirar/levantar el pool rápido en dev.
  # Pasar a ACTIVE antes de manejar usuarios reales en producción.
  deletion_protection = "INACTIVE"
}

resource "aws_cognito_user_pool_domain" "this" {
  domain       = var.domain_prefix
  user_pool_id = aws_cognito_user_pool.this.id
}

# Los IdPs solo se crean si hay credenciales (default "" hasta dar de alta las
# apps en Google Cloud Console / Meta for Developers — ver terraform.tfvars.example).
resource "aws_cognito_identity_provider" "google" {
  count = var.google_client_id != "" ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.this.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "openid email profile"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
    name     = "name"
  }
}

resource "aws_cognito_identity_provider" "facebook" {
  count = var.facebook_app_id != "" ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.this.id
  provider_name = "Facebook"
  provider_type = "Facebook"

  provider_details = {
    client_id        = var.facebook_app_id
    client_secret    = var.facebook_app_secret
    authorize_scopes = "public_profile,email"
  }

  attribute_mapping = {
    email    = "email"
    username = "id"
    name     = "name"
  }
}

resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.project}-${var.environment}-web"
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = false # cliente público (SPA/Next.js), no puede guardar secreto

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  prevent_user_existence_errors = "ENABLED"

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Hosted UI solo se usa para login social (redirect a Google/Facebook con
  # identity_provider=<nombre>, salta el picker). Login normal por
  # email/password sigue yendo directo por InitiateAuth arriba, no toca esto.
  supported_identity_providers = concat(
    ["COGNITO"],
    length(aws_cognito_identity_provider.google) > 0 ? [aws_cognito_identity_provider.google[0].provider_name] : [],
    length(aws_cognito_identity_provider.facebook) > 0 ? [aws_cognito_identity_provider.facebook[0].provider_name] : [],
  )

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  callback_urls                        = var.callback_urls
  logout_urls                          = var.logout_urls
}

# App nativo del socio (apps/mobile-app, Expo). Mismo tipo que `web`: cliente
# público, sin secreto — un binario instalado en un teléfono no puede guardar
# uno. Cliente aparte y no reusar `web`: sus callbacks son otros
# (mucholoco://…) y así el backend puede distinguir de dónde viene cada token
# (`aud`).
resource "aws_cognito_user_pool_client" "mobile" {
  name         = "${var.project}-${var.environment}-mobile"
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  prevent_user_existence_errors = "ENABLED"

  # Cerrar sesión en el teléfono = RevokeToken del refresh token, que mata
  # también los ID/access tokens emitidos con él. Es el default del provider;
  # explícito porque el app depende de esto.
  enable_token_revocation = true

  # Sin rotación de refresh token, a propósito: con rotación Cognito rechaza
  # REFRESH_TOKEN_AUTH y hay que refrescar con GetTokensFromRefreshToken. El
  # refresh token vive en el llavero del SO (Keychain/Keystore), no en
  # localStorage. Rotación = endurecimiento futuro, ver CLAUDE.md del app.

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Login social: Hosted UI + authorization code + PKCE, igual que `web`,
  # pero regresando al app por deep link en vez de a una ruta de Next.
  supported_identity_providers = concat(
    ["COGNITO"],
    length(aws_cognito_identity_provider.google) > 0 ? [aws_cognito_identity_provider.google[0].provider_name] : [],
    length(aws_cognito_identity_provider.facebook) > 0 ? [aws_cognito_identity_provider.facebook[0].provider_name] : [],
  )

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  callback_urls                        = var.mobile_callback_urls
  logout_urls                          = var.mobile_logout_urls
}

resource "aws_cognito_user_pool_client" "owner_panel" {
  name         = "${var.project}-${var.environment}-owner-panel"
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = false # SPA pura (Vite), sin servidor — no puede guardar secreto

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  prevent_user_existence_errors = "ENABLED"

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}

resource "aws_cognito_user_pool_client" "branch_app" {
  name         = "${var.project}-${var.environment}-branch-app"
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = false # SPA pura (Vite), sin servidor — no puede guardar secreto

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  prevent_user_existence_errors = "ENABLED"

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}

resource "aws_cognito_user_group" "staff" {
  for_each = var.staff_groups

  name         = each.key
  user_pool_id = aws_cognito_user_pool.this.id
  description  = each.value.description
  precedence   = each.value.precedence
}
