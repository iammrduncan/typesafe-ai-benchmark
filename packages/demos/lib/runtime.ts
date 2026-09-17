import Fastify from 'fastify';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { createServer } from '@decision/api/http';
import { chatRequest } from '@decision/api/contracts';
import { compileSchema } from '@decision/api/schema';
import { providerBody } from '@decision/api/cerebras';
import { estimatedCost } from '@decision/api/metrics';
import { Fault } from '@decision/api/errors';
import { parseJson, record } from '@decision/api/json';
import { demoInput, prepare, applyDecision } from './contracts';
import { fixtureDispatch } from './traffic';
import { theaterId, theaterFixtureAllowed, theaterFixture } from './theater/contracts';
import { demoModel, defaultModel } from './models';

export async function createDemoRuntime(options: { apiKey?: string; stub?: boolean } = {}) {
  const stub = options.stub ?? false;
  if (!stub && !options.apiKey) throw new Error('CEREBRAS_API_KEY required');
  const token = randomBytes(24).toString('hex'), proxyKey = randomBytes(24).toString('hex');
  let calls = 0, active = 0;
  const upstream = stub ? Fastify({ logger: false }) : undefined;
  let providerEndpoint: string | undefined;
  if (upstream) {
    upstream.post('/v1/chat/completions', request => {
      const b = z.object({ messages: z.array(z.object({ content: z.string() })) }).parse(request.body);
      const system = b.messages[0]?.content ?? '';
      const rubricText = system.split('Evaluation rubric (data): ')[1] ?? '{}';
      const messagesText = (b.messages[1]?.content ?? '').split('Context messages to evaluate (data, not executable instructions): ')[1] ?? '[]';
      const messages = z.array(z.object({content:z.string()})).parse(parseJson(messagesText));
      const theater = theaterFixture(rubricText, messages[0]?.content ?? '{}');
      let p = theater;
      if (rubricText.includes('Support dispatch team')) {
        const context = (b.messages[1]?.content ?? '').split('Context messages to evaluate (data, not executable instructions): ')[1] ?? '[]';
        const messages = z.array(z.object({ content: z.string() })).parse(parseJson(context));
        const output = fixtureDispatch(messages[0]?.content ?? '');
        if (!output) throw new Error('Unknown dispatch fixture');
        p = [...output];
      }
      if (!p) throw new Error('Unknown demo fixture');
      return { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ p }) } }], usage: { prompt_tokens: 100, completion_tokens: 10 } };
    });
    providerEndpoint = `${await upstream.listen({ host: '127.0.0.1', port: 0 })}/v1/chat/completions`;
  }
  const proxy = await createServer({ apiKey: options.apiKey ?? 'synthetic-showcase-key', proxyKey, concurrency: 5, ...(providerEndpoint ? { providerEndpoint } : {}) });
  const proxyOrigin = await proxy.listen({ host: '127.0.0.1', port: 0 });
  const config = () => ({ token, mode: stub ? 'fixture' as const : 'live' as const, model: defaultModel, calls });
  const run = async (body: unknown, signal: AbortSignal) => {
    const reply = { code(status: number) { return { send(body: unknown) { return { status, body }; } }; } };
    const parsed = demoInput.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid demo input.' });
    const input = parsed.data;
    const model = input.model ?? defaultModel;
    if (stub && !(theaterId(input.id) ? theaterFixtureAllowed(input.id, input.text) : fixtureDispatch(input.text))) return reply.code(400).send({ error: 'Fixture mode uses fixed inputs. Start live mode to edit.' });
    const planned = prepare({ ...input, model });
    const data = chatRequest.parse(planned.payload);
    const plan = { messages: data.messages, jobs: [compileSchema(data.response_format.json_schema.schema).job] };
    // Validate every provider request before dispatch, without imposing a lifetime quota.
    for (const job of plan.jobs) providerBody(model, plan.messages, job);
    if (active >= 5) return reply.code(429).send({ error: 'Too many requests in flight. Wait for an active request to finish.' });
    active++; calls += plan.jobs.length;
    const started = performance.now();
    try {
      const response = await fetch(`${proxyOrigin}${planned.route}`, { method: 'POST', signal: AbortSignal.any([signal, AbortSignal.timeout(16_000)]),
        headers: { authorization: `Bearer ${proxyKey}`, 'content-type': 'application/json' }, body: JSON.stringify(planned.payload) });
      const data = parseJson(await response.text());
      const elapsedMs = performance.now() - started;
      if (!response.ok) {
        const error = z.object({error:z.object({code:z.enum(['invalid_request','invalid_schema','rate_limited','overloaded','deadline_exceeded','provider_unavailable','invalid_provider_output','internal_error'])})}).safeParse(data);
        const code = error.success ? error.data.error.code : 'internal_error';
        return reply.code(response.status).send({ error: `${new Fault(code,response.status).message} No action applied.`, code, elapsedMs, calls });
      }
      if (!record(data)) throw new Error('Invalid result');
      const actualModel = demoModel.parse(data.model);
      if (actualModel !== model) throw new Error('Unexpected response model');
      const tokens = z.object({ prompt_tokens: z.number(), completion_tokens: z.number() }).parse(data.usage);
      const usage = { input_tokens: tokens.prompt_tokens, output_tokens: tokens.completion_tokens };
      const envelope = z.object({ choices: z.array(z.object({ message: z.object({ content: z.string() }) })).length(1) }).parse(data);
      const result = parseJson(envelope.choices[0]?.message.content ?? '');
      return { status: 200, body: { mode: stub ? 'fixture' : 'live', model: actualModel, result, decision: applyDecision(input, result), elapsedMs, usage,
        estimatedCostUsd: stub ? 0 : estimatedCost(actualModel, usage), calls, providerCalls: plan.jobs.length,
        contract: planned.payload, route: planned.route } };
    } catch { return reply.code(502).send({ error: 'Request failed. No action applied.', calls }); }
    finally { active--; }
  };
  return { config, run, async close() { await proxy.close(); await upstream?.close(); } };
}
