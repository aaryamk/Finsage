import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check, Info, LifeBuoy, PiggyBank, Plus, ShieldCheck, TrendingUp, X } from 'lucide-react';
import { useProfile } from '../state/ProfileContext';
import { formatINR, formatLakhCr } from '../engine/format';
import { addWindfallToProfile, compareWindfall, emergencyBuffer, simulateWindfall, swpPlan, windfallInsights, withdrawalBounds, type Comfort, type WindfallOptionId, type WindfallSettings, type YearOutcome } from '../engine/windfall';
import { TAX_FY_2026_27 as TAX, WINDFALL_ASSUMPTIONS as A, WINDFALL_OPTIONS } from '../engine/windfallConstants';
import { MoneyInput, Slider } from '../components/ui';
import '../extra-money.css';

const COLORS: Record<WindfallOptionId, string> = { fd: '#7A6F5C', liquid: '#4F7398', hybrid: '#B7791F', index_lump: '#1F4D3A', index_stp: '#4E9A74', stocks: '#8E4B5A' };
const SHORT: Record<WindfallOptionId, string> = { fd: 'Fixed deposit', liquid: 'Liquid / debt', hybrid: 'Balanced hybrid', index_lump: 'Index, lump sum', index_stp: 'Index via STP', stocks: 'Direct stocks' };
const HORIZONS = [{ v: 1, l: '1 yr' }, { v: 3, l: '3 yrs' }, { v: 5, l: '5 yrs' }, { v: 10, l: '10 yrs' }, { v: 15, l: '15+ yrs' }];
const HEAT_YEARS = [1, 2, 3, 5, 7, 10, 15, 20];
const SOURCES = ['Bonus', 'Gift', 'Freelance', 'Other'];
const SWP_OPTIONS: WindfallOptionId[] = ['hybrid', 'index_lump', 'liquid'];
const pct = (n: number) => `${n < 0.005 && n > 0 ? '<1' : Math.round(n * 100)}%`;
const yrs = (n: number | null) => (n === null ? 'not within 20 yrs' : `${n.toFixed(1)} yrs`);
const runs = A.paths.toLocaleString('en-IN');

function Seg<T extends string | number>({ items, value, onChange, testId, label }: { items: { v: T; l: string }[]; value: NoInfer<T>; onChange: (v: NoInfer<T>) => void; testId: string; label: string }) {
  return (
    <div className="seg-ctl" role="radiogroup" aria-label={label}>
      {items.map((it) => (
        <button key={String(it.v)} role="radio" aria-checked={value === it.v} className={value === it.v ? 'on' : ''} onClick={() => onChange(it.v)} data-testid={`${testId}-${it.v}`}>{it.l}</button>
      ))}
    </div>
  );
}

function AssumptionsPopover() {
  const [open, setOpen] = useState(false);
  return (
    <div className="pop-wrap">
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="button-wf-assumptions"><Info size={14} /> Assumptions</button>
      {open && (
        <div className="popover wf-pop" role="dialog" aria-label="Extra Money assumptions">
          <div className="wf-pop-head"><h4>{A.label}</h4><button className="wf-x" onClick={() => setOpen(false)} aria-label="Close"><X size={14} /></button></div>
          <p className="muted">Long-run averages used to generate {runs} seeded simulated runs. Real returns will differ.</p>
          <table className="atable wf-atable"><tbody>
            <tr><td><b>Option</b></td><td>Return</td><td>Vol.</td></tr>
            {WINDFALL_OPTIONS.map((o) => <tr key={o.id}><td>{o.name}<span className="wf-dep">{o.deployment}</span></td><td>{(o.expectedReturn * 100).toFixed(2).replace(/\.?0+$/, '')}%</td><td>{Math.round(o.volatility * 100)}%</td></tr>)}
          </tbody></table>
          <h4 style={{ marginTop: 14 }}>Tax model ({TAX.version})</h4>
          <p className="muted" style={{ marginBottom: 6 }}>User-supplied, illustrative rules. Not legal or tax validation; check current rules before acting.</p>
          <ul className="wf-rules">
            <li>Equity funds and stocks held over {TAX.equityLongTermMonths} months: {TAX.equityLongTermRate * 100}% on gains above {formatINR(TAX.annualEquityExemption)} a year. Held {TAX.equityLongTermMonths} months or less: {TAX.equityShortTermRate * 100}%.</li>
            <li>FD and liquid / debt funds: gains taxed at your slab, simplified to tax at exit.</li>
            <li>Balanced hybrid treated as equity (a simplification).</li>
            <li>Today's ₹ view discounts by {A.inflation * 100}% inflation a year.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function RangeRow({ r, lo, hi, amount, horizon, i }: { r: ReturnType<typeof compareWindfall>[number]; lo: number; hi: number; amount: number; horizon: number; i: number }) {
  const x = (v: number) => `${((v - lo) / (hi - lo || 1)) * 100}%`;
  const h = r.horizon;
  const flat = r.option.volatility === 0;
  return (
    <div className={`rr${r.riskier ? ' muted' : ''}`} style={{ animationDelay: `${i * 50}ms` }} data-testid={`row-range-${r.option.id}`}>
      <div className="rr-name">
        <span className="rr-dot" style={{ background: COLORS[r.option.id] }} />
        <div>
          <div className="rr-title">{r.option.name}</div>
          <div className="rr-tags">
            {r.riskier && <span className="tag risk">Riskier for a {horizon}-year timeline</span>}
            {r.fitsTimeline && <span className="tag fit">Fits your timeline</span>}
          </div>
          {r.option.id === 'stocks' && <div className="rr-note">Wider range: depends heavily on which stocks you pick.</div>}
        </div>
      </div>
      <div className="rr-track" aria-hidden>
        <span className="rr-start" style={{ left: x(amount) }} />
        {!flat && <span className="rr-whisker" style={{ left: x(h.p10), width: `calc(${x(h.p90)} - ${x(h.p10)})`, background: COLORS[r.option.id] }} />}
        {!flat && <span className="rr-box" style={{ left: x(h.p25), width: `calc(${x(h.p75)} - ${x(h.p25)})`, background: COLORS[r.option.id] }} />}
        <span className="rr-med" style={{ left: x(h.p50), borderColor: COLORS[r.option.id] }} />
      </div>
      <div className="rr-val num">
        <b>{formatLakhCr(h.p50)}</b> <span className={r.gainPct >= 0 ? 'up' : 'down'}>{r.gainPct >= 0 ? '+' : ''}{r.gainPct.toFixed(1)}%</span>
        <div className="rr-loss">Chance of ending below {formatLakhCr(amount)}: {pct(h.lossProbability)}</div>
        <span className="sr-only">Range {formatLakhCr(h.p10)} to {formatLakhCr(h.p90)}</span>
      </div>
    </div>
  );
}

function fanData(results: { id: WindfallOptionId; yearly: YearOutcome[] }[], start: number[]) {
  return Array.from({ length: 21 }, (_, y) => {
    const row: Record<string, number> = { year: y };
    results.forEach((r, i) => {
      const p = y === 0 ? { p10: start[i]!, p50: start[i]!, p90: start[i]! } : r.yearly[y - 1]!;
      row[`b${i}`] = p.p10; row[`w${i}`] = p.p90 - p.p10; row[`m${i}`] = p.p50; row[`lo${i}`] = p.p10; row[`hi${i}`] = p.p90;
    });
    return row;
  });
}

export function ExtraMoney() {
  const { profile, updateProfile, extraMoneyAmount: amount, setExtraMoneyAmount: setAmount } = useProfile();
  const [source, setSource] = useState<string | null>(null);
  const [years, setYears] = useState(5);
  const [comfort, setComfort] = useState<Comfort>('some');
  const [mode, setMode] = useState<'grow' | 'swp'>('grow');
  const [afterTax, setAfterTax] = useState(true);
  const [slab, setSlab] = useState(0.3);
  const [today, setToday] = useState(false);
  const [fan, setFan] = useState<WindfallOptionId[]>(['fd', 'index_lump']);
  const [withdrawal, setWithdrawal] = useState(1000);
  const [startAfter, setStartAfter] = useState(0);
  const [swpOpt, setSwpOpt] = useState<WindfallOptionId>('hybrid');
  const [planOpen, setPlanOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [cell, setCell] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const inputs = useMemo(() => ({ amount, years, comfort, afterTax, slab, today, withdrawal, startAfter, swpOpt, mode }), [amount, years, comfort, afterTax, slab, today, withdrawal, startAfter, swpOpt, mode]);
  const d = useDeferredValue(inputs);
  const pending = d !== inputs;
  const settings: WindfallSettings = useMemo(() => ({ afterTax: d.afterTax, taxSlab: d.slab, todayRupees: d.today }), [d.afterTax, d.slab, d.today]);

  const bounds = withdrawalBounds(amount);
  useEffect(() => { setWithdrawal((w) => Math.min(Math.max(w, bounds.min), bounds.max)); }, [bounds.min, bounds.max]);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const buffer = emergencyBuffer(profile, amount);
  const say = (m: string) => { setToast(m); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(null), 4200); };

  const useForBuffer = () => {
    const b = emergencyBuffer(profile, amount);
    if (b.useAmount <= 0) return;
    updateProfile((p) => addWindfallToProfile(p, b.useAmount, 'savings'));
    setAmount(b.remaining);
    say(`${formatINR(b.useAmount)} added to your emergency savings. ${formatINR(b.remaining)} left to explore.`);
  };
  const addToPlan = (dest: 'savings' | 'investments') => {
    if (amount <= 0) return;
    const committed = amount;
    updateProfile((p) => addWindfallToProfile(p, committed, dest));
    setAmount(0); setPlanOpen(false);
    say(`${formatINR(committed)} added to your ${dest === 'savings' ? 'liquid savings' : 'invested corpus'}. X-Ray and Simulator now include it.`);
  };

  const grow = d.mode === 'grow' && d.amount > 0;
  const rows = useMemo(() => (grow ? compareWindfall(d.amount, d.years, settings, d.comfort) : []), [grow, d.amount, d.years, settings, d.comfort]);
  const insights = useMemo(() => (grow ? windfallInsights(d.amount, d.years, settings) : null), [grow, d.amount, d.years, settings]);
  const fanResults = useMemo(() => (grow ? fan.map((id) => simulateWindfall(d.amount, id, d.years, A.paths, A.seed, settings)) : []), [grow, fan, d.amount, d.years, settings]);
  const swp = useMemo(() => (d.mode === 'swp' && d.amount > 0 ? swpPlan(d.amount, d.withdrawal, d.swpOpt, { ...settings, startAfterYears: d.startAfter }) : null), [d.mode, d.amount, d.withdrawal, d.swpOpt, d.startAfter, settings]);

  const realLabel = today ? "today's ₹ (after 6% inflation)" : 'future (nominal) ₹';
  const lo = rows.length ? Math.min(d.amount, ...rows.map((r) => r.horizon.p10)) * 0.96 : 0;
  const hi = rows.length ? Math.max(d.amount, ...rows.map((r) => r.horizon.p90)) * 1.02 : 1;
  const byId = (id: WindfallOptionId) => rows.find((r) => r.option.id === id);
  const lump = byId('index_lump'), stp = byId('index_stp');
  const stpLo = lump && stp ? Math.min(d.amount, lump.horizon.p10, stp.horizon.p10) * 0.96 : 0;
  const stpHi = lump && stp ? Math.max(lump.horizon.p90, stp.horizon.p90) * 1.02 : 1;
  const heatRows = useMemo(() => WINDFALL_OPTIONS.map((o) => rows.find((r) => r.option.id === o.id)).filter(Boolean) as typeof rows, [rows]);
  const fdata = useMemo(() => fanData(fanResults.map((r) => ({ id: r.option.id, yearly: r.yearly })), fanResults.map(() => d.amount)), [fanResults, d.amount]);
  const swpData = useMemo(() => swp ? swp.yearly.map((p) => ({ year: p.year, b: p.p10, w: p.p90 - p.p10, m: p.p50, lo: p.p10, hi: p.p90 })) : [], [swp]);

  const toggleFan = (id: WindfallOptionId) => setFan((f) => (f.includes(id) ? (f.length > 1 ? f.filter((x) => x !== id) : f) : f.length >= 2 ? [f[1]!, id] : [...f, id]));
  const horizonLabel = years === 15 ? '15+ years' : `${years} year${years > 1 ? 's' : ''}`;
  const yFmt = (v: number) => formatLakhCr(v).replace('₹', '₹ ');

  return (
    <div className="screen wf">
      <div className="wf-top">
        <div>
          <div className="eyebrow">Extra Money</div>
          <h1 className="screen-title">What a windfall could become</h1>
          <p className="screen-sub">Bonus, gift or freelance cheque: see the range of outcomes across common choices, from {runs} simulated runs each. Educational, not a recommendation.</p>
        </div>
        <AssumptionsPopover />
      </div>

      <div className="wf-grid">
        <aside className="card wf-panel" aria-label="I have extra money">
          {buffer.months < 6 && buffer.useAmount > 0 && (
            <div className="wf-nudge" data-testid="nudge-buffer">
              <LifeBuoy size={16} />
              <div>
                <p>Your emergency fund covers <b className="num">{buffer.months.toFixed(1)} months</b>. Many people top this up first.</p>
                <button className="link-btn" onClick={useForBuffer} data-testid="button-use-buffer">Use {formatINR(buffer.useAmount)} for the buffer</button>
              </div>
            </div>
          )}
          <h2 className="wf-panel-title">I have extra money</h2>
          <label className="field"><span className="field-label">Amount</span>
            <MoneyInput value={amount} onChange={setAmount} prefix="₹" max={1000000000} testId="input-wf-amount" id="wf-amount" />
          </label>
          <div className="chips wf-chips">
            {[[50000, '₹50K'], [100000, '₹1 L'], [200000, '₹2 L'], [500000, '₹5 L']].map(([v, l]) => (
              <button key={v} className={`chip${amount === v ? ' on' : ''}`} onClick={() => setAmount(v as number)} data-testid={`chip-amount-${v}`}>{l}</button>
            ))}
          </div>
          <div className="field"><span className="field-label">Source <i>(optional)</i></span>
            <div className="chips wf-chips">{SOURCES.map((s) => <button key={s} className={`chip sm${source === s ? ' on' : ''}`} aria-pressed={source === s} onClick={() => setSource(source === s ? null : s)} data-testid={`chip-source-${s.toLowerCase()}`}>{s}</button>)}</div>
          </div>
          <div className="field"><span className="field-label">Mode</span>
            <Seg label="Mode" testId="seg-mode" value={mode} onChange={setMode} items={[{ v: 'grow', l: 'Grow it' }, { v: 'swp', l: 'Monthly income from it' }]} />
          </div>
          {mode === 'grow' ? (<>
            <div className="field"><span className="field-label">When might you need it?</span>
              <Seg label="Horizon" testId="seg-horizon" value={years} onChange={setYears} items={HORIZONS} />
            </div>
            <div className="field"><span className="field-label">How do you feel about ups and downs?</span>
              <Seg label="Comfort" testId="seg-comfort" value={comfort} onChange={setComfort} items={[{ v: 'calm', l: 'Calm' }, { v: 'some', l: 'Some' }, { v: 'comfortable', l: 'Comfortable' }]} />
            </div>
          </>) : (<div className="wf-swp-ctl">
            <Slider label="Monthly withdrawal" value={withdrawal} min={bounds.min} max={bounds.max} step={500} display={formatINR(withdrawal)} onChange={setWithdrawal} endLabels={[formatINR(bounds.min), `${formatINR(bounds.max)} (2%)`]} testId="slider-withdrawal" disabled={bounds.max <= bounds.min} />
            <Slider label="Start after" value={startAfter} min={0} max={10} step={1} display={startAfter === 0 ? 'Right away' : `${startAfter} yr${startAfter > 1 ? 's' : ''}`} onChange={setStartAfter} note="The money grows first, then withdrawals begin." testId="slider-start-after" />
            <div className="field"><span className="field-label">Draw from</span>
              <Seg label="SWP option" testId="seg-swp-option" value={swpOpt} onChange={setSwpOpt} items={SWP_OPTIONS.map((id) => ({ v: id, l: SHORT[id] }))} />
            </div>
          </div>)}
          <div className="field"><span className="field-label">Tax view</span>
            <Seg label="Tax view" testId="seg-tax" value={afterTax ? 'after' : 'before'} onChange={(v) => setAfterTax(v === 'after')} items={[{ v: 'before', l: 'Before tax' }, { v: 'after', l: 'After tax' }]} />
          </div>
          <div className={`field${afterTax ? '' : ' dim'}`}><span className="field-label">Your tax slab</span>
            <Seg label="Tax slab" testId="seg-slab" value={slab} onChange={setSlab} items={TAX.slabChoices.map((s): { v: number; l: string } => ({ v: s, l: `${Math.round(s * 100)}%` }))} />
          </div>
          <div className="field"><span className="field-label">Show values in</span>
            <Seg label="Rupee basis" testId="seg-rupees" value={today ? 'today' : 'future'} onChange={(v) => setToday(v === 'today')} items={[{ v: 'future', l: 'Future ₹' }, { v: 'today', l: "Today's ₹" }]} />
          </div>
          <div className="wf-plan">
            {!planOpen ? (
              <button className="btn" onClick={() => setPlanOpen(true)} disabled={amount <= 0} data-testid="button-add-plan"><Plus size={16} /> Add to my plan</button>
            ) : (
              <div className="wf-plan-choice" role="group" aria-label="Where should this go?">
                <p>Add {formatINR(amount)} to:</p>
                <button className="btn ghost" onClick={() => addToPlan('savings')} data-testid="button-add-savings"><PiggyBank size={15} /> Add to savings</button>
                <button className="btn ghost" onClick={() => addToPlan('investments')} data-testid="button-add-investments"><TrendingUp size={15} /> Add to investments</button>
                <button className="link-btn" onClick={() => setPlanOpen(false)} data-testid="button-cancel-plan">Cancel</button>
              </div>
            )}
          </div>
        </aside>

        <section className="wf-main" aria-busy={pending}>
          {pending && <div className="wf-pending" data-testid="status-pending">Recalculating {runs} runs…</div>}
          {d.amount <= 0 ? (
            <div className="card empty wf-empty" data-testid="state-empty">
              <ShieldCheck size={28} color="var(--accent)" />
              <h3>Nothing left to model</h3>
              <p>Your amount is committed to your plan. Enter a new amount or pick a chip to explore another windfall.</p>
              <div className="chips" style={{ justifyContent: 'center', marginTop: 14 }}>
                {[100000, 200000].map((v) => <button key={v} className="chip" onClick={() => setAmount(v)}>{formatLakhCr(v)}</button>)}
              </div>
            </div>
          ) : d.mode === 'grow' ? (<div className={pending ? 'stale' : ''}>
            <h2 className="wf-headline" data-testid="text-headline"><span className="num">{formatLakhCr(d.amount)}</span>{source ? ` ${source.toLowerCase()}` : ''} for {horizonLabel}: {rows.length} ways it could grow</h2>
            <p className="wf-basis">Values in {realLabel}, {d.afterTax ? `after tax at a ${Math.round(d.slab * 100)}% slab` : 'before tax'}. Simulated outcomes, not forecasts.</p>

            <div className="card wf-hero">
              <div className="rr-legend"><span><i className="lg-whisk" /> 10th–90th percentile</span><span><i className="lg-box" /> 25th–75th</span><span><i className="lg-med" /> median</span><span><i className="lg-start" /> starting amount</span></div>
              {rows.map((r, i) => <RangeRow key={r.option.id} r={r} lo={lo} hi={hi} amount={d.amount} horizon={d.years} i={i} />)}
            </div>

            <div className="section">
              <div className="section-head"><h2>How long should I stay invested?</h2><span className="wf-small">Median value · colour = chance of loss</span></div>
              <div className="card wf-heat-card">
                <div className="heat" role="grid" aria-label="Median value and chance of loss by years held">
                  <div className="heat-row head" role="row"><span role="columnheader" />{HEAT_YEARS.map((y) => <span key={y} role="columnheader" className={y === d.years ? 'sel' : ''}>{y} yr</span>)}</div>
                  {heatRows.map((r) => (
                    <div className="heat-row" role="row" key={r.option.id}>
                      <span className="heat-name" role="rowheader">{SHORT[r.option.id]}</span>
                      {HEAT_YEARS.map((y) => {
                        const p = r.yearly[y - 1]!; const k = `${r.option.id}-${y}`;
                        const tone = p.lossProbability < 0.05 ? 'g' : p.lossProbability <= 0.2 ? 'a' : 'r';
                        return (
                          <button key={y} role="gridcell" className={`heat-cell ${tone}${y === d.years ? ' sel' : ''}`} onMouseEnter={() => setCell(k)} onMouseLeave={() => setCell(null)} onFocus={() => setCell(k)} onBlur={() => setCell(null)} aria-label={`${r.option.name}, ${y} years: median ${formatLakhCr(p.p50)}, 10th percentile ${formatLakhCr(p.p10)}, 90th ${formatLakhCr(p.p90)}, chance of loss ${pct(p.lossProbability)}`} data-testid={`cell-heat-${k}`}>
                            <span className="num">{(p.p50 / 100000).toFixed(1)}</span>
                            {cell === k && <span className="heat-tip" role="tooltip"><b>{r.option.name} · {y} yr</b><span>p10 {formatLakhCr(p.p10)}</span><span>p50 {formatLakhCr(p.p50)}</span><span>p90 {formatLakhCr(p.p90)}</span><span>Chance of loss {pct(p.lossProbability)}</span></span>}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="heat-key"><span><i className="g" />under 5% loss</span><span><i className="a" />5–20%</span><span><i className="r" />over 20%</span><span>Values in ₹ L</span></div>
                {insights && <p className="wf-caption" data-testid="text-heat-caption">Equity index funds (lump sum) ended below the starting amount in {pct(insights.oneYearLoss)} of {runs} simulated runs at 1 year, and {pct(insights.sevenYearLoss)} at 7 years.</p>}
              </div>
            </div>

            <div className="section">
              <div className="section-head"><h2>Growth over time</h2>
                <div className="chips">{WINDFALL_OPTIONS.map((o) => <button key={o.id} className={`chip sm${fan.includes(o.id) ? ' on' : ''}`} style={fan.includes(o.id) ? { background: COLORS[o.id], borderColor: COLORS[o.id] } : undefined} aria-pressed={fan.includes(o.id)} onClick={() => toggleFan(o.id)} data-testid={`chip-fan-${o.id}`}>{SHORT[o.id]}</button>)}</div>
              </div>
              <div className="card chart-card">
                <div className="chart-legend">{fanResults.map((r) => <span key={r.option.id}><i className="swatch" style={{ background: COLORS[r.option.id] }} />{r.option.name}: doubles {r.yearsToDouble === null ? 'not within 20 years' : `around year ${Math.round(r.yearsToDouble)}`}</span>)}<span>Pick up to 2 · shaded = 10th–90th</span></div>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={fdata} margin={{ top: 18, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="year" type="number" domain={[0, 20]} ticks={[0, 5, 10, 15, 20]} tick={{ fontSize: 12, fill: 'var(--muted)' }} tickFormatter={(v) => `Yr ${v}`} />
                    <YAxis tickFormatter={yFmt} width={78} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                    <Tooltip formatter={(v: number, n: string) => (n.startsWith('m') || n.startsWith('lo') || n.startsWith('hi') ? [formatLakhCr(v), fanLabel(n, fanResults.map((r) => r.option.name))] : null) as never} labelFormatter={(l) => `Year ${l}`} />
                    {fanResults.map((r, i) => [
                      <Area key={`b${i}`} dataKey={`b${i}`} stackId={`s${i}`} stroke="none" fill="transparent" isAnimationActive={false} tooltipType="none" />,
                      <Area key={`w${i}`} dataKey={`w${i}`} stackId={`s${i}`} stroke="none" fill={COLORS[r.option.id]} fillOpacity={0.16} isAnimationActive={false} tooltipType="none" />,
                    ])}
                    {fanResults.map((r, i) => [
                      <Line key={`lo${i}`} dataKey={`lo${i}`} stroke="none" dot={false} activeDot={false} legendType="none" />,
                      <Line key={`hi${i}`} dataKey={`hi${i}`} stroke="none" dot={false} activeDot={false} legendType="none" />,
                      <Line key={`m${i}`} dataKey={`m${i}`} stroke={COLORS[r.option.id]} strokeWidth={2.2} dot={false} isAnimationActive={false} />,
                    ])}
                    <ReferenceLine y={d.amount} stroke="var(--muted)" strokeDasharray="4 4" />
                    {fanResults.map((r, i) => r.yearsToDouble !== null && <ReferenceLine key={`d${i}`} x={r.yearsToDouble} stroke={COLORS[r.option.id]} strokeDasharray="3 3" label={{ value: `Doubles ~yr ${Math.round(r.yearsToDouble)}`, position: i ? 'insideTopLeft' : 'insideTopRight', fontSize: 11, fill: COLORS[r.option.id] }} />)}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {lump && stp && (
              <div className="card wf-stp section" data-testid="card-stp">
                <div className="label">Lump sum vs STP · {d.years} yrs</div>
                {[lump, stp].map((r) => {
                  const x = (v: number) => `${((v - stpLo) / (stpHi - stpLo || 1)) * 100}%`; const h = r.horizon;
                  return (
                    <div className="stp-row" key={r.option.id}>
                      <span className="stp-name">{SHORT[r.option.id]}</span>
                      <div className="rr-track sm" aria-hidden><span className="rr-start" style={{ left: x(d.amount) }} /><span className="rr-whisker" style={{ left: x(h.p10), width: `calc(${x(h.p90)} - ${x(h.p10)})`, background: COLORS[r.option.id] }} /><span className="rr-box" style={{ left: x(h.p25), width: `calc(${x(h.p75)} - ${x(h.p25)})`, background: COLORS[r.option.id] }} /><span className="rr-med" style={{ left: x(h.p50), borderColor: COLORS[r.option.id] }} /></div>
                      <span className="num stp-v">{formatLakhCr(h.p50)} · loss {pct(h.lossProbability)}</span>
                    </div>
                  );
                })}
                <p className="wf-caption">Illustrative: STP lowers the chance of investing everything right before a fall; over long periods lump sum usually ends slightly higher.</p>
              </div>
            )}

            {insights && (
              <div className="wf-insights">
                <div className="card ins" data-testid="card-insight-beat"><div className="label">Beating FD</div><p>Equity index (lump sum) beat FD in <b className="num">{pct(insights.beatFDProbability)}</b> of {runs} simulated {d.years}-year runs.</p></div>
                <div className="card ins" data-testid="card-insight-double"><div className="label">Time to double (median)</div><p>FD <b className="num">{yrs(insights.fdDouble)}</b> · Equity index <b className="num">{yrs(insights.equityDouble)}</b></p></div>
                <div className="card ins" data-testid="card-insight-tax"><div className="label">Tax impact</div><p>Equity index median gain before tax <b className="num">{formatINR(insights.grossGain)}</b> becomes <b className="num">{formatINR(insights.netGain)}</b> after tax at {d.years} yrs (future ₹, illustrative {TAX.version} rules).</p></div>
              </div>
            )}
          </div>) : swp && (<div className={pending ? 'stale' : ''}>
            <h2 className="wf-headline" data-testid="text-headline-swp"><span className="num">{formatINR(d.withdrawal)}</span> a month from <span className="num">{formatLakhCr(d.amount)}</span> in a {SHORT[d.swpOpt].toLowerCase()} fund</h2>
            <p className="wf-basis">Withdrawals start {d.startAfter ? `after ${d.startAfter} years of growth` : 'right away'}. Balances in {realLabel}, {d.afterTax ? 'after tax' : 'before tax'}. {runs} simulated runs.</p>
            <div className="wf-swp-hero">
              <div className="card wf-big" data-testid="text-sustainable">
                <div className="label">Sustainable monthly income</div>
                <div className="big wf-bignum num">{formatINR(swp.safeMonthlyWithdrawal)}</div>
                <p className="wf-small">Largest withdrawal where even the weaker 10% of runs last 20 years.</p>
                <p className="wf-compare">At 6.75%, an FD paying interest monthly gives <b className="num">{formatINR(swp.fdMonthlyIncome)}</b>{d.afterTax ? ' after slab tax' : ''}.</p>
              </div>
              <div className="card wf-last">
                <div className="label">Your {formatINR(d.withdrawal)} lasts</div>
                <div className="big num">{Number.isFinite(swp.monthsP50) ? `${(swp.monthsP50 / 12).toFixed(1)} yrs` : '30+ yrs'}</div>
                <p className="wf-small">median · weaker 10%: {Number.isFinite(swp.monthsP10) ? `${(swp.monthsP10 / 12).toFixed(1)} yrs` : '30+ yrs'}</p>
              </div>
            </div>
            <div className="card chart-card section">
              <div className="chart-legend"><span><i className="swatch" style={{ background: COLORS[d.swpOpt] }} />Median balance</span><span>Shaded: 10th–90th percentile · x = years after withdrawals start</span></div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={swpData} margin={{ top: 18, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="year" type="number" domain={[0, 30]} ticks={[0, 5, 10, 15, 20, 25, 30]} tick={{ fontSize: 12, fill: 'var(--muted)' }} tickFormatter={(v) => `Yr ${v}`} />
                  <YAxis tickFormatter={yFmt} width={78} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                  <Tooltip formatter={(v: number, n: string) => (n === 'm' || n === 'lo' || n === 'hi' ? [formatLakhCr(v), n === 'm' ? 'Median' : n === 'lo' ? '10th percentile' : '90th percentile'] : null) as never} labelFormatter={(l) => `Year ${l}`} />
                  <Area dataKey="b" stackId="s" stroke="none" fill="transparent" isAnimationActive={false} tooltipType="none" />
                  <Area dataKey="w" stackId="s" stroke="none" fill={COLORS[d.swpOpt]} fillOpacity={0.16} isAnimationActive={false} tooltipType="none" />
                  <Line dataKey="lo" stroke="none" dot={false} activeDot={false} />
                  <Line dataKey="hi" stroke="none" dot={false} activeDot={false} />
                  <Line dataKey="m" stroke={COLORS[d.swpOpt]} strokeWidth={2.2} dot={false} isAnimationActive={false} />
                  {Number.isFinite(swp.monthsP50) && <ReferenceLine x={swp.monthsP50 / 12} stroke="var(--act)" strokeDasharray="4 4" label={{ value: `Median runs out ~yr ${(swp.monthsP50 / 12).toFixed(1)}`, position: 'insideTopRight', fontSize: 11, fill: 'var(--act)' }} />}
                  {!Number.isFinite(swp.monthsP50) && <ReferenceLine x={30} stroke="none" label={{ value: 'Lasts 30+ years', position: 'insideTopRight', fontSize: 12, fill: 'var(--strong)' }} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="wf-caption">SWP is for drawing income; to grow money, use Grow it mode.</p>
          </div>)}
        </section>
      </div>

      {toast && <div className="wf-toast" role="status" data-testid="toast-extra-money"><Check size={16} /><span>{toast}</span></div>}
    </div>
  );
}

function fanLabel(key: string, names: string[]) {
  const i = Number(key.replace(/\D/g, ''));
  const kind = key.startsWith('m') ? 'median' : key.startsWith('lo') ? '10th pct' : '90th pct';
  return `${names[i] ?? ''} ${kind}`;
}
