# Qwen 2.5 1.5B RLCD mapping v2 benchmark

Measured 2026-09-19 UTC on the Apple M4 Pro described in
[environment.json](environment.json). This is one direct-runtime run of the pinned
RLCD engine and pinned MLX weights using clean commit
`dcf8fd5bac0dc7bb718dd6c4eeb4cc4c56bef2f6`. No browser, HTTP server, cloud model,
warmup request, retry, repair, fixture lookup or fallback was involved.

Mapping v2 fixes the v1 adapter's semantic mismatch. The upstream engine scores the
first token of each choice, so v2 supplies compact task evidence and distinct semantic
labels instead of raw scene JSON and literal wire values. Judge criteria are evaluated
as parallel `YES` / `NO` fields, then their declared weights are summed through the
unchanged public validator.

## Results

| Scene | Validated / sent | Wall time | End-to-end p50 / p95 | Engine p50 | Prefill p50 | Batched suffix p50 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Tickets | 100 / 100 | 13.00 s | 240 / 242 ms | 120 ms | 94 ms | 21 ms |
| Routing | 9 / 9 | 2.20 s | 236 / 314 ms | 235 ms | 223 ms | 10 ms |
| Driving | 95 / 96 | 10.31 s | 105 / 107 ms | 104 ms | 82 ms | 19 ms |
| Guardrails | 100 / 100 | 8.03 s | 131 / 133 ms | 65 ms | 55 ms | 9 ms |
| Approvals | 100 / 100 | 6.61 s | 131 / 137 ms | 65 ms | 55 ms | 9 ms |
| Scoring | 100 / 100 | 12.59 s | 246 / 273 ms | 121 ms | 96 ms | 22 ms |
| Home | 24 / 24 | 5.24 s | 217 / 225 ms | 216 ms | 167 ms | 41 ms |
| **Total** | **528 / 529** | **58.00 s** | **133 / 258 ms** | **104 ms** | **83 ms** | **19 ms** |

The one cancellation was the in-flight driving request at the fixed ten-second
deadline. No request failed validation. Successful throughput was 9.10 decisions/s
across the sum of scene durations. Static scenes used two concurrent callers, but one
persistent worker serialized independent inputs; field suffixes within each request
were batched. End-to-end timing includes queue wait.

Compared with the original v1 capture, total median end-to-end latency fell from
213 ms to 133 ms, median engine time from 125 ms to 104 ms, and throughput rose from
6.06 to 9.10 decisions/s. The stateful driving scene emitted more calls in the fixed
ten-second window, so total request counts differ. These separate local runs are not
a universal model or provider speed ranking.

## Judgment outcomes

| Outcome | v1 | v2 |
| --- | ---: | ---: |
| Ticket exact fixture matches | 0 / 100 | 13 / 100 |
| Guardrail exact fixture matches | 50 / 100 | 90 / 100 |
| Approval exact fixture matches | 50 / 100 | 80 / 100 |
| Scoring exact fixture matches | 3 / 100 | 16 / 100 |
| Home exact seven-field matches | 0 / 24 | 0 / 24 |
| First-token collision requests | 124 | 0 |

Home remains a useful warning about exact-object metrics: v2 matched 76 of 168
individual fields, including 20 of 24 action fields, but never matched all seven fields
in one request. Routing still did not reach the target; it followed
`20 → 15 → 10 → 5 → 0 → 1 → 2 → 1 → 0 → 1`. Driving covered 9.76 m with one
collision. Type validity is not judgment quality, and the full expected/actual
mismatches remain in [summary.json](summary.json).

The v2 improvements establish that the old all-block behavior was an adapter error,
not an intrinsic result of the weights. The remaining low ticket, scoring, routing,
driving and home quality also establishes that corrected constrained decoding does not
make this 1.5B instruct model a reliable general judge, planner or controller.

## Method

- Engine: `harshatheg/Qwen-2.5-1B-RLCD` at
  `2af86848be75847ccb3553b0941cc51d6ef7e4e9`.
- Actual weights: `mlx-community/Qwen2.5-1.5B-Instruct-4bit` at
  `8b403126fc14f14cfc99bb4cfa72ecbc129ea677`.
- Temperature 1; one persistent FIFO worker; two callers for static scenes and one
  for routing, driving and home.
- Same static request order as the published Qwen/Jev comparison. Stateful scenes
  follow this model's prior validated decisions.
- Zero API fees exclude hardware and electricity. Token counts are unavailable.

Reproduce a new directory:

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
