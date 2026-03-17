# terraform/gcp-vm.tf
# GCP Compute Engine instance running OpenClaw gateway and Mentra bridge via pm2.

resource "google_compute_instance" "moltworker" {
  name         = "moltworker"
  machine_type = var.gcp_machine_type # e.g., "e2-medium" or "c4a-standard-1"
  zone         = var.gcp_zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12-arm64"
      size  = 20 # GB
      type  = "hyperdisk-balanced"
    }
  }

  network_interface {
    network = "default"
    access_config {
      # Ephemeral public IP (used for SSH access and outbound traffic)
    }
  }

  # Startup script removed — runs on EVERY boot and pegs CPU.
  # Use scripts/setup-vm.sh manually for initial provisioning instead.
  # metadata_startup_script = file("${path.module}/scripts/startup.sh")

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
