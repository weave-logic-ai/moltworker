---
name: Cloudflare Logging Rule
description: Never build custom log endpoints for Cloudflare services. Use Log Explorer and wrangler tail instead. Custom log endpoints don't work reliably across containers.
type: feedback
---

Do NOT build custom log endpoints (like /mentra/logs) for Cloudflare Workers/Containers.

**Why:** Container log files are ephemeral, custom Express log endpoints require the container to be running and healthy, and cross-container log access doesn't work. We wasted multiple deploy cycles building /mentra/logs that never worked.

**How to apply:**
- Use **Cloudflare Log Explorer** (dashboard > Workers > Logs) for production debugging
- Use **`wrangler tail --format pretty`** for real-time log streaming
- Use **`console.log()`** in container code — it shows up in Log Explorer automatically
- For containers, use `observability.enabled: true` in wrangler.jsonc (already set)
- Never create custom HTTP log endpoints in containers
- If debugging a specific container, use SSH access (`wrangler_ssh: {enabled: true}`) or the debug CLI endpoint
