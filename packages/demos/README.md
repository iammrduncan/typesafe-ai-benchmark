# Decision Theater · Next.js demos

The home page is a Dracula-themed, viewport-sized player. Inputs stay on the left, the
application is in the center, and validated typed returns arrive on the right.
The charcoal surfaces, purple controls, cyan keys, yellow strings and pink literals
follow the [Dracula palette](https://draculatheme.com/contribute). The map, verdict
grids and WebGPU city use matching colors. There is no document scrolling; the
input/output feeds scroll inside their panels.

| Scene | Workload | Result |
| --- | --- | --- |
| Ticket switchboard | 100 structured customer tickets | Animated sorting into billing, technical, trust and sales queues |
| Routing | Street graph, closures, travel costs, coordinates, destination and history | One legal cardinal move per model call; click a junction to change the destination |
| WebGPU driving | 10 real seconds, continuous sensor updates | Third-person angled camera following a car through a rendered city; typed steering/throttle controls |
| Guardrails | 100 incoming requests | Allow/block decisions on a live 100-cell grid |
| Auto approver | 100 coding-agent commands plus permissions and task context | Allow/block decisions; no command is executed |
| LLM judge | 100 input/golden/candidate triples | Accuracy matrix with adjustable validity threshold; green tiles and the count share the same strict comparison |
| Home automation | 24 shuffled household requests, each with current device state | A live floor plan: four room lights, blinds and an 18–26°C thermostat; ambiguous/unsupported commands request clarification |

**Play scene** runs the selected scene. **Play all 7** starts at tickets, advances
through all seven, and stops at the end. **Stop** cancels dispatch and outstanding
requests. Independent items allow 1–5 concurrent requests. Navigation, driving and home automation
are sequential because each decision needs the latest world state.

The header dropdown offers Qwen 27B and GPT OSS 120B on Cerebras. The selected
model's input/output prices appear beneath the dropdown. Selection is locked
during a run; changing it clears prior results. Requests, exports and estimates
use the chosen model. Qwen is the default; unknown model names fail before inference.

**Jev · TypeSafe** uses the real native TypeSafe API when `JEV_KEY` (or
`TYPESAFE_API_KEY`) is configured. Unconfigured models are disabled. Jev-only
setups default to Jev. [Native mapping, response validation and cost limits](../../docs/jev.md).
Exports include native probabilities, actual model revision and mapping version;
the contract dialog shows the TypeSafe request. Jev pricing is $0.04/M input with free output, supplied by the account owner.

Set `CEREBRAS_API_KEY` in the root `.env`. The key stays server-side. Fixture mode
uses synthetic outputs and zero billed cost. GPT OSS can use internal reasoning
tokens; these count in usage but reasoning is never returned. Both models use
strict upstream schema mode and the same local output gate, without repair or
fallback. [Current Qwen theater benchmark](../../docs/benchmarks/README.md).

Each bulk run shuffles all 100 inputs before dispatch. Exports retain the actual
request order and input/output pairing. Guardrails and approvals each contain 20
synthetic scenarios, balanced between 10 benign/permitted and 10 hostile/forbidden
cases, repeated five times. Scoring contains 100 distinct reference/candidate pairs:
six four-fact references with all completeness combinations and four edge cases.
Explicit criterion weights total 100; missing facts earn no points for that criterion.
These are demos, not a statistically representative benchmark dataset.
Click a sorted ticket, allow/block tile, score or home command to pin its matching
input and output. Keyboard Enter/Space works too; **Follow live** follows actual
completion order. **Export session** saves every scene in the latest play sequence.
The retired `/labs` and `/demos/[id]` pages and their separate UI have been removed.
The standalone API examples remain in `packages/api/examples`.

Scoring starts at **accuracy > 90%** (90 itself does not pass). Adjust the slider
without another inference call; both the valid count and green tiles update. The
raw model `valid` field still means complete content/format compliance and remains
visible in the output inspector. Exports include the chosen display threshold,
strict comparison and derived count alongside unmodified model responses.

Home requests run one at a time with no artificial delay. Each validated `apply`
decision updates only named devices; `unchanged` lights/blinds and temperature 0
keep the current state. `clarify` never changes the house. The command history and
devices are clickable: a selected request shows the house at that point; **Follow
live** returns to the latest state. These are simulated devices, not integrations.

## Run locally

From the repository root, with Node 22 and npm 10:

```sh
npm ci
npm run dev       # fixtures, no paid inference
npm run dev:live  # real inference; uses provider keys from root .env
```

For production timing: `npm run build`, then `npm run start:demos:live`.
The root dev command builds the API first. When editing API code, rebuild it with
`npm run build -w @decision/api`, or run its TypeScript build in watch mode.
The standalone proxy remains available through `npm run dev:api`.

## Tailscale and WebGPU

WebGPU requires a secure context: localhost or HTTPS. A remote HTTP tailnet address
can run the other scenes but cannot initialize WebGPU. This machine's secure URL is
`https://josephs-macbook-pro.taila9c138.ts.net/`.

The local `.env` uses these non-secret settings alongside the provider credentials:

```sh
DEMO_HOST=100.127.125.114
DEMO_HOSTNAME=josephs-macbook-pro.taila9c138.ts.net
DEMO_BIND_HOST=127.0.0.1
```

The public host allowlist and listening address are separate because Tailscale Serve
on macOS needs a loopback upstream. The current tailnet-only configuration is:

```sh
tailscale serve --bg --https=443 http://127.0.0.1:3001
tailscale serve --bg --tcp=3001 tcp://127.0.0.1:3001
```

Port 3001 preserves the old HTTP URL; HTTPS is recommended for the whole slideshow.
This does not enable public Funnel. Only the exact configured hosts are allowed,
and POSTs require their matching origin, JSON, bounded input and a session token.
Users with access to your tailnet service can trigger paid inference. The app is
not a multi-user public deployment and has no account system.

## Runtime and measurements

The Next server imports `@decision/api` through a `server-only` runtime and calls
its actual authenticated HTTP routes over loopback. Provider and proxy credentials
never enter browser bundles. Cerebras output passes the numeric codec/type gate;
native Jev answers pass their own probability/answer checks and the same final
scene validators.
Each Cerebras scene uses one joint OpenAI-schema judgment per request; Jev sends
one native request containing all questions for the same scene item. The standalone
API continues to support both OpenAI and TypeSafe endpoints.

There is no cumulative spending or call cutoff. Runtime concurrency is bounded to
five, requests have deadlines, and cancellation propagates upstream. A scene makes
100 calls, 24 home commands, bounded navigation steps, or as many driving decisions as fit in ten
seconds. No hidden retries, no substituted live judgments, and no artificial request
delays. Provider quota errors remain visible and may cause incomplete results.

Scene wall time includes actual HTTP work and failures. Aggregate decision/output
throughput uses successful results divided by that wall time, not provider decode
time. Costs use reported usage and dated list prices; failed/canceled calls may
have unknown billed usage. The 1.2-second slideshow presentation transition is
outside each scene measurement. It does not change request timings.
**AVG / REQUEST** divides the known estimated cost by requests with reported usage
and configured pricing;
it excludes pending/failed/canceled calls with unknown usage. Exported totals include
that denominator. Before any measured result, the average is unavailable, not zero.

A 429 stops new dispatches and slideshow advancement. In-flight requests finish
normally, their usage is retained, and the user can start a new run later. There
are no hidden retries or waits added to request timing. This handles both provider
quota exhaustion and a local concurrency rejection without repeatedly sending work.

The player follows the visual viewport as browser chrome, window size or fullscreen
state changes. Metrics and the footer remain inside the visible height; the main
scene and independently scrolling feeds use the remaining space.

The driving engine advances from a monotonic clock and clamps to exactly 10,000 ms.
Renderer initialization occurs before playtime starts. In-flight inference is
canceled at the end, and late controls cannot affect the car. Controls come from
structured sensors (position, speed, road geometry and obstacles), not vision.
Three.js uses a verified WebGPU backend; it does not silently substitute WebGL.
Fixture mode uses clearly labeled deterministic decisions, including navigation BFS.
Model mistakes, loops and collisions are retained in live results.

## Add a scene

1. Add a scene and synthetic workload to `lib/theater/data.ts`.
2. Add bounded input, strict output contract and validated interpretation in
   `lib/theater/contracts.ts`; register its request ID in `lib/contracts.ts`.
3. Add a central visualization in `components/theater/visuals.tsx`, or a dedicated
   component. The player already supplies event feeds, metrics, export and controls.
4. Add workflow/fixture coverage to `tests/theater.test.ts`, then run `npm run check`.

The 3D world lives in `components/theater/city.tsx`; deterministic vehicle state and
physics live in `lib/theater/driving.ts`. The navigation graph is in
`lib/theater/navigation.ts`. No provider plugin framework is required.

See [verification and design choices](../../docs/theater-verification.md) and
[research notes](../../docs/showcase-research.md).
