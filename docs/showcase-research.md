# Showcase research and implementation

Checked 2026-09-16. The aim is to let people test whether an ordinary LLM plus a
strict contract is sufficient for their application, not assert unmeasured Jev parity.

## What the public materials show

TypeSafe's [launch article](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
describes a side-by-side decision workload, a Doom control loop using structured
state, and Wikiracing over available links. It also explains that its broad speed
and cost claims come from workflow evaluations, not every individual demo.
The [homepage](https://typesafe.ai/) presents outcomes and cost/latency together.
Their public [LLM adapter](https://github.com/typesafe-ai/system-one-adapter-python)
already demonstrates the idea of a compatible interface on ordinary providers.

The founder's [launch post](https://x.com/CompleteSkeptic/status/2099925682726002904)
and [Doom post](https://x.com/CompleteSkeptic/status/2099925687465570372) were located
through indexed references. Direct X requests returned 403; the clips were not
watched or independently timed. Social snippets helped locate primary material,
but are not used as performance evidence. Earlier smart-home/cookbook references
remain in [examples.md](examples.md).

## What we built in response

The Next.js Decision Arcade puts four applications side by side. Support routing
shows composed Choice/Score/Noul judgments; the home translates text to finite
light states; the courier closes the loop between current state and legal actions;
the screening panel exposes model estimates and the caller's policy. These are
original, simulated workflows—not a Doom port or a reproduced Wikipedia workload.

Each run has an editable live input, inspectable contract and result, measured
browser/proxy time, provider token usage, estimated cost and downloadable receipt.
There is no manufactured Jev latency, hidden failure, time-stretched recording,
or live deterministic controller disguised as a model. Fixture mode is visibly
labeled and disables custom inputs. Live courier mistakes remain visible.

## Why this design

A single terminal clip proves a request; visible state changes show usefulness.
A Next.js app with a small catalog, request builder and reusable React stages
supports adding ideas quickly. A separate npm API workspace keeps the validation
boundary independently testable and usable by other clients. A large provider or
demo plugin framework would slow iteration without serving these four workflows.

The demo runtime imports the API package server-side and calls its actual HTTP
routes over loopback. This avoids requiring users to configure two processes for
local experimentation; it also adds a measurable HTTP hop. The standalone API
remains available separately. This local architecture is deliberately not a
multi-user public deployment or distributed billing system.

Measured usability, correct judgments, calibration, cost, and performance are
separate questions. The app makes it possible to collect those observations;
it does not claim that all of them already favor this implementation.

## Decision stream revision

The primary view now follows a complete work stream: structured tickets on the
left, queues in the middle, finite typed results on the right. Each support ticket
includes customer, plan, payment and incident context. Bursts submit up to three
concurrent one-call OpenAI judgments and release only fully validated decisions.
The UI measures aggregate decision and output-token throughput over actual run
wall time; it does not simulate token streaming or substitute scripted live results.
This retains atomic validation and uses existing HTTP routes instead of adding an
SSE lifecycle solely for presentation. Original single-request labs remain below.


## Single-screen theater revision

The current implementation moves the spectacle into six finite scenes, with a
light instrument-panel palette, animated ticket sorting, a street graph, a WebGPU
city, binary decision matrices and an evaluation score grid. Each scene shares
input/output streams and measured receipts. The visual reference is TypeSafe's
machine-oriented diagrams, live state changes and workload views, not its proprietary
assets or unmeasured speed claims. The cited website was revisited; direct X clips
remain inaccessible and are not claimed as watched or timed.

Three.js's [WebGPURenderer documentation](https://threejs.org/docs/pages/WebGPURenderer.html)
explains its automatic WebGL fallback. We explicitly check the initialized backend
and reject that fallback for this demo, so a WebGPU label means actual WebGPU.
Tailnet-only HTTPS supplies the secure context needed by remote browsers.
