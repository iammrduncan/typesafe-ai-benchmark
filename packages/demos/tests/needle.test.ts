import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import { needlePlan } from '../lib/needle-plan';
import { decodeNeedle, requestNeedle } from '../lib/needle';
import { createDemoRuntime } from '../lib/runtime';
import { workItem, type SceneId } from '../lib/theater/data';
import { DrivingEngine } from '../lib/theater/driving';
import { contractSnapshot, readContract, readNeedleContract } from '../lib/theater/contract-view';
import { requestTotals } from '../lib/theater/workload';

const input = (id: SceneId) => ({ id, model: 'needle-3' as const, text: JSON.stringify(id === 'navigate'
  ? { position: 20, target: 4, visited: [20] } : id === 'drive' ? new DrivingEngine().state : workItem(id, 0).context) });
const response = (name: string, args: unknown) => ({ type: 'call', success: true, error: null,
  function_calls: [{ name, arguments: args }], reasoning: 'PRIVATE_REASONING', extra: 'PRIVATE_ENVELOPE',
  prefill_tps: 2000, decode_tps: 800, peak_ram_mb: 96 });

test('Needle rejects ambiguous, suppressed, prose and invalid decisions without leaking reasoning', () => {
  const i = input('screen'), plan = needlePlan(i), name = plan.tools[0]?.name ?? '';
  const good = response(name, { decision: 'allow' });
  const decoded = decodeNeedle(i, plan, good);
  assert.deepEqual(decoded.decision, { decision: 'allow' });
  assert.ok(!JSON.stringify(decoded).includes('PRIVATE'));
  for (const raw of [
    { ...good, function_calls: [] }, { ...good, function_calls: [...good.function_calls, ...good.function_calls] },
    { ...good, function_calls: [], suppressed_calls: good.function_calls },
    { ...good, success: false }, response('run_command', { decision: 'allow' }),
    response(name, { decision: 'allow', reasoning: 'PRIVATE' }), response(name, { decision: 'execute' }),
    response(name, 'explanation'), { ...good, decode_tps: Infinity },
  ]) assert.throws(() => decodeNeedle(i, plan, raw));
  const judge = input('judge'), judgePlan = needlePlan(judge);
  assert.throws(() => decodeNeedle(judge, judgePlan, response('decide_judge', { accuracy: 101, valid: true })));
  assert.throws(() => decodeNeedle(judge, judgePlan, response('decide_judge', { accuracy: 33.5, valid: true })));
});

test('all Needle scene contracts use the native plan and offline fixtures retain their model identity', async () => {
  const runtime = await createDemoRuntime({ stub: true });
  try {
    assert.ok(runtime.config().availableModels.includes('needle-3'));
    for (const id of ['dispatch', 'navigate', 'drive', 'screen', 'approve', 'judge', 'home'] satisfies SceneId[]) {
      const i = input(id), plan = needlePlan(i);
      const snapshot = contractSnapshot({ scene: id, model: i.model, context: JSON.parse(i.text) });
      assert.deepEqual(snapshot.request, plan);
      assert.equal(readNeedleContract(snapshot.request)?.forced, true);
      assert.ok(readContract(snapshot.request)?.fields.length);
      const r = await runtime.run(i, new AbortController().signal);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      const result = z.object({ model: z.literal('needle-3'), mode: z.literal('fixture'), contract: z.unknown() }).parse(r.body);
      assert.deepEqual(result.contract, plan);
    }
  } finally { await runtime.close(); }
});

test('local usage stays unknown while known zero API fees remain priced', () => {
  const totals = requestTotals([{ data: { usage: null, estimatedCostUsd: 0 } }]);
  assert.equal(totals.measuredRequests, 0); assert.equal(totals.unmeasuredRequests, 1);
  assert.equal(totals.pricedRequests, 1); assert.equal(totals.unpricedRequests, 0);
  assert.equal(totals.averageCostUsd, 0);
});

test('native process boundary is isolated, cancellable and sanitized; no cloud key is needed', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'needle-test-'));
  const executable = path.join(dir, 'fake-needle.cjs'), marker = path.join(dir, 'started');
  // A synthetic upstream process, never the downloaded model or a paid service.
  await writeFile(executable, `#!${process.execPath}
const fs=require('node:fs');
const args=process.argv.slice(2), get=flag=>args[args.indexOf(flag)+1];
const tools=JSON.parse(fs.readFileSync(get('--tools'),'utf8'));
if(process.env.CEREBRAS_API_KEY||process.env.JEV_KEY)process.exit(4);
if(!args.includes('--forced')||!args.includes('--fail-input-overflow'))process.exit(5);
if(get('--model')==='slow'){fs.writeFileSync(${JSON.stringify(marker)},String(process.pid));setTimeout(()=>{},10000);}
else if(get('--model')==='bad'){console.log('PRIVATE_INVALID_OUTPUT');}
else if(get('--model')==='fail'){console.error('PRIVATE_FAILURE');process.exit(1);}
else console.log(JSON.stringify({type:'call',success:true,error:null,function_calls:[{name:tools[0].name,arguments:{decision:'allow'}}],reasoning:'PRIVATE',prefill_tps:2000,decode_tps:800,peak_ram_mb:96}));
`, { mode: 0o700 });
  const runtime = await createDemoRuntime({ needle: { executable, weights: 'good' } });
  const i = input('screen'), plan = needlePlan(i);
  try {
    assert.equal(runtime.config().model, 'needle-3');
    assert.deepEqual(runtime.config().availableModels, ['needle-3']);
    const good = await runtime.run(i, new AbortController().signal);
    assert.equal(good.status, 200);
    const result = z.object({ mode: z.literal('live'), usage: z.null(), estimatedCostUsd: z.literal(0),
      decision: z.object({ decision: z.literal('allow') }), elapsedMs: z.number().positive() }).parse(good.body);
    assert.equal(result.usage, null); assert.ok(!JSON.stringify(good).includes('PRIVATE'));
    for (const [weights, code] of [['bad', 'invalid_provider_output'], ['fail', 'provider_unavailable']] as const) {
      await assert.rejects(requestNeedle(i, plan, { executable, weights }, new AbortController().signal), { code });
    }
    const abort = new AbortController();
    const pending = requestNeedle(i, plan, { executable, weights: 'slow' }, abort.signal);
    const rejected = assert.rejects(pending, { code: 'deadline_exceeded' });
    let pid = 0;
    for (let n = 0; n < 200 && !pid; n++) { try { pid = Number(await readFile(marker, 'utf8')); } catch { await delay(5); } }
    assert.ok(pid); abort.abort(); await rejected;
    let alive = true;
    for (let n = 0; n < 200 && alive; n++) { try { process.kill(pid, 0); await delay(5); } catch { alive = false; } }
    assert.equal(alive, false, 'Canceled native inference must actually exit');
    assert.equal((await runtime.run(i, new AbortController().signal)).status, 200);
    await rm(marker);
    const closing = await createDemoRuntime({ needle: { executable, weights: 'slow' } });
    try {
      const inFlight = closing.run(i, new AbortController().signal);
      let started = false;
      for (let n = 0; n < 200 && !started; n++) { try { await readFile(marker); started = true; } catch { await delay(5); } }
      assert.ok(started); await closing.close();
      assert.equal((await inFlight).status, 504);
    } finally { await closing.close(); }
  } finally { await runtime.close(); await rm(dir, { recursive: true, force: true }); }
});
