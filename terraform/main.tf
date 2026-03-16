# terraform/main.tf
# Provider configuration and remote state backend for moltworker infrastructure.

terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Local state for now. Switch to GCS backend after bucket is created:
  #   backend "gcs" {
  #     bucket = "moltworker-tf-state"
  #     prefix = "terraform/state"
  #   }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
  zone    = var.gcp_zone
}
