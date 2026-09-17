'use client';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { dispatchDecision, teams, trafficTicket, type TrafficTicket, ticketSchema } from '../lib/traffic';

const responseSchema = z.object({ decision: dispatchDecision, elapsedMs: z.number().finite(),
  usage: z.object({ input_tokens: z.number().nonnegative(), output_tokens: z.number().nonnegative() }),
  estimatedCostUsd: z.number().nonnegative() });
type ResponseData = z.infer<typeof responseSchema>;
type Event = { sequence: number; ticket: TrafficTicket; status: 'pending' | 'validated' | 'failed' | 'canceled'; sentAt: string; settledAtMs?: number; elapsedMs?: number; data?: ResponseData; error?: string };
type Connection = { token: string; mode: 'fixture' | 'live'; model: string };
const format = (value: unknown) => JSON.stringify(value, null, 2);

export function TrafficConsole({ config }: { config: Connection | undefined }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(24);
  const [concurrency, setConcurrency] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [runConcurrency, setRunConcurrency] = useState(0);
  const [selected, setSelected] = useState<number>();
  const [draft, setDraft] = useState(format(trafficTicket(0)));
  const [inputError, setInputError] = useState('');
  const [runNote, setRunNote] = useState('Ready for a burst of 24 synthetic tickets.');
  const control = useRef<{ stopped: boolean; active: Set<AbortController>; started: number } | null>(null);
  useEffect(() => () => { if (control.current) { control.current.stopped = true; for (const c of control.current.active) c.abort(); } }, []);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => { if (control.current) setElapsed(performance.now() - control.current.started); }, 100);
    return () => clearInterval(timer);
  }, [running]);
  async function start(single = false) {
    if (!config || control.current) return;
    const connection = config;
    let custom: TrafficTicket | undefined;
    if (single) {
      try {
        custom = ticketSchema.parse(JSON.parse(draft));
        if (JSON.stringify(custom).length > 2000) throw new Error('Too large');
      } catch { setInputError('Use the ticket fields shown below, valid JSON, and at most 2,000 characters.'); return; }
    }
    setInputError(''); setEvents([]); setSelected(undefined); setElapsed(0); setRunning(true);
    const run = { stopped: false, active: new Set<AbortController>(), started: performance.now() };
    control.current = run;
    const total = single ? 1 : count;
    setRunConcurrency(single ? 1 : concurrency);
    let next = 0, completed = 0;
    setRunNote(`Dispatching ${total} tickets · up to ${single ? 1 : concurrency} in flight`);
    async function worker() {
      while (!run.stopped && next < total) {
        const sequence = next++;
        const ticket = custom ?? trafficTicket(sequence);
        const abort = new AbortController(); run.active.add(abort);
        const event: Event = { sequence, ticket, status: 'pending', sentAt: new Date().toISOString() };
        setEvents(rows => [...rows, event]);
        const started = performance.now();
        let result: Event;
        try {
          const response = await fetch('/api/decide', { method: 'POST', signal: abort.signal,
            headers: { 'content-type': 'application/json', 'x-demo-token': connection.token },
            body: JSON.stringify({ id: 'dispatch', text: JSON.stringify(ticket) }) });
          const raw: unknown = await response.json();
          if (!response.ok) {
            const error = z.object({ error: z.string() }).safeParse(raw);
            result = { ...event, status: 'failed', elapsedMs: performance.now() - started, error: error.success ? error.data.error : `HTTP ${response.status}` };
            if (response.status === 429) run.stopped = true;
          } else {
            const data = responseSchema.parse(raw);
            result = { ...event, status: 'validated', elapsedMs: performance.now() - started, data };
            completed++;
          }
        } catch {
          result = { ...event, status: abort.signal.aborted ? 'canceled' : 'failed', elapsedMs: performance.now() - started, error: abort.signal.aborted ? 'Canceled. Cost may be unknown.' : 'Request failed. No action applied.' };
        } finally { run.active.delete(abort); }
        result = { ...result, settledAtMs: performance.now() - run.started };
        setEvents(rows => rows.map(row => row.sequence === sequence ? result : row));
      }
    }
    await Promise.all(Array.from({ length: single ? 1 : concurrency }, () => worker()));
    setElapsed(performance.now() - run.started);
    setRunNote(`${run.stopped ? 'Stopped' : 'Burst complete'} · ${completed} validated / ${next} dispatched. Click any event to inspect it.`);
    control.current = null; setRunning(false);
  }
  function stop() { const run = control.current; if (!run) return; run.stopped = true; for (const c of run.active) c.abort(); }
  const settled = events.filter(e => e.status !== 'pending').sort((a, b) => (a.settledAtMs ?? 0) - (b.settledAtMs ?? 0));
  const complete = settled.filter(e => e.status === 'validated');
  const focus = events.find(e => e.sequence === selected) ?? settled.at(-1) ?? events.at(-1);
  const pending = events.filter(e => e.status === 'pending').length;
  const totals = complete.reduce((sum, e) => ({ input: sum.input + (e.data?.usage.input_tokens ?? 0), output: sum.output + (e.data?.usage.output_tokens ?? 0), cost: sum.cost + (e.data?.estimatedCostUsd ?? 0) }), { input: 0, output: 0, cost: 0 });
  const hz = elapsed > 0 ? complete.length / (elapsed / 1000) : 0;
  function download() {
    const url = URL.createObjectURL(new Blob([format({ mode: config?.mode, model: config?.model, elapsedMs: elapsed, concurrency: runConcurrency, events, costNote: 'Actual reported usage; estimated list-price cost. Failed calls may be billed.' })], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'decision-stream.json'; a.click(); URL.revokeObjectURL(url);
  }
  return <section className="traffic" id="decision-stream" aria-label="Live decision stream">
    <div className="traffic-heading"><div><p className="eyebrow">THE DECISION FLOOR / SUPPORT OPERATIONS</p><h2>Watch the work happen.</h2><p>Inputs arrive. Types pass. Queues move. Every event is a real request.</p></div><span className={`stream-status ${running ? 'on' : ''}`}>{running ? '● RUNNING' : config?.mode === 'fixture' ? 'FIXTURE FEED' : 'LIVE INFERENCE'}</span></div>
    <div className="traffic-controls"><label>Burst<select aria-label="Burst size" value={count} disabled={running} onChange={e => setCount(Number(e.target.value))}>{[12, 24, 48].map(n => <option key={n} value={n}>{n} tickets</option>)}</select></label><label>Concurrency<select aria-label="Concurrency" value={concurrency} disabled={running} onChange={e => setConcurrency(Number(e.target.value))}>{[1, 2, 3].map(n => <option key={n} value={n}>{n} in flight</option>)}</select></label><button className="stream-start" disabled={!config || running} onClick={() => { void start(); }}>Start decision stream ↗</button><button className="stream-stop" disabled={!running} onClick={stop}>Stop</button><button className="stream-export" disabled={!events.length || running} onClick={download}>Export run ↓</button></div>
    <div className="stream-metrics">{[['VALIDATED', `${complete.length} / ${events.length}`], ['IN FLIGHT', pending], ['DECISIONS / SEC', hz.toFixed(1)], ['TOKENS IN / OUT', `${totals.input} / ${totals.output}`], ['OUTPUT TOKENS / SEC', elapsed ? (totals.output / (elapsed / 1000)).toFixed(1) : '0.0'], ['EST. USD', `$${totals.cost.toFixed(6)}`]].map(([label,value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="stream-grid">
      <div className="stream-pane inputs-pane"><div className="pane-heading"><span>01 / INPUT STREAM</span><span>{events.length} SENT</span></div><pre className="stream-code">{format(focus?.ticket ?? trafficTicket(0))}</pre><div className="event-feed" aria-label="Input events">{events.length ? events.toReversed().map(e => <button key={e.sequence} className={`feed-row ${e.status} ${focus?.sequence === e.sequence ? 'focused' : ''}`} onClick={() => setSelected(e.sequence)}><span>{e.ticket.ticket}</span><strong>{e.ticket.subject}</strong><i>{e.status === 'pending' ? 'IN FLIGHT' : `${e.elapsedMs?.toFixed(0)} ms`}</i></button>) : <div className="feed-empty">24 tickets ready.<br />Outages. Refunds. Takeovers. Sales.<br />No requests until you press start.</div>}</div></div>
      <div className="stream-pane floor-pane"><div className="pane-heading"><span>02 / THE APPLICATION</span><span>{pending} IN FLIGHT</span></div><div className="dispatch-gate"><span className={running ? 'gate-active' : ''}>◇</span><div><strong>Contract gate</strong><small>{pending ? `${pending} decisions awaiting validation` : 'Only validated decisions enter the queues'}</small></div></div><div className="dispatch-queues">{teams.map(team => { const queue = complete.filter(e => e.data?.decision.team === team); return <div className={`dispatch-queue ${team}`} key={team}><header><span>{team}</span><b>{queue.length.toString().padStart(2, '0')}</b></header><div className="queue-items">{queue.length ? queue.toReversed().map(e => <button key={e.sequence} onClick={() => setSelected(e.sequence)} className={focus?.sequence === e.sequence ? 'focused' : ''}><span>{e.ticket.ticket}<i className={`priority-${e.data?.decision.priority}`}>{e.data?.decision.priority}</i></span><strong>{e.ticket.subject}</strong><small>{e.data?.decision.action.replaceAll('_', ' ')}{e.data?.decision.escalate ? ' · ESCALATED' : ''}</small></button>) : <p>Waiting for a decision</p>}</div></div>; })}</div><div className="stream-run-note" aria-live="polite">{runNote}</div><p className="stream-caveat">Simulated queues. No refunds issued, accounts changed, or messages sent.</p></div>
      <div className="stream-pane outputs-pane"><div className="pane-heading"><span>03 / TYPED RETURNS</span><button onClick={() => setSelected(undefined)}>Follow latest ↗</button></div><div className="output-contract"><span>OUTPUT CONTRACT</span><code>{'type Decision = {\n  team: Team;\n  priority: Priority;\n  action: SupportAction;\n  escalate: boolean;\n}'}</code></div><div className="selected-return"><span>{focus?.ticket.ticket ?? 'AWAITING FIRST RETURN'} / {focus?.status.toUpperCase() ?? 'READY'}</span><pre className="stream-code">{focus?.data ? format(focus.data.decision) : focus?.error ?? '// Complete decisions appear here\n// after local validation.'}</pre></div><div className="event-feed" aria-label="Output events">{settled.toReversed().map(e => <button className={`return-row ${e.status}`} key={e.sequence} onClick={() => setSelected(e.sequence)}><span>{e.ticket.ticket} · {e.elapsedMs?.toFixed(0)} ms</span><code>{e.data ? format(e.data.decision) : e.error}</code></button>)}</div></div>
    </div>
    <details className="custom-ticket"><summary>Supply your own ticket context</summary><p>Edit customer, plan, payment history, incident evidence and message. Eight distinct synthetic scenarios repeat through the burst; custom tickets use the same contract.</p><textarea aria-label="Custom ticket JSON" value={draft} onChange={e => setDraft(e.target.value)} rows={12} disabled={running || config?.mode !== 'live'} /><button className="stream-start" disabled={!config || running || config.mode !== 'live'} onClick={() => { void start(true); }}>Dispatch this ticket ↗</button>{inputError && <p role="alert">{inputError}</p>}</details>
    <p className="stream-caveat">{config?.mode === 'fixture' ? 'Deterministic fixtures. Synthetic tokens; no inference cost. ' : ''}Complete validated decisions arrive as requests finish; this is not partial-token streaming. Rates use actual run wall time, including failures. Failed-call usage may be unknown. No retries or pacing delays. No lifetime session limit. Stop cancels the active burst.</p>
  </section>;
}
