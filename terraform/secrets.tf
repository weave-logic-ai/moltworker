# terraform/secrets.tf
# Optional GCP Secret Manager resources for moltworker secrets.
#
# This is an OPTIONAL alternative to using a .env file on the VM.
# For simple deployments, /opt/moltworker/.env works fine.
# Secret Manager is useful for:
#   - Audit logging of secret access
#   - Automatic rotation
#   - Shared access across multiple VMs
#
# To enable: set var.use_secret_manager = true in terraform.tfvars

# --- Secret definitions ---
# Each critical secret gets its own Secret Manager resource.
# Values are NOT stored in Terraform — use gcloud CLI or Console to set versions.

locals {
  secret_ids = var.use_secret_manager ? toset([
    "moltworker-openclaw-gateway-token",
    "moltworker-ai-gateway-api-key",
    "moltworker-anthropic-api-key",
    "moltworker-mentra-api-key",
    "moltworker-telegram-bot-token",
    "moltworker-discord-bot-token",
  ]) : toset([])
}

resource "google_secret_manager_secret" "moltworker" {
  for_each  = local.secret_ids
  secret_id = each.value
  project   = var.gcp_project_id

  replication {
    auto {}
  }

  labels = {
    app        = "moltworker"
    managed_by = "terraform"
  }
}

# Placeholder secret versions — replace values via gcloud or Console.
# These use a dummy value so Terraform can create the version resource.
# Update with real values after initial apply:
#   gcloud secrets versions add moltworker-openclaw-gateway-token --data-file=-
resource "google_secret_manager_secret_version" "moltworker" {
  for_each = local.secret_ids
  secret   = google_secret_manager_secret.moltworker[each.value].id

  secret_data = "REPLACE_ME"

  lifecycle {
    # Prevent Terraform from overwriting manually-set secret values
    ignore_changes = [secret_data]
  }
}

# --- IAM: Allow VM service account to access secrets ---

# The VM's default compute service account needs secretAccessor role
resource "google_project_iam_member" "vm_secret_access" {
  count   = var.use_secret_manager ? 1 : 0
  project = var.gcp_project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_compute_instance.moltworker.service_account[0].email}"
}
