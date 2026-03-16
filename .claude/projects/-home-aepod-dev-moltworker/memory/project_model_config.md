---
name: AI Model Configuration
description: OpenRouter via openai-responses API. Provider must be gw-openrouter with full model IDs. Never create gw-* providers from AI_GATEWAY_MODEL.
type: project
---

Using OpenRouter (AI_GATEWAY_BASE_URL=https://openrouter.ai/api/v1) as the AI gateway.

**Critical: API format must be `openai-responses`** — `openai-completions` returns empty content.
**Critical: Model IDs must include provider prefix** — e.g. `google/gemini-2.0-flash-001` not just `gemini-2.0-flash-001`.
**Critical: Only use `gw-openrouter` provider** — do NOT set `AI_GATEWAY_MODEL` env var, it creates broken `gw-*` providers with truncated model IDs.

**Working config:**
- Provider: `gw-openrouter`
- API: `openai-responses`
- Default: `gw-openrouter/google/gemini-2.0-flash-001`
- Available: `moonshotai/kimi-k2.5`, `nvidia/nemotron-nano-12b-v2-vl:free`

**How to apply:** Model changes should be done via `/config set` in the OpenClaw UI or by editing the R2 config directly. Never use the `AI_GATEWAY_MODEL` wrangler secret for model switching.
