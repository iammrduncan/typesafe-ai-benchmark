# Needle 3 schema-capped benchmark

Measured **2026-09-19 UTC** on the Apple M4 Pro described in
[environment.json](environment.json). This is one direct-runtime run of the pinned
Needle 3 binary and weights on the same static input order as the published
Qwen/Jev comparison. No browser, HTTP server, cloud model, warmup request, retry,
repair, fixture lookup or fallback was involved.

Mapping v2 fixes an output-budget error in v1. The native engine can continue from
one complete call into additional calls until `--max` is exhausted. V1 gave every
schema 512 tokens, then correctly rejected responses containing more than one call.
V2 sizes the cap for one complete schema: 24 tokens for one-field routing,
guardrails and approvals; 32 for driving and scoring; 160 for Home. Dispatch keeps
512 because its four-field schema lost valid calls at smaller measured caps.

The decoder is unchanged. Missing, conflicting, wrongly named, extra-field and
out-of-range outputs still fail validation; v2 does not select the first call,
retry, repair or substitute a deterministic answer.

## Results

| Scene | Validated / sent | Wall time | Success p50 / p95 / p99 |
| --- | ---: | ---: | ---: |
| Tickets | 85 / 100 | 15.90 s | 172 / 494 / 675 ms |
| Routing | 8 / 8 | 8.75 s | 1,095 / 1,103 / 1,103 ms |
| Driving | 53 / 54 | 10.01 s | 185 / 190 / 273 ms |
| Guardrails | 100 / 100 | 2.80 s | 53 / 59 / 142 ms |
| Approvals | 100 / 100 | 3.49 s | 67 / 75 / 166 ms |
| Scoring | 100 / 100 | 9.53 s | 187 / 216 / 280 ms |
| Home | 24 / 24 | 5.31 s | 193 / 269 / 557 ms |
| **Total** | **470 / 486** | **55.79 s** | **161 / 444 / 1,095 ms** |

The remaining 15 failures are dispatch outputs; the one cancellation is the
in-flight driving request at the fixed ten-second deadline. Successful throughput
was **8.42 decisions/s** across the sum of scene durations, up from 3.47 in the
reset-worker v1 run. The successful median fell from 225 ms to 161 ms and the sum
of scene durations fell 40.8% from 94.23 seconds. Request totals differ because
routing now completes and driving fits more validated controls into ten seconds.

The default route reached junction 4 from 20 in eight valid hops:
`20 → 15 → 10 → 5 → 0 → 1 → 2 → 3 → 4`. V1 stopped after its second request
returned conflicting calls. Driving produced 53 valid controls instead of zero,
covered 13.79 m and had one collision.

These are completion/decision measurements, not time to first token. Native median
decode and prefill rates were 990 and 2,255 tokens/s; they exclude adapter and queue
time. Zero API fees exclude hardware and electricity. This separate local run is
not a controlled or universal provider speed ranking.

## Judgment outcomes

| Exact fixture agreement | V1 | V2 |
| --- | ---: | ---: |
| Tickets | 0 / 100 | 0 / 100 |
| Guardrails | 43 / 100 | 70 / 100 |
| Approvals | 45 / 100 | 45 / 100 |
| Scoring | 1 / 100 | 0 / 100 |
| Home | 0 / 24 | 0 / 24 |

The caps fix validity and unnecessary generation, not general judgment quality.
Needle is designed around tool selection and grounded argument extraction; these
shared benchmark tasks also demand abstract policy, evaluation, planning and
control judgments. Valid shape is not equivalent to a correct decision. Every
expected/actual mismatch remains in [summary.json](summary.json).

## Method

- Engine and weights: `Cactus-Compute/needle3` at
  `9da75122d4ca11aa4a667281c9c8ba38a7eed679`.
- Full 20-layer rung; forced structured selection; input overflow fails instead of
  truncating; no token counts are available.
- Two reset workers for static schemas; one fresh native process for every routing
  hop because its legal-move schema changes. One caller for routing, driving and
  Home.
- Same static input order as the published Qwen/Jev comparison. Stateful scenes
  follow this model's prior validated decisions.

Reproduce a new directory:

```sh
npm run setup:needle
node --import tsx scripts/benchmark-needle.mjs .artifacts/needle-benchmark-new
node --import tsx scripts/summarize-needle.mjs .artifacts/needle-benchmark-new
```

## Raw evidence

- [Tickets](dispatch-needle.json)
- [Routing](navigate-needle.json)
- [Driving](drive-needle.json)
- [Guardrails](screen-needle.json)
- [Approvals](approve-needle.json)
- [Scoring](judge-needle.json)
- [Home](home-needle.json)
- [Computed summary](summary.json)
- [Environment, configuration and hashes](environment.json)
