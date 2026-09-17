# Full-theater live benchmark

Measured **2026-09-17 UTC** (September 16–17 in America/Chicago) with **Qwen 3.8
27B on Cerebras**, through the actual browser theater and production Next.js build.
This replaces the initial 12-request benchmark as the current performance report.

All seven scenes were exercised. The initial **Play all 7** slideshow stopped on a
provider HTTP 429 after 53 scoring requests. After quota recovery, Scoring was
restarted at concurrency one and Home was run separately. This is a complete set
of scene measurements across three exports, **not one uninterrupted slideshow**.
The interrupted scoring run is included in every overall total; no failed or
repeated work has been discarded.

## Results

Latency percentiles below use successful browser fetches, in milliseconds;
failed/canceled counts are shown separately. Scene wall time includes failures.

| Scene | Concurrency | Validated / dispatched | Failed / canceled | Scene seconds | Request p50 / p95 / p99 ms | Input / output tokens | Known estimated cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Tickets | 5 | 100/100 | 0/0 | 5.94 | 241 / 520 / 1251 | 71,660 / 1,600 | $0.073327 |
| Routing | 1 | 8/8 | 0/0 | 3.47 | 335 / 708 / 708 | 18,122 / 56 | $0.018024 |
| Driving | 1 | 37/38 | 0/1 | 10.00 | 242 / 378 / 542 | 29,793 / 366 | $0.030040 |
| Guardrails | 5 | 100/100 | 0/0 | 6.98 | 220 / 724 / 2632 | 43,645 / 700 | $0.044252 |
| Approvals | 5 | 100/100 | 0/0 | 7.97 | 225 / 1222 / 3472 | 45,650 / 700 | $0.046236 |
| Scoring (interrupted) | 5 | 52/53 | 1/0 | 3.03 | 234 / 435 / 1479 | 35,592 / 572 | $0.036088 |
| Scoring (completion run) | 1 | 100/100 | 0/0 | 27.91 | 228 / 353 / 1290 | 68,006 / 1,099 | $0.068963 |
| Home (completion run) | 1 | 24/24 | 0/0 | 12.21 | 308 / 527 / 4849 | 24,262 / 600 | $0.024913 |

**Overall: 521/523 validated, one HTTP 429, one driving deadline
cancellation, zero automatic retries.** Reported usage: **336,730 input /
5,693 output tokens**, estimated known cost **$0.34184527**.
Successful-request latency p50/p95/p99: **234.3 / 672.5 /
2626.7 ms**. These pooled percentiles combine different workloads and
concurrency settings; they are not a controlled concurrency comparison.

Sum of measured scene time: **77.52 seconds**. This excludes slideshow
transitions, manual interactions and the quota-recovery gap, so it is not elapsed
end-to-end session time. Per-scene decision and output-token throughput are in the
[computed summary](theater/summary.json). Output throughput divides successful
outputs by scene wall time; it does not represent provider decode speed. The
browser export has no provider completion-time telemetry, so no decode-rate claim
is made. One request is one joint structured judgment, not one independently
judged field.

## Judgment quality and outcomes

- **Tickets:** 100/100 typed responses; 75/100 exact fixture matches. The other
  25 differed only on priority: sales requests were low instead of normal and
  revoked-user access was critical instead of high. Routing/action/escalation matched.
- **Routing:** reached junction 4 from 20 in eight model-selected hops.
- **Driving:** 10.000 seconds of engine playtime, 92.45 metres, two collisions;
  37 accepted decisions and one fetch canceled at the deadline. WebGPU initialized
  before the driving timer. Typed controls did not guarantee collision avoidance.
- **Guardrails and approvals:** 100/100 exact matches each, with 50 allow and 50
  block. Each scene repeats 20 synthetic cases five times; these are not 100
  independent security examples or evidence of general attack resistance.
- **Scoring:** 93/100 exact rubric matches in the complete run; seven incomplete
  answers were scored 70 instead of 80 or 90. At the UI's strict >90 threshold,
  seven answers passed. The interrupted run matched 48/52 accepted outputs.
- **Home:** 24/24 exact fixture matches, 20 apply / 4 clarify. Export replay verified
  that each request saw the prior applied device state. No real devices were used.

Expected labels are local evaluation fixtures, not supplied to live inference.
Every mismatch is retained in the summary and every original result in the raw
exports. Fixture agreement does not prove calibrated probabilities or TypeSafe
judgment parity. Tickets repeat eight scenarios; scoring uses 100 candidate/reference
pairs, and Home uses 24 commands. No repair or output substitution was performed.

## Method and reproduction

1. Run `npm ci`, configure `CEREBRAS_API_KEY` locally, then run `npm run build`
   and `npm run start:demos:live`. This uses real paid synthetic inference.
2. Open the theater on localhost or HTTPS, select **Qwen 27B**, select **5 in
   parallel**, then **Play all 7**. There were **zero warmup requests** in this
   measurement; first-use network costs are included.
3. Export the session. If a rate limit stops it, preserve the export before
   starting another scene. Wait for quota recovery; record each later scene and
   its concurrency separately. This report's completion runs used one stream.
4. Save exports as `docs/benchmarks/theater/initial.json`, `scoring.json`, and
   `home.json`. Run `node --import tsx scripts/summarize-theater.mjs` to reproduce
   the summary without making any network calls or spending provider tokens.

The summarizer validates export shape, success/status consistency, token and cost
arithmetic, unique event IDs, home state continuity, and fixture comparisons. It
uses nearest-rank percentiles (`ceil(q × n) - 1`). Raw exports preserve exact
shuffled dispatch order, inputs, public request contracts, outcomes, timings and
usage. Request payloads differ by scene; each exported contract contains its
complete schema and context. These are synthetic data, with no provider/session
credentials included.

Browser timings span fetch dispatch through response parsing and validation,
including the Next handler, authenticated loopback proxy, upstream transport and
model inference. Scene time also includes browser scheduling/rendering overhead.
The production server was isolated on localhost:3002; the existing server remained
on 3001. Apple M4 Pro, 24 GiB RAM, macOS 26.5.2, arm64, Node 22.15.0, npm 10.9.2,
Next 16.3.5, Codex in-app browser. Browser version was not captured. Temperature 0,
Qwen reasoning none, at most five active requests; stateful loops remain sequential.

Prices use the implementation's September 16 snapshot: $0.99 input / $1.49 output
per million tokens. Known cost excludes the failed and canceled request because
no usage was exported; they may still be billed. It is not a complete invoice.
This is one development-machine observation with a rate limit and small per-scene
samples, not a saturation test, production p99/SLA, provider comparison or TypeSafe
comparison. There was no separate local-overhead benchmark in this run.

## Evidence

- [Initial slideshow, including interruption](theater/initial.json)
- [Complete scoring run](theater/scoring.json)
- [Complete home run](theater/home.json)
- [Recomputed metrics and all judgment mismatches](theater/summary.json)
- [Environment, measured-source hashes and configuration](theater/environment.json)

The measured source tree contained uncommitted work; the environment record pins
its file hashes and base commit. Before publication, abandoned alternate-provider
work was removed. An offline comparison verified that all 521 captured successful
contracts generate identical upstream request objects with the retained Cerebras
implementation; it did not rerun inference. Earlier CLI reports remain as historical raw
artifacts in [live.json](live.json) and [local-stub.json](local-stub.json); they are
not used in the figures above. CLI benchmark commands still exercise their separate
small-request workloads and do not regenerate this theater report.
