import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { createDemoRuntime } from '../lib/runtime';
import { neighbors, walls, depot, parcel, presets, applyDecision, prepare, demoInput } from '../lib/contracts';
import { localRequest, readInput } from '../lib/request';
const responseSchema = z.object({ mode: z.string(), estimatedCostUsd: z.number(), usage: z.object({ output_tokens: z.number() }), decision: z.record(z.string(), z.unknown()) });
test('courier context includes bounded recent history without restricting legal model choices', () => {
  const input = { id: 'courier', text: 'Go', position: 10, history: [36, 27, 18, 9, 10] };
  const request = prepare(demoInput.parse(input));
  const payload = z.object({ messages: z.array(z.object({ content: z.string() })) }).parse(request.payload);
  const context = JSON.parse(payload.messages[0]?.content ?? '{}') as { recentPath: number[]; legalMoves: unknown[]; map: string[] };
  assert.deepEqual(context.recentPath, input.history);
  assert.deepEqual(context.legalMoves, neighbors(10));
  assert.equal(context.map[1]?.[1], 'C');
  assert.equal(demoInput.safeParse({ ...input, history: Array(57).fill(10) }).success, false);
  assert.equal(demoInput.safeParse({ ...input, history: [45] }).success, false);
});
test('courier routes exist, wall collisions and row wrapping are impossible', () => {
  const queue = [depot], seen = new Set<number>();
  while (queue.length) {
    const at = queue.shift(); if (at === undefined || seen.has(at)) continue;
    seen.add(at);
    for (const n of neighbors(at)) {
      assert.ok(!walls.includes(n.position));
      assert.ok(Math.abs(at - n.position) === 9 || Math.floor(at / 9) === Math.floor(n.position / 9));
      queue.push(n.position);
    }
  }
  assert.ok(seen.has(parcel));
  assert.throws(() => applyDecision({ id: 'courier', text: 'Go', position: 2 }, { move: 'east' }));
  assert.throws(() => prepare({ id: 'courier', text: 'Go', position: 3 }));
  assert.deepEqual(applyDecision({ id: 'courier', text: 'Go', position: 7 }, { move: 'east' }), { move: 'east', position: 8, carrying: true, delivered: false });
  assert.deepEqual(applyDecision({ id: 'courier', text: 'Return', position: 37, carrying: true }, { move: 'west' }), { move: 'west', position: 36, carrying: true, delivered: true });
});
test('Next request boundary rejects foreign origins, rebinding, duplicate JSON and oversized bodies', async () => {
  const make = (body = '{}', headers: Record<string, string> = {}) => new Request('http://127.0.0.1:3001/api/decide', { method: 'POST', body,
    headers: { host: '127.0.0.1:3001', origin: 'http://127.0.0.1:3001', 'content-type': 'application/json', ...headers } });
  assert.equal(localRequest(make(), true), true);
  assert.equal(localRequest(make('{}', { origin: 'https://evil.test' }), true), false);
  assert.equal(localRequest(make('{}', { host: 'evil.test' })), false);
  const tailnetHost = '100.127.125.114';
  const tailnet = make('{}', { host: `${tailnetHost}:3001`, origin: `http://${tailnetHost}:3001` });
  assert.equal(localRequest(tailnet, true, tailnetHost), true);
  assert.equal(localRequest(tailnet, true), false);
  const hostname = 'josephs-macbook-pro.taila9c138.ts.net';
  const dnsRequest = make('{}', { host: `${hostname}:3001`, origin: `http://${hostname}:3001` });
  assert.equal(localRequest(dnsRequest, true, tailnetHost, hostname), true);
  assert.equal(localRequest(dnsRequest, true, tailnetHost, ''), false);
  assert.equal(localRequest(make('{}', { host: `${hostname}:3001`, origin: 'https://evil.test' }), true, tailnetHost, hostname), false);
  assert.equal(localRequest(make('{}', { host: `evil.${hostname}:3001`, origin: `http://evil.${hostname}:3001` }), true, tailnetHost, hostname), false);
  assert.equal(localRequest(make('{}', { host: `${tailnetHost}:3001`, origin: 'https://evil.test' }), true, tailnetHost), false);
  assert.equal(localRequest(make('{}', { host: '100.64.0.2:3001', origin: 'http://100.64.0.2:3001' }), true, tailnetHost), false);
  assert.equal(localRequest(make('{}', { 'content-type': 'text/plain' }), true), false);
  assert.deepEqual(await readInput(make('{"id":"home"}')), { id: 'home' });
  await assert.rejects(readInput(make('{"a":1,"a":2}')));
  await assert.rejects(readInput(make(' '.repeat(16385))));
});
test('all demo workflows traverse the real proxy in fixture mode', async () => {
  const demo = await createDemoRuntime({ stub: true });
  const signal = new AbortController().signal;
  try {
    assert.equal((await demo.run({ id: 'home', text: 'Different fixture' }, signal)).status, 400);
    for (const id of ['triage', 'home', 'guardrail'] as const) {
      const response = await demo.run({ id, text: presets[id] }, signal);
      assert.equal(response.status, 200, JSON.stringify(response.body));
      const data = responseSchema.parse(response.body);
      assert.equal(data.mode, 'fixture'); assert.equal(data.estimatedCostUsd, 0); assert.ok(data.usage.output_tokens > 0);
      assert.ok(!JSON.stringify(response.body).includes(demo.config().token));
      if (id === 'home') assert.deepEqual(data.decision, { kitchen: 'off', hall: 'on', action: 'apply' });
      if (id === 'triage') assert.equal(data.decision.team, 'billing');
      if (id === 'guardrail') assert.equal(data.decision.action, 'block');
    }
    let position = depot, carrying = false, delivered = false;
    for (let i = 0; i < 28 && !delivered; i++) {
      const response: Awaited<ReturnType<typeof demo.run>> = await demo.run({ id: 'courier', text: presets.courier, position, carrying }, signal);
      assert.equal(response.status, 200, JSON.stringify(response.body));
      const decision = z.object({ decision: z.object({ position: z.number(), carrying: z.boolean(), delivered: z.boolean() }) }).parse(response.body).decision;
      assert.ok(neighbors(position).some(n => n.position === decision.position));
      position = decision.position; carrying = decision.carrying; delivered = decision.delivered;
    }
    assert.equal(delivered, true);
  } finally { await demo.close(); }
});
test('demo sessions continue past the former 80-call cutoff; aborted requests return no action', async () => {
  const demo = await createDemoRuntime({ stub: true });
  try {
    for (let i = 0; i < 110; i++) {
      assert.equal((await demo.run({ id: 'home', text: presets.home }, new AbortController().signal)).status, 200);
    }
    assert.equal(demo.config().calls, 110);
  } finally { await demo.close(); }
  const second = await createDemoRuntime({ stub: true });
  try {
    const response = await second.run({ id: 'home', text: presets.home }, AbortSignal.abort());
    assert.equal(response.status, 502);
    assert.equal(z.object({ error: z.string() }).parse(response.body).error, 'Request failed. No action applied.');
  } finally { await second.close(); }
});

test('dispatch feed uses rich context and a single validated request per ticket', async () => {
  const { trafficTicket, fixtureDispatch, dispatchDecision, teams, priorities, actions } = await import('../lib/traffic');
  const demo = await createDemoRuntime({ stub: true });
  try {
    for (let offset = 0; offset < 24; offset += 3) {
      await Promise.all(Array.from({ length: 3 }, async (_, n) => {
        const ticket = trafficTicket(offset + n);
        const text = JSON.stringify(ticket);
        const request = prepare({ id: 'dispatch', text });
        assert.equal(request.route, '/v1/chat/completions');
        const messages = z.object({ messages: z.array(z.object({ content: z.string() })) }).parse(request.payload).messages;
        assert.deepEqual(JSON.parse(messages[0]?.content ?? '{}'), ticket);
        assert.equal(Object.hasOwn(ticket, 'expected'), false);
        const result = await demo.run({ id: 'dispatch', text }, new AbortController().signal);
        assert.equal(result.status, 200);
        const body = z.object({ decision: dispatchDecision, providerCalls: z.number() }).parse(result.body);
        const expected = fixtureDispatch(text);
        assert.ok(expected);
        assert.deepEqual(body.decision, { team: teams[expected[0]], priority: priorities[expected[1]], action: actions[expected[2]], escalate: expected[3] === 1 });
        assert.equal(body.providerCalls, 1);
      }));
    }
    assert.equal(demo.config().calls, 24);
    assert.equal((await demo.run({ id: 'dispatch', text: '{"message":"custom fixture"}' }, new AbortController().signal)).status, 400);
    assert.equal(demo.config().calls, 24);
    assert.throws(() => prepare({ id: 'dispatch', text: '{"message":"missing context"}' }));
    assert.throws(() => applyDecision({ id: 'dispatch', text: '' }, { team: 'billing', priority: 'critical', action: 'transfer_money', escalate: true }));
  } finally { await demo.close(); }
});
