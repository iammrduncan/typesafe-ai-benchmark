# Needle 3 reset-worker benchmark

Measured **2026-09-18 UTC** on Apple M4 Pro (14 cores, 24 GiB RAM), Node 22.15.0,
with the same pinned native binary, 20-layer weights, scene contracts and static
input order as the [one-process-per-request baseline](../needle/README.md).
This is a separate direct-demo-runtime run, not a simultaneous Qwen/Jev browser
comparison. There were no warmup requests, retries, repairs or fallback answers.
Every dispatched request, including failures, is retained below.

| Measurement | One-shot baseline | Reset workers |
| --- | ---: | ---: |
| Validated / dispatched | 327 / 442 | 327 / 445 |
| Invalid output / canceled | 114 / 1 | 117 / 1 |
| Successful request p50 / p95 / p99 | 403 / 867 / 919 ms | 225 / 724 / 791 ms |
| All settled request p50 / p95 / p99 | 485 / 884 / 988 ms | 293 / 728 / 809 ms |
| Sum of scene durations | 132.03 s | 94.23 s |
| Valid decisions / summed scene second | 2.48 | 3.47 |
| Native decode p50 / p95 / p99 | 846 / 1,000 / 1,031 tok/s | 864 / 1,041 / 1,060 tok/s |
| Native prefill p50 / p95 / p99 | 2,029 / 2,464 / 2,505 tok/s | 2,120 / 2,491 / 2,570 tok/s |
| Largest reported per-process peak RAM | 105.9 MB | 104.6 MB |
| Input / output tokens; API fees | Unavailable; $0 | Unavailable; $0 |

The sum of scene durations improved **28.6%**; the successful-request median
improved **44%**. These are completion/decision measurements, **not time to first
token**. The pinned CLI provides only a complete JSON response plus engine-reported
prefill/decode rates, not token timestamps or a true multi-input batch API. Native
rates exclude adapter, queueing and process startup; per-process peak RAM is not
total host memory. Zero API fees excludes hardware and electricity. No universal
speed ranking follows from this local, sequential A/B run.

## Scene results

| Scene / raw export | Valid / sent | Failed / canceled | Seconds | Success p50 / p95 / p99 ms | Exact matches / outcome |
| --- | ---: | ---: | ---: | --- | --- |
| [dispatch](dispatch-needle.json) | 85/100 | 15 / 0 | 16.51 | 179 / 512 / 773 | 0/100 |
| [navigate](navigate-needle.json) | 1/2 | 1 / 0 | 2.94 | 1467 / 1467 / 1467 | Stopped at 15; target 4 |
| [drive](drive-needle.json) | 0/19 | 18 / 1 | 10.00 | — | No valid controls; 34.57 m, 1 collision |
| [screen](screen-needle.json) | 78/100 | 22 / 0 | 8.46 | 167 / 231 / 293 | 43/100 |
| [approve](approve-needle.json) | 91/100 | 9 / 0 | 19.54 | 522 / 572 / 628 | 45/100 |
| [judge](judge-needle.json) | 48/100 | 52 / 0 | 30.35 | 659 / 791 / 799 | 1/100 |
| [home](home-needle.json) | 24/24 | 0 / 0 | 6.43 | 201 / 416 / 606 | 0/24 |

For all non-driving requests, validation status and decoded decisions matched the
baseline item-for-item. Driving is a ten-second control loop, not a fixed input
list: faster failures allowed three additional requests, but none produced a
valid control. Its distance is default coasting/physics, not model-directed
driving. Valid shapes did not make the other scene judgments accurate; the
[summary](summary.json) preserves expected/actual mismatches.

## Method and reproduction

```sh
npm ci
npm run build -w @decision/api
npm run setup:needle
node --import tsx scripts/benchmark-needle.mjs .artifacts/needle-benchmark-new
node --import tsx scripts/summarize-needle.mjs .artifacts/needle-benchmark-new
```

The destination must not exist. Static schemas use up to two independent native
workers; each handles at most one request at a time and resets its conversation
before the next. Workers start lazily, expire after five idle seconds and are
killed on cancellation. Navigation retains fresh processes because its tool
schema varies by junction. The global demo admission limit is five in-flight
requests, including queue wait, with a 16-second end-to-end deadline. Routing
and Home stop at their first invalid response. Driving runs for ten seconds and
cancels its outstanding request. No renderer, browser, HTTP frontend or cloud
provider is included in the benchmark timing.

The one-shot baseline used the same two static caller streams. A separate
20-input direct-native diagnostic compared cold 1/2/4-way processes and warm
2/4-way workers: warm two-worker guardrails took 1.66 s versus 2.61 s cold;
dispatch took 3.53 s versus 5.61 s. Four-way cold contention increased median
per-request latency, and one thread per process did not materially help. The
diagnostic script is `scripts/probe-needle-speed.mjs`. The native server was
verified bound to `127.0.0.1` on this pinned binary; only synthetic data was used.

[Environment, configuration and source hashes](environment.json) ·
[Computed summary, distributions and all mismatches](summary.json) ·
[Adapter and routing limitations](../../needle.md)
