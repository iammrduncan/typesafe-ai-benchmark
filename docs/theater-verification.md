# Decision Theater verification

Goal: a single-screen slideshow of seven demos, with inputs left, application
center and validated results right. 100 tickets, structured navigation, 10 real
seconds of third-person WebGPU driving, 100 guardrail decisions, 100 command
approvals, 100 golden-reference evaluations, and 24 home automation commands. Bulk concurrency is selectable
from one to five; stateful control loops stay sequential.

## Implementation decisions

The previous scrolling gallery and its `/labs` and `/demos/[id]` routes have been
removed; the home page is a dedicated viewport-sized player. Reusing the full gallery would preserve its vertical overflow
and competing controls. A bounded player keeps scene switching and cancellation in
one owner; the original API and contract gate stay unchanged.

Each bulk item uses one atomic strict-schema request. Five concurrent independent
requests give progressive completion without batching unrelated contexts into one
completion. This repeats request overhead, but preserves per-item failure, timing
and validation. No unvalidated partial tokens are rendered.

Three.js 0.186.0 supplies scene geometry, materials and the perspective camera. Its
WebGPURenderer can automatically fall back to WebGL, so the app explicitly checks
that its initialized backend is WebGPU and reports an error otherwise. This is an
actual city scene with a chase camera, rendered meshes, steering, throttle, road
edges and obstacle collisions. The car receives structured sensor state rather
than screenshots. The physics clock advances from monotonic elapsed time; it stops
at 10,000 ms and cancels outstanding inference. Late results cannot change controls.

A separate API call is made for every navigation hop, with the whole street graph,
closures, costs, target, history and legal exits. The caller enforces legal moves;
only fixture mode uses BFS. Live navigation can loop or choose a poor route.

The auto-approver evaluates commands as data. It never invokes a shell or grants
permissions. Guardrail outputs are model judgments, not a security guarantee.
Scoring compares candidate answers to the input and golden reference, returning
integer accuracy and boolean validity. No reasoning text crosses the type gate.

There is one 1.2-second presentation transition between scenes. It is outside the
reported scene duration and never added to or removed from request timings. The
slideshow runs once through seven scenes, then stops; it does not silently loop paid
inference. Stop cancels dispatch and in-flight fetches.

## Home, score policy and inspection decisions (2026-09-16)

Home automation reuses the reel's request lifecycle, validated OpenAI schema and
sequential control loop. A parallel set of independent houses would improve request
throughput, but would not demonstrate commands changing a shared home. The selected
single-house loop makes 24 shuffled requests with the current state, takes one
provider round trip per command, and is easy to remove as one scene. No new
infrastructure or dependencies were added. Only validated `apply` decisions update
the simulated lights, blinds and thermostat; clarification and failures leave them
unchanged. Every command includes its actual input snapshot in the session export.

The judge previously counted the model's boolean completeness field while coloring
scores >=80 green. That produced two incompatible visible definitions of validity.
The count and tile colors now share a local strict `accuracy > threshold` policy,
initially >90%. Re-prompting for each slider change would add latency/cost and replace
the original evidence. Instead, the slider reclassifies existing results instantly,
while preserving the raw accuracy and model `valid` values. Exported judge runs
include the display threshold at export time, comparator and derived valid count.

Sorted tickets, verdict/score tiles and home history commands select an event by
its stable dispatch ID. Selection pins both side panes and highlights the tile;
new completions do not override it. Follow live clears the pin. Home selections
also show the historical device state; device buttons select their last command.
Undispatched cells are disabled, pending cells show waiting output, and failed
requests remain inspectable. Buttons support keyboard activation. No click or
threshold adjustment makes an inference call or modifies request timing.

## Current benchmark evidence — 2026-09-17 UTC

The [full-theater benchmark](benchmarks/README.md) replaces the prior piecemeal
latency/cost tables. All seven scenes ran against Cerebras Qwen through the
production browser UI. The initial slideshow stopped on HTTP 429 during Scoring;
complete Scoring and Home runs were captured separately. All 523 dispatches remain
in the report: 521 validated, one rate limit and one driving deadline cancellation.

Raw exports, environment metadata, a reproducible offline summary and every
fixture mismatch are published in `docs/benchmarks/theater/`. These curated
benchmark artifacts are intentionally tracked; incidental recordings/screenshots
remain in ignored `.artifacts/demo-verification/`. README media is allowlisted
under `docs/media/`.

Home replay confirmed all 24 inputs reflected the prior device state, with 20
apply and four clarify outputs. Guardrails and approvals matched all 100 fixtures
each; Tickets matched 75/100 complete outputs and Scoring 93/100. Routing reached
its destination in eight hops. The WebGPU driving engine ran ten seconds, covered
92.45 metres and had two collisions. All output-shape checks passed for accepted
responses; judgment mistakes remain visible. No real devices or commands ran.

The browser's rate-limit stop preserved in-flight results and prevented automatic
advance. The complete scoring follow-up used one stream; the report does not
claim that it completed at concurrency five or that the whole slideshow ran
without interruption. See the benchmark for timings and known-cost accounting.

Final publication checks: `npm run check` passed with 38 API tests and 18 demo
tests, strict type checks, lint and both production builds. The offline report
recomputation and independent counts, percentiles, cost and export-hash checks
passed. Only the two Cerebras models remain in the application.
