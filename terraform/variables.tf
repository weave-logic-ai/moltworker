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
  default     = "c4a-standard-1"
}

# --- Networking ---

variable "domain" {
  description = "Base domain for services (e.g., aebots.org)"
  type        = string
  default     = "aebots.org"
}

variable "ssh_allowed_ips" {
  description = "IPs allowed to SSH into the VM"
  type        = list(string)
  default     = ["107.209.9.134/32"]
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
  default     = "mathew@weavelogic.ai"
}
