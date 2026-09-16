# Cerebras-backed TypeSafe compatibility demo

Status: implementation plan, 2026-09-16. Only project setup is implemented.
The normative local contract and source register are in
[api_reference.txt](context/api_reference.txt); planned demos are in
[examples.md](examples.md). This is an independent implementation, not Jev.

## What exists and what we will build

The starting repository had a README, license, agent/convention documents, an
empty API reference, and a Cerebras SDK snippet. There was no runtime, package
manifest, server, provider adapter, or test suite to preserve. The snippet is
reference material, not an installed dependency or working integration.

The public endpoint is `POST /v1/chat/completions`, using the OpenAI request
and response contract. **Context goes in `messages`; the output contract goes in
`response_format.json_schema`.** Clients send normal text messages and a JSON
Schema, and receive validated JSON in `choices[0].message.content`. No nested
TypeSafe request, special message encoding, or `/v1/systemone` route is planned.

Preserve TypeSafe-inspired Choice, Score, and Noul judgments as documented schema
recipes. Their options, rubrics, and instructions live in ordinary JSON Schema
properties and descriptions. The API reference defines both the supported schema
subset and the recognizable rich judgment recipes. Ordinary supported schemas
also work, without inventing TypeSafe semantics for unrelated numeric fields.

This supersedes CONVENTIONS.md's TypeSafe wire target under the user's explicit
HTTP-interface instruction. Its validation, resource, quality, and security rules
still apply. Keep the original TypeSafe sources as semantic research, not our wire
specification. There is one public contract and one request path.

The output gate guarantees accepted response structure and numerical invariants.
It cannot guarantee a correct judgment or calibrated probability. The LLM's
numbers are self-reported estimates. State this in the README and example output.

## Decisions and tradeoffs

| Decision | Alternatives and tradeoffs | Initial choice |
| --- | --- | --- |
| Compact output | A custom DSL such as `C(.2,.8)` saves punctuation but needs a parser and lacks documented Cerebras grammar enforcement. Full public JSON is simple but repeats labels and derived values. Compact constrained JSON keeps native decoding and standard parsing; actual token savings must be measured. | Compact JSON containing only numbers, expanded locally. No generated code execution. |
| Rich judgment records | One completion amortizes state tokens and network work but couples judgments. One call per question repeats state and increases rate-limit pressure, while keeping other questions out of each inference. Both can use the same public contract. | Isolated calls with bounded concurrency for rich recipes. Generic schemas use one completion with no field-independence claim. Batching rich recipes remains benchmark-only. |
| Provider access | Official SDK gives convenience but brings another dependency and retry layer. Native `fetch` covers this single JSON endpoint, cancellation, and controlled retries; it requires explicit response validation. | Direct Cerebras HTTPS via Node `fetch`; no intermediary and no provider framework. Revisit SDK only for a concrete missing capability. |
| HTTP | Native `node:http` avoids dependencies but requires careful body/deadline/disconnect handling. Fastify supplies those server primitives with a larger dependency footprint. Neither is presumed faster without measurement. | Plan Fastify for the implementation slice; install when its route is written. |
| Public interface | A TypeSafe-shaped payload inside a chat message requires custom client behavior. Standard messages plus response_format let ordinary OpenAI clients supply context and a schema directly, but require a bounded schema compiler. | Native OpenAI Chat Completions wire format, per the user’s instruction. No TypeSafe HTTP adapter. |
| Runtime schemas | Handwritten guards duplicate definitions. Zod is convenient for fixed schemas; TypeBox + Ajv supports fixed request types and validating caller-supplied JSON Schema with one validator family. | Plan TypeBox for the fixed HTTP envelope and Ajv for the bounded caller schema. Disable coercion, defaults, remote refs, and schema-driven code keywords; add dependencies with the first validators. |

Current setup: Node 22 LTS, npm 10, ESM, TypeScript, tsx, ESLint and Node's built-in
test runner. TypeScript 5.9.3 is pinned within typescript-eslint's supported range;
the latest TypeScript 7 release was rejected by its peer dependency constraint.
These development dependencies remove manual compile/watch/lint
work. No production dependency is installed yet. Node 22 is supported according
to the [release table](https://nodejs.org/en/about/previous-releases), and is the
major version already available locally; use an up-to-date patch release.

## Provider selection

Use `qwen-3.8-27b` first with `reasoning_effort: "none"`; compare `gpt-oss-120b`
with `reasoning_effort: "low"`. Pin prompt/codec versions and effective generation
settings in evaluation results. Start with temperature 0, no tools, no streaming,
and parsed reasoning. Validate supported settings against each account/model
before running the evaluation. Do not silently switch models on failure.

The [Cerebras catalog](https://inference-docs.cerebras.ai/models/overview) lists
approximately 1,850 tokens/s for Qwen and 3,000 for GPT OSS. These are provider
generation figures, not our latency measurements. Qwen can disable reasoning;
GPT OSS cannot, and its reasoning consumes completion budget even if hidden.
See [reasoning controls](https://inference-docs.cerebras.ai/capabilities/reasoning).
The existing snippet's medium reasoning and 1,024-token budget are not defaults
for this design.

Send requests to `https://api.cerebras.ai/v1/chat/completions` with the server's
bearer credential and explicit `X-Cerebras-Version-Patch: 2`. Version 2 retains
the `/v1` URL ([version reference](https://inference-docs.cerebras.ai/api-reference/versions)).
Accepted model IDs and truthful response naming are specified in the API reference.

## Compact representation and contract gate

Validate text-only messages with system/developer/user/assistant roles. Preserve
role boundaries and message order. The latest user content is ordinary text, not
a JSON-encoded application envelope. Structured context can be serialized as text
by callers, but is never parsed as a hidden request. Tools and multimodal parts
are outside the initial supported subset.

Recognize exact rich Choice/Score/Noul schemas described in the API reference.
For those recipes, compile one isolated judgment per root property. Every call
sees the same message context plus that property's rubric. Keep result property
names local; send descriptions and option labels instead. Do not send sibling
schemas or generated answers. For an ordinary supported schema, make one strict
structured-output call for the whole schema; do not promise independent fields
or interpret arbitrary numbers as probability distributions.

Examples of the internal `compact-v1` format (synthetic numbers):

```json
{"p":[0.1,0.7,0.2]}
```

For rich Choice recipes, positions refer to option names sorted lexicographically
using code-unit comparison, not locale sorting. For rich Score recipes, positions
retain the numeric order of legend keys. A Noul is `{"p":0.8}`. The recognized recipe already determines the type;
the provider need not repeat it, the selected option, legend, score, or confidence.
JSON whitespace is harmless; "compact" means fewer fields, not a whitespace
requirement or a claim that fewer characters always means fewer tokens.

For recognized recipes, compile a strict root object schema requiring only `p`,
with no extra properties. Ordinary schemas use their supported fields directly;
never discard caller-requested output to optimize token count.
For distributions, use `prefixItems` with exactly N numeric entries and
`items: false`; each entry has minimum 0 and maximum 1. Check exact length locally
as well. Do not rely on unsupported `minItems`/`maxItems`. For Noul use one bounded
number. Cerebras documents tuple support, object roots, closed objects, and
numeric bounds in its [structured-output subset](https://inference-docs.cerebras.ai/capabilities/structured-outputs).
There is no schema guarantee that an array sums to one, so that remains our gate.

Gate order:

1. Authenticate and bound bytes before parsing. Treat decoded input as `unknown`.
2. Validate complete request, model, limits, and schema feasibility before
   acquiring an inference permit. Reject invalid input without any provider call.
3. Compile the internal mapping and output schema. Preflight the provider's
   schema limits; compact recipe shapes have two levels and one named property.
   Generic schemas must pass the documented subset and complexity checks.
4. Execute the selected schema strategy with one global concurrency limiter and one request
   deadline. Queueing and retries consume the same deadline.
5. Validate provider HTTP envelope, finish reason, content, and usage. Refusal,
   tool calls, truncation, empty content, invalid JSON, and incompatible schema are
   explicit failures. Never repair them into confident defaults.
6. Check exact shape, length, finite values, range, and sum. Apply only the tiny
   normalization tolerance in the API reference. Compute derived fields locally.
7. Reconstruct result properties safely, validate against the caller’s original schema,
   then wrap the JSON text in the OpenAI response envelope.
   If any question fails, cancel siblings and fail the whole request. Never return
   a partial success; work already performed can still incur provider charges.

The gate never uses `eval`, `Function`, generated JavaScript, a tool dispatcher,
or URL fetching from state. Prompt boundaries reduce accidental instruction
mixing but do not prove immunity to prompt injection; include adversarial cases.

## Proposed implementation boundaries

Grow these files when needed, with colocated `*.test.ts` files; do not create
empty abstractions now:

| File | Responsibility |
| --- | --- |
| `src/index.ts` | Validate startup configuration and start/shut down HTTP service. |
| `src/http.ts` | Authentication, bounded body, Chat Completions route, cancellation, and OpenAI success/error envelopes. |
| `src/contract.ts` | Request schemas, supported JSON Schema validation, rich-recipe recognition, compact compilation, answer math, and final contract gate. |
| `src/cerebras.ts` | Prompt/compact schema, direct transport, validated decoding, usage. |
| `src/evaluate.ts` | ID mapping, isolated fan-out, deadline, permits, aggregate outcome. |

Use request-local Maps or own-property-safe dictionaries for result property names. Keep
secrets and provider destination in trusted startup config. Auth uses a vetted
Fastify bearer-auth facility selected with the HTTP slice, not homemade crypto.
Bind loopback by default, CORS closed. Require a distinct proxy key even locally;
there is no implicit unauthenticated mode. `.env.example` is illustrative until
configuration handling is implemented.

## Delivery sequence and exit checks

1. **Setup (this change).** Docs, npm lockfile, strict compiler, lint, build,
   watch/start commands, and an explicitly pending test. Exit: clean install and
   checks run; startup prints a scaffold notice and exits without network access.
2. **Contract and deterministic math.** Implement the API-reference decisions,
   inferred envelope types, schema-subset checks, safe property mapping, errors, and
   recipe math. Exit: fixtures cover supported/rejected schemas, 255 options,
   Score bounds, ties, zero/one/uniform distributions, malformed data, unknown
   fields, and sum drift. No live provider needed.
3. **One-question vertical slice.** Add HTTP, startup auth/config, Cerebras
   translation, and cancellation. Start with Noul, then Choice and Score before
   marking the slice complete. Exit: an upstream HTTP stub proves valid outputs,
   rejected input makes zero calls, and malformed/truncated/refused responses
   never become success. Add the Chat Completions handler and check actual compiled schemas
   against provider limits. Use an OpenAI SDK client pointed at the local stub-backed
   service to verify message.content, finish_reason, model, usage, and API errors. Include ordinary text plus a simple enum schema, not only
   rich recipes; reject unsupported schema features before inference.
4. **Mixed requests and lifecycle.** Add isolated scheduling, bounded queue,
   usage aggregation and atomic failures for rich recipes. Exit: tests prove result-key rename/reorder
   leaves each compiled inference input unchanged, sibling cancellation and
   permit release, deadline while queued, overload, 429/5xx handling, and redaction.
5. **Demo workflows.** Implement examples E1–E5 and E7 from `examples.md`, with synthetic
   fixtures and deterministic stub mode first. Exit: examples consume this public
   API and show decisions made in caller code, including uncertainty/failure paths.
6. **Explicit live evaluation.** Synthetic data only; operator provides a spend
   ceiling and selects model. No inference is run as incidental scaffold testing.
   Exit: verify tuple schema and max-option support on the account, record quality
   and latency, and publish limitations. Add a benchmark command only when real.

## Resource policy for the first implementation

Initial local limits and error statuses live in the API reference. A request
deadline is 15 seconds, including queueing; the global provider-call cap is 4,
with at most 32 pending question jobs. Admit a request only if its jobs fit,
avoiding partial dispatch on admission failure. Reject overload with 503.
These are conservative demo choices, configurable later with validation.

Start with zero automatic retries and no repair/fallback. This bounds cost and
makes failures measurable. A later measured retry policy may permit one transient
retry (429/selected 5xx or transport failure), respecting Retry-After, jitter,
deadline and a single attempt budget. Never retry validation/refusal errors.
No SDK retry layer exists with native fetch. Always release timers/permits,
cancel queued jobs on disconnect, and abort sibling calls after a fatal failure.

Bound provider response bytes including reasoning. Determine completion allowance
from option count and the effective reasoning mode; start with an output budget
of 4,096 tokens per call, verified against 255-option fixtures. Truncation fails
closed; do not claim all allowed questions work until the boundary is live-tested.
No caches, database, streaming API, fallback model, or general plugin system.

## Quality and performance evidence

For each model use the same versioned synthetic dataset, rubric, and prompt.
Record Choice accuracy, Noul Brier score, and Score error against labeled rubrics;
report sample counts and uncertainty. Confidence is our documented entropy
statistic, not TypeSafe's undisclosed computation. Do not reuse TypeSafe thresholds
as though they were calibrated for Cerebras.

Run question rename, reorder, add/remove, and unrelated-adversarial-question
experiments. Isolated requests remove cross-question prompt context but do not
guarantee bitwise deterministic model answers or reproduce TypeSafe's separate
per-level scoring mechanism. Compare batched experiments against isolated
run-to-run variation and report differences, not just averages.

Measure local processing with an upstream stub separately from live end-to-end
latency. Include warmup, duration, sample size, hardware/runtime, state bytes,
question/option counts, concurrency, queue wait, upstream time, local time,
p50/p95/p99, throughput, failures, invalid outputs, retries, and actual tokens.
Compare 1, 3, and 13 questions; compare compact output against full-answer JSON.
With isolated inference, extra questions repeat state tokens and can queue;
TypeSafe's parallel cost/latency claims do not transfer. Choose a numerical target
only after a baseline. Log safe aggregate metadata, never raw state, credentials,
prompts, completions, or reasoning by default.

## Deferred surfaces and unresolved evidence

The OpenAI Chat Completions route and all three judgment recipes are in scope. SDK convenience helpers, model-listing
endpoints, arbitrary extraction, streaming, image interpretation, UI hosting,
and real-world device/tool execution are outside the first demo. Return explicit
unsupported-route/field errors where appropriate; ordinary URLs inside state
remain text and are never fetched. Revisit model listing if a selected SDK needs it.

The API reference records unknown confidence math, local limits, supported schema
features, and differences from TypeSafe semantics. Only actual Cerebras model IDs
are accepted; no Jev aliases are exposed. The GPT OSS model page
contains conflicting free-tier rate figures; read actual account limits instead
of encoding those figures. Qwen/GPT OSS availability and schema acceptance are
documented, not yet verified through paid inference in this repo.
