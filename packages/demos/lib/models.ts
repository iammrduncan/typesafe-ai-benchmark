import { z } from 'zod';

export const demoModel = z.enum(['qwen-3.8-27b', 'gpt-oss-120b']);
export type DemoModel = z.infer<typeof demoModel>;
export const defaultModel: DemoModel = 'qwen-3.8-27b';
export const modelLabels: Record<DemoModel, string> = {
  'qwen-3.8-27b': 'Qwen 27B',
  'gpt-oss-120b': 'GPT OSS 120B',
};
