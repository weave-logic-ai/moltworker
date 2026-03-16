---
name: Architecture Decision - GCP VM + Cloudflare Tunnel
description: Moving from Cloudflare Containers to GCP VM with Cloudflare Tunnel for Zero Trust auth. Keep Cloudflare Worker for agents/edge functions.
type: project
---

Decision made 2026-03-15: Move core services (OpenClaw, Mentra bridge) to GCP VM with Cloudflare Tunnel.

**Why:** Cloudflare Container lifecycle (DO resets, cold starts, config persistence, WebSocket instability) caused 40+ PRs of workarounds. A persistent VM solves all issues for $5.55-30/mo vs $35-40/mo on Cloudflare.

**How to apply:**
- GCP VM runs OpenClaw + Mentra bridge as persistent processes
- Cloudflare Tunnel connects VM to edge (free)
- CF Zero Trust provides auth (free)
- Keep Cloudflare Workers for edge agents, CDN, DDoS
- DO NOT destroy existing Cloudflare infrastructure — keep as fallback/agents
- Use Terraform for IaC
- Use pm2 for process management
- Evaluate C4A (ARM, good for local inference) vs e2 instances
- Budget target: ~$30/mo for compute
