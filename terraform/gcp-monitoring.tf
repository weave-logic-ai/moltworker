# terraform/gcp-monitoring.tf
# GCP Cloud Monitoring: uptime checks, notification channels, and alert policies.

# --- Notification channel (email) ---

resource "google_monitoring_notification_channel" "email" {
  display_name = "Moltworker Alerts"
  type         = "email"
  project      = var.gcp_project_id

  labels = {
    email_address = var.monitoring_email
  }
}

# --- Uptime check: moltworker domain ---
# Checks the /v1/models endpoint through the Cloudflare Tunnel.
# This validates the full path: CF edge -> tunnel -> VM -> OpenClaw gateway.

resource "google_monitoring_uptime_check_config" "moltworker" {
  display_name = "moltworker-gateway"
  project      = var.gcp_project_id
  timeout      = "10s"
  period       = "300s" # 5 minutes

  http_check {
    path         = "/v1/models"
    port         = 443
    use_ssl      = true
    validate_ssl = true

    # CF Access will return 302/403 for unauthenticated requests.
    # A non-5xx response means the tunnel and VM are up.
    accepted_response_status_codes {
      status_class = "STATUS_CLASS_2XX"
    }
    accepted_response_status_codes {
      status_class = "STATUS_CLASS_3XX"
    }
    accepted_response_status_codes {
      status_value = 403
    }
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.gcp_project_id
      host       = "moltworker.${var.domain}"
    }
  }
}

# --- Uptime check: mentra bridge (bypass path, no auth) ---

resource "google_monitoring_uptime_check_config" "mentra" {
  display_name = "moltworker-mentra"
  project      = var.gcp_project_id
  timeout      = "10s"
  period       = "300s"

  http_check {
    path         = "/mentra/"
    port         = 443
    use_ssl      = true
    validate_ssl = true

    accepted_response_status_codes {
      status_class = "STATUS_CLASS_2XX"
    }
    # 404/502 = tunnel works but service may be down
    accepted_response_status_codes {
      status_value = 404
    }
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.gcp_project_id
      host       = "moltworker.${var.domain}"
    }
  }
}

# --- Alert policy: notify on uptime failures ---

resource "google_monitoring_alert_policy" "uptime_failure" {
  display_name = "Moltworker Uptime Failure"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "Gateway uptime check failing"
    condition_threshold {
      filter          = "resource.type = \"uptime_url\" AND metric.type = \"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.labels.check_id = \"${google_monitoring_uptime_check_config.moltworker.uptime_check_id}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "300s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.project_id"]
      }

      trigger {
        count = 1
      }
    }
  }

  conditions {
    display_name = "Mentra uptime check failing"
    condition_threshold {
      filter          = "resource.type = \"uptime_url\" AND metric.type = \"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.labels.check_id = \"${google_monitoring_uptime_check_config.mentra.uptime_check_id}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "300s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.project_id"]
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name,
  ]

  alert_strategy {
    auto_close = "1800s" # Auto-close after 30 minutes of recovery
  }
}
