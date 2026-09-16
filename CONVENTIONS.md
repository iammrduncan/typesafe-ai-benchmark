# Engineering conventions

## Product contract

The implementation language is **TypeScript**. Build a low-overhead gateway from the
TypeSafe request contract to existing LLM providers, with validated responses on
the way back. Start with one provider and a working request path. Add infrastructure
only when a concrete requirement or measurement justifies it.

The following upstream reference was checked on **2026-09-16**. It is a starting
contract, not a claim that this scaffold already implements it.

| Surface | Compatibility target | Source |
| --- | --- | --- |
| HTTP | `POST /v1/systemone`, bearer authentication, JSON; request contains `state`, `model`, `questions`; response contains `model`, `answers`, `usage` | [API](https://docs.typesafe.ai/api) |
| Questions | `choice`, `score`, `noul`; return answers under the caller's IDs; IDs are not inference context; questions share state and are evaluated independently | [Primitives](https://docs.typesafe.ai/primitives) |
| Choice | Option map; answer includes `type`, `choice`, `probabilities`, `confidence`; selection is a maximum-probability option; distribution covers every option; documented maximum is 255 options | [Choice](https://docs.typesafe.ai/primitives/choice) |
| Score | Ordered criteria with 2–10 levels; answer includes `type`, `score`, `legend`, `probabilities`, `confidence`; zero-based level indices become string keys in JSON; score is the probability-weighted mean | [Score](https://docs.typesafe.ai/primitives/score) |
| Noul | Optional `true`/`false` criteria descriptions; answer contains `type` and `noul`, a probability in `[0, 1]`; no separate confidence | [Noul](https://docs.typesafe.ai/primitives/noul) |
| Confidence | Derived from the distribution; the referenced page does not specify the exact formula | [Confidence](https://docs.typesafe.ai/confidence) |

### Resolve uncertainty explicitly

- The API reference and primitive guides differ on accepted criteria value shapes:
  the guides allow structured descriptions, while the API lists narrower types in
  places. Record the accepted subset and evidence before freezing a schema. Do not
  accidentally restrict `instructions` to strings; the API also allows objects and
  arrays. State accepts strings, objects, or arrays.
- The API documents `401`, `422`, `429`, and `529`, but does not fully define the
  error body. Define and test our stable error contract and mark deviations. Do not
  claim byte-for-byte error compatibility without evidence.
- Do not invent TypeSafe's confidence formula. Choose and document a deterministic
  approximation if needed, with edge cases and fixtures, and label the difference
  in compatibility documentation. Never substitute the winning probability without
  recording that decision.
- Define model alias resolution explicitly. A TypeSafe model name cannot silently
  imply that its proprietary model is running. Document aliases, actual provider
  models, and the response `model` policy; reject unknown names.
- Record unknown rules such as tie-breaking, unknown fields, empty maps, size limits,
  and partial failures as local decisions until verified. Keep extensions out of
  the compatibility payload unless explicitly designed and documented.

## TypeScript and code structure

- Enable `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` when
  creating the TypeScript configuration. Use a supported runtime and one package
  manager; commit its lockfile and declare the supported runtime version.
- Treat parsed JSON, environment values, and provider output as `unknown`. Validate
  them before narrowing. Type assertions, non-null assertions, and `any` are not
  substitutes for evidence; isolate a necessary library escape hatch and explain it.
- Model questions, answers, provider outcomes, and errors as discriminated unions.
  Make switches exhaustive. Prefer explicit result types at module boundaries.
- Keep runtime schemas and static types aligned, ideally deriving types from one
  schema definition. Do not maintain independent copies of the wire contract.
- Use named intermediate values and explicit units such as `timeoutMs`. Avoid
  boolean-heavy signatures and generic abstractions that obscure concrete types.
- Co-locate feature code and tests. Separate responsibilities when they hide a real
  decision: HTTP contract, validation and judgment math, provider translation, and
  request lifecycle. These are boundaries, not a mandate for one file per layer.
- Keep handwritten production files under 500 lines when practical. Review cohesion
  above 500; normally split above 800 by responsibility, not arbitrary line count.
- Document why surprising code exists. A deliberate shortcut gets a `ponytail:`
  comment explaining its ceiling and the condition that warrants replacing it.

## Request path and enforcement

Keep the path legible: authenticate and bound input → validate request → resolve
provider capabilities → perform inference → validate provider result → compute
derived fields → validate and serialize the public response.

- Validate client input before spending provider tokens. Bound request bytes,
  nesting, question counts, criteria sizes, output size, and in-flight work. Declare
  limits as local configuration where they differ from upstream documentation.
- Prefer native constrained output when a provider supports the required schema.
  Track capabilities explicitly; JSON mode and prompt instructions alone do not
  guarantee a schema. Always validate the result locally.
- Success means a complete, valid answer set with matching IDs and types. Reject
  missing or extra answers, unknown options, non-finite numbers, and invalid ranges.
  Treat refusal, truncation, malformed JSON, and unsupported capabilities as explicit
  outcomes. Never turn a failed inference into a confident default answer.
- Choice and Score distributions must cover exactly their criteria, contain finite
  values in `[0, 1]`, and sum to one within a documented numerical tolerance. Only
  normalize small numerical drift under a tested rule. Do not clamp arbitrary
  invalid values or fill missing probabilities to make validation pass.
- Compute Choice selection, Score weighted mean, legend, and the chosen confidence
  statistic locally from validated inputs. The provider need not generate fields
  that deterministic code can derive. Define stable behavior for ties and rounding.
- Keep caller question IDs out of inference content, including schema property
  names exposed to the model. Map opaque internal identifiers back at the boundary.
- A shared LLM completion can couple questions. Do not claim independence merely
  because the prompt requests it. Compare batched generation with isolated calls
  under bounded concurrency; document the chosen tradeoff and test sensitivity to
  adding, removing, renaming, and reordering unrelated questions.
- Keep evaluation state separate from trusted instructions. User content is data,
  even when it contains instructions. The proxy does not execute generated code,
  tools, URLs, or actions contained in that state.

## Probabilities and quality

A model writing a decimal is not evidence of calibrated probability. Provider
log-probabilities, sampled frequencies, and self-reported estimates have different
meanings. Record how each adapter obtains its values and what those values support.
Do not present token likelihoods as outcome probabilities without a justified mapping
that handles tokenization and missing probability mass.

Keep shape validation separate from quality evaluation. Use a small labeled dataset
to compare judgment accuracy and, when claiming calibration, an appropriate metric
such as Brier score or log loss. Pin model, prompt, and configuration versions in
evaluation results. Never inflate confidence to make examples look decisive.

## Latency and resource control

- Keep handlers stateless and reuse provider clients and connections. Avoid blocking
  I/O, repeated schema compilation, unnecessary parsing, and synchronous logging on
  the request path. Profile before introducing caches, pools, or clever algorithms.
- Minimize network round trips and generated tokens. Batching, concurrency, repair,
  and fallback each affect semantics, cost, and tail latency; measure the tradeoff.
- Use an end-to-end deadline that includes queueing, provider time, and retries.
  Propagate cancellation through `AbortSignal`, including client disconnects.
  Release permits and timers on every exit path.
- Bound concurrency and queue capacity. Reject overload predictably instead of
  allowing memory growth. No detached inference after the client cancels.
- Retry only classified transient failures within a small configured attempt and
  time budget; respect provider retry guidance with jitter. Account for SDK retries
  so retry layers do not multiply. Repair and fallback are explicit policies, never
  unlimited loops or hidden model changes. Retries can incur duplicate charges.
- Measure local processing with a controlled upstream stub and total latency with
  the actual provider separately. Use monotonic timing; distinguish processing,
  queue wait, upstream wait, and total duration.
- Report p50/p95/p99, throughput, failures, concurrency, payload/question sizes,
  provider/model, runtime/hardware, warmup, duration, and sample count. Include
  invalid-output and retry rates plus token usage. Do not let faster failures look
  like a speedup. Set a numerical latency budget from an agreed target and measured
  baseline; do not invent an SLA or borrow TypeSafe's performance claims.

## Errors, security, and observability

- Use stable error categories for client validation, authentication, throttling,
  overload, timeout, provider transport failures, and invalid provider output. Map
  them to deliberate public statuses and sanitized bodies in one place.
- Keep client credentials separate from upstream credentials. Validate configuration
  at startup, keep secrets out of source control, and exclude local `.env` files
  before staging changes. Supply placeholder-only examples when setup needs them.
- Provider destinations come from trusted configuration, not arbitrary request
  URLs. Default network exposure and CORS to closed; require an explicit local
  development mode for unauthenticated use. Use established auth libraries.
- Log request IDs, timing, provider/model, attempt count, outcome, and safe usage
  metadata. Log consequential branches and failures; do not log per-token or
  per-option loops by default. Keep log levels configurable and logging bounded.
  This applies the engineering reference's branch visibility principle without
  flooding the hot path.
- Never log keys, authorization headers, raw state, prompts, or raw completions by
  default. Avoid question IDs and request IDs as metric labels; keep cardinality
  bounded. Test redaction on error paths as well as success paths.
- If caching becomes justified, define tenant isolation, complete semantic keys,
  expiry, memory bounds, and retention policy first. Never share private judgments
  across callers accidentally.

## Verification and maintenance

- Favor contract and integration tests at real boundaries. Stub the upstream HTTP
  service instead of mocking every internal function. Keep normal tests offline,
  deterministic, and independent of provider credentials.
- Cover mixed question types, ID round trips, structured inputs, null Choice
  descriptions, distribution math, ties, range edges, and declared size limits.
- Exercise malformed requests and provider output, missing/extra options, refusals,
  truncation, timeout, cancellation, retry exhaustion, and overload. Assert rejected
  input makes no upstream call and cancellation releases resources.
- Use small unit or property checks for deterministic math and normalization rules.
  Add a failing regression case before fixing a behavioral bug. Do not freeze
  incidental internal structure into snapshots or tests.
- Run live provider evaluations separately and explicitly with synthetic data and
  a cost bound. Separate probabilistic quality assertions from deterministic contract
  tests; a model's occasional disagreement is not a flaky schema test.
- Pin dependencies through the lockfile. Prefer existing tooling and small maintained
  dependencies that remove real complexity. Document actual setup, start, test,
  type-check, lint, build, and benchmark commands when those scripts exist.
- Changes to prompts, model selection, schema handling, probability extraction, or
  retry behavior can alter product semantics. Update relevant fixtures, quality
  evidence, performance evidence, and compatibility notes with the change.
