# Decision Theater verification

The primary runner compares LLM-native Qwen 3.8 on Cerebras with native Jev across
seven workloads: Tickets, Routing, Driving, Guardrails, Approvals, Scoring and Home.
The default side-by-side view launches both models on matching workload order,
with two concurrent requests per model for bulk scenes and sequential stateful
loops. Each lane records independent outcomes and timings. Single-model mode
retains the original input/visual/output layout and up to five concurrent calls.

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

The [paired benchmark](benchmarks/README.md) measures all seven scenes with Qwen
and native Jev running together in the production comparison UI. Qwen validated
475/476 dispatches and Jev 479/480. Each canceled one outstanding driving request
at the ten-second deadline; neither encountered an HTTP failure or rate limit.
Both lanes started within 0–2 ms for every scene. Static request inputs and order
were verified equal; stateful worlds evolved independently from matching setup.

Raw exports, environment/source hashes, an offline summarizer and every fixture
mismatch are tracked in `docs/benchmarks/comparison/`. The prior Qwen-only report
is retained as [historical evidence](benchmarks/qwen-theater.md).

Fixture agreement: Tickets 75/100 each; Guardrails 100/100 each; Approvals 100/100
Qwen and 95/100 Jev; Scoring 93/100 Qwen and 100/100 Jev; Home 24/24 Qwen and 15/24
Jev. Both navigated to the target in eight hops and had one driving collision.
These figures distinguish accepted output shape from judgment quality. Every
home input was checked against the previous applied state. No real devices or
commands were operated.

The README GIF, compressed MP4 and still were replaced with the user's September
17 side-by-side recording. Recording timings are illustrative and separate from
the exported benchmark measurements. Incidental verification artifacts remain
ignored under `.artifacts/demo-verification/`.
