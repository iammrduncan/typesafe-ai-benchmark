# Benchmark architecture and delivery record

Updated 2026-09-17. **typesafe-ai-benchmark** compares LLM-native structured output
from Qwen 3.8 on Cerebras with native TypeSafe Jev. The current product is a paired
seven-workload runner with independent timing, costs, quality checks and raw exports.
[Published results](benchmarks/README.md) and [native mapping](jev.md) define the
measured paths. Qwen uses one compact schema response; Jev batches native questions.

The project began as a TypeSafe-compatible proxy before Jev access was available.
That API remains supporting infrastructure and a separate compatibility experiment.
The decisions below describe its implementation; its per-question strategy is not
the LLM-native path measured by the paired benchmark. The supported API contract is
[api_reference.txt](context/api_reference.txt).

## Decisions

| Concern | Alternatives | Implemented choice and tradeoff |
| --- | --- | --- |
| Output codec | Full public JSON is simple but repeats labels; custom executable/DSL syntax needs a parser and lacks native provider enforcement. | Strict compact JSON `{"p":[...]}` containing only numbers. Local reconstruction removes generated text and derived-field duplication; token savings against full JSON remain unmeasured. |
| TypeSafe questions | One batched prompt saves repeated context but couples judgments; isolated calls cost more input tokens. | One call per question, max four concurrent, shared bounded queue. Question IDs stay local; no sibling rubrics or answers enter another call. |
| OpenAI schema | Forwarding arbitrary JSON Schema allows free text and a broad attack surface; a finite compiler limits compatibility. | Compile a documented closed subset into numeric slots. One inference per schema, no field-independence or automatic TypeSafe semantic-recipe recognition. |
| Validation | Ajv/TypeBox can cover broad JSON Schema; a compiler plus Zod fits a much smaller algebra. | Zod validates fixed boundaries; a bounded schema interpreter constructs only legal output shapes. No schema code generation, coercion, remote refs or schema cache. |
| HTTP | Native node:http avoids a framework but adds lifecycle/body/auth plumbing. | Fastify and its bearer-auth plugin supply those primitives; custom hooks impose deadlines and safe logging. |
| Provider | SDK offers convenience but adds a retry layer; native fetch provides cancellation and bounded reads. | Native fetch to the fixed Cerebras destination, no retries/repair/fallback. OpenAI SDK is a development dependency for client compatibility tests only. |
| JSON parser | JSON.parse loses duplicate keys. | jsonc-parser first inspects syntax, duplicates, finite numbers and depth; comments/trailing commas are disabled. |

Dependencies remove boundary-validation, authentication, HTTP-lifecycle and parsing
complexity. Node 22/npm/ESM/TypeScript/tsx/ESLint/Node test runner form the ordinary
project scaffold. Versions and transitive dependencies are locked in package-lock.

## Delivered sequence and checks

1. **Scaffold and research.** Strict compiler, package scripts, lockfile, source
   register, compatibility decisions and examples mapped to official TypeSafe docs.
2. **Contract core.** Choice/Score/Noul envelopes and deterministic math; bounded
   generic schema compiler; dangerous-key preservation and duplicate-key rejection.
   Checks include bounds, invalid keywords, distribution drift, ties, finite values,
   nested descriptions, structured rubrics and 255-choice/ten-score boundaries.
3. **Vertical slice.** Authenticated routes call Cerebras directly, constrain numeric
   tuples and validate the entire provider result before public reconstruction.
   Actual OpenAI SDK tests exercise completion parsing and error classes.
4. **Lifecycle/failure paths.** Global admission, queue deadline, preflight before
   spending, client disconnect, sibling cancellation, bounded upstream reads, safe
   errors, shutdown cancellation and no hidden retries. HTTP stub tests cover these.
5. **Examples.** Seven synthetic workflows with caller policies, mock devices and
   an allowlisted function preview. Run offline or live; no actual tool execution.
6. **Live verification.** Qwen returned valid responses for all seven workflows
   (31 calls). The account required a single leading system message; the provider
   adapter now sends exactly one. Preserve wrong judgments in the live artifact.
7. **Benchmark.** Reproducible local/stub and live HTTP runners report latency,
   provider decode time, throughput, tokens, estimated cost, warmup, failures,
   environment and safe per-call metadata. Current evidence: all seven paired Qwen/Jev scenes; the earlier Qwen-only interruption is preserved as historical evidence.

## Data path and containment

Authenticate → bounded duplicate-aware parse → validate public contract → compile
all jobs and preflight prompt size → admit jobs → constrained provider inference →
validate envelope and numeric tuple → derive/reconstruct output → serialize once.

For TypeSafe, derive normalized distributions, argmax, weighted score and local
entropy confidence. For generic OpenAI schemas, enforce only declared structural
and numeric constraints; numbers do not automatically become distributions.

Provider inputs contain one server-owned system instruction and serialized rubric,
then a user message containing role-tagged client context as evaluation data.
This preserves client message order and role labels but does not implement full
OpenAI conversational instruction precedence. Container/leaf schema descriptions
remain rubric context. Schema titles/names are annotations, not extra instructions.

The gate cannot emit model-provided strings. It also cannot prevent a model from
choosing a wrong allowed value, encoding context in a number, or supplying an
uncalibrated probability. No credentials enter inference. See [security.md](security.md).

## Resource and failure policy

Defaults: 15-second whole-request deadline, four active provider calls, 32 queued
jobs, 32 TypeSafe questions, 256 KiB request/upstream bodies, 512 KiB final response,
48,000-byte serialized provider request cap, 4,096 completion tokens per call.
All jobs preflight before any inference. Public requests either fully succeed or
return sanitized errors; prior completed/canceled calls may still incur cost.

Qwen uses reasoning_effort none. GPT OSS uses low and parsed reasoning; internal
reasoning is never forwarded. No caches, retries, freeform generation, model
fallback, database, tool execution or streaming in this slice.

## Evidence limits and next experiments

[Benchmark results](benchmarks/README.md) now report the production theater's
seven scenes, browser request latencies, token usage, costs and fixture comparisons.
The current paired run completed every scene with no rate limits; each driving
lane canceled its final in-flight request at the deadline. This is not a saturation test or a provider decode measurement.

Deferred: live GPT OSS validation; large-contract live stress tests (255 options
are offline-tested); calibrated labeled quality evaluation; multi-question and
concurrency sweeps; sequential-versus-isolated comparisons; compact-versus-full-JSON
ablation; repeatability and unrelated-question experiments. None is needed to claim
the delivered structural contract, and none is claimed as completed.

TypeSafe wire compatibility, model quality and performance remain separate claims.
The API reference documents deliberate limits, especially local confidence math,
text-only context and a restricted OpenAI schema subset.

## Monorepo and demo iteration

Delivered npm workspaces: `packages/api` owns the proxy and CLI runners;
`packages/demos` owns a Next.js App Router application. Root scripts coordinate
type checks, tests and builds, API first. The root `.env` and lockfile remain shared.

The demo reel provides seven scenes with shared React controls and server-only
contract construction. The original four-workflow gallery has been removed. An embedded loopback API instance
keeps one-command local startup while preserving the actual HTTP validation path.
See [the extension guide](../packages/demos/README.md) and
[research notes](showcase-research.md). This supersedes the earlier UI deferral.


## Completed theater revision

The seven-scene Next.js theater defaults to side-by-side Qwen and Jev, with two
concurrent requests per model in bulk scenes and sequential stateful controls.
Single-model mode retains up to five concurrent requests and automatic advancement. The WebGPU
scene runs for ten monotonic seconds; request results remain atomically validated.
See [the requirement audit](theater-verification.md) for current implementation
decisions, test coverage, live results and known model mistakes. Home automation
runs 24 stateful commands. Scoring has an adjustable strict validity threshold.
The old gallery routes and UI are removed. No cumulative demo spending or call cutoff is imposed.
