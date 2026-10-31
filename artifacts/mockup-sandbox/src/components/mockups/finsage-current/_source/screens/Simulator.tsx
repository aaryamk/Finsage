import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Scale } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useProfile } from '../state/ProfileContext';
import { applyHomePurchase } from '../engine/decision';
import { compareOutcomes, decisionVerdict } from '../engine/profile';
import { netWorthTimeline } from '../engine/projection';
import { runXRay } from '../engine/xray';
import { formatINR, formatLakhCr } from '../engine/format';
import { emi } from '../engine/loan';
import { Drawer, Num, Section, Slider, StatusPill } from '../components/ui';
import { FindingCard, type Tab } from '../components/FindingCard';

const PRESETS = [4000000, 5500000, 10000000];

function fmt(v: number | string, format: 'money' | 'months' | 'age') {
  if (typeof v === 'string') return v;
  if (format === 'money') return formatINR(Math.round(v));
  if (format === 'months') return `${v.toFixed(1)} mo`;
  return v.toFixed(1);
}
function fmtDelta(d: number, format: 'money' | 'months' | 'age') {
  const a = Math.abs(d);
  if (format === 'money') return formatINR(Math.round(a));
  if (format === 'months') return `${a.toFixed(1)} mo`;
  return `${a.toFixed(1)} yrs`;
}

export function Simulator({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const { profile, decision, setDecision } = useProfile();
  const [drawer, setDrawer] = useState(false);
  const future = useMemo(() => applyHomePurchase(profile, decision), [profile, decision]);
  const rows = useMemo(() => compareOutcomes(profile, future), [profile, future]);
  const verdict = useMemo(() => decisionVerdict(profile, future), [profile, future]);
  const futureFindings = useMemo(() => runXRay(future), [future]);
  const chart = useMemo(() => {
    const a = netWorthTimeline(profile), b = netWorthTimeline(future);
    const m = new Map<number, { age: number; a?: number; b?: number }>();
    a.forEach((p) => m.set(p.age, { age: p.age, a: p.netWorth }));
    b.forEach((p) => m.set(p.age, { ...(m.get(p.age) ?? { age: p.age }), b: p.netWorth }));
    return [...m.values()].sort((x, y) => x.age - y.age);
  }, [profile, future]);
  const bStatus = futureFindings.find((f) => f.id === 'emergency')?.status ?? 'watch';
  const loanEmi = emi(future.loan.principal, future.loan.annualRate, future.loan.years);
  const set = (k: keyof typeof decision, v: number) => setDecision({ ...decision, [k]: v });

  return (
    <div className="screen">
      <div className="eyebrow">Life Decision Simulator</div>
      <h1 className="screen-title">Compare two futures with the same assumptions.</h1>
      <p className="screen-sub">Move the sliders. Both futures recalculate from your profile, side by side.</p>

      <div className="chips" style={{ marginBottom: 20 }}>
        <button className="chip on" aria-pressed="true" data-testid="chip-decision-home">Buy a home</button>
        <button className="chip" disabled title="Coming soon">Career break — coming soon</button>
      </div>

      <div className="card section">
        <div className="section-head">
          <h2 style={{ fontSize: 16 }}>The home</h2>
          <div className="chips">
            {PRESETS.map((p) => (
              <button key={p} className={`chip${decision.price === p ? ' on' : ''}`} onClick={() => set('price', p)} data-testid={`chip-price-${p}`}>{formatLakhCr(p)}</button>
            ))}
          </div>
        </div>
        <div className="sim-controls">
          <Slider testId="slider-price" label="Home price" value={decision.price} min={3000000} max={15000000} step={500000} display={formatLakhCr(decision.price)} endLabels={['₹30 L', '₹1.5 Cr']} onChange={(v) => set('price', v)} />
          <Slider testId="slider-down" label="Down payment" value={Math.round(decision.downPct * 100)} min={10} max={40} step={1} display={`${Math.round(decision.downPct * 100)}% · ${formatLakhCr(decision.price * decision.downPct)}`} endLabels={['10%', '40%']} onChange={(v) => set('downPct', v / 100)} />
          <Slider testId="slider-rate" label="Interest rate" value={Math.round(decision.annualRate * 1000) / 10} min={7} max={11} step={0.1} display={`${(decision.annualRate * 100).toFixed(1)}%`} endLabels={['7%', '11%']} onChange={(v) => set('annualRate', Math.round(v * 10) / 1000)} />
          <Slider testId="slider-tenure" label="Tenure" value={decision.years} min={10} max={30} step={1} display={`${decision.years} yrs`} endLabels={['10 yrs', '30 yrs']} onChange={(v) => set('years', v)} />
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>
          Loan <b className="num" style={{ color: 'var(--ink)' }}><Num>{formatLakhCr(future.loan.principal)}</Num></b> · EMI <b className="num" style={{ color: 'var(--ink)' }}><Num>{formatINR(Math.round(loanEmi))}</Num></b>/mo · Cash needed today <b className="num" style={{ color: 'var(--ink)' }}><Num>{formatINR(Math.round(future.cashNeeded))}</Num></b> (down payment + 7% stamp duty &amp; registration)
        </div>
      </div>

      <div className="futures">
        <div className="card future" data-testid="column-future-a">
          <div className="future-head"><div><div className="kicker">Future A</div><h3>Keep renting</h3></div></div>
          {rows.map((r) => (
            <div className="row" key={r.id}><span className="label">{r.label}</span>
              <span className="row-val"><span className="big"><Num>{fmt(r.a, r.format)}</Num></span></span></div>
          ))}
        </div>
        <div className="card future" data-testid="column-future-b">
          <div className="future-head"><div><div className="kicker">Future B</div><h3>Buy this home</h3></div><StatusPill status={bStatus} /></div>
          {future.cashShortfall > 0 && (
            <div className="banner" role="alert" data-testid="banner-shortfall"><AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
              <span>Not enough cash for down payment + upfront costs — short by {formatINR(Math.round(future.cashShortfall))}.</span></div>
          )}
          {rows.map((r) => {
            const same = Math.abs(r.delta) < 0.05;
            const tone = same ? 'same' : r.better ? 'good' : 'bad';
            return (
              <div className={`row tone-${tone}`} key={r.id} data-testid={`row-${r.id}`}><span className="label">{r.label}</span>
                <span className="row-val"><span className="big"><Num>{fmt(r.b, r.format)}</Num></span>
                  <span className={`delta ${tone}`}><Num>{same ? 'No change' : `${r.delta > 0 ? '↑' : '↓'} ${fmtDelta(r.delta, r.format)}`}</Num></span></span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="verdict" data-testid="text-verdict"><Scale size={20} /><p><Num>{verdict}</Num></p></div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
        <button className="btn" onClick={() => setDrawer(true)} data-testid="button-xray-future">X-Ray this future <ArrowRight size={16} className="nudge" /></button>
      </div>

      <Section title="Net worth over time">
        <div className="card chart-card">
          <div className="chart-legend">
            <span><i className="swatch" style={{ background: 'var(--muted)' }} />Future A · Rent</span>
            <span><i className="swatch" style={{ background: 'var(--accent)' }} />Future B · Buy</span>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={chart} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="#E6E3DC" vertical={false} />
                <XAxis dataKey="age" tick={{ fill: '#6B6F76', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#E6E3DC' }} />
                <YAxis tick={{ fill: '#6B6F76', fontSize: 12 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => `₹${(v / 1e7).toFixed(v >= 1e8 ? 0 : 1)} Cr`} />
                <Tooltip formatter={(v: number, n: string) => [formatLakhCr(v), n === 'a' ? 'Keep renting' : 'Buy this home']} labelFormatter={(l) => `Age ${l}`} contentStyle={{ borderRadius: 10, border: '1px solid #E6E3DC', fontSize: 13 }} />
                <Line type="monotone" dataKey="a" stroke="#6B6F76" strokeWidth={2} dot={false} strokeDasharray="5 4" animationDuration={400} />
                <Line type="monotone" dataKey="b" stroke="#1F4D3A" strokeWidth={2.5} dot={false} animationDuration={400} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="X-Ray: Future B" subtitle={`If you buy at ${formatLakhCr(decision.price)} with ${Math.round(decision.downPct * 100)}% down`}>
        <div className="findings">
          {futureFindings.map((f, i) => <FindingCard key={f.id} f={f} i={i} onNavigate={(t) => { setDrawer(false); onNavigate(t); }} />)}
        </div>
      </Drawer>
    </div>
  );
}
