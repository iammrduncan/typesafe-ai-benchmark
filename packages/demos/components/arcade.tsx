'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { catalog, type DemoId } from '../lib/catalog';
import { useArcade, type Panel, type ArcadeState } from './use-arcade';
import { DemoStage } from './stages';
import { TrafficConsole } from './traffic-console';
const money = (n: number) => `$${n.toFixed(6)}`;
function Metrics({ panel }: { panel: Panel }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { if (!panel.busy) return; const timer = setInterval(() => setElapsed(performance.now() - panel.started), 30); return () => clearInterval(timer); }, [panel.busy, panel.started]);
  const data = panel.receipt?.data;
  return <div className="metrics"><div><span>BROWSER ROUND TRIP</span><strong className={panel.busy ? 'pending' : ''}>{panel.busy ? `${Math.floor(elapsed)} ms` : panel.receipt ? `${Math.round(panel.receipt.browserMs)} ms` : '—'}</strong></div><div><span>IN / OUT TOKENS</span><strong>{data ? `${data.usage.input_tokens} / ${data.usage.output_tokens}` : panel.receipt ? 'unknown' : '—'}</strong></div><div><span>EST. COST</span><strong>{data ? money(data.estimatedCostUsd) : panel.receipt ? 'unknown' : '—'}</strong></div></div>;
}
function DemoCard({ id, state }: { id: DemoId; state: ArcadeState }) {
  const demo = catalog.find(d => d.id === id); if (!demo) return null;
  const panel = state.panels[id]; const locked = panel.busy || (id === 'courier' && state.missionRunning);
  const captions = { triage: 'Route ticket', home: 'Apply command', courier: 'Start mission', guardrail: 'Screen input' };
  return <article className={`card ${locked ? 'busy' : ''}`} data-demo={id}><div className="card-head"><Link href={`/demos/${id}`} className="number">{String(catalog.indexOf(demo) + 1).padStart(2, '0')} / {demo.category.toUpperCase()}</Link><span className="pill">{demo.contract}</span></div><h2>{demo.title}</h2><p className="description">{demo.description}</p><DemoStage id={id} state={state} />
    <label htmlFor={`${id}-input`}>{id === 'courier' ? 'GIVE THE COURIER A MISSION' : 'TRY YOUR OWN INPUT'}</label><textarea id={`${id}-input`} rows={3} maxLength={2000} value={state.inputs[id]} disabled={!state.config || state.config.mode === 'fixture' || locked} onChange={e => state.setInput(id, e.target.value)} />
    <div className="card-controls"><button className="run" disabled={!state.config || locked} onClick={() => { void (id === 'courier' ? state.runMission() : state.run(id)); }}>{captions[id]} <span>↗</span></button>{id === 'courier' ? <><button className="stop" disabled={!state.missionRunning} onClick={state.stopMission}>Stop</button><button className="text-button" disabled={locked} onClick={state.resetCourier}>Reset</button></> : <span className={`state ${panel.error ? 'error' : ''}`}>{panel.busy ? 'Running' : panel.error ? 'Failed' : panel.receipt ? 'Validated' : 'Ready'}</span>}</div><Metrics panel={panel} />
    <details><summary>Inspect contract &amp; result</summary><pre>{panel.receipt ? JSON.stringify(panel.receipt, null, 2) : 'Run a request to inspect its full contract, validated result, decision and measurements.'}</pre></details></article>;
}
export function Arcade({ only }: { only?: DemoId }) {
  const state = useArcade(); const { config } = state;
  const visible = only ? catalog.filter(d => d.id === only) : catalog;
  const last = state.receipts.findLast(r => r.data)?.data;
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ generatedAt: new Date().toISOString(), mode: config?.mode, model: config?.model,
      costNote: 'Dated list-price estimates; failed-call costs can be unknown.', receipts: state.receipts }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'decision-arcade-session.json'; a.click(); URL.revokeObjectURL(url);
  }
  return <><header className="topbar"><Link href="/" className="brand"><span className="mark">↗</span> decision arcade<span className="byline">/ typesafe-ai-mimic</span></Link><div className="connection"><span className="dot" /><span>{config ? config.mode === 'live' ? 'LIVE / CEREBRAS · QWEN 27B' : 'FIXTURE MODE / NO INFERENCE' : 'Connecting…'}</span></div><a href="#receipts" className="quiet-link">Show the receipts ↘</a></header><main>
    <section className={`hero ${only ? '' : 'stream-hero'}`}><div><p className="eyebrow">SMALL OUTPUTS. REAL CONSEQUENCES.</p><h1>Less talking.<br /><span>More doing.</span></h1><p className="intro">An ordinary LLM. A strict contract. Software that moves.<br />Try the decisions yourself. Every millisecond and token is accounted for.</p></div><div className="hero-action">{!only ? <a className="primary" href="#decision-stream">Open decision stream <span>↗</span></a> : <Link className="primary" href="/">All demos <span>↗</span></Link>}<p>Visible actions. Measured requests.<br />No staged delays.</p><div className="session"><span>SESSION COST ESTIMATE</span><strong>{money(state.totalCost)}</strong></div></div></section>
    <nav className="demo-nav" aria-label="Demos"><Link href="/">Side by side</Link>{catalog.map(d => <Link key={d.id} href={`/demos/${d.id}`}>{d.category}</Link>)}</nav>
    <div role="status" className={`mode-note ${config?.mode === 'fixture' ? 'fixture' : ''}`}>{state.connectionError || (!config ? 'Loading the local inference connection…' : config.mode === 'live' ? 'LIVE MODE · Inputs go to Cerebras. Actions are simulated. Click to run; nothing runs automatically.' : 'FIXTURE MODE · Deterministic outputs and synthetic tokens. No inference. Run npm run dev:live for real decisions.')}</div>
    {!only && <><TrafficConsole config={config} /><div className="lab-heading"><p className="eyebrow">SINGLE-REQUEST LABS</p><h2>Explore individual decisions.</h2></div></>}
    <section className={`cards ${only ? 'single-demo' : 'four-demos'}`} aria-label="Interactive decision workflows">{visible.map(d => <DemoCard key={d.id} id={d.id} state={state} />)}</section>
    <section className="receipts" id="receipts"><div><p className="eyebrow">SHOW YOUR WORK</p><h2>Every run leaves a receipt.</h2><p>No Jev access. No invented competitor timings. Decide whether this works for <em>your</em> use case.</p></div><button className="outline" onClick={download}>Download this session ↓</button><div className="table-scroll"><table><thead><tr>{['WORKFLOW', 'STATUS', 'BROWSER MS', 'PROXY MS', 'CALLS', 'TOKENS IN / OUT', 'ESTIMATED USD'].map(v => <th key={v}>{v}</th>)}</tr></thead><tbody>{state.receipts.length === 0 ? <tr><td colSpan={7}>Your requests will appear here. Failures stay visible too.</td></tr> : state.receipts.toReversed().map((r, i) => <tr key={i}>{[r.id, r.status, r.browserMs.toFixed(1), r.data?.elapsedMs.toFixed(1) ?? '—', r.data?.providerCalls ?? '—', r.data ? `${r.data.usage.input_tokens} / ${r.data.usage.output_tokens}` : 'unknown', r.data ? money(r.data.estimatedCostUsd) : 'unknown'].map((v, j) => <td key={j} className={r.status !== '200' ? 'error' : ''}>{v}</td>)}</tr>)}</tbody></table></div></section>
    <footer><span>BUILT WITH CEREBRAS + STRICT TYPES. NO PROPRIETARY JUDGMENT MODEL.</span><span>{last ? `${last.calls} provider calls` : 'No session cutoff · requests run only when started'}</span><p>Local demo only. Simulated actions. Types constrain outputs, not correctness or calibration. Failed calls may be billable. Prices are dated estimates. The courier uses structured state, not vision.</p></footer>
  </main></>;
}
