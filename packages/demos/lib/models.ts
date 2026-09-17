import { z } from 'zod';
import { modelIds, models } from '@decision/api/models';
export { models };

export const demoModel = z.enum(modelIds);
export type DemoModel = z.infer<typeof demoModel>;
export const defaultModel: DemoModel = 'qwen-3.8-27b';
