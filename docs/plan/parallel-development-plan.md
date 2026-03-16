# Parallel Development Plan

## Two Workstreams, Small Batches

```
STREAM A: Infrastructure                    STREAM B: Mentra Channel
(GCP + Cloudflare Tunnel)                   (OpenClaw channel for glasses)

A1: Terraform + VM provisioning       ──┐   B1: Research OpenClaw channels    ──┐
A2: cloudflared tunnel setup          ──┤   B2: Channel plugin skeleton       ──┤
A3: OpenClaw on VM + pm2             ──┤   B3: Mentra SDK integration        ──┤
A4: CI/CD pipeline (GH Actions→SSH)  ──┘   B4: Audio/voice pipeline          ──┘
                                     │                                       │
                              Integration Point ─────────────────────────────┘
                                     │
A5: Migrate secrets + config    ──┐  │     B5: Webview React app scaffold    ──┐
A6: CF Access via tunnel        ──┤  │     B6: Chat + timeline components    ──┤
A7: Monitoring + health checks  ──┘  │     B7: Drawer navigation + routing   ──┘
                                     │
                              Final Integration
                                     │
A8: DNS cutover + validation         B8: End-to-end glasses test
A9: Decommission CF containers       B9: Production polish
```

## Stream A: Infrastructure (GCP + Cloudflare Tunnel)

**Expert agents:** system-architect, devops (sparc:devops), security-architect

### A1: Terraform + VM Provisioning
**Agent:** system-architect
**Context needed:** docs/devops/terraform.md, docs/devops/architecture.md
**Deliverables:**
- `terraform/main.tf` — providers, backend (GCS)
- `terraform/gcp-vm.tf` — c4a-standard-1 instance, us-east1
- `terraform/variables.tf` + `terraform.tfvars.example`
- GCS bucket for TF state
**Batch size:** 4 files, ~200 lines total
**Dependencies:** GCP project ID, service account key

### A2: Cloudflare Tunnel Setup
**Agent:** devops
**Context needed:** docs/devops/terraform.md (cloudflare section)
**Deliverables:**
- `terraform/cloudflare-tunnel.tf` — tunnel, DNS, ingress rules
- `terraform/cloudflare-access.tf` — Zero Trust policies
- `scripts/install-cloudflared.sh`
**Batch size:** 3 files, ~150 lines
**Dependencies:** A1 (VM must exist), CF API token

### A3: OpenClaw on VM
**Agent:** sparc-coder
**Context needed:** start-openclaw.sh (reference), docs/devops/ci-cd.md
**Deliverables:**
- `scripts/setup-vm.sh` — Node.js, pm2, OpenClaw install
- `ecosystem.config.js` — pm2 process config
- `scripts/openclaw-config.sh` — config patching (from start-openclaw.sh)
- `.env.example` for VM
**Batch size:** 4 files, ~200 lines
**Dependencies:** A1 (VM accessible)

### A4: CI/CD Pipeline
**Agent:** cicd-engineer
**Context needed:** .github/workflows/deploy.yml (reference), docs/devops/ci-cd.md
**Deliverables:**
- `.github/workflows/deploy-gcp.yml` — push to main → SSH deploy
- `scripts/deploy.sh` — git pull, npm install, pm2 restart
**Batch size:** 2 files, ~80 lines
**Dependencies:** A1, A3 (VM with pm2)

### A5: Migrate Secrets + Config
**Agent:** security-architect
**Context needed:** .env (local), wrangler secrets list
**Deliverables:**
- `scripts/migrate-secrets.sh` — export from CF, import to VM .env
- `terraform/secrets.tf` — GCP Secret Manager (optional)
- R2 config → local filesystem migration
**Batch size:** 3 files, ~100 lines
**Dependencies:** A3 (OpenClaw running)

### A6: CF Access via Tunnel
**Agent:** security-architect
**Context needed:** docs/devops/terraform.md (access section)
**Deliverables:**
- Verify CF Access works through tunnel
- Test /mentra/* bypass policy
- Test admin UI protection
**Batch size:** Config verification, no new files
**Dependencies:** A2, A3

### A7: Monitoring + Health Checks
**Agent:** devops
**Context needed:** docs/devops/architecture.md
**Deliverables:**
- `scripts/health-check.sh` — cron probe for OpenClaw + bridge
- pm2 webhook alerts (Discord/Slack)
- `terraform/gcp-monitoring.tf` — uptime checks
**Batch size:** 3 files, ~100 lines
**Dependencies:** A3, A6

### A8: DNS Cutover
**Agent:** devops
**Deliverables:**
- Update Mentra console webhook URL
- Update WORKER_URL references
- Verify all endpoints respond
**Batch size:** Config changes only
**Dependencies:** A6, A7, B4

### A9: Decommission CF Containers
**Agent:** system-architect
**Deliverables:**
- Remove containers from wrangler.jsonc (keep Worker for agents)
- Update deploy.yml (remove container build)
- Document fallback procedure
**Batch size:** 3 file edits
**Dependencies:** A8 (cutover validated)

---

## Stream B: Mentra Channel (OpenClaw Integration)

**Expert agents:** researcher, sparc-coder, mentra-development skill

### B1: Research OpenClaw Channels
**Agent:** researcher
**Context needed:** OpenClaw docs, existing channel configs (Telegram, Discord in start-openclaw.sh)
**Deliverables:**
- `docs/mentra-channel-research.md` — how OpenClaw channels work
- Channel plugin API documentation
- How Telegram/Discord channels are implemented
**Batch size:** 1 doc, ~500 lines
**Dependencies:** None (can start immediately)

### B2: Channel Plugin Skeleton
**Agent:** sparc-coder
**Context needed:** B1 research, skills/mentra-bridge/mentra-bridge.js
**Deliverables:**
- `src/channels/mentra/index.ts` — channel plugin class
- `src/channels/mentra/types.ts` — message types
- Config schema for openclaw.json channels.mentra section
**Batch size:** 3 files, ~200 lines
**Dependencies:** B1

### B3: Mentra SDK Integration
**Agent:** sparc-coder (with mentra-development skill)
**Context needed:** B2 skeleton, docs/mentraOS/*, skills/mentra-bridge/mentra-bridge.js
**Deliverables:**
- Channel handles onSession → registers event handlers
- onTranscription → sends as user message to OpenClaw agent
- Agent response → session.audio.speak() + channel message
- onPhotoTaken → sends as image attachment
- onButtonPress → mapped to channel actions
**Batch size:** 1 file update (~300 lines)
**Dependencies:** B2

### B4: Audio/Voice Pipeline
**Agent:** sparc-coder (with mentra-development skill)
**Context needed:** B3, docs/mentraOS/audio.md
**Deliverables:**
- TTS response via session.audio.speak()
- Voice input → transcription → agent
- Audio feedback sounds (connect, error, notification)
- Interrupt/cancel via button press
**Batch size:** 1 file update (~150 lines)
**Dependencies:** B3

### B5: Webview React App Scaffold
**Agent:** sparc-coder (with mentra-ui skill)
**Context needed:** docs/UI/design-system.md, docs/UI/app-structure.md, symposium answers
**Deliverables:**
- `webview/` directory with React + Vite + Tailwind + shadcn/ui
- Package.json, tsconfig, tailwind.config
- App shell with routing (home, workflow, comms, admin, settings)
- MentraAuthProvider integration
- WebSocket connection to bridge
**Batch size:** ~10 files, scaffold only
**Dependencies:** None (can start immediately, parallel with B1)

### B6: Chat + Timeline Components
**Agent:** sparc-coder (with mentra-ui skill)
**Context needed:** B5, docs/UI/mockup-workflow.html, symposium answers (AI SDK Elements)
**Deliverables:**
- Conversation thread component (Discord-style)
- Timeline entries (vertical changelog format)
- Agent message with avatar
- Approval card with swipe-to-modal
- Diff viewer (DiffMate-style)
- Tool output (collapsible)
**Batch size:** ~6 components
**Dependencies:** B5

### B7: Drawer Navigation + Routing
**Agent:** sparc-coder (with mentra-ui skill)
**Context needed:** B5, docs/UI/mockup-left-drawer.html, mockup-right-drawer.html
**Deliverables:**
- Left drawer: Client→Project→Workflow tree
- Right drawer: sensor debug tools
- Visible edge handles (not hamburger)
- Bottom tab bar (context-aware)
- Home screen with widget grid
**Batch size:** ~5 components
**Dependencies:** B5, B6

### B8: End-to-End Glasses Test
**Agent:** mentra-tester skill
**Deliverables:**
- Toggle app on glasses → session connects
- Speak → transcription → AI response → audio playback
- Button press → action
- Camera → photo → AI analysis → audio description
- Webview shows conversation history
**Batch size:** Test script + verification
**Dependencies:** A8, B4, B7

### B9: Production Polish
**Agent:** reviewer
**Deliverables:**
- Error handling review
- Reconnection robustness
- Performance optimization
- Documentation update
**Batch size:** Review + fixes
**Dependencies:** B8

---

## Execution Schedule

```
Week 1:
  A1 ──────► A2 ──────► A3
  B1 ──────► B2         B5 (parallel)

Week 2:
  A3 ──────► A4
  B2 ──────► B3 ──────► B4
  B5 ──────► B6

Week 3:
  A5 ──────► A6 ──────► A7
  B6 ──────► B7

Week 4:
  A8 (cutover)          B8 (e2e test)
  A9 (decommission)     B9 (polish)
```

## Context Management Rules

1. **Each batch is 1-4 files, under 500 lines**
2. **Each agent gets ONLY the context it needs** (listed per task)
3. **No agent sees the full codebase** — they see their task files + reference docs
4. **Integration points are explicit** — Stream A and B connect at A8/B4
5. **Tests run after each batch** — `npm test`, manual verification
6. **Commits per batch** — one commit per completed task, descriptive message
7. **Skills provide domain knowledge** — agents use mentra-development, mentra-ui, mentra-tester skills for context

## Agent Assignment Summary

| Agent Type | Tasks |
|-----------|-------|
| system-architect | A1, A9 |
| devops (sparc:devops) | A2, A4, A7, A8 |
| security-architect | A5, A6 |
| researcher | B1 |
| sparc-coder | A3, B2, B3, B4, B5, B6, B7 |
| mentra-tester | B8 |
| reviewer | B9 |
| cicd-engineer | A4 |
