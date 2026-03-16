# GCP Compute Instance Research: AI Assistant Workload

**Date**: 2026-03-15
**Budget Target**: ~$30/month
**Region Focus**: us-central1 (Iowa), us-east1 (South Carolina)

---

## 1. Workload Profile

| Component | Baseline RAM | Peak RAM | CPU Pattern | Notes |
|-----------|-------------|----------|-------------|-------|
| OpenClaw AI Gateway (Node.js/Hono) | ~500 MB | ~2 GB | Bursty on inference requests | HTTP API, SSE streaming |
| MentraOS Bridge (@mentra/sdk) | ~100 MB | ~200 MB | Low, persistent WebSocket | Event-driven, lightweight |
| Local AI Inference (ONNX/llama.cpp) | ~500 MB | ~2 GB | CPU-intensive bursts | Embedding models, small LLMs |
| Cloudflare Tunnel (cloudflared) | ~50 MB | ~100 MB | Minimal | Ingress tunnel daemon |
| **OS + runtime overhead** | ~200 MB | ~300 MB | Minimal | Linux + Node.js runtime |
| **TOTAL** | **~1.35 GB** | **~4.6 GB** | Mixed: idle + bursts | |

**Key observation**: The baseline footprint is ~1.35 GB, which immediately rules out anything with less than 2 GB RAM for production. Under load with AI inference, peak memory reaches ~4.6 GB, making 4 GB a practical minimum.

---

## 2. Instance Comparison Matrix

### Pricing (us-central1, on-demand, March 2026)

| Instance | Arch | vCPU | RAM | Monthly | Spot/mo | Disk (10GB SSD) | Total On-Demand |
|----------|------|------|-----|---------|---------|-----------------|-----------------|
| **e2-micro** | x86 (shared 1/8 core) | 2 shared | 1 GB | $6.11 | ~$2.50 | $1.87 | **$7.98** |
| **e2-small** | x86 (shared 1/4 core) | 2 shared | 2 GB | $12.23 | ~$5.00 | $1.87 | **$14.10** |
| **e2-medium** | x86 (shared 1/2 core) | 2 shared | 4 GB | $24.46 | $10.73 | $1.87 | **$26.33** |
| **c4a-highcpu-1** | ARM64 (Axion) | 1 dedicated | 2 GB | $27.65 | $8.98 | $1.87 | **$29.52** |
| **c4a-standard-1** | ARM64 (Axion) | 1 dedicated | 4 GB | $32.78 | $10.64 | $1.87 | **$34.65** |
| **t2a-standard-1** | ARM64 (Ampere) | 1 dedicated | 4 GB | $28.11 | $7.77 | $1.87 | **$29.98** |
| **t2a-standard-2** | ARM64 (Ampere) | 2 dedicated | 8 GB | $56.21 | $15.55 | $1.87 | **$58.08** |
| **c4a-standard-2** | ARM64 (Axion) | 2 dedicated | 8 GB | $65.55 | $21.32 | $1.87 | **$67.42** |
| **n2-standard-2** | x86 (dedicated) | 2 dedicated | 8 GB | $70.90 | ~$21.00 | $1.87 | **$72.77** |

**Disk pricing note**: 10 GB pd-ssd = ~$1.87/month. Free tier includes 30 GB standard persistent disk (not SSD).

---

## 3. Discount Programs

### Sustained Use Discounts (SUDs) -- Automatic

| Series | SUD Eligible | Max Discount |
|--------|-------------|--------------|
| E2 | NO | -- |
| C4A | NO | -- |
| T2A | NO | -- |
| N2 | YES | Up to 30% |
| N1 | YES | Up to 30% |

**Finding**: None of the budget-friendly options (E2, C4A, T2A) qualify for sustained use discounts. Only N2 qualifies, but N2 instances are well above the $30/month budget.

### Committed Use Discounts (CUDs)

| Commitment | Discount (General Purpose) |
|-----------|---------------------------|
| 1-year | 37% off on-demand |
| 3-year | 55% off on-demand |

CUD-eligible series include E2, C4A, T2A, N2, and N4A.

**CUD pricing for candidates within budget**:

| Instance | On-Demand | 1yr CUD (37% off) | 3yr CUD (55% off) |
|----------|-----------|--------------------|--------------------|
| e2-medium | $24.46 | $15.41 | $11.01 |
| c4a-highcpu-1 | $27.65 | $17.42 | $12.44 |
| c4a-standard-1 | $32.78 | $20.65 | $14.75 |
| t2a-standard-1 | $28.11 | $17.71 | $12.65 |

### Spot VM Pricing

Spot VMs offer 60-91% discounts but can be preempted at any time. **Not suitable for an always-on AI assistant** that needs persistent WebSocket connections (MentraOS bridge) and reliable uptime.

| Instance | On-Demand | Spot | Discount |
|----------|-----------|------|----------|
| e2-medium | $24.46 | $10.73 | 56% |
| c4a-highcpu-1 | $27.65 | $8.98 | 68% |
| c4a-standard-1 | $32.78 | $10.64 | 68% |
| t2a-standard-1 | $28.11 | $7.77 | 72% |

**Verdict**: Spot VMs are unsuitable for this workload due to preemption. The MentraOS bridge requires persistent connections, and the OpenClaw gateway needs consistent availability.

---

## 4. GCP Always-Free Tier

**Offer**: 1x e2-micro instance free forever in us-west1, us-central1, or us-east1.

**Includes**:
- 730 hours/month (full month)
- 30 GB standard persistent disk (HDD, not SSD)
- 1 GB network egress from North America/month
- 5 GB snapshot storage/month

**Assessment for this workload**: INSUFFICIENT.

| Requirement | e2-micro Capability | Verdict |
|-------------|-------------------|---------|
| RAM (need 1.35 GB baseline) | 1 GB | FAIL -- OOM guaranteed |
| CPU (need burst capacity) | 2 shared (1/8 physical core) | MARGINAL -- heavy throttling |
| Persistent WebSocket | Possible but unreliable | RISKY |
| AI inference | Impossible at 1 GB | FAIL |

The free tier e2-micro could potentially serve as a secondary utility node (monitoring, cron jobs, tunnel relay) but cannot run the primary workload.

---

## 5. CPU Architecture Analysis

### ARM64 vs x86 for This Workload

#### Node.js Performance

| Metric | ARM64 (Axion/Ampere) | x86 (E2 shared) |
|--------|---------------------|------------------|
| Single-thread throughput | Dedicated core, consistent | Shared, throttled after burst |
| Price-performance | 20-42% better | Baseline |
| Node.js API throughput | +25-35% vs comparable x86 | Baseline |
| Burst behavior | Always full core available | Burst credits, then throttled |
| V8 JIT optimization | Excellent on ARM64 | Mature, well-optimized |

**Key benchmark data**:
- Google C4A Axion achieves ~53,798 req/sec on Node.js (4 vCPU test)
- ARM instances show +25% API throughput and +30% response time improvement vs comparable x86
- ARM delivers ~42% cost reduction per million requests vs x86

#### Local AI Inference (llama.cpp / ONNX Runtime)

| Metric | ARM64 | x86 (E2 shared) |
|--------|-------|------------------|
| llama.cpp support | Native ARM NEON + SVE | SSE/AVX (limited on shared) |
| ONNX Runtime | 1.9x faster token gen vs AMD Genoa | Baseline |
| KleidiAI optimizations | +28-51% uplift on ARM | Not applicable |
| Embedding model speed | Excellent with INT8/BF16 | Adequate |
| Small model inference | 29+ tok/s (11B model, Graviton4) | Slower on shared cores |

**Critical finding**: ARM64 has a decisive advantage for AI inference workloads:
- Native NEON/SVE vector instructions are always available
- KleidiAI integration in both llama.cpp and ONNX Runtime delivers 28-51% performance uplift
- E2 shared-core instances have limited access to AVX instructions and will be throttled under sustained inference load

#### Cloudflare Tunnel (cloudflared) Compatibility

| Platform | Status |
|----------|--------|
| x86_64 Linux | Fully supported, official Docker image |
| ARM64 Linux | Binary available, official Docker image added ARM64 support. Community images also available (klutchell/cloudflared) |

Both architectures are viable for cloudflared. ARM64 support is production-ready.

---

## 6. E2 Shared-Core CPU Throttling Analysis

E2-medium provides 2 shared vCPUs, each at **50% of CPU time** (totaling 100% effective CPU). This is critical to understand:

| E2 Type | Baseline CPU | Burst Behavior |
|---------|-------------|----------------|
| e2-micro | 2 vCPU at 12.5% each (25% total) | Burst for "dozens of seconds" then throttle |
| e2-small | 2 vCPU at 25% each (50% total) | Burst for "dozens of seconds" then throttle |
| e2-medium | 2 vCPU at 50% each (100% total) | Burst for "dozens of seconds" then throttle |

**Impact on this workload**:
- OpenClaw API requests that trigger AI inference will consume sustained CPU
- After burst credits deplete, CPU will throttle to baseline
- MentraOS transcription/photo analysis involves sequential CPU-bound work
- An AI inference job lasting >30 seconds will be throttled on E2

**E2-medium verdict**: Adequate for the gateway + bridge workload alone. Will struggle with local AI inference that requires sustained CPU.

---

## 7. Network Egress

| Tier | Included Free | Cost Beyond Free |
|------|--------------|-----------------|
| All GCP | First 200 GB/month free | $0.085-0.12/GB (Premium tier) |
| Free tier bonus | 1 GB from North America | Standard egress rates apply |
| Intra-zone | Free (internal IP) | $0.01/GB (external IP) |

**Assessment**: 200 GB/month free egress is more than sufficient for an AI assistant workload. Typical monthly usage for this application would be well under 50 GB (API responses are text-based, small payloads).

---

## 8. Detailed Instance Evaluations

### e2-medium ($26.33/mo total) -- BEST BUDGET OPTION

**Pros**:
- Fits within $30 budget
- 4 GB RAM covers baseline + moderate load
- x86 compatibility (broadest software support)
- Eligible for 1yr CUD at ~$17.28/mo total

**Cons**:
- Shared CPU with burst throttling
- Poor sustained AI inference performance
- No sustained use discount
- Will OOM under peak load (4 GB total, ~4.6 GB peak needed)
- Random CPU platform assignment (could get Broadwell or Skylake)

**Suitability**: 6/10 -- Workable for gateway + bridge without local inference

### c4a-highcpu-1 ($29.52/mo total) -- BEST PERFORMANCE/DOLLAR

**Pros**:
- Fits within ~$30 budget
- 1 dedicated ARM64 core (no throttling, no burst limits)
- Google Axion processor (Neoverse V2) -- latest generation
- Excellent for Node.js (+25-35% vs comparable x86)
- Superior AI inference (KleidiAI, NEON, SVE)
- Eligible for 1yr CUD at ~$19.29/mo total

**Cons**:
- Only 2 GB RAM -- insufficient for baseline workload (1.35 GB needed + headroom)
- 1 vCPU limits concurrency
- ARM64 requires compatible container images

**Suitability**: 4/10 -- RAM is the dealbreaker at 2 GB

### c4a-standard-1 ($34.65/mo total) -- BEST OVERALL

**Pros**:
- 4 GB RAM covers baseline + moderate headroom
- 1 dedicated ARM64 core (no throttling)
- Google Axion (Neoverse V2) -- top-tier ARM performance
- Best single-thread performance of any option near this price
- Excellent AI inference capability
- Eligible for 1yr CUD at ~$22.52/mo total
- Eligible for 3yr CUD at ~$16.62/mo total

**Cons**:
- Slightly over $30 budget at on-demand ($34.65)
- 1 vCPU limits parallel processing
- 4 GB may be tight under peak load with AI inference
- ARM64 container image requirements

**Suitability**: 8/10 -- Best balance of price, performance, and capability

### t2a-standard-1 ($29.98/mo total) -- BUDGET ARM OPTION

**Pros**:
- Just under $30 budget
- 4 GB RAM covers baseline
- 1 dedicated ARM64 core (Ampere Altra)
- Decent for Node.js workloads
- Eligible for 1yr CUD at ~$19.58/mo total

**Cons**:
- Older Ampere Altra (Neoverse N1) vs Axion's Neoverse V2
- Significantly slower than C4A for AI inference
- Limited to 3 regions (us-central1, europe-west4, asia-southeast1)
- No SVE or latest ARM extensions for AI acceleration
- Being superseded by N4A

**Suitability**: 7/10 -- Solid budget option but inferior to C4A for AI workloads

### n2-standard-2 ($72.77/mo total) -- PREMIUM OPTION

**Pros**:
- 8 GB RAM (ample headroom)
- 2 dedicated x86 vCPUs
- Sustained use discount eligible (up to 30% off = ~$52/mo)
- Best concurrency for parallel requests
- Broadest software compatibility

**Cons**:
- Far over $30 budget even with SUD
- Overkill for baseline workload
- Less power-efficient than ARM alternatives

**Suitability**: 5/10 -- Too expensive for this budget

### N4A (Axion, budget-optimized) -- EMERGING OPTION

**Status**: GA as of January 2026. Pricing not yet widely published on third-party tools.

**Specs**: Up to 64 vCPUs, 512 GB DDR5, 50 Gbps networking. Available in standard, highcpu, highmem.

**Expected pricing**: Based on Google's claim of "2x better price-performance" than x86, and the Phoronix review showing N4A-standard-16 at $0.71/hr (~$0.044/hr per vCPU), the N4A-standard-1 should be roughly:
- ~$0.035-0.044/hr (estimated)
- ~$25-32/month (estimated)

**Assessment**: N4A could be the ideal choice if pricing falls below c4a-standard-1. It uses the same Axion silicon but is positioned as the cost-optimized variant. Worth checking current pricing via `gcloud compute machine-types list --filter="name:n4a"`.

---

## 9. Recommendation Matrix

### Scenario A: Gateway + Bridge Only (No Local AI Inference)

| Rank | Instance | Monthly | Why |
|------|----------|---------|-----|
| 1 | **e2-medium** | $26.33 | Fits budget, 4 GB sufficient, simplest setup |
| 2 | t2a-standard-1 | $29.98 | Better CPU, same RAM, ARM learning curve |
| 3 | c4a-standard-1 | $34.65 | Best performance, slightly over budget |

### Scenario B: Gateway + Bridge + Light AI Inference (Embeddings, Small Models)

| Rank | Instance | Monthly | Why |
|------|----------|---------|-----|
| 1 | **c4a-standard-1** | $34.65 | Best inference performance, dedicated core |
| 2 | t2a-standard-1 | $29.98 | Budget-friendly, decent inference |
| 3 | e2-medium | $26.33 | Will throttle under inference load |

### Scenario C: Full Workload Including Larger Model Inference

| Rank | Instance | Monthly | Why |
|------|----------|---------|-----|
| 1 | **c4a-standard-2** (Spot hybrid) | $21.32-65.55 | 8 GB RAM, 2 cores, proper AI capacity |
| 2 | t2a-standard-2 | $58.08 | 8 GB, 2 cores, budget ARM |
| 3 | n2-standard-2 | $72.77 | 8 GB, 2 cores, x86 compatibility |

### Scenario D: Maximum Savings with CUD

| Instance | 1yr CUD/mo | 3yr CUD/mo |
|----------|-----------|-----------|
| e2-medium + disk | $17.28 | $12.88 |
| c4a-standard-1 + disk | $22.52 | $16.62 |
| t2a-standard-1 + disk | $19.58 | $14.52 |

---

## 10. Architecture Decision Recommendation

### Primary Recommendation: c4a-standard-1 with 1-year CUD

**Monthly cost**: ~$22.52 (with 1yr CUD) or ~$34.65 (on-demand)

**Rationale**:
1. **Dedicated CPU**: No throttling during inference bursts, unlike E2 shared cores
2. **4 GB RAM**: Covers baseline (1.35 GB) with ~2.65 GB headroom for inference
3. **ARM64 advantage**: 25-50% better performance for Node.js and AI inference workloads
4. **Axion processor**: Latest-generation ARM with NEON, SVE, KleidiAI support
5. **Future-proof**: ARM is the direction of cloud compute; building for ARM now avoids migration later
6. **CUD economics**: 1yr commitment brings it well under $30/month budget

**Risks and mitigations**:
- **4 GB RAM limit**: Use `--max-old-space-size=1536` for Node.js, limit model sizes to <2B params for inference
- **ARM compatibility**: Verify all container images support linux/arm64 (Node.js, cloudflared, ONNX Runtime all do)
- **1 vCPU concurrency**: Use async/non-blocking patterns (already the case with Hono framework); queue inference requests

### Fallback Recommendation: e2-medium (on-demand or 1yr CUD)

If ARM64 introduces unacceptable complexity or if local AI inference is not needed:
- On-demand: $26.33/month (within budget)
- 1yr CUD: $17.28/month
- Accept CPU throttling during sustained load
- Offload all AI inference to external APIs (Anthropic, OpenRouter)

### Cost Optimization Path

1. **Start**: e2-medium on-demand ($26.33/mo) to validate workload
2. **Validate**: Test ARM64 compatibility on t2a-standard-1 ($29.98/mo)
3. **Optimize**: Move to c4a-standard-1 with 1yr CUD ($22.52/mo)
4. **Scale**: If needed, upgrade to c4a-standard-2 ($65.55/mo) or use N4A when pricing is confirmed

---

## 11. Supplementary: Free-Tier Hybrid Architecture

Use the always-free e2-micro alongside a paid instance:

| Component | Instance | Cost |
|-----------|----------|------|
| Cloudflare Tunnel + monitoring | e2-micro (free tier) | $0 |
| OpenClaw + MentraOS + inference | c4a-standard-1 (1yr CUD) | $22.52 |
| **Total** | | **$22.52/mo** |

The free e2-micro runs cloudflared and health checks, routing traffic to the c4a-standard-1 where the actual workload runs. This saves ~50 MB RAM on the primary instance and provides a persistent tunnel endpoint that survives primary instance restarts.

---

## Sources

- [GCP Compute Engine Pricing](https://cloud.google.com/compute/all-pricing)
- [e2-micro Pricing - Economize](https://www.economize.cloud/resources/gcp/pricing/compute-engine/e2-micro/)
- [e2-small Pricing - Economize](https://www.economize.cloud/resources/gcp/pricing/compute-engine/e2-small/)
- [e2-medium Pricing - Economize](https://www.economize.cloud/resources/gcp/pricing/compute-engine/e2-medium/)
- [c4a-standard-1 Specs - CloudPrice](https://cloudprice.net/gcp/compute/instances/c4a-standard-1)
- [c4a-standard-2 Specs - CloudPrice](https://cloudprice.net/gcp/compute/instances/c4a-standard-2)
- [c4a-highcpu-1 Specs - CloudPrice](https://cloudprice.net/gcp/compute/instances/c4a-highcpu-1)
- [t2a-standard-1 Specs - CloudPrice](https://cloudprice.net/gcp/compute/instances/t2a-standard-1)
- [t2a-standard-2 Specs - CloudPrice](https://cloudprice.net/gcp/compute/instances/t2a-standard-2)
- [n2-standard-2 Pricing - Economize](https://www.economize.cloud/resources/gcp/pricing/compute-engine/n2-standard-2/)
- [GCP Sustained Use Discounts](https://docs.cloud.google.com/compute/docs/sustained-use-discounts)
- [GCP Committed Use Discounts](https://docs.cloud.google.com/compute/docs/instances/committed-use-discounts-overview)
- [GCP Free Tier Compute](https://cloud.google.com/free/docs/compute-getting-started)
- [GCP Spot VMs Pricing](https://cloud.google.com/spot-vms/pricing)
- [GCP Network Pricing](https://cloud.google.com/vpc/network-pricing)
- [GCP Disk Pricing](https://cloud.google.com/compute/disks-image-pricing)
- [ARM vs x86 Cloud 2025 - sanj.dev](https://sanj.dev/post/arm-vs-x86-cloud-2025)
- [ARM vs x86 Cloud Compute 2025 - sanj.dev](https://sanj.dev/post/arm-vs-x86-cloud-compute-2025)
- [Node.js on GCP C4A Axion - Arm Learning Paths](https://learn.arm.com/learning-paths/servers-and-cloud-computing/node-js-gcp/benchmarking/)
- [Google Axion C4A Benchmarks - Phoronix](https://www.phoronix.com/review/google-axion-c4a)
- [Google N4A Axion Review - Phoronix](https://www.phoronix.com/review/google-cloud-n4a-axion)
- [llama.cpp on ARM Graviton - ClearML](https://clear.ml/blog/benchmarking-llama-cpp-on-arm-neoverse-based-aws-graviton-instances-with-clearml)
- [LLM Inference on Ampere - Oracle](https://blogs.oracle.com/ai-and-datascience/smaller-llama-llm-models-cost-efficient-ampere-cpus)
- [ONNX Runtime on ARM Cobalt - Arm Developer](https://developer.arm.com/community/arm-community-blogs/b/servers-and-cloud-computing-blog/posts/accelerate-llm-inference-with-onnx-runtime-on-arm-neoverse-powered-microsoft-cobalt-100)
- [N4A VMs GA Announcement - Google Cloud Blog](https://cloud.google.com/blog/products/compute/axion-based-n4a-vms-now-in-preview)
- [N4A Cost-Effective ARM - Network World](https://www.networkworld.com/article/4086182/google-cloud-aims-for-more-cost-effective-arm-computing-with-axion-n4a.html)
- [Cloud ARM Performance Leader - The Register](https://www.theregister.com/2025/10/28/clouds_new_performance_leader/)
- [Cloudflare Tunnel Downloads](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/)
- [Cloudflare Tunnel ARM Support - Community](https://community.cloudflare.com/t/cloudflare-tunnel-support-for-arm/393261)
- [Node.js Memory Management in Containers - Red Hat](https://developers.redhat.com/articles/2025/10/10/nodejs-20-memory-management-containers)
- [E2 Shared Core Machine Types - GCP Docs](https://docs.google.com/compute/docs/general-purpose-machines)
- [GCP Instance Types Explained - CloudBolt](https://www.cloudbolt.io/gcp-cost-optimization/gcp-instance-types/)
