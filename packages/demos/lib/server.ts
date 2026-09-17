import 'server-only';
import { createDemoRuntime } from './runtime';
// Cache across Next dev reloads to reuse the provider runtime and connection pool.
const globalState = globalThis as typeof globalThis & { decisionRuntime?: ReturnType<typeof createDemoRuntime> };
export function getRuntime() {
  globalState.decisionRuntime ??= createDemoRuntime({ stub: process.env.DEMO_MODE !== 'live',
    ...(process.env.CEREBRAS_API_KEY ? { apiKey: process.env.CEREBRAS_API_KEY } : {}) }).catch(error => {
      delete globalState.decisionRuntime;
      throw error;
    });
  return globalState.decisionRuntime;
}
