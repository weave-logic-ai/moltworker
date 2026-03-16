# terraform/cloudflare-access.tf
# Cloudflare Zero Trust Access policies for moltworker services.

# --- Main application: moltworker admin (authenticated) ---

resource "cloudflare_zero_trust_access_application" "moltworker" {
  account_id       = var.cloudflare_account_id
  name             = "Moltworker"
  domain           = "moltworker.${var.domain}"
  type             = "self_hosted"
  session_duration = "24h"
}

# Allow only specified email addresses (owner access)
resource "cloudflare_zero_trust_access_policy" "allow_owner" {
  account_id     = var.cloudflare_account_id
  application_id = cloudflare_zero_trust_access_application.moltworker.id
  name           = "Allow owner"
  decision       = "allow"
  precedence     = 1

  include {
    email = var.allowed_emails
  }
}

# --- Mentra webhook: bypass authentication for /mentra/* ---

resource "cloudflare_zero_trust_access_application" "mentra_webhook" {
  account_id       = var.cloudflare_account_id
  name             = "Mentra Webhook"
  domain           = "moltworker.${var.domain}"
  path             = "/mentra/"
  type             = "self_hosted"
  session_duration = "24h"
}

# Bypass policy: allow anyone to hit the /mentra/* webhook path
resource "cloudflare_zero_trust_access_policy" "mentra_bypass" {
  account_id     = var.cloudflare_account_id
  application_id = cloudflare_zero_trust_access_application.mentra_webhook.id
  name           = "Mentra bypass"
  decision       = "bypass"
  precedence     = 1

  include {
    everyone = true
  }
}
