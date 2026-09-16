# Planned examples

Checked 2026-09-16. These are implementation briefs, not working demos or live
results. All examples call **`POST /v1/chat/completions`** using normal `messages`
and `response_format.json_schema`. The assistant content is the requested JSON
object, not a TypeSafe request/response wrapper. The [API reference](context/api_reference.txt)
defines the supported schema subset and rich judgment recipes.

## Source map and build order

| ID | Example | Official reference | Adaptation |
| --- | --- | --- | --- |
| E1 | Ticket triage | [Choice](https://docs.typesafe.ai/primitives/choice), [Score](https://docs.typesafe.ai/primitives/score), [Noul](https://docs.typesafe.ai/primitives/noul) | Synthetic tickets with all three judgment modes represented in JSON Schema. |
| E2 | Smart home | [Official demo](https://docs.typesafe.ai/demos/smart-home), [linked video](https://www.loom.com/share/18c4dbcf8db546dfb2d7f2ef018e78e4) | Speculative judgments over simulated devices. Video discovered, not watched. |
| E3 | Parallel questions | [Cookbook](https://docs.typesafe.ai/cookbooks/parallel_questions) | Eight Nouls, two Choices, three Scores over a synthetic policy memo. |
| E4 | Function dispatch | [Cookbook](https://docs.typesafe.ai/cookbooks/function_calling) | Caller-side allowlisted functions selected by structured judgments. |
| E5 | Guardrails | [Cookbook](https://docs.typesafe.ai/cookbooks/llm_guardrails) | Synthetic input/output screening and caller-owned pass/review/block policy. |
| E6 | Rich judgment schemas | [Advanced structure](https://docs.typesafe.ai/primitives/advanced) | Rubric descriptions and typed distributions, adapted to standard JSON Schema. |
| E7 | OpenAI SDK usage | [Chat Completions reference](https://developers.openai.com/api/reference/typescript/resources/chat/subresources/completions) | Standard client example, shared by every demo. |

The [official demo index](https://docs.typesafe.ai/demos) lists smart home. Its
page says source will be available at release, without a repository link; our
example is a workflow adaptation, not a port of inspected source. The
[documentation index](https://docs.typesafe.ai/llms.txt) links the cookbooks.

## E1 — ticket triage

Put the ticket in a user message and the task in a system message. Define the
contract as an object with three required fields: department (string enum),
refund_requested (number in [0,1]), and urgency (number in [0,2]). Descriptions
explain each judgment and the urgency rubric. The complete wire example is in
API-reference section 2. No state or questions fields are sent.

Synthetic ticket: “I paid twice for my subscription. Please return the extra
payment today.” Expected qualitative judgments are billing, refund requested,
and an explicit deadline. Do not require exact live decimal values. Add unclear,
informational, unrelated, and instruction-injection examples.

First show direct fields. Then use rich recipes for applications needing the
full distributions, locally derived scores, and entropy confidence. Caller code
owns routing and review thresholds. No refund is performed.

Acceptance: returned JSON satisfies the actual supplied schema; enum membership
and bounds hold; rich distributions satisfy sum/coverage rules. Stub failure,
uniform, and tie fixtures must not trigger an unintended action. Report live
accuracy separately from deterministic contract validation.

## E2 — smart-home speculative judgments

Request schema fields for intent, room/scope, device category, action, and a Noul
for compound intent. Ask for all fields in one public request. Caller code ignores
irrelevant speculative fields and validates the relevant combination before
changing simulated device state.

| Message | Expected caller behavior |
| --- | --- |
| Switch every lamp off. | Simulated whole-home lighting action. |
| Dim the kitchen lights. | Kitchen dim action using a configured demo brightness. |
| Switch the hall light off and warm the bedroom. | Detect compound intent; show a decomposition branch. |
| Explain why bulbs flicker. | Route to a conversation stub. |
| Do something with the lights. | Clarification/review branch. |

Use synthetic rooms/devices and allowlisted actions. Compound and conversation
branches initially use visibly labeled stubs. Later generative decomposition is
separate application work. Never connect real devices for incidental verification.
Acceptance: all branches, including uncertainty and invalid output, are covered;
no device action follows a failed contract gate. Record total request latency.

## E3 — thirteen judgments over one document

The source uses a pinned GDPR article. Start with a synthetic policy memo and
preserve its workload shape: eight rich Nouls, two rich Choices, three rich Scores.
Put the memo in a user message, and each rubric in its schema record's description.
Publish the memo, schemas, and human labels. Label it a synthetic adaptation.
A later reproduction can use the source cookbook's pinned article with attribution.

Compare sequential calls, isolated bounded fan-out for rich recipes, and a
benchmark-only batched completion. Record provider calls, repeated context tokens,
reasoning/output tokens, wall time, and failures. Rename/reorder root property
names without changing descriptions/messages, then add/remove unrelated records.
Isolated compiled inputs should be unaffected; repeated live trials quantify noise.

Acceptance: 13 complete results or an HTTP error. Do not claim TypeSafe's published
speedup ratios, or claim generic-schema fields are independent. Generic schemas
use one completion; rich recipes use isolated inference as specified in the API.

## E4 — closed-set function dispatch

The source maps function names and finite arguments to judgments. Adapt this to
three local functions: list synthetic series, summarize a series, and render a
chart. Choice enums select function/series/window; Nouls control boolean flags.
Represent set selection as one Noul per candidate and apply a caller threshold.

Example: “Chart demo series B for the last week with volume.” The result supplies
validated data for caller code to dispatch. It is not executable JavaScript and
not OpenAI tool-call mode. Unsupported/uncertain arguments produce a preview or
clarification. Use mock data, no brokerage connection. Test the function allowlist
and that irrelevant arguments cannot change dispatch.

## E5 — input/output guardrails

Adapt the cookbook's four-Noul plus one-Score screening shape to separate synthetic
request and reply collections. Include ordinary text, instruction override attempts,
requests for a demo secret, and replies that improperly comply. Add a message
trying to force all output probabilities to zero.

Use rich schema recipes with explicit rubrics. Caller code owns versioned
pass/review/block thresholds. Do not copy thresholds as though calibrated for
Cerebras. Acceptance: deterministic policy tests cover every branch; inference
failure produces review/error, never an automatic pass. Report false positives,
false negatives, and Score error separately from schema validity.

## E6 — rich judgment schema fixture

This standard response schema requests a Noul record and a Choice distribution.
It uses no custom JSON Schema keywords. The proxy recognizes the exact recipes
from API-reference section 4 and reconstructs derived fields locally.

```json
{
  "type": "object",
  "properties": {
    "refund": {
      "type": "object",
      "description": "Does the customer ask for money to be returned?",
      "properties": {
        "type": {"type":"string","const":"noul"},
        "noul": {"type":"number","minimum":0,"maximum":1}
      },
      "required": ["type","noul"],
      "additionalProperties": false
    },
    "team": {
      "type": "object",
      "description": "Which team owns the main issue?",
      "properties": {
        "type": {"type":"string","const":"choice"},
        "choice": {"type":"string","enum":["billing","support"]},
        "probabilities": {
          "type":"object",
          "properties": {
            "billing":{"type":"number","minimum":0,"maximum":1,"description":"Charges and refunds."},
            "support":{"type":"number","minimum":0,"maximum":1,"description":"Product usage and troubleshooting."}
          },
          "required":["billing","support"],
          "additionalProperties":false
        },
        "confidence":{"type":"number","minimum":0,"maximum":1}
      },
      "required":["type","choice","probabilities","confidence"],
      "additionalProperties":false
    }
  },
  "required":["refund","team"],
  "additionalProperties":false
}
```

Also cover rich Score records with a constant string legend and numeric-string
probability keys. Structured rubric information can be serialized into description
strings; preserving TypeSafe's arbitrary object-valued legends is not part of this
new public interface. Explicitly test unsupported schema keywords and malformed
recipe shapes rather than silently accepting them as generic schemas.

Acceptance: returned objects match the schema exactly; original root keys round-trip
safely, including Unicode and __proto__; schema-only IDs are absent from compact
inference inputs. Check tied/uniform/point distributions, normalization tolerance,
weighted mean and reconstructed legend. An unrelated bounded numeric field in a
generic schema must not accidentally receive these probability semantics.

## E7 — OpenAI SDK client

Planned client code, requiring the future proxy server and the `openai` package
in the client project. No SDK dependency is added to this scaffold yet.

```ts
import OpenAI from 'openai';

const apiKey = process.env.PROXY_API_KEY;
if (!apiKey) throw new Error('PROXY_API_KEY is required');

const client = new OpenAI({
  baseURL: 'http://127.0.0.1:3000/v1',
  apiKey,
  maxRetries: 0,
  timeout: 20_000,
});

const completion = await client.chat.completions.create({
  model: 'qwen-3.8-27b',
  messages: [
    { role: 'system', content: 'Classify the customer request.' },
    { role: 'user', content: 'Please return the duplicate payment.' },
  ],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'routing',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          department: {
            type: 'string',
            enum: ['billing', 'technical', 'other'],
            description: 'The team responsible for the main issue.',
          },
        },
        required: ['department'],
        additionalProperties: false,
      },
    },
  },
});

const content = completion.choices[0]?.message.content;
if (!content) throw new Error('Missing structured result');
const result: unknown = JSON.parse(content);
// Validate before using the result to trigger actions.
console.log(result, completion.usage);
```

Example assistant content: `{"department":"billing"}`. No nested model/answers/
usage object is inserted into content. Standard usage stays in completion.usage.
The proxy credential is sufficient; requests go to the local proxy, not OpenAI.

Acceptance: run an actual OpenAI SDK client against a local upstream-stub-backed
server. Test success, authentication, unsupported schema/streaming, throttling,
provider failure, and cancellation. Verify malformed requests make zero provider
calls. maxRetries:0 prevents the example client from hiding repeated charges.

## Planned packaging and verification

Implement runners under examples/ with synthetic fixtures and short READMEs.
Add npm scripts only when runners exist. Start with CLI output; UI is later work.
Each demo has offline stub mode and a separate live mode with an operator-selected
call/token/spend ceiling. No real tickets, private documents, or keys in fixtures.
Record schema/prompt/codec versions, model/settings, fixture hashes, usage, timing,
invalid outputs and failures. Label fixture values and live estimates honestly.
