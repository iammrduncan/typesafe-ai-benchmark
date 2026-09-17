'use client';
import { useRef, useState } from 'react';
import { scenes, workItem, type SceneId } from '../../lib/theater/data';
import { requestTotals, shuffledWorkload } from '../../lib/theater/workload';
import { models } from '../../lib/models';
import { contractSnapshot, type ContractSnapshot } from '../../lib/theater/contract-view';
import { usePlayer, type PlayerState } from './use-player';
import { SceneVisual } from './visuals';
import { JsonCode } from './json-code';
import { ContractDialog } from './contract-dialog';

export function ComparisonPlayer({ onSingle }: { onSingle: () => void }) {
  const qwen = usePlayer('qwen-3.8-27b');
  const jev = usePlayer('jev-latest');
  const [running, setRunning] = useState(false);
  const busy = useRef(false);
  const [generation, setGeneration] = useState(0);
  const current = scenes.find(s => s.id === qwen.scene) ?? scenes[0];
  const configured = [qwen, jev].every(p => p.config?.availableModels.includes(p.model));
  const ready = configured && (qwen.scene !== 'drive' || [qwen,jev].every(p => p.gpu === 'ready'));
  function select(scene: SceneId) {
    if (busy.current) return;
    qwen.select(scene); jev.select(scene); setGeneration(n => n + 1);
  }
  async function run() {
    if (busy.current || !ready) return;
    busy.current = true; setRunning(true); setGeneration(n => n + 1);
    // Share input order, not a per-response barrier: each provider runs at its own
    // speed. Independent engines preserve feedback in home, routing and driving.
    const workload = shuffledWorkload(qwen.scene);
    try { await Promise.all([qwen.play(false, workload), jev.play(false, workload)]); }
    finally { busy.current = false; setRunning(false); }
  }
  function target(node: number) { if (!busy.current) { qwen.target(node); jev.target(node); } }
  function threshold(value: Parameters<PlayerState['setScoreThreshold']>[0]) { qwen.setScoreThreshold(value); jev.setScoreThreshold(value); }
  return <main className="theater-shell comparison-shell">
    <header className="theater-top"><div className="theater-brand"><i>↗</i> typesafe benchmark<span>/ side by side</span></div><span className="theater-connection">{qwen.config?.mode === 'fixture' ? 'FIXTURES / NO INFERENCE' : qwen.config ? 'LIVE COMPARISON' : 'CONNECTING'}</span><button disabled={running} onClick={onSingle}>Single model ↗</button></header>
    <nav className="scene-tabs" aria-label="Demo scenes">{scenes.map((s,i) => <button key={s.id} aria-current={qwen.scene === s.id ? 'page' : undefined} disabled={running} onClick={() => select(s.id)}><small>0{i+1}</small>{s.short}</button>)}</nav>
    <section className="theater-title"><div><p>{current.kicker}</p><h1>{current.name}</h1><span>Same inputs. Two models. Watch both run.</span></div><div className="theater-controls"><button className="play-scene" disabled={!ready || running} onClick={() => { void run(); }}>▶ Run demo</button><button className="stop-show" disabled={!running} onClick={() => { qwen.stop(); jev.stop(); }}>■ Stop both</button></div></section>
    {!configured && <p className="comparison-warning" role="status">{qwen.connectionError || jev.connectionError || (!qwen.config || !jev.config ? 'Connecting to the demo server…' : 'Configure both CEREBRAS_API_KEY and JEV_KEY, then restart the demo server to compare.')}</p>}
    <div className="comparison-grid">{[qwen,jev].map(p => <ComparisonLane key={p.model} player={{...p,target,setScoreThreshold:threshold}} generation={generation} locked={running}/>)}</div>
    <footer className="theater-footer"><span>Matching input order · independent results and timing</span><span>Simulated actions. Types ≠ correctness. {qwen.config?.mode === 'fixture' ? 'Synthetic tokens; no inference.' : 'Estimated cost; failed-call usage may be unknown.'}</span></footer>
  </main>;
}

function ComparisonLane({ player:p, generation, locked }: { player:PlayerState; generation:number; locked:boolean }) {
  const [selection,setSelection] = useState<{generation:number;id:number}>();
  const [contract,setContract] = useState<ContractSnapshot>();
  const pinned = selection?.generation === generation ? selection.id : undefined;
  const settled = p.events.filter(e => e.status !== 'pending');
  const done = settled.filter(e => e.data);
  const focus = p.events.find(e => e.id === pinned) ?? settled.toSorted((a,b) => (a.settledMs ?? 0)-(b.settledMs ?? 0)).at(-1) ?? p.events.at(-1);
  const totals = requestTotals(p.events);
  const name = p.model === 'jev-latest' ? 'Jev' : 'Qwen 3.8 · 27B';
  const inspectionId = `comparison-${p.model}`;
  function openContract() {
    const context = focus?.item.context ?? (p.scene === 'navigate' ? p.navigation : p.scene === 'drive' ? p.car : workItem(p.scene,0).context);
    setContract(contractSnapshot({scene:p.scene,model:p.model,context,scoreThreshold:p.scoreThreshold,...(focus ? {requestId:focus.item.id} : {}),...(focus?.data ? {recorded:focus.data.contract} : {})}));
  }
  return <section className="comparison-lane" aria-label={name}>
    <header className="comparison-provider"><div><span>{p.model === 'jev-latest' ? 'TYPESAFE' : 'CEREBRAS'}</span><h2>{name}</h2><small>${models[p.model].input} input / ${models[p.model].output} output · per 1M tokens</small></div><div><button onClick={openContract}>View contract ↗</button><button disabled={locked || !settled.length} onClick={p.download}>Export {p.model === 'jev-latest' ? 'Jev' : 'Qwen'} ↗</button></div></header>
    <div className="comparison-metrics">{[['VALIDATED',`${done.length} / ${p.events.length}`],['WALL TIME',`${(p.elapsedMs/1000).toFixed(2)}s`],['DECISIONS / SEC',p.elapsedMs ? (done.length/(p.elapsedMs/1000)).toFixed(1) : '—'],['EST. COST',totals.unpricedRequests ? 'Unknown' : `$${totals.cost.toFixed(6)}`]].map(([label,value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="scene-visual comparison-visual" key={p.scene}><SceneVisual player={p} selectedId={pinned} onSelect={id => setSelection({generation,id})} inspectionId={inspectionId}/></div>
    <div className="scene-status" role="status"><span className={p.running ? 'running-dot' : ''}/>{p.connectionError || p.note}</div>
    <details className="comparison-inspection" open={pinned !== undefined || undefined}><summary>{focus?.item.id ?? 'Input & output'} · {focus?.status ?? 'click a result to inspect'}</summary><div id={inspectionId} className="comparison-json"><div><h3>INPUT</h3><pre className="theater-code"><JsonCode value={focus?.input ?? {}}/></pre></div><div><h3>OUTPUT</h3><pre className="theater-code"><JsonCode value={focus?.data?.decision ?? focus?.error ?? 'Waiting for a decision'}/></pre></div></div></details>
    {contract && <ContractDialog snapshot={contract} onClose={() => setContract(undefined)}/>}
  </section>;
}
