# Needle 3 local benchmark

Measured **2026-09-18 UTC** on Apple M4 Pro (14 cores, 24 GiB RAM), Node 22.15.0.
This is a separate direct-runtime run, not the historical paired Qwen/Jev browser run.
It uses the demo's actual Needle adapter, strict validation, shared synthetic workloads
and historical Qwen input order. No cloud API calls, warmups, retries, output repairs,
or fallback answers. Every dispatched request is retained.

| Measurement | Needle 3 local |
| --- | ---: |
| Validated / dispatched | 327 / 442 (74.0%) |
| Invalid output / canceled | 114 / 1 |
| Successful request p50 / p95 / p99 | 403 / 867 / 919 ms |
| All settled request p50 / p95 / p99 | 485 / 884 / 988 ms |
| Sum of scene durations | 132.03 s |
| Valid decisions / summed scene second | 2.48 |
| Native engine decode p50 / p95 / p99 | 846 / 1,000 / 1,031 tok/s |
| Native engine prefill p50 / p95 / p99 | 2,029 / 2,464 / 2,505 tok/s |
| Largest reported per-process peak RAM | 105.9 MB |
| Total input / output tokens | Unavailable / unavailable |
| API fees / average API fee per request | $0 / $0 |

Native rates and RAM are engine-reported for successful requests only. They exclude
startup/validation and are not aggregate end-to-end throughput. RAM is not total
host memory or concurrent-process memory. Token counts cannot be reconstructed
from these rates. Zero API fees excludes hardware and electricity.

## Scene results

Exact matches below divide by **all dispatched requests**, counting invalid output
as no match. The summary also records quality among validated outputs separately.

| Scene / raw export | Valid / sent | Failed / canceled | Seconds | Success p50 / p95 / p99 ms | Exact matches / outcome |
| --- | ---: | ---: | ---: | --- | --- |
| [dispatch](dispatch-needle.json) | 85/100 | 15 / 0 | 26.57 | 397 / 716 / 789 | 0/100 |
| [navigate](navigate-needle.json) | 1/2 | 1 / 0 | 2.81 | 1388 / 1388 / 1388 | Stopped at 15; target 4 |
| [drive](drive-needle.json) | 0/16 | 15 / 1 | 10.00 | — / — / — | No valid controls; 34.57 m, 1 collision |
| [screen](screen-needle.json) | 78/100 | 22 / 0 | 12.51 | 252 / 284 / 322 | 43/100 |
| [approve](approve-needle.json) | 91/100 | 9 / 0 | 26.82 | 648 / 758 / 767 | 45/100 |
| [judge](judge-needle.json) | 48/100 | 52 / 0 | 38.25 | 832 / 919 / 988 | 1/100 |
| [home](home-needle.json) | 24/24 | 0 / 0 | 15.07 | 575 / 783 / 805 | 0/24 |

Routing stopped on invalid output after 20 → 15. Driving had no validated control
responses: its distance comes entirely from initial speed, default coasting and
collision physics, **not successful model driving**. Home returned well-typed outputs
for all 24 commands but none matched every expected field. Full expected/actual
mismatches are retained in [summary.json](summary.json). Type validity is not quality.

## Method and reproduction

```sh
npm ci
npm run build -w @decision/api
npm run setup:needle
node --import tsx scripts/benchmark-needle.mjs .artifacts/needle-benchmark-new
node --import tsx scripts/summarize-needle.mjs .artifacts/needle-benchmark-new
```

The output directory must not exist; previous measurements are never overwritten.
The summarizer is offline. To regenerate this published summary only:
`node --import tsx scripts/summarize-needle.mjs`.

Revision `9da75122d4ca11aa4a667281c9c8ba38a7eed679`, depth 20, maximum 512 generated
tokens, forced tool calling, input overflow rejected. Each request starts a fresh
native process. Static scenes run two requests concurrently; Routing, Driving and
Home run one at a time. Home state follows Needle's own decisions. Routing and Home
stop at their first invalid response. Driving runs for ten seconds and cancels its
outstanding request. The same driving physics engine ticks every 60 ms; no WebGPU
renderer is running in this harness.

Monotonic request timing surrounds the demo runtime call, including input/output
validation, temporary tool file creation, process startup, inference and cleanup.
It **excludes browser rendering and HTTP**, unlike the historical Qwen/Jev request
timings. It ran alone, not alongside either provider. These differences prevent a
controlled speed ranking. Scene totals exclude file export and setup. No repository
tests or builds ran during inference. Failures preserve safe adapter errors; raw
native reasoning is deliberately not exported.

[Environment, configuration, binary/weight/source hashes](environment.json) ·
[Computed summary, latency distributions and all mismatches](summary.json) ·
[Needle integration and routing limitations](../../needle.md)
