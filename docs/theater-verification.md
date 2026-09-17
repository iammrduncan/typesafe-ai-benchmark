# Decision Theater verification

Goal: a light, single-screen slideshow of six demos, with inputs left, application
center and validated results right. 100 tickets, structured navigation, 10 real
seconds of third-person WebGPU driving, 100 guardrail decisions, 100 command
approvals, and 100 golden-reference evaluations. Bulk concurrency is selectable
from one to five; stateful control loops stay sequential.

## Implementation decisions

The previous scrolling gallery is retained at `/labs`; the home page is a dedicated
viewport-sized player. Reusing the full gallery would preserve its vertical overflow
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
slideshow runs once through six scenes, then stops; it does not silently loop paid
inference. Stop cancels dispatch and in-flight fetches.

## Evidence

### Workload, cost and viewport follow-up (2026-09-16 local)

The original grids repeated ten inputs in fixed order. The original live approval
export was shape-valid but all block, including benign commands. Explicit numeric
selection mappings in the shared schema compiler fixed the ten-case live probe
without changing the approval policy or decoder. A bare label list was simpler,
but left the model to infer positions; explicit `{index,value}` pairs add a small
prompt cost and clarify every enum/boolean while keeping public behavior reversible.
No hardcoded live labels, score substitution, outcome balancing or post-hoc sorting
is used. Only fixture mode uses expected labels.

Bulk workloads now use Fisher–Yates shuffling before dispatch. Replaying the small
dataset sequentially was predictable and caused striped grids; shuffling preserves
coverage and adds no inference work. Exact inputs and dispatch order are exported.
Scoring now has weighted, auditable partial-credit criteria instead of almost all
right/wrong cases and a vague partial-credit instruction.

New live browser evidence at concurrency five (Qwen 3.8 27B, temperature zero,
reasoning none; real wall times, estimated list-price costs):

| Scene | Validated | Judgments versus fixture labels | Scene wall time | Input/output tokens | Known cost | Average/request |
| --- | --- | --- | --- | --- | --- | --- |
| Approvals | 100/100 | 50 allow, 50 block; all 100 agree | 4.59 s | 45,650 / 700 | $0.0462365 | $0.000462365 |
| Scoring | 100/100 | 11 observed score values, 0–100; 93/100 exact rubric matches | 4.73 s | 68,006 / 1,099 | $0.06896345 | $0.0006896345 |
| Guardrails | 97/100 | 48 allow, 49 block; all 97 agree | 4.39 s | 42,334 / 679 | $0.04292237 | $0.000442499 |

The scoring model under-awarded seven incomplete responses (70 instead of 80 or
90); those mistakes remain visible. Three guardrail calls hit provider rate limits
while verification and user traffic shared the same quota. No more paid tests were
run after that report. Costs for these three failed calls are unknown and excluded
from the reported average, rather than being counted as free.

The player now stops new dispatches and automatic scene advancement on HTTP 429,
lets other in-flight requests settle, and preserves their usage. An intercepted
fixture-browser regression returned one 429 with four requests in flight: exactly
five requests were sent, four completed, no next scene ran, and the average used
the four known costs. The user may manually start a fresh run later.

The reported clipped footer prompted an additional visible-height fix. The shell
is fixed to the viewport and sized from the smaller of layout/visual viewport
heights. Browser checks now inspect child bounds, not just document scroll size:
36 scene/size combinations passed, including 1512×817 (the reported window),
1512×900, 1280×632, 1024×512, 390×760 and 375×579. A separate Chrome emulation
kept layout height 900 while visual height dropped to 818.18: shell/footer followed
818.18 and metrics ended at 784.18. This tests the previously missed distinction.
Two browser fixture runs sent different permutations of all 100 approval IDs.

`npm run check` passed: 52 tests, type checks, lint, API build and Next production
build. New regressions cover explicit index mappings (including reversed enums),
shuffle coverage, mixed command cases, weighted scoring inputs and cost coverage.

Evidence: [approval run](media/theater-approvals-v2-live.json),
[scoring run](media/theater-scoring-v2-live.json),
[guardrail run with quota failures](media/theater-guardrails-v2-live.json),
[approval screenshot](media/theater-approvals-v2-live.png),
[scoring screenshot](media/theater-scoring-v2-live.png), and
[viewport fixture screenshot](media/theater-viewport-v2-fixture.png).

### Original six-scene implementation

- `npm run check`: 48 tests, strict type checks, lint and both production builds passed.
- `tests/theater.test.ts`: 400 fixture requests at concurrency five, one call per
  item; map/closure validation; exact ten-second physics clock and late-action
  rejection; output schema rejection; exact secure-origin validation.
- Browser checks: all six scenes across 1512×900, 1280×720, 1024×600,
  390×844 and 375×667 produced no document overflow (30 scene/viewport checks).
- The complete fixture slideshow automatically reached all six scenes, with 100
  validated results in each bulk scene and an exact 10,000 ms driving clock.
- A browser-observed single-stream run dispatched 100 requests with maximum one
  in flight. The cancellation check dispatched five, canceled all five, and did
  not advance to the next scene. These interception checks were separate from
  the live capture and incurred no inference charges.
- Live HTTPS WebGPU initialized and rendered the city. The live car made 35
  validated control decisions in ten seconds, covered 115 m and had two collisions.
  The pending 36th request was canceled at the end; its usage/cost is unknown.
- Live ticket, guardrail and command-approval scenes each returned 100 validated
  responses. The first scoring run returned 90/100; the later isolated recheck
  returned 100/100. Both observations are preserved.
- The first navigation run stalled on a permitted no-op. The revised cardinal-move
  contract reached junction 4 from junction 20 in eight live decisions. There is
  no live BFS or substituted move.
- Browser bundles and theater capture files were scanned against the actual local
  credentials: no matches. `.env` remains ignored.

Raw evidence: [browser check summary](media/theater-browser-checks.json),
[fixture slideshow](media/theater-fixture-results.json),
[initial live slideshow](media/theater-live-results.json),
[navigation recheck](media/theater-navigation-live-results.json),
[scoring recheck](media/theater-scoring-recheck.json), and
[untouched browser video](media/theater-live.webm).

## Requirement audit

| Requirement | Evidence |
| --- | --- |
| Light theme | Rendered driving, navigation and scoring screenshots; scoped `theater.css` palette |
| Single screen | 30 browser scene/viewport checks; viewport-sized grid with internal stream scrolling |
| Automatic slideshow | Six ordered scene runs in fixture and live exports; Stop prevented advancement |
| 100 categorized tickets | 100 real validated responses; animated 100-ticket switchboard |
| Structured routing | Full graph, closure, coordinate and cost context in exported contracts; eight-hop live arrival |
| Third-person WebGPU city, ten seconds | Renderer backend check, actual browser render/video, 10,000 ms engine record, 35 live controls |
| 100 guardrails | 100 allow/block live responses, visible 100-cell matrix |
| 100 command approvals | 100 allow/block live responses; command/permission context; no execution path |
| 100 judged evaluations | 100 input/golden/candidate cases; 100 validated accuracy/validity outputs on recheck |
| Single or batches up to five | Browser single-stream and five-in-flight cancellation checks, 400-request concurrency-five integration test |
| Inputs left / demo center / outputs right | All six scenes share the verified three-column player |

These observations prove functioning demos, not calibrated judgment quality,
prompt-injection immunity, collision-free driving or parity with TypeSafe/Jev.

## Network setup

The existing Tailscale bind and MagicDNS URL remain supported. WebGPU on another
machine needs HTTPS. Tailnet-only Tailscale Serve proxies
`https://josephs-macbook-pro.taila9c138.ts.net/` to loopback port 3001; Funnel is not enabled. A separate tailnet TCP listener
preserves the existing HTTP port 3001 URL.
Origin validation allows only the exact configured secure hostname, alongside the
existing HTTP host/port forms. No wildcard tailnet hostnames are trusted.
