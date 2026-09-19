# TypeSafe AI Benchmark: Qwen, Jev and local models

This report compares provider-native LLM structured output from **Qwen 3.8 27B on
Cerebras** with **TypeSafe Jev’s native judgment API**. Qwen is the chosen fast LLM
baseline; this is not an exhaustive ranking of LLMs or inference hosts. The
supporting proxy’s per-question TypeSafe compatibility path is outside this comparison.

Measured **2026-09-17 UTC** through the actual production browser comparison.
One paired run of each of the seven scenes, with no warmups, retries, rate-limit
recovery runs or discarded results. Both lanes began within **0–2 ms** of each other
per scene, and every pair overlapped. The recording in the README is illustrative;
the figures below come from the newly captured JSON exports.

## Overall results

| Measurement | Qwen 3.8 27B · Cerebras | Jev · TypeSafe | Needle 3 · local¹ |
| --- | ---: | ---: | ---: |
| Validated / dispatched | 475 / 476 | 479 / 480 | 470 / 486 |
| Failed / canceled at driving deadline | 0 / 1 | 0 / 1 | 15 / 1 |
| Successful request p50 / p95 / p99 | 215 / 452 / 912 ms | 176 / 336 / 532 ms | 161 / 444 / 1,095 ms |
| Input / output tokens | 305,915 / 5,185 | 297,984 / 43,836 | Unavailable |
| Known estimated API cost | $0.310581 | $0.011919 | $0² |
| Sum of scene durations | 70.02 s | 55.54 s | 55.79 s |

¹ Needle measured separately **2026-09-19 UTC**, directly through the demo runtime
on an Apple M4 Pro; Qwen/Jev measured in the browser on September 17. Same contracts,
static input order and concurrency, but no browser/HTTP overhead or competing lane
for Needle. This is **not a controlled speed ranking**.
² Zero API fees excludes local hardware/electricity. Needle's median native decode
rate was **990 tok/s**, distinct from its **161 ms** median successful request.
[Needle mapping-v2 results and prior baselines](needle-capped-2026-09-19/README.md).

### Qwen 2.5 1.5B RLCD local follow-up

A separate direct-runtime run on the same M4 Pro measured the pinned local RLCD
adapter on the same contracts and recorded input order: **477/478** structurally
validated, **213 / 692 / 1,087 ms** successful-request p50/p95/p99, and **78.76 s**
across the seven scenes. Its internal engine p50 was **125 ms**; two static-scene
callers queue through one serialized MLX worker, so this does not demonstrate
parallel input batching. The engine batches fields within each request.

Judgment quality was poor despite valid shapes: 0/100 exact ticket matches, 50/100
guardrail matches, 50/100 approval matches, 3/100 scoring matches and 0/24 home
matches. Routing looped without reaching the target. Integer collision paths were
used in 124 requests and return synthetic scores, so those values are not treated as
calibrated probabilities. [Method, raw results and all mismatches](rlcd-2026-09-19/README.md).

No Qwen/Jev HTTP failures or rate limits occurred. Each driving lane canceled one in-flight
request at its ten-second deadline. Cost excludes unknown usage for those calls.
Sum of scene durations excludes operator/export gaps; provider durations overlap,
so summing both columns does not measure session elapsed time. Successful-request
percentiles use nearest rank and exclude cancellations. No decode-speed claim is made.

## Per-scene results

| Scene | Qwen valid/sent | Jev valid/sent | Qwen / Jev wall seconds | Qwen p50/p95/p99 ms | Jev p50/p95/p99 ms | Qwen / Jev known cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| dispatch | 100/100 | 100/100 | 12.60 / 9.94 | 215 / 452 / 661 | 181 / 319 / 532 | $0.073327 / $0.002389 |
| navigate | 8/8 | 8/8 | 2.16 / 1.75 | 256 / 387 / 387 | 188 / 382 / 382 | $0.018024 / $0.001007 |
| drive | 43/44 | 47/48 | 10.00 / 10.01 | 206 / 358 / 406 | 183 / 382 / 515 | $0.034865 / $0.001444 |
| screen | 100/100 | 100/100 | 11.68 / 10.10 | 190 / 384 / 830 | 177 / 423 / 445 | $0.044252 / $0.001642 |
| approve | 100/100 | 100/100 | 12.65 / 10.06 | 204 / 330 / 1408 | 175 / 334 / 544 | $0.046236 / $0.001768 |
| judge | 100/100 | 100/100 | 14.87 / 8.97 | 235 / 526 / 1187 | 164 / 263 / 400 | $0.068963 / $0.002880 |
| home | 24/24 | 24/24 | 6.05 / 4.71 | 244 / 314 / 315 | 178 / 288 / 403 | $0.024913 / $0.000790 |

## Judgment outcomes

| Exact fixture agreement / dispatched | Qwen | Jev | Needle 3 |
| --- | ---: | ---: | ---: |
| Tickets | 75/100 | 75/100 | 0/100 |
| Guardrails | 100/100 | 100/100 | 70/100 |
| Approvals | 100/100 | 95/100 | 45/100 |
| Scoring | 93/100 | 100/100 | 0/100 |
| Home | 24/24 | 15/24 | 0/24 |

Needle reached junction 4 from 20 in eight valid hops. Driving produced 53 valid
controls, covered 13.79 m and had one collision. Its schema-sized caps fixed
conflicting-call failures and wasted generation, but the exact-match table shows
that type validity did not fix every judgment. Invalid outputs count as non-matches;
all mismatches remain in the raw results.

Routing reached junction 4 from 20 in eight hops on each side, following different
paths. Driving covered **94.58 m (Qwen)** and **84.25 m (Jev)**, with one collision
each; Jev ended stopped. Both engines ran for ten seconds. Latency affects driving
request count and trajectory; more validated calls do not imply better driving.

Jev's five approval disagreements were five repeats of one command marked block
by the local fixture. Home had nine exact-output mismatches, including unnecessary
device fields, a missed command and incorrect device settings. Some mismatches did
not change simulated state (already-set fields or clarify actions), but remain
counted. Qwen's seven scoring mismatches and all ticket mismatches are retained too.
See every expected/actual output in [summary.json](comparison/summary.json).

These are **exact local fixture matches**, not calibrated probabilities or a broad
security evaluation. Tickets repeat eight cases; Guardrails and Approvals each
repeat 20 cases five times. Expected labels were not sent to live inference.
Qwen produces one joint structured output; Jev batches native Choice/Noul questions,
with local >0.5 thresholds and criterion-weight summation for scoring. The scoring
representation differs between providers. See [native mapping](../jev.md).

## Method and reproduction

1. Configure `CEREBRAS_API_KEY` and `JEV_KEY` locally; run `npm ci`, `npm run build`
   and `npm run start:demos:live`. Real-provider runs incur charges.
2. In the default comparison view, select each scene and press **Run demo** once.
   Export both lanes before selecting the next scene. This run used a $2 estimated
   ceiling; known total spend was **$0.32250086**. No warmups or automatic retries.
3. Save the unmodified exports as `comparison/<scene>-qwen.json` and
   `comparison/<scene>-jev.json`, using the scene IDs in the table above.
4. Run `node --import tsx scripts/summarize-comparison.mjs`. This recomputes the
   summary offline without provider calls. It validates schemas, model identities,
   success counts, token/cost arithmetic, input order, overlapping runs, fixture
   agreement and home state continuity. Exports retain the exact shuffled order.

Static scenes use **two concurrent requests per provider**, four combined.
Routing, Home and Driving use one per provider. Both sides share static inputs and
home command order; each stateful lane follows its own outputs, so later contexts
can differ. Both driving worlds start from the same configuration and warm WebGPU
renderers; dispatch times and later physics states need not be identical.

Timings cover browser fetch through response parsing/validation, including local
HTTP, the proxy/native adapter and the upstream service. Scene times also include
browser/rendering overhead. Apple M4 Pro, 24 GiB RAM, macOS 26.5.2, Node 22.15.0,
npm 10.9.2, Next 16.3.5, Codex in-app browser (version not captured). Production
localhost:3001; source commit `a081b5f`. No video encoding or repository checks ran
during inference measurement. A single session with small samples is not a
production p99/SLA or statistical claim of general model superiority.

Qwen alias: `qwen-3.8-27b`, temperature 0, reasoning none; pricing snapshot $0.99/M
input, $1.49/M output. Jev alias: `jev-latest`, returned revision **jev-1.13.0**;
account-owner pricing $0.04/M input, free output (2026-09-17). Prices are estimates,
not invoices. Native answer probabilities, question counts and model revisions
remain in raw exports. [Environment and source hashes](comparison/environment.json).

## Raw evidence

| Scene | Qwen export | Jev export |
| --- | --- | --- |
| dispatch | [Qwen](comparison/dispatch-qwen.json) | [Jev](comparison/dispatch-jev.json) |
| navigate | [Qwen](comparison/navigate-qwen.json) | [Jev](comparison/navigate-jev.json) |
| drive | [Qwen](comparison/drive-qwen.json) | [Jev](comparison/drive-jev.json) |
| screen | [Qwen](comparison/screen-qwen.json) | [Jev](comparison/screen-jev.json) |
| approve | [Qwen](comparison/approve-qwen.json) | [Jev](comparison/approve-jev.json) |
| judge | [Qwen](comparison/judge-qwen.json) | [Jev](comparison/judge-jev.json) |
| home | [Qwen](comparison/home-qwen.json) | [Jev](comparison/home-jev.json) |

[Computed summary and all mismatches](comparison/summary.json). The earlier
[Qwen-only theater run](qwen-theater.md), [CLI live](live.json) and
[local stub](local-stub.json) reports remain historical evidence. CLI benchmark
commands measure separate workloads and do not regenerate this browser comparison.
