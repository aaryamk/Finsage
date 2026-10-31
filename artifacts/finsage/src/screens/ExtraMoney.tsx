import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { useProfile } from '../state/ProfileContext';
import { formatINR, formatLakhCr } from '../engine/format';
import { addWindfallToProfile } from '../engine/windfall';
import { getGroupedWindfall, type GroupOptionResult } from '../engine/windfallGroups';
import { GROUPED_WINDFALL_ASSUMPTIONS as A, GROUP_OPTION_MIX_LABELS, RISK_DESCRIPTIONS, type RiskGroupId } from '../engine/windfallGroupsConstants';
import { Big, Drawer, MoneyInput } from '../components/ui';
import '../extra-money.css';

const CHIPS: [number, string][] = [[50000, '₹50K'], [100000, '₹1 L'], [200000, '₹2 L'], [500000, '₹5 L']];
const RISKS: { id: RiskGroupId; l: string }[] = [{ id: 'safer', l: 'Low' }, { id: 'medium', l: 'Medium' }, { id: 'high', l: 'High' }];
const LEVEL: Record<RiskGroupId, number> = { safer: 1, medium: 2, high: 3 };
const TICKS = [1, 5, 10, 15, 20];
const TABLE_YEARS = [1, 3, 5, 10];
const MIX_TONES = ['#141414', '#5A5A56', '#BDBDB7'];
const L = (n: number) => formatLakhCr(n);
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${formatLakhCr(Math.abs(n))}`;

function RangeBar({ o, amount }: { o: GroupOptionResult; amount: number }) {
  const h = o.result.horizon;
  const flat = h.p90 - h.p10 < 1;
  const lo = Math.min(h.p10, amount), hi = Math.max(h.p90, amount);
  const x = (v: number) => `${hi > lo ? ((v - lo) / (hi - lo)) * 100 : 50}%`;
  return (
    <div className="em-range" aria-label={flat ? `Fixed outcome ${L(h.p50)}` : `Low ${L(h.p10)}, likely ${L(h.p50)}, high ${L(h.p90)}`}>
      <div className="em-track">
        <span className="em-line" />
        {!flat && <span className="em-band" style={{ left: x(h.p10), width: `calc(${x(h.p90)} - ${x(h.p10)})` }} />}
        <span className="em-start" style={{ left: x(amount) }} title={`Invested ${L(amount)}`} />
        <span className="em-med" style={{ left: x(h.p50) }} />
      </div>
      <div className="em-ends num">{flat ? <span>Fixed · {L(h.p50)}</span> : <><span>Low {L(h.p10)}</span><span>High {L(h.p90)}</span></>}</div>
    </div>
  );
}

export function ExtraMoney() {
  const { updateProfile, extraMoneyAmount: amount, setExtraMoneyAmount: setAmount } = useProfile();
  const [years, setYears] = useState(5);
  const [risk, setRisk] = useState<RiskGroupId>('medium');
  const [open, setOpen] = useState<GroupOptionResult | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const dAmount = useDeferredValue(amount);
  const dYears = useDeferredValue(years);
  const pending = dAmount !== amount || dYears !== years;
  const data = useMemo(() => (dAmount > 0 ? getGroupedWindfall(dAmount, dYears) : null), [dAmount, dYears]);
  const table = useMemo(() => (open ? TABLE_YEARS.map(y => ({
    y, h: open.result.yearly[y - 1]!,
  })) : []), [open]);

  const add = () => {
    if (amount <= 0) return;
    const committed = amount;
    updateProfile((p) => addWindfallToProfile(p, committed, 'investments'));
    setAmount(0);
    setToast(`${formatINR(committed)} added to your invested corpus.`);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3800);
  };

  return (
    <div className="screen em">
      <div className="screen-bar"><h1 className="screen-title">Extra Money</h1><span className="em-cap">{A.caption}</span></div>
      <div className="em-grid">
        <aside className="em-left" aria-label="Your inputs">
          <section className="card em-in">
            <label className="em-label" htmlFor="em-amount">Amount to invest</label>
            <div className="em-money"><MoneyInput value={amount} onChange={setAmount} prefix="₹" max={1000000000} testId="input-wf-amount" id="em-amount" /></div>
            <div className="chips">{CHIPS.map(([v, l]) => <button key={v} className={`mini-pill${amount === v ? ' black' : ''}`} aria-pressed={amount === v} onClick={() => setAmount(v)} data-testid={`chip-amount-${v}`}>{l}</button>)}</div>
          </section>
          <section className="card em-in">
            <label className="em-label" htmlFor="em-years">For how long</label>
            <div className="em-years num">{years}<span> year{years > 1 ? 's' : ''}</span></div>
            <input id="em-years" className="range" type="range" min={1} max={20} step={1} value={years} onChange={(e) => setYears(Number(e.target.value))} style={{ ['--p' as string]: `${((years - 1) / 19) * 100}%` }} data-testid="slider-years" />
            <div className="em-ticks">{TICKS.map((t) => <span key={t} style={{ left: `${((t - 1) / 19) * 100}%` }}>{t}</span>)}</div>
          </section>
          <section className="card em-in">
            <span className="em-label" id="em-risk">Risk you're okay with</span>
            <div className="em-seg" role="radiogroup" aria-labelledby="em-risk">
              {RISKS.map((r) => <button key={r.id} role="radio" aria-checked={risk === r.id} className={risk === r.id ? 'on' : ''} onClick={() => setRisk(r.id)} data-testid={`seg-risk-${r.id}`}>{r.l}</button>)}
            </div>
            <p className="em-muted">{RISK_DESCRIPTIONS[risk]}</p>
          </section>
          <p className="em-foot">Educational, not advice.</p>
        </aside>

        <section className={`em-right${pending ? ' stale' : ''}`} aria-busy={pending}>
          {!data ? (
            <div className="card em-empty" data-testid="state-empty">
              <span className="em-label">Nothing to model</span>
              <span className="big md num">₹0</span>
              <div className="chips">{CHIPS.map(([v, l]) => <button key={v} className="mini-pill black" onClick={() => setAmount(v)}>{l}</button>)}</div>
            </div>
          ) : data.groups.map((g, gi) => {
            const id = g.definition.id; const pick = id === risk;
            return (
              <article key={id} className={`card em-group${pick ? ' pick' : ' dim'}`} style={{ ['--i' as string]: gi }} data-testid={`group-${id}`}>
                <header className="em-gh">
                  <div className="em-gname">
                    <h2>{g.definition.name}</h2>
                    <span className="em-dots" aria-label={`Risk level ${g.definition.level} of 3`}>{[1, 2, 3].map((n) => <i key={n} className={n <= g.definition.level ? 'f' : ''} />)}</span>
                    {pick && <span className="em-pill black">Your pick</span>}
                    {LEVEL[id] > LEVEL[risk] && <span className="em-pill">Above your risk level</span>}
                    {g.warning && <span className="em-pill red">{g.warning}</span>}
                  </div>
                  <div className="em-gval">
                    <Big value={g.result.horizon.p50} format={L} size="md" testId={`text-likely-${id}`} />
                    <span className={`em-gain num ${g.gain >= 0 ? 'up' : 'down'}`}>{signed(g.gain)} likely · {dYears} yr{dYears > 1 ? 's' : ''}</span>
                  </div>
                </header>
                <div className="em-mix" role="list" aria-label="Suggested mix">
                  {g.options.map((o, i) => {
                    const k = `${id}-${i}`; const w = g.definition.weights[i]!;
                    return (
                      <div key={k} role="listitem" tabIndex={0} className="em-seg-mix" style={{ flexGrow: w, background: MIX_TONES[i] }} onMouseEnter={() => setTip(k)} onMouseLeave={() => setTip(null)} onFocus={() => setTip(k)} onBlur={() => setTip(null)} aria-label={`${o.definition.name} ${Math.round(w * 100)}%, ${formatINR(g.mixAmounts[i]!)}`}>
                        <span className={i === 2 ? 'ink' : ''}>{GROUP_OPTION_MIX_LABELS[o.definition.id]} {Math.round(w * 100)}%</span>
                        {tip === k && <em role="tooltip" className="em-tip num">{formatINR(Math.round(g.mixAmounts[i]!))}</em>}
                      </div>
                    );
                  })}
                </div>
                <div className="em-opts">
                  {g.options.map((o) => (
                    <button key={o.definition.id} className="em-opt" onClick={() => setOpen(o)} data-testid={`card-option-${o.definition.id}`}>
                      <b className="em-oname">{o.definition.name}</b>
                      <span className="em-odesc">{o.definition.description}</span>
                      <span className="em-oval"><Big value={o.result.horizon.p50} format={L} size="sm" /></span>
                      <RangeBar o={o} amount={dAmount} />
                      <span className="em-loss">Chance of loss: <b>{o.lossLabel}</b></span>
                      {o.tag && <span className={`em-pill${o.tag.startsWith('Locked') ? ' red' : ''}`}>{o.tag}</span>}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
          <button className="pill-btn black em-add" onClick={add} disabled={amount <= 0} data-testid="button-add-plan"><Plus size={16} /> Add {L(amount)} to my plan</button>
        </section>
      </div>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.definition.name ?? ''} subtitle={open?.definition.description} testId="drawer-option">
        {open && <>
          <div className="why-block em-what"><p>{open.definition.explanation[0]}</p><p>{open.definition.explanation[1]}</p></div>
          <table className="em-table num">
            <thead><tr><th /><>{table.map((r) => <th key={r.y}>{r.y} yr</th>)}</></tr></thead>
            <tbody>
              {(['p50', 'p10', 'p90'] as const).map((k) => (
                <tr key={k}><th scope="row">{k === 'p50' ? 'Likely' : k === 'p10' ? 'Low' : 'High'}</th>{table.map((r) => <td key={r.y}>{L(r.h[k])}</td>)}</tr>
              ))}
            </tbody>
          </table>
          <p className="em-muted">{open.taxNote}</p>
          <p className="em-foot">Educational, not advice.</p>
        </>}
      </Drawer>
      {toast && <div className="em-toast" role="status" data-testid="toast-extra-money"><Check size={16} /><span>{toast}</span></div>}
    </div>
  );
}
