# Terraform Configuration

## Overview

Infrastructure as Code for GCP VM + Cloudflare Tunnel.

## Directory Structure

```
terraform/
├── main.tf              # Provider config, backend
├── variables.tf         # Input variables
├── outputs.tf           # Output values
├── gcp-vm.tf           # GCP compute instance
├── gcp-firewall.tf     # Firewall rules
├── cloudflare-tunnel.tf # Tunnel + DNS + Access
├── terraform.tfvars     # Variable values (gitignored)
└── terraform.tfvars.example
```

## Providers

```hcl
terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # State in GCS bucket
  backend "gcs" {
    bucket = "moltworker-tf-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
  zone    = var.gcp_zone
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
```

## GCP Compute Instance

```hcl
# terraform/gcp-vm.tf

resource "google_compute_instance" "moltworker" {
  name         = "moltworker"
  machine_type = var.gcp_machine_type  # e.g., "e2-medium" or "c4a-standard-1"
  zone         = var.gcp_zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 20  # GB
      type  = "pd-ssd"
    }
  }

  network_interface {
    network = "default"
    access_config {
      # Ephemeral public IP
    }
  }

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

  # Allow Terraform to recreate if needed
  allow_stopping_for_update = true
}
```

## Firewall Rules

```hcl
# terraform/gcp-firewall.tf

# Only allow Cloudflare Tunnel (no direct access needed)
# cloudflared connects outbound, no inbound rules required

# SSH access (optional, for debugging)
resource "google_compute_firewall" "ssh" {
  name    = "moltworker-ssh"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = var.ssh_allowed_ips
  target_tags   = ["moltworker"]
}
```

## Cloudflare Tunnel

```hcl
# terraform/cloudflare-tunnel.tf

resource "cloudflare_zero_trust_tunnel_cloudflared" "moltworker" {
  account_id = var.cloudflare_account_id
  name       = "moltworker"
  secret     = var.tunnel_secret
}

# Route: moltworker domain → VM port 18789 (OpenClaw)
resource "cloudflare_zero_trust_tunnel_cloudflared_config" "moltworker" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.moltworker.id

  config {
    ingress_rule {
      hostname = "moltworker.${var.domain}"
      service  = "http://localhost:18789"
    }
    ingress_rule {
      hostname = "mentra.${var.domain}"
      service  = "http://localhost:7010"
    }
    # Catch-all
    ingress_rule {
      service = "http_status:404"
    }
  }
}

# DNS records pointing to tunnel
resource "cloudflare_record" "moltworker" {
  zone_id = var.cloudflare_zone_id
  name    = "moltworker"
  content = "${cloudflare_zero_trust_tunnel_cloudflared.moltworker.id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true
}

# CF Access application (auth)
resource "cloudflare_zero_trust_access_application" "moltworker" {
  account_id       = var.cloudflare_account_id
  name             = "Moltworker"
  domain           = "moltworker.${var.domain}"
  type             = "self_hosted"
  session_duration = "24h"
}

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

# Bypass policy for /mentra/* (glasses webhook)
resource "cloudflare_zero_trust_access_application" "mentra_webhook" {
  account_id       = var.cloudflare_account_id
  name             = "Mentra Webhook"
  domain           = "moltworker.${var.domain}"
  path             = "/mentra/"
  type             = "self_hosted"
  session_duration = "24h"
}

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
```

## Variables

```hcl
# terraform/variables.tf

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
  description = "Base domain for services"
  type        = string
}

variable "tunnel_secret" {
  description = "Cloudflare Tunnel secret"
  type        = string
  sensitive   = true
}

variable "ssh_allowed_ips" {
  description = "IPs allowed to SSH"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict in production
}

variable "allowed_emails" {
  description = "Emails allowed via CF Access"
  type        = list(string)
}
```

## Startup Script

```bash
#!/bin/bash
# terraform/scripts/startup.sh

set -e

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Install pm2
npm install -g pm2

# Install OpenClaw
npm install -g openclaw@latest

# Install cloudflared
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared focal main' | tee /etc/apt/sources.list.d/cloudflared.list
apt-get update && apt-get install -y cloudflared

# Create app directory
mkdir -p /opt/moltworker
cd /opt/moltworker

# Clone repo (first boot only)
if [ ! -d ".git" ]; then
  git clone https://github.com/weave-logic-ai/moltworker.git .
fi

# Install bridge dependencies
cd /opt/moltworker/skills/mentra-bridge
npm install @mentra/sdk
cd /opt/moltworker

# Setup pm2
pm2 startup systemd

echo "Startup complete. Configure .env and start services with pm2."
```

## Usage

```bash
# Initialize
cd terraform/
terraform init

# Plan
terraform plan -var-file="terraform.tfvars"

# Apply
terraform apply -var-file="terraform.tfvars"

# Destroy (careful!)
terraform destroy -var-file="terraform.tfvars"
```
