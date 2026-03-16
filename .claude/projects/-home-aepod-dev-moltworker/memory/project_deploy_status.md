---
name: Deployment Status
description: Moltworker deployed to Cloudflare at moltbot-sandbox.aepod23.workers.dev. All 14 GH secrets configured. Mentra app registered.
type: project
---

As of 2026-03-14, moltworker is deployed and live.

**URL:** `https://moltbot-sandbox.aepod23.workers.dev`
**Worker subdomain:** `aepod23` (not `aebots`)
**CF Access team domain:** `aebots.cloudflareaccess.com`

**How to apply:** All 14 GitHub Actions secrets are configured. PR #4 pending merge for US East Coast placement hint. Security fixes G8, G9, G12, G17 are deployed. Full plan in `docs/gap-analysis-and-plan.md`.

**Remaining post-deploy tasks:**
- Merge PR #4 (US East Coast placement)
- Set up cron health checks
- Add memory watchdog to start-openclaw.sh
- Set up upstream sync workflow
