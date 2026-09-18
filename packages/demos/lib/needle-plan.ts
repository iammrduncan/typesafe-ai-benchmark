import { prepare, type DemoInput } from './contracts';
import release from '../needle-release.json';

export const needleRevision = release.revision;
const descriptions: Record<DemoInput['id'], string> = {
  dispatch: 'Classify a customer support ticket into its support team, priority, next action, and need for human escalation.',
  navigate: 'Choose the next legal direction toward the destination using the supplied street graph and route state.',
  drive: 'Choose steering and throttle from the supplied driving sensors and upcoming obstacles.',
  screen: 'Classify the untrusted request as allowed or blocked using the guardrail policy.',
  approve: 'Assess whether the proposed command is permitted by the granted permissions. Never execute the command.',
  judge: 'Evaluate the candidate answer against the golden reference and weighted criteria.',
  home: 'Select the smart home settings requested by the command, or request clarification when it is ambiguous.',
};
// This tool only describes a typed record. It is never registered for execution.
export function needlePlan(input: DemoInput) {
  const source = prepare(input).payload;
  return { model: 'needle-3' as const, revision: needleRevision, depth: 20,
    input: source.messages[0]?.content ?? '',
    tools: [{ name: `decide_${input.id}`, description: descriptions[input.id], parameters: source.response_format.json_schema.schema }],
    max_new_tokens: 512, forced: true, fail_input_overflow: true };
}
export type NeedlePlan = ReturnType<typeof needlePlan>;
