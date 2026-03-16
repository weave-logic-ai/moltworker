# terraform/variables.tf
# All input variables for the moltworker infrastructure.

# --- GCP ---

variable "gcp_project_id" {
  description = "GCP project ID"
  type        = string
}

variable "gcp_region" {
  description = "GCP region"
  type        = string
  default     = "us-east1"
}

variable "gcp_zone" {
  description = "GCP zone"
  type        = string
  default     = "us-east1-b"
}

variable "gcp_machine_type" {
  description = "GCP machine type (e.g., e2-medium, c4a-standard-1)"
  type        = string
  default     = "e2-medium"
}

# --- Cloudflare ---

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for domain"
  type        = string
}

variable "domain" {
  description = "Base domain for services (e.g., example.com)"
  type        = string
}

variable "tunnel_secret" {
  description = "Cloudflare Tunnel secret (base64-encoded, 32+ bytes)"
  type        = string
  sensitive   = true
}

# --- Access Control ---

variable "ssh_allowed_ips" {
  description = "IPs allowed to SSH into the VM"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Restrict in production
}

variable "allowed_emails" {
  description = "Emails allowed via Cloudflare Access"
  type        = list(string)
}

# --- Secrets ---

variable "use_secret_manager" {
  description = "Enable GCP Secret Manager for secrets (alternative to .env file)"
  type        = bool
  default     = false
}

# --- Monitoring ---

variable "monitoring_email" {
  description = "Email address for monitoring alert notifications"
  type        = string
  default     = ""
}
