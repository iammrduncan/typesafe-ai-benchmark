import { z } from 'zod';
import { modelIds, models as cerebrasModels } from '@decision/api/models';
// Jev price supplied by the account owner on 2026-09-17: $0.04/M input, free output.
export const models = { ...cerebrasModels, 'jev-latest': { label: 'Jev · TypeSafe', input: 0.04, output: 0 } };

export const demoModel = z.enum([...modelIds, 'jev-latest']);
export type DemoModel = z.infer<typeof demoModel>;
export const defaultModel = 'qwen-3.8-27b' satisfies DemoModel;
