# Qwen 2.5 1.5B RLCD local benchmark

Measured 2026-09-19 UTC (2026-09-18 America/Chicago) on the Apple M4 Pro described
in [environment.json](environment.json). This is one direct-runtime run of the
pinned RLCD engine and pinned MLX weights, using commit
`9553cdd2812f56b26796855b008aa2192e04719a`. No browser, HTTP server, cloud model,
warmup request, retry, repair or fallback was involved.

## Results

| Scene | Validated / sent | Wall time | End-to-end p50 / p95 / p99 | Engine p50 | Prefill p50 | Batched suffix p50 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Tickets | 100 / 100 | 14.47 s | 253 / 258 / 1,969 ms | 126 ms | 99 ms | 22 ms |
| Routing | 7 / 7 | 6.03 s | 856 / 886 / 886 ms | 854 ms | 837 ms | 12 ms |
| Driving | 46 / 47 | 10.62 s | 211 / 253 / 315 ms | 210 ms | 187 ms | 21 ms |
| Guardrails | 100 / 100 | 8.74 s | 141 / 148 / 1,700 ms | 70 ms | 59 ms | 10 ms |
| Approvals | 100 / 100 | 8.86 s | 175 / 183 / 184 ms | 87 ms | 75 ms | 10 ms |
| Scoring | 100 / 100 | 24.31 s | 410 / 1,004 / 1,085 ms | 201 ms | 163 ms | 18 ms |
| Home | 24 / 24 | 5.73 s | 211 / 416 / 467 ms | 209 ms | 146 ms | 42 ms |
| **Total** | **477 / 478** | **78.76 s** | **213 / 692 / 1,087 ms** | **125 ms** | **98 ms** | **17 ms** |

The one cancellation was the in-flight driving request at the fixed ten-second
deadline. No request failed validation. Successful end-to-end throughput was
6.06 decisions/s across the sum of scene durations.

The caller dispatched two requests concurrently in static scenes, matching the
historical input order and concurrency. Actual MLX inference remained one request at
a time because the upstream engine has a process-global GPU lock. This is why the
overall 213 ms end-to-end p50 is higher than the 125 ms engine p50: a queued request
includes another request's service time. The engine does batch all output fields
within one request. These results do not demonstrate parallel input batching.

The high ticket and guardrail p99 values include cold worker/model load. The driving
deadline kills its active worker to guarantee cancellation, so the following scene
pays another cold load. Those costs are retained.

## Judgment outcomes

| Outcome | Result |
| --- | ---: |
| Ticket exact fixture matches | 0 / 100 |
| Guardrail exact fixture matches | 50 / 100 |
| Approval exact fixture matches | 50 / 100 |
| Scoring exact fixture matches | 3 / 100 |
| Home exact fixture matches | 0 / 24 |
| Routing | Did not reach target; looped `20 → 15 → 10 → 5 → 0 → 5 → 0 → 5` |
| Driving | 13.69 m, one collision |

Shape validity and decision quality are sharply different here. All 477 completed
responses conformed to their strict local contracts, but the model/engine combination
performed poorly against these synthetic fixture labels. Guardrail and approval
outputs each matched only the balanced half of their workload. Ticket decisions had
no exact four-field matches. The complete expected/actual mismatches remain in
[summary.json](summary.json); none were repaired or discarded.

The scoring accuracy field and every home temperature field use multi-token integer
choices. The upstream collision path was exercised for 124 requests. Its winning
score is synthesized with a minimum of 0.75 and it may fall back to the first choice;
these scores are not calibrated probabilities. String-only scenes had no collision
fields, so collisions alone do not explain their poor judgment quality.

## Method

- Engine: `harshatheg/Qwen-2.5-1B-RLCD` at
  `2af86848be75847ccb3553b0941cc51d6ef7e4e9`.
- Actual weights: `mlx-community/Qwen2.5-1.5B-Instruct-4bit` at
  `8b403126fc14f14cfc99bb4cfa72ecbc129ea677`.
- Temperature 1; one persistent FIFO worker; two callers for static scenes and one
  for routing, driving and home.
- Same static request order as the published Qwen/Jev comparison. Home uses the same
  command order but carries this model's resulting state forward. Routing and driving
  are stateful and therefore follow this model's decisions.
- End-to-end latency starts before demo runtime dispatch and ends after strict scene
  validation. Engine, prefill and batched-suffix timings are reported by the pinned
  engine. Token counts are unavailable. Zero API fees exclude hardware/electricity.

This was measured separately from the browser Qwen/Jev comparison and the Needle
run, so it is not a controlled universal speed ranking. Reproduce a new directory:

```sh
npm run setup:rlcd
npm run benchmark:rlcd -- .artifacts/rlcd-benchmark-new
npm run summarize:rlcd -- .artifacts/rlcd-benchmark-new
```

## Raw evidence

- [Tickets](dispatch-rlcd.json)
- [Routing](navigate-rlcd.json)
- [Driving](drive-rlcd.json)
- [Guardrails](screen-rlcd.json)
- [Approvals](approve-rlcd.json)
- [Scoring](judge-rlcd.json)
- [Home](home-rlcd.json)
- [Computed summary](summary.json)
- [Environment, configuration and hashes](environment.json)
