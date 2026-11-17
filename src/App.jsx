import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { seed, slug } from './data';
import './App.css';
import { loadCloud, saveCloud } from './cloud';

const KEY = 'cd-calvia-infantil-v1';
const TABS = [
  ['plantilla', 'Plantilla'], ['F7', 'Fútbol 7'], ['F11', 'Fútbol 11'],
  ['partes', 'Partes totales'], ['goles', 'Goles'],
];
const addMark = (s, key) => ({ ...(s.marks || {}), [key]: 'p' });

function levelOf(marks, pred) {
  let lvl = '';
  for (const [k, v] of Object.entries(marks)) {
    if (pred(k)) { if (v === 'p') return 'p'; lvl = 's'; }
  }
  return lvl;
}
function useStore() {
  const [state, setState] = useState(() => {
    try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch {}
    return seed();
  });
  const [saved, setSaved] = useState(() => JSON.stringify(state));
  const [status, setStatus] = useState('listo');
  const dirty = JSON.stringify(state) !== saved;

  // Al abrir: cargar lo último guardado en la nube
  useEffect(() => {
    loadCloud()
      .then((d) => { if (d) { setState(d); setSaved(JSON.stringify(d)); } })
      .catch(() => setStatus('error'));
  }, []);

  // Avisar si cierras con cambios sin guardar
  useEffect(() => {
    const h = (e) => { if (dirty) e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const save = async () => {
    setStatus('guardando');
    const next = {
      ...state,
      marks: Object.fromEntries(Object.keys(state.marks || {}).map((k) => [k, 's'])),
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      await saveCloud(next);
      setState(next);
      setSaved(JSON.stringify(next));
      setStatus('listo');
    } catch {
      setStatus('error');
    }
  };
  return [state, setState, { dirty, status, save }];
}

function calc(state) {
  return state.players.map((p) => {
    const r = { p };
    for (const cat of ['F7', 'F11']) {
      const v = state.matches
        .filter((m) => m.cat === cat && m.played)
        .map((m) => m.parts[p.id])
        .filter((x) => x != null);
      r[cat] = { pj: v.filter((x) => x > 0).length, parts: v.reduce((a, b) => a + b, 0), called: v.length };
    }
    const g = state.goals[p.id] || { f7: 0, f11: 0 };
    r.g7 = g.f7; r.g11 = g.f11; r.goals = g.f7 + g.f11;
    r.pj = r.F7.pj + r.F11.pj; r.parts = r.F7.parts + r.F11.parts;
    return r;
  });
}

export default function App() {
const [state, setState, { dirty, status, save }] = useStore();
  const [tab, setTab] = useState('plantilla');
  const stats = useMemo(() => calc(state), [state]);const exportExcel = () => {
  const wb = XLSX.utils.book_new();
  const add = (name, rows) =>
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);

  add('Plantilla', [
    ['Jugador', 'Ficha', 'Posición principal', 'Posición alternativa', 'Partidos',
     'Partes F7', 'Partes F11', 'Partes totales', 'Goles F7', 'Goles F11', 'Goles totales'],
    ...stats.map((r) => [r.p.name, r.p.ficha, r.p.pos, r.p.alt, r.pj,
      r.F7.parts, r.F11.parts, r.parts, r.g7, r.g11, r.goals]),
  ]);

  for (const [cat, name] of [['F7', 'Fútbol 7'], ['F11', 'Fútbol 11']]) {
    const ms = state.matches.filter((m) => m.cat === cat);
    add(name, [
      ['Jugador', ...ms.map((m) => m.rival), 'Total'],
      ['Casa/Fuera', ...ms.map((m) => m.home ?? ''), ''],
      ['Jugado', ...ms.map((m) => (m.played ? 'Sí' : 'No')), ''],
      ...state.players.map((p) => [
        p.name,
        ...ms.map((m) => m.parts[p.id] ?? ''),
        ms.filter((m) => m.played).reduce((a, m) => a + (m.parts[p.id] || 0), 0),
      ]),
    ]);
  }

  add('Partes totales', [
    ['Jugador', 'Partes F7', 'Partes F11', 'Total'],
    ...[...stats].sort((a, b) => b.parts - a.parts)
      .map((r) => [r.p.name, r.F7.parts, r.F11.parts, r.parts]),
  ]);

  add('Goles', [
    ['Jugador', 'F7', 'F11', 'Total'],
    ...[...stats].sort((a, b) => b.goals - a.goals)
      .map((r) => [r.p.name, r.g7, r.g11, r.goals]),
  ]);

  XLSX.writeFile(wb, `cd-calvia-infantil-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

  return (
    <div className="app">
      <header>
        <div className="top">
          <h1>⚽ CD Calviá · Infantil</h1>
          <div className="savebar">
            <small>
              {status === 'error' ? '⚠ Error con la nube' : dirty ? 'Cambios sin guardar' : '✓ Todo guardado'}
            </small>
            <button className={dirty ? 'save dirty' : 'save'} onClick={save} disabled={!dirty || status === 'guardando'}>
              {status === 'guardando' ? 'Guardando…' : '💾 Guardar'}
            </button>
          </div>
        </div>
        <nav>
          {TABS.map(([k, label]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </nav>
      </header>
      <main>
        {tab === 'plantilla' && <Plantilla stats={stats} setState={setState} />}
        {(tab === 'F7' || tab === 'F11') && <Partidos key={tab} cat={tab} state={state} setState={setState} />}
        {tab === 'partes' && <Partes stats={stats} />}
        {tab === 'goles' && <Goles stats={stats} marks={state.marks || {}} setState={setState} />}      </main>
        <footer>
          <button onClick={exportExcel}>⬇ Exportar a Excel</button>
          <button onClick={() => setState((s) => ({
            ...s,
            marks: Object.fromEntries(Object.entries(s.marks || {}).filter(([, v]) => v === 'p')),
          }))}>🧹 Quitar marcas verdes</button>
        </footer>
    </div>
  );
}

/* ---------- PLANTILLA ---------- */
function Plantilla({ stats, setState }) {
  const [f, setF] = useState({ name: '', ficha: 'F7', pos: '', alt: '' });
  const add = () => {
    const name = f.name.trim(); if (!name) return;
    const id = slug(name);
    setState((s) => s.players.some((p) => p.id === id) ? s : { ...s, players: [...s.players, { id, name, ficha: f.ficha, pos: f.pos, alt: f.alt }] });
    setF({ name: '', ficha: 'F7', pos: '', alt: '' });
  };
  return (
    <>
      <div className="cards">
        {stats.map((r) => (
          <article className="card" key={r.p.id}>
            <h3>{r.p.name}</h3>
            <p className="pos">{r.p.pos}{r.p.alt && <span> · {r.p.alt}</span>}</p>
            <div className="chips">
              {(r.F7.called > 0 || r.p.ficha.includes('F7')) && <span className="chip f7">F7</span>}
              {(r.F11.called > 0 || r.p.ficha.includes('F11')) && <span className="chip f11">F11</span>}
            </div>
            <div className="kpis">
              <div><b>{r.pj}</b><small>Partidos</small></div>
              <div><b>{r.parts}</b><small>Partes</small></div>
              <div><b>{r.goals}</b><small>Goles</small></div>
            </div>
          </article>
        ))}
      </div>
      <section className="box">
        <h3>Añadir jugador</h3>
        <div className="row">
          <input placeholder="Nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <select value={f.ficha} onChange={(e) => setF({ ...f, ficha: e.target.value })}>
            <option>F7</option><option>F11</option><option>F7/F11</option>
          </select>
          <input placeholder="Posición principal" value={f.pos} onChange={(e) => setF({ ...f, pos: e.target.value })} />
          <input placeholder="Posición alternativa" value={f.alt} onChange={(e) => setF({ ...f, alt: e.target.value })} />
          <button onClick={add}>Añadir</button>
        </div>
      </section>
    </>
  );
}

/* ---------- PARTIDOS (F7 / F11) ---------- */
function Partidos({ cat, state, setState }) {
  const [rival, setRival] = useState('');
  const matches = state.matches.filter((m) => m.cat === cat);
  const marks = state.marks || {};

  const patchMatch = (id, patch) =>
    setState((s) => ({
      ...s,
      marks: addMark(s, `${id}|*`),
      matches: s.matches.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  const setPart = (mid, pid, v) =>
    setState((s) => ({
      ...s,
      marks: addMark(s, `${mid}|${pid}`),
      matches: s.matches.map((m) => {
        if (m.id !== mid) return m;
        const parts = { ...m.parts };
        if (v === '') delete parts[pid]; else parts[pid] = Number(v);
        return { ...m, parts };
      }),
    }));
  const addMatch = () => {
    const name = rival.trim(); if (!name) return;
    setState((s) => ({ ...s, matches: [...s.matches, { id: `${cat}-${Date.now()}`, cat, rival: name, home: null, played: false, parts: {} }] }));
    setRival('');
  };
  const delMatch = (m) => {
    if (confirm(`¿Eliminar el partido contra ${m.rival}?`))
      setState((s) => ({ ...s, matches: s.matches.filter((x) => x.id !== m.id) }));
  };

  const colLvl = (m) => levelOf(marks, (k) => k.startsWith(`${m.id}|`));
  const rowLvl = (p) => levelOf(marks, (k) => k.startsWith(`${cat}-`) && k.endsWith(`|${p.id}`));
  const cellCls = (m, p, rl, cl) => {
    const v = marks[`${m.id}|${p.id}`];
    if (v) return `c-${v}`;
    const lvl = rl === 'p' || cl === 'p' ? 'p' : rl || cl;
    return lvl ? `x-${lvl}` : '';
  };

  return (
    <>
      <p className="hint">Selecciona el número de partes jugadas</p>
      <div className="scroll">
        <table className="grid">
          <thead>
            <tr>
              <th className="sticky">Jugador</th>
              {matches.map((m) => {
                const cl = colLvl(m);
                return (
                  <th key={m.id} className={`${m.played ? '' : 'pending'} ${cl ? 'h-' + cl : ''}`}>
                    <div className="rival">{m.rival}</div>
                    <select value={m.home ?? ''} onChange={(e) => patchMatch(m.id, { home: e.target.value || null })}>
                      <option value="">Casa/Fuera</option><option value="casa">Casa</option><option value="fuera">Fuera</option>
                    </select>
                    <label><input type="checkbox" checked={m.played} onChange={(e) => patchMatch(m.id, { played: e.target.checked })} /> Jugado</label>
                    <button className="x" title="Eliminar partido" onClick={() => delMatch(m)}>✕</button>
                  </th>
                );
              })}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {state.players.map((p) => {
              const rl = rowLvl(p);
              const total = matches.filter((m) => m.played).reduce((a, m) => a + (m.parts[p.id] || 0), 0);
              return (
                <tr key={p.id}>
                  <td className={`sticky ${rl ? 'h-' + rl : ''}`}>{p.name}</td>
                  {matches.map((m) => (
                    <td key={m.id} className={`${m.played ? '' : 'pending'} ${cellCls(m, p, rl, colLvl(m))}`}>
                      <select value={m.parts[p.id] ?? ''} onChange={(e) => setPart(m.id, p.id, e.target.value)}>
                        <option value=""></option>
                        {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>
                  ))}
                  <td className={`tot ${rl ? 'x-' + rl : ''}`}>{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <section className="box">
        <div className="row">
          <input placeholder="Nuevo rival" value={rival} onChange={(e) => setRival(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addMatch()} />
          <button onClick={addMatch}>Añadir partido</button>
        </div>
      </section>
    </>
  );
}
/* ---------- PARTES TOTALES ---------- */
function Partes({ stats }) {
  const list = [...stats].sort((a, b) => b.parts - a.parts || a.p.name.localeCompare(b.p.name));
  const max = Math.max(1, ...list.map((r) => r.parts));
  return (
    <div className="box">
      <p className="hint">Total de partes jugadas (F7 + F11).</p>
      {list.map((r, i) => (
        <div className="bar" key={r.p.id}>
          <span className="n">{i + 1}. {r.p.name}</span>
          <div className="track"><div className="fill" style={{ width: `${(r.parts / max) * 100}%` }} /></div>
          <span className="v"><b>{r.parts}</b> <small>({r.F7.parts} F7 · {r.F11.parts} F11)</small></span>
        </div>
      ))}
    </div>
  );
}

/* ---------- GOLES ---------- */
function Goles({ stats, marks, setState }) {
  const bump = (id, key, d) =>
    setState((s) => {
      const g = s.goals[id] || { f7: 0, f11: 0 };
      return {
        ...s,
        marks: addMark(s, `g|${id}|${key}`),
        goals: { ...s.goals, [id]: { ...g, [key]: Math.max(0, g[key] + d) } },
      };
    });
  const list = [...stats].sort((a, b) => b.goals - a.goals || a.p.name.localeCompare(b.p.name));

  const rowLvl = (id) => levelOf(marks, (k) => k.startsWith(`g|${id}|`));
  const colLvl = (key) => levelOf(marks, (k) => k.startsWith('g|') && k.endsWith(`|${key}`));
  const cellCls = (id, key, rl, cl) => {
    const v = marks[`g|${id}|${key}`];
    if (v) return `c-${v}`;
    const lvl = rl === 'p' || cl === 'p' ? 'p' : rl || cl;
    return lvl ? `x-${lvl}` : '';
  };

  const Ctl = ({ id, k, v }) => (
    <div className="ctl">
      <button onClick={() => bump(id, k, -1)}>−</button><b>{v}</b><button onClick={() => bump(id, k, 1)}>+</button>
    </div>
  );
  const c7 = colLvl('f7'), c11 = colLvl('f11');

  return (
    <div className="scroll">
      <table className="grid goals">
        <thead>
          <tr>
            <th className="sticky">Jugador</th>
            <th className={c7 ? 'h-' + c7 : ''}>F7</th>
            <th className={c11 ? 'h-' + c11 : ''}>F11</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => {
            const rl = rowLvl(r.p.id);
            return (
              <tr key={r.p.id}>
                <td className={`sticky ${rl ? 'h-' + rl : ''}`}>{r.p.name}</td>
                <td className={cellCls(r.p.id, 'f7', rl, c7)}><Ctl id={r.p.id} k="f7" v={r.g7} /></td>
                <td className={cellCls(r.p.id, 'f11', rl, c11)}><Ctl id={r.p.id} k="f11" v={r.g11} /></td>
                <td className={`tot ${rl ? 'x-' + rl : ''}`}>{r.goals}</td>
              </tr>
            );
          })}
          <tr className="sum">
            <td className="sticky">TOTAL EQUIPO</td>
            <td>{list.reduce((a, r) => a + r.g7, 0)}</td>
            <td>{list.reduce((a, r) => a + r.g11, 0)}</td>
            <td className="tot">{list.reduce((a, r) => a + r.goals, 0)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}