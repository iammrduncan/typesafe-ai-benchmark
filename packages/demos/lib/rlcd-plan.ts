import { z } from 'zod';
import { prepare, type DemoInput } from './contracts';
import { defaultModel } from './models';
import release from '../rlcd-release.json';

const objectSchema = z.strictObject({
  type: z.literal('object'),
  properties: z.record(z.string(), z.unknown()),
  required: z.array(z.string()),
  additionalProperties: z.literal(false),
});
const propertySchema = z.object({
  type: z.enum(['string', 'integer', 'boolean']),
  description: z.string().min(1),
  enum: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
  minimum: z.number().int().optional(),
  maximum: z.number().int().optional(),
});

type RlcdBooleanField = { type: 'boolean'; description: string; output: 'boolean' };
type RlcdEnumField = {
  type: 'enum'; description: string; output: 'string' | 'integer';
  choices: string[]; values: (string | number)[];
};
export type RlcdField = RlcdBooleanField | RlcdEnumField;

function enumField(name: string, property: z.infer<typeof propertySchema>): RlcdEnumField {
  let values: (string | number)[];
  if (property.type === 'string') {
    values = z.array(z.string()).min(1).max(255).parse(property.enum);
  } else if (property.type === 'integer') {
    if (property.enum) values = z.array(z.number().int()).min(1).max(255).parse(property.enum);
    else {
      const minimum = z.number().int().parse(property.minimum);
      const maximum = z.number().int().parse(property.maximum);
      if (maximum < minimum || maximum - minimum + 1 > 255) throw new Error(`RLCD cannot represent ${name}`);
      values = Array.from({ length: maximum - minimum + 1 }, (_, index) => minimum + index);
    }
  } else throw new Error(`RLCD cannot represent ${name}`);
  const choices = values.map(String);
  if (new Set(choices).size !== choices.length) throw new Error(`RLCD choices are ambiguous for ${name}`);
  return { type: 'enum', description: property.description,
    output: property.type === 'integer' ? 'integer' : 'string', choices, values };
}

export function rlcdPlan(input: DemoInput) {
  // RLCD is an alternate execution engine for the same scene schema. The source
  // model is replaced before preparation so its local alias never reaches a cloud request.
  const source = prepare({ ...input, model: defaultModel }).payload;
  const schema = objectSchema.parse(source.response_format.json_schema.schema);
  const names = Object.keys(schema.properties);
  if (schema.required.length !== names.length || names.some(name => !schema.required.includes(name))) {
    throw new Error('RLCD requires every output property exactly once');
  }
  const fields = Object.fromEntries(names.map(name => {
    const property = propertySchema.parse(schema.properties[name]);
    const field: RlcdField = property.type === 'boolean'
      ? { type: 'boolean', description: property.description, output: 'boolean' }
      : enumField(name, property);
    return [name, field];
  }));
  return {
    model: 'qwen-2.5-1.5b-rlcd' as const,
    engine: { repository: release.engineRepository, revision: release.engineRevision },
    weights: { repository: release.weightsRepository, revision: release.weightsRevision },
    mode: 'parallel_constrained' as const,
    temperature: 1,
    input: source.messages[0]?.content ?? '',
    schema,
    fields,
  };
}
export type RlcdPlan = ReturnType<typeof rlcdPlan>;

export function rlcdWorkerSchema(plan: RlcdPlan) {
  return Object.fromEntries(Object.entries(plan.fields).map(([name, field]) => [name, field.type === 'boolean'
    ? { type: field.type, description: field.description }
    : { type: field.type, description: field.description, choices: field.choices }]));
}
