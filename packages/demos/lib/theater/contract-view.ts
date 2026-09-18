import { z } from 'zod';
import { prepare } from '../contracts';
import type { DemoModel } from '../models';
import { scenes, type SceneId } from './data';
import { jevPlan } from '../jev';
import { needlePlan } from '../needle-plan';

export type ContractSnapshot = {
  title: string;
  source: 'Recorded request' | 'Reconstructed request' | 'Scene preview';
  requestId?: string;
  request: unknown;
  scoreThreshold?: number;
};

export function contractSnapshot(input: {
  scene: SceneId; model: DemoModel; context: unknown;
  requestId?: string; recorded?: unknown; scoreThreshold?: number;
}): ContractSnapshot {
  return {
    title: scenes.find(scene => scene.id === input.scene)?.name ?? input.scene,
    source: input.recorded !== undefined ? 'Recorded request' : input.requestId ? 'Reconstructed request' : 'Scene preview',
    ...(input.requestId ? { requestId: input.requestId } : {}),
    // Build previews with the same function as inference. Do not maintain a second contract.
    request: input.recorded ?? (input.model === 'needle-3'
      ? needlePlan({ id: input.scene, model: input.model, text: JSON.stringify(input.context) }) : input.model === 'jev-latest'
      ? jevPlan({ id: input.scene, model: input.model, text: JSON.stringify(input.context) }).payload
      : prepare({ id: input.scene, model: input.model, text: JSON.stringify(input.context) }).payload),
    ...(input.scene === 'judge' && input.scoreThreshold !== undefined ? { scoreThreshold: input.scoreThreshold } : {}),
  };
}

export function readNativeContract(request: unknown) {
  const parsed = z.object({ model: z.literal('jev-latest'), state: z.unknown(),
    questions: z.record(z.string(), z.object({ type: z.enum(['choice', 'noul']), instructions: z.string(),
      criteria: z.record(z.string(), z.string().nullable()).optional() })) }).safeParse(request);
  return parsed.success ? parsed.data : undefined;
}

// This is a read-only projection for display, not an inference validation boundary.
// Preserve the original request/schema for the raw JSON views.
const displayRequest = z.object({ model: z.string(), response_format: z.object({
  type: z.literal('json_schema'), json_schema: z.object({ name: z.string(), strict: z.boolean(),
    schema: z.object({ type: z.literal('object'), properties: z.record(z.string(), z.unknown()),
      required: z.array(z.string()), additionalProperties: z.literal(false) }).passthrough(),
  }).passthrough(),
}).passthrough() });
const displayField = z.object({ type: z.string(), description: z.string().optional(),
  enum: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  minimum: z.number().optional(), maximum: z.number().optional(),
});

export function readContract(request: unknown) {
  const needle = readNeedleContract(request);
  const parsed = displayRequest.safeParse(needle ? { model: needle.model, response_format: { type: 'json_schema',
    json_schema: { name: needle.tools[0]?.name, strict: true, schema: needle.tools[0]?.parameters } } } : request);
  if (!parsed.success) return undefined;
  const format = parsed.data.response_format;
  const schema = format.json_schema.schema;
  return { model: parsed.data.model, format, schema, fields: Object.entries(schema.properties).map(([name, value]) => {
    const field = displayField.safeParse(value);
    return { name, required: schema.required.includes(name), ...(field.success ? field.data : { type: 'See JSON schema' }) };
  }) };
}

export function readNeedleContract(request: unknown) {
  const parsed = z.object({ model: z.literal('needle-3'), forced: z.literal(true),
    tools: z.array(z.object({ name: z.string(), description: z.string(), parameters: z.unknown() })).length(1),
    revision: z.string(), depth: z.literal(20), max_new_tokens: z.literal(512), fail_input_overflow: z.literal(true),
  }).safeParse(request);
  return parsed.success ? parsed.data : undefined;
}
