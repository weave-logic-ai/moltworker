# terraform/outputs.tf
# Useful values exported after terraform apply.

output "vm_ip" {
  description = "External IP address of the moltworker VM"
  value       = google_compute_instance.moltworker.network_interface[0].access_config[0].nat_ip
}

output "vm_name" {
  description = "Name of the moltworker VM instance"
  value       = google_compute_instance.moltworker.name
}

output "tunnel_id" {
  description = "Cloudflare Tunnel ID"
  value       = cloudflare_zero_trust_tunnel_cloudflared.moltworker.id
}

output "tunnel_cname" {
  description = "Cloudflare Tunnel CNAME target"
  value       = "${cloudflare_zero_trust_tunnel_cloudflared.moltworker.id}.cfargotunnel.com"
}
