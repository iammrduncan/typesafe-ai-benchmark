'use client';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { catalog, depot, presets, type DemoId } from '../lib/catalog';
const configSchema = z.object({ token: z.string(), mode: z.enum(['fixture', 'live']), model: z.string() });
const resultSchema = z.object({ mode: z.enum(['fixture', 'live']), result: z.unknown(), decision: z.record(z.string(), z.unknown()),
  elapsedMs: z.number().finite(), usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }),
  estimatedCostUsd: z.number(), calls: z.number(), providerCalls: z.number(), contract: z.unknown(), route: z.string() });
export type DemoResult = z.infer<typeof resultSchema>;
export type Receipt = { id: DemoId; status: string; browserMs: number; at: string; data?: DemoResult; error?: string };
export type Panel = { busy: boolean; started: number; error?: string; receipt?: Receipt };
const courierSchema = z.object({ position: z.number().int().min(0).max(44), carrying: z.boolean(), delivered: z.boolean(), move: z.string() });
const initialCourier = () => ({ position: depot, carrying: false, delivered: false, move: 'wait', steps: 0, visited: [depot], history: [depot] });
const initialPanels = () => Object.fromEntries(catalog.map(d => [d.id, { busy: false, started: 0 }])) as Record<DemoId, Panel>;
export function useArcade() {
  const [config, setConfig] = useState<z.infer<typeof configSchema>>();
  const [connectionError, setConnectionError] = useState('');
  const [inputs, setInputs] = useState({ ...presets });
  const [panels, setPanels] = useState(initialPanels);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [lights, setLights] = useState({ kitchen: true, hall: true });
  const [courier, setCourier] = useState(initialCourier);
  const actor = useRef(initialCourier());
  const controllers = useRef(new Map<DemoId, AbortController>());
  const mission = useRef(false);
  const [missionRunning, setMissionRunning] = useState(false);
  const [missionNote, setMissionNote] = useState('Collect the parcel. Bring it home.');
  useEffect(() => {
    const abort = new AbortController(); const active = controllers.current;
    void fetch('/api/config', { signal: abort.signal }).then(async r => {
      if (!r.ok) throw new Error('Unavailable'); setConfig(configSchema.parse(await r.json()));
    }).catch(() => { if (!abort.signal.aborted) setConnectionError('Unable to connect. Check the local server configuration.'); });
    return () => { abort.abort(); mission.current = false; for (const controller of active.values()) controller.abort(); };
  }, []);
  async function run(id: DemoId): Promise<DemoResult | undefined> {
    if (!config || controllers.current.has(id)) return;
    const text = inputs[id].trim(); if (!text) { setPanels(p => ({ ...p, [id]: { ...p[id], error: 'Enter an input first.' } })); return; }
    const abort = new AbortController(); controllers.current.set(id, abort);
    const started = performance.now(); setPanels(p => ({ ...p, [id]: { busy: true, started } }));
    let receipt: Receipt;
    try {
      const r = await fetch('/api/decide', { method: 'POST', signal: abort.signal,
        headers: { 'content-type': 'application/json', 'x-demo-token': config.token },
        body: JSON.stringify({ id, text, ...(id === 'courier' ? { position: actor.current.position, carrying: actor.current.carrying, history: actor.current.history } : {}) }) });
      const raw: unknown = await r.json(); const browserMs = performance.now() - started;
      if (!r.ok) {
        const safe = z.object({ error: z.string() }).safeParse(raw);
        receipt = { id, status: String(r.status), browserMs, at: new Date().toISOString(), error: safe.success ? safe.data.error : 'Request failed. No action applied.' };
      } else {
        const data = resultSchema.parse(raw);
        receipt = { id, status: '200', browserMs, at: new Date().toISOString(), data };
        if (id === 'home' && data.decision.action === 'apply') setLights(l => ({
          kitchen: data.decision.kitchen === 'on' ? true : data.decision.kitchen === 'off' ? false : l.kitchen,
          hall: data.decision.hall === 'on' ? true : data.decision.hall === 'off' ? false : l.hall,
        }));
        if (id === 'courier') {
          const action = courierSchema.parse(data.decision);
          const history = action.carrying !== actor.current.carrying ? [action.position] : [...actor.current.history, action.position].slice(-56);
          actor.current = { ...action, history, steps: actor.current.steps + 1, visited: [...new Set([...actor.current.visited, action.position])] };
          setCourier(actor.current);
          setMissionNote(action.delivered ? `Delivered in ${actor.current.steps} model decisions.` : `${action.move.toUpperCase()} → cell ${action.position}${action.carrying ? ' / parcel collected' : ''}`);
        }
      }
    } catch {
      receipt = { id, status: abort.signal.aborted ? 'canceled' : 'failed', browserMs: performance.now() - started,
        at: new Date().toISOString(), error: abort.signal.aborted ? 'Stopped. No further action applied.' : 'Request failed. No action applied.' };
    } finally { controllers.current.delete(id); }
    setReceipts(rows => [...rows, receipt]);
    setPanels(p => ({ ...p, [id]: { busy: false, started, receipt, ...(receipt.error ? { error: receipt.error } : {}) } }));
    return receipt.data;
  }
  async function runMission() {
    if (mission.current) return;
    mission.current = true; setMissionRunning(true); const visits = new Map<string, number>();
    for (let i = 0; i < 28 && mission.current && !actor.current.delivered; i++) {
      if (!await run('courier')) break;
      if (!mission.current || actor.current.delivered) break;
      const key = `${actor.current.position}:${actor.current.carrying}`;
      visits.set(key, (visits.get(key) ?? 0) + 1);
      if (actor.current.move === 'wait' || (visits.get(key) ?? 0) >= 3) { setMissionNote('Paused: model waited or repeated a position. Inspect the result.'); break; }
      if (i === 27) setMissionNote('28-decision limit reached. Continue or inspect the route.');
    }
    mission.current = false; setMissionRunning(false);
  }
  const stopMission = () => { mission.current = false; controllers.current.get('courier')?.abort(); setMissionRunning(false); setMissionNote('Stopped by you. No further requests.'); };
  const resetCourier = () => { if (mission.current || controllers.current.has('courier')) return; actor.current = initialCourier(); setCourier(actor.current); setMissionNote('Collect the parcel. Bring it home.'); };
  return { config, connectionError, inputs, setInput: (id: DemoId, text: string) => setInputs(v => ({ ...v, [id]: text })), panels, receipts,
    lights, resetLights: () => setLights({ kitchen: true, hall: true }), courier, missionNote, missionRunning, run, runMission, stopMission, resetCourier,
    runAll: () => Promise.all([run('triage'), run('home'), runMission()]),
    totalCost: receipts.reduce((sum, r) => sum + (r.data?.estimatedCostUsd ?? 0), 0) };
}
export type ArcadeState = ReturnType<typeof useArcade>;
