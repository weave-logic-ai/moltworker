# terraform/cloudflare-tunnel.tf
# Cloudflare Zero Trust Tunnel connecting the GCP VM to the Cloudflare edge.

# --- Tunnel ---

resource "cloudflare_zero_trust_tunnel_cloudflared" "moltworker" {
  account_id = var.cloudflare_account_id
  name       = "moltworker"
  secret     = var.tunnel_secret
}

# Tunnel ingress configuration: routes hostnames to local services on the VM
resource "cloudflare_zero_trust_tunnel_cloudflared_config" "moltworker" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.moltworker.id

  config {
    # OpenClaw gateway
    ingress_rule {
      hostname = "moltworker.${var.domain}"
      service  = "http://localhost:18789"
    }
    # Mentra bridge
    ingress_rule {
      hostname = "mentra.${var.domain}"
      service  = "http://localhost:7010"
    }
    # Catch-all: return 404 for unmatched requests
    ingress_rule {
      service = "http_status:404"
    }
  }
}

# --- DNS ---

# CNAME record pointing moltworker subdomain to the tunnel
resource "cloudflare_record" "moltworker" {
  zone_id = var.cloudflare_zone_id
  name    = "moltworker"
  content = "${cloudflare_zero_trust_tunnel_cloudflared.moltworker.id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true
}
