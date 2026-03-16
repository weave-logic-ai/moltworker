# terraform/gcp-vm.tf
# GCP Compute Engine instance running OpenClaw gateway and Mentra bridge via pm2.

resource "google_compute_instance" "moltworker" {
  name         = "moltworker"
  machine_type = var.gcp_machine_type # e.g., "e2-medium" or "c4a-standard-1"
  zone         = var.gcp_zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 20 # GB
      type  = "pd-ssd"
    }
  }

  network_interface {
    network = "default"
    access_config {
      # Ephemeral public IP (used for SSH access and outbound traffic)
    }
  }

  # VM startup script installs Node.js, pm2, openclaw, cloudflared
  metadata_startup_script = file("${path.module}/scripts/startup.sh")

  tags = ["moltworker", "http-server"]

  service_account {
    scopes = ["cloud-platform"]
  }

  labels = {
    app         = "moltworker"
    environment = "production"
    managed_by  = "terraform"
  }

  # Allow Terraform to stop the VM for updates (e.g., machine type change)
  allow_stopping_for_update = true
}
