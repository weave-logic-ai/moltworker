# terraform/gcp-firewall.tf
# Firewall rules for the moltworker VM.
#
# Note: Cloudflare Tunnel connects outbound from the VM, so no inbound HTTP
# rules are needed. Only SSH is opened for debugging/deployment.

resource "google_compute_firewall" "ssh" {
  name    = "moltworker-ssh"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  # Restrict to known IPs in production (default allows all for initial setup)
  source_ranges = var.ssh_allowed_ips
  target_tags   = ["moltworker"]
}
