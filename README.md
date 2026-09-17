# typesafe-ai-mimic

Built while waiting for TypeSafe access. For fun and giggles. Because we can.

This is an independent TypeScript experiment that puts a strict judgment API in
front of an existing LLM. It borrows [TypeSafe.ai](https://typesafe.ai)'s
Choice / Score / Noul interface and adds an OpenAI-compatible endpoint so existing
LLM clients can use it too. The proxy uses Cerebras; the theater also offers a
direct connection to real TypeSafe Jev for comparison.

[![Decision Theater demo recording](docs/media/theater-demo.gif)](docs/media/theater-demo.mp4)

[Watch or download the full demo (MP4)](docs/media/theater-demo.mp4) ·
[Static screenshot](docs/media/theater.png)

The animated preview shows the full recording at a reduced frame rate. The MP4
preserves the full 98-second side-by-side demo at 720p / 30 fps and is ready to upload to X.

The Dracula-themed player includes 100-ticket categorization, structured-map
navigation, ten seconds of WebGPU city driving, 100 guardrail checks, 100 agent
command approvals, 100 golden-reference evaluations, and home automation. Each model has its own results panel. Inspect a decision to see its input and output.
Single-model mode also supports the whole slideshow.
The default side-by-side view runs **Qwen 3.8 27B / Cerebras** and **Jev / TypeSafe**
together when you press **Run demo**, using the same shuffled input order. Configure
`CEREBRAS_API_KEY` and `JEV_KEY` in `.env`. Each side has its own timing, cost,
results and export. **Single model** retains the original model selector. Jev uses native batched questions and keeps its probabilities in exports.
The header identifies the provider; Jev cost uses $0.04/M input and free output.
[Jev setup, question mapping and limitations](docs/jev.md).
[Verification, measurements and limitations](docs/theater-verification.md).

## Monorepo and interactive demos

```text
packages/api/     Fastify proxy, strict contracts, tests, CLI examples and benchmarks
packages/demos/   Next.js + React app, demo catalog, pages and server-side handlers
docs/             API specification, research and verification summaries
```

One npm workspace lockfile; no separate installs inside packages.

```sh
npm ci
npm run dev       # Next.js at http://127.0.0.1:3001; fixtures, no paid inference
npm run dev:live  # real inference; uses provider keys in root .env
npm run dev:api   # standalone API at http://127.0.0.1:3000
```

**Decision Theater** supports single-stream or 2–5 concurrent bulk requests, automatic
scene advancement, real timing/token/cost metrics, and complete session exports.
The driving scene needs WebGPU on localhost or HTTPS. The current secure tailnet
URL is `https://josephs-macbook-pro.taila9c138.ts.net/`. The seven-scene reel includes
home automation, clickable request inspection and adjustable scoring validity.
The retired labs have been removed.

[How to add a demo](packages/demos/README.md#add-a-scene) ·
[Research and source notes](docs/showcase-research.md) ·
[API workspace](packages/api/README.md)

## What it does

- `POST /v1/systemone`: TypeSafe-style Choice, Score and Noul questions.
- `POST /v1/chat/completions`: normal OpenAI messages and strict `response_format.json_schema`.

Send context plus a contract. Cerebras produces compact numeric values and selection
indices; the proxy validates them and reconstructs declared labels and structure
locally. Invalid output fails closed. Provider reasoning and arbitrary generated
prose never become answer content. Unconstrained strings, streaming and tools are
rejected. See the [supported API](docs/context/api_reference.txt).

## Why Cerebras?

The theater uses Cerebras for its Qwen judgment calls. In the latest paired run,
Qwen returned **475/476 validated outputs** with **215 ms median successful browser
request latency**, compared with **176 ms for Jev**. Each canceled one outstanding
driving request at the ten-second deadline. See the [benchmark](docs/benchmarks/README.md)
for costs, concurrency, judgment outcomes and limitations.

## The inefficient part

This is an inefficient stand-in for TypeSafe's purpose-built judgment service:
we ask a general-purpose LLM to *write* probabilities. Each TypeSafe question gets
its own call, repeating state and rubric input. A thirteen-question request means
thirteen provider calls, with only four running concurrently. That increases input
tokens, cost and queueing. The generic OpenAI schema path uses one call, but its
fields do not have the same isolation guarantee.

The theater now measures native Jev beside the joint-schema Qwen path. This does
not benchmark the standalone proxy’s per-question TypeSafe-compatible path. Matching an API does not reproduce its underlying
model efficiency, calibration or quality. Our entropy-based confidence is a local
approximation. The point is an accessible experiment while on the waitlist, not a
claim of TypeSafe parity.

## Quick start

Requires **Node 22** and **npm 10**. From this checkout, try all seven examples
without credentials or paid inference:

```sh
npm ci
npm run examples
```

To start the real Cerebras-backed server:

```sh
# Create the file only if it does not already exist.
test -f .env || cp .env.example .env
```

Edit `.env`: set `CEREBRAS_API_KEY` and a **different** `PROXY_API_KEY` of at least
16 characters. Keep both private; clients use only the proxy key. Then:

```sh
npm run build
npm start
```

The server loads `.env` and listens at `http://127.0.0.1:3000`. In another terminal,
set `PROXY_API_KEY` to the same proxy key from `.env`, then make a judgment:

```sh
export PROXY_API_KEY='your-proxy-key-from-.env'
curl --fail-with-body http://127.0.0.1:3000/v1/systemone \
  -H "Authorization: Bearer $PROXY_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "jev-latest",
    "state": "Please refund the duplicate charge.",
    "questions": {
      "refund": {"type": "noul", "instructions": "Is money requested back?"}
    }
  }'
```

The response contains `answers.refund.noul` in `[0,1]`, actual token usage, and
`model: "qwen-3.8-27b"`. `jev-latest` is only a compatibility alias; it does not
select Jev. The probability is model-estimated, not guaranteed to be correct.

For an ordinary OpenAI-compatible request:

```sh
curl --fail-with-body http://127.0.0.1:3000/v1/chat/completions \
  -H "Authorization: Bearer $PROXY_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "qwen-3.8-27b",
    "messages": [{"role": "user", "content": "Please refund the duplicate charge."}],
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "routing", "strict": true,
        "schema": {
          "type": "object",
          "properties": {"department": {"type": "string", "enum": ["billing", "technical", "other"]}},
          "required": ["department"], "additionalProperties": false
        }
      }
    }
  }'
```

`choices[0].message.content` contains JSON such as `{"department":"billing"}`.
For an OpenAI SDK client, set `baseURL: 'http://127.0.0.1:3000/v1'`, use the proxy
key, and supply a supported strict schema. Set `maxRetries: 0` when measuring
calls and cost. [Complete SDK example](docs/examples.md#ordinary-openai-sdk-call).

## Want a different inference backend?

Ask your coding agent to make the swap. This currently requires code changes;
changing an environment variable alone will not configure another provider.
Copy this prompt and replace the bracketed provider name:

> Replace Cerebras with [provider and model] as the inference backend. Read
> AGENTS.md and CONVENTIONS.md first. Trace packages/api/src/cerebras.ts and its callers in
> packages/api/src/evaluate.ts, then inspect model validation in packages/api/src/contracts.ts, startup
> configuration in packages/api/src/index.ts, and pricing in packages/api/src/metrics.ts. Verify the target
> provider's official structured-output support, tuple schemas, reasoning controls,
> usage fields and cancellation behavior. Adapt the compact numeric schema if
> necessary while preserving local type/range/length/distribution checks and both
> public HTTP contracts. Keep keys server-side, sanitize errors, and retain bounded
> bodies, queueing, deadlines, cancellation and zero automatic retries. Reject
> unsupported behavior explicitly. Update model IDs, .env.example, examples,
> benchmark preflight/pricing/timing extraction and documentation. Do not invent
> provider timings or infer parity from its OpenAI-compatible URL. Run the HTTP
> stub tests, npm run check and offline examples. Keep live verification separate,
> synthetic and within an explicit spend bound. Keep the change small; a provider
> plugin framework is unnecessary.

## Benchmark outcomes

Measured **2026-09-17 UTC**, running both providers together through the production
side-by-side theater. All seven scenes completed; no rate limits or retries.
Static scenes used two concurrent requests per model; stateful scenes used one.

| Measurement | Qwen 3.8 27B · Cerebras | Jev · TypeSafe |
| --- | ---: | ---: |
| Validated / dispatched | 475 / 476 | 479 / 480 |
| Failed / canceled at driving deadline | 0 / 1 | 0 / 1 |
| Successful request p50 / p95 / p99 | 215 / 452 / 912 ms | 176 / 336 / 532 ms |
| Input / output tokens | 305,915 / 5,185 | 297,984 / 43,836 |
| Known estimated cost | $0.310581 | $0.011919 |
| Sum of scene durations | 70.02 s | 55.54 s |

Latency measures successful browser requests, including local handling and
validation. Scene durations exclude operator gaps; the two columns overlap in
real time. Driving stops at ten seconds and cancels its outstanding request.
Unknown canceled-call usage is excluded from estimated cost.

| Exact fixture agreement | Qwen | Jev |
| --- | ---: | ---: |
| Tickets | 75/100 | 75/100 |
| Guardrails | 100/100 | 100/100 |
| Approvals | 100/100 | 95/100 |
| Scoring | 93/100 | 100/100 |
| Home | 24/24 | 15/24 |

Both reached the routing destination in eight hops. Driving covered **94.6 m /
84.2 m**, respectively, with **one collision each**. Fixture agreement is separate
from valid output: Jev matched Scoring more often, while Qwen matched Approvals
and Home more often in this run.

Jev uses batched native questions; Qwen generates one joint schema response.
Stateful inputs can diverge after different decisions. These measurements describe
one synthetic development-machine run, not calibrated quality or general model parity.
[Per-scene results, raw exports, method and limitations](docs/benchmarks/README.md).
Recompute the table data offline with `node --import tsx scripts/summarize-comparison.mjs`.

```sh
npm run benchmark      # local HTTP + upstream stub
npm run benchmark:live # real Cerebras; reads .env and overwrites the live report
npm run examples:live  # seven synthetic workflows against real Cerebras
```

Live commands enforce bounded calls and a conservative $1 list-price ceiling per
run. Examples use an ephemeral proxy credential and need only the Cerebras key.
No real devices or external functions are operated.

## Correct types are not correct judgments

Seven examples returned validated live outputs, but the smart-home scope and two
injection-screening judgments were wrong. Those results are preserved in the
[live report](docs/live-results.json). A type gate blocks arbitrary generated text;
it cannot prove semantic prompt-injection resistance or stop information from
being encoded in allowed numbers/selections. See [security boundaries](docs/security.md).
The paired theater benchmark reports both providers and preserves every fixture mismatch.

## Development and documentation

`npm run dev` starts the Next.js fixture app; `npm run dev:api` watches the API.
`npm run check` runs strict source/example type
checks, ESLint, both workspace test suites and both production builds.
Normal tests never use `.env` credentials.

- [Implementation plan and decisions](docs/plan.md)
- [Example source mapping and SDK usage](docs/examples.md)
- [Runner and benchmark commands](packages/api/examples/README.md)
- [HTTP API reference](docs/context/api_reference.txt)
- [Engineering conventions](CONVENTIONS.md)
