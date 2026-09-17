# First benchmark: Qwen on Cerebras

Measured 2026-09-16. Raw reproducible reports:
[live.json](live.json), [local-stub.json](local-stub.json).
Commands and flag limits are in [examples/README.md](../../packages/api/examples/README.md).

| Metric | Live Cerebras | Local HTTP + upstream stub |
| --- | ---: | ---: |
| Measured requests | 12 | 100 |
| Warmup requests (excluded from latency) | 1 | 1 |
| Concurrency | 1 | 1 |
| Successes / failures / retries | 12 / 0 / 0 | 100 / 0 / 0 |
| HTTP latency p50 | 198.79 ms | 0.82 ms |
| HTTP latency p95 | 1,304.85 ms | 2.10 ms |
| HTTP latency p99 | 1,304.85 ms | 2.96 ms |
| Measured input / output tokens | 3,858 / 108 | 10,000 / 1,000 synthetic |
| End-to-end output tokens/s | 29.84 | Synthetic; not model speed |
| Provider-reported decode tokens/s | 1,209.59 | No real model |
| Measured estimated cost | $0.00398034 | $0 |
| Whole-run estimated cost including warmup | $0.00429768 | $0 |

Live usage including warmup: **4,165 input / 117 output tokens**. All 13 live
calls had usage, so no unknown-usage calls were omitted from this cost estimate.
Pricing snapshot: Qwen $0.99 input / $1.49 output per million tokens, checked
2026-09-16 against the [Cerebras model documentation](https://inference-docs.cerebras.ai/models/qwen-3.8-27b).
Costs are arithmetic estimates, not invoices or account-specific prices.

Both routes are exercised equally using one small bounded numeric judgment per
request. The TypeSafe route's six measured requests had p50 198.79 ms and p95
1,304.85 ms; OpenAI's six had p50 196.11 ms and p95 211.34 ms. At this sample size,
p95/p99 are effectively the slowest observation, not reliable production tails.
No attribution of the outlier to a particular service component is asserted.

The runner makes actual loopback HTTP calls to the proxy and separately records
upstream round-trip-plus-validation time, local queue wait and numeric provider
queue/prompt/completion times when available. Local residual includes HTTP and
loopback work, not just CPU processing. The stub report is a local baseline; it
cannot predict provider/network latency. Runtime and hardware are in each report.

End-to-end tokens/s divides successful output tokens by summed successful HTTP
latency. Provider decode tokens/s divides those tokens by reported completion time,
with 12/12 measured timing samples in this run. Aggregate output throughput divides
by measured wall time (29.84 tokens/s here, rounded). Neither metric should be
confused with the provider's advertised peak generation rate; the outputs here were
only nine tokens each. This run measures a small request workload, not saturation.

Run `npm run benchmark:live -- --samples=12 --warmup=1 --concurrency=2` to repeat
with bounded concurrency. Another run overwrites live.json. GPT OSS is selectable
but was not live-benchmarked. Multi-question scaling, long outputs, model comparison
and compact-versus-full-JSON token savings remain unmeasured.
