# Infrastructure Architecture

## Overview

Hybrid architecture: GCP VM for persistent services + Cloudflare edge for auth, CDN, and agents.

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Edge (Free)                │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Zero Trust    │  │ Tunnel       │  │ Workers       │  │
│  │ CF Access     │  │ cloudflared  │  │ (agents,      │  │
│  │ (auth)        │  │ (connects    │  │  edge funcs)  │  │
│  │               │  │  GCP to edge)│  │               │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────────┘  │
│         │                  │                             │
│         │    DNS: moltworker.aepod23.workers.dev         │
│         │    or custom domain                            │
└─────────┼──────────────────┼─────────────────────────────┘
          │                  │
          │    Cloudflare Tunnel (encrypted)
          │                  │
┌─────────┼──────────────────┼─────────────────────────────┐
│         ▼                  ▼                              │
│              GCP VM (e2/c4a, ~$30/mo)                    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ pm2 Process Manager                               │    │
│  │                                                    │    │
│  │  ┌─────────────────┐  ┌────────────────────────┐  │    │
│  │  │ OpenClaw Gateway │  │ Mentra Bridge          │  │    │
│  │  │ (port 18789)     │  │ (port 7010)            │  │    │
│  │  │                  │  │                         │  │    │
│  │  │ - AI Chat        │  │ - @mentra/sdk AppServer│  │    │
│  │  │ - WebSocket UI   │  │ - Persistent WS to     │  │    │
│  │  │ - Admin UI       │  │   MentraOS Cloud       │  │    │
│  │  │ - Skills         │  │ - Voice → AI → Audio   │  │    │
│  │  │ - R2 sync        │  │ - Camera → Vision      │  │    │
│  │  └─────────────────┘  └────────────────────────┘  │    │
│  │                                                    │    │
│  │  ┌─────────────────┐  ┌────────────────────────┐  │    │
│  │  │ cloudflared      │  │ (future) Local AI      │  │    │
│  │  │ (tunnel daemon)  │  │ - Embeddings           │  │    │
│  │  │                  │  │ - Small model inference │  │    │
│  │  │                  │  │ - Vector search         │  │    │
│  │  └─────────────────┘  └────────────────────────┘  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  Storage: Local SSD (10-20GB)                            │
│  OS: Debian 12 / Ubuntu 24.04                            │
│  Node.js: 22.x                                           │
└──────────────────────────────────────────────────────────┘
```

## Cost Comparison

| Component | Cloudflare (current) | GCP + CF Tunnel |
|-----------|---------------------|-----------------|
| Compute | Container $30/mo | VM ~$15-30/mo |
| Auth | CF Access (free) | CF Access via Tunnel (free) |
| CDN/DDoS | Free | Free (via Tunnel) |
| DNS | Free | Free |
| Storage | R2 $0.50/mo | Local SSD (included) |
| Workers plan | $5/mo | $0 (keep for agents) |
| **Total** | **~$35-40/mo** | **~$15-30/mo** |

## What Stays on Cloudflare

- **Zero Trust / CF Access** — auth for admin routes
- **Cloudflare Tunnel** — connects GCP VM to edge
- **DNS** — domain management
- **DDoS protection** — free tier
- **Workers** (optional) — edge agents, caching, routing
- **R2** (optional) — backup storage

## What Moves to GCP

- **OpenClaw gateway** — persistent Node.js process
- **Mentra bridge** — persistent WebSocket to MentraOS Cloud
- **Config/data** — local filesystem (no more R2 sync loops)
- **Skills** — local directory
- **Future AI** — local inference, embeddings, vector search

## Why This Works Better

1. **No cold starts** — processes are always running
2. **Persistent WebSocket** — Mentra bridge stays connected
3. **Simple deploys** — `git pull && pm2 restart`
4. **No DO migrations** — no Durable Objects
5. **No container lifecycle** — no image rebuilds for config changes
6. **Local AI ready** — ARM CPU for inference (C4A) or x86 for compatibility
7. **Cheaper** — same or less cost, much less complexity

## Instance Decision

Workload baseline: ~1.35 GB RAM (OpenClaw ~500MB + bridge ~100MB + cloudflared ~50MB + OS ~700MB). Needs 4GB for spikes.

### Recommended Path

| Phase | Instance | vCPU | RAM | Arch | $/mo | Purpose |
|-------|----------|------|-----|------|------|---------|
| **Start** | e2-medium | 2 shared | 4GB | x86 | $26.33 | Validate workload |
| **Test ARM** | t2a-standard-1 | 1 dedicated | 4GB | ARM | $29.98 | Test ARM compatibility |
| **Production** | **c4a-standard-1** | **1 dedicated** | **4GB** | **ARM (Axion)** | **$22.52 (1yr CUD)** | **SELECTED** |

### Why C4A Axion (Production Target)

- **25-50% better Node.js performance** vs x86 at same price
- **KleidiAI + NEON + SVE** for ONNX Runtime (28-51% uplift)
- **llama.cpp ARM** achieves up to 24x decoding speedup with NEON
- **$22.52/mo with 1-year CUD** — cheaper than e2-medium
- Google's latest ARM, Neoverse V2 cores

### Key Findings

- E2 series has **NO sustained use discounts** (common misconception)
- Spot VMs unsuitable (Mentra WebSocket can't survive preemption)
- e2-micro (1GB) too small — OOM guaranteed. Could be monitoring sidecar
- 200 GB/mo network egress free — sufficient for API workload
- N4A (newer ARM, GA Jan 2026) could undercut c4a — worth monitoring

See `docs/gcp-compute-instance-research.md` for full analysis.
