import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowUpRight, HeartPulse, Landmark, LifeBuoy, PieChart, Plus, Shield, ShieldCheck, Target, Umbrella, Wallet, Waves, X } from 'lucide-react';
import { useProfile } from '../state/ProfileContext';
import { runXRay } from '../engine/xray';
import { derive } from '../engine/profile';
import { fireAge, netWorthTimeline } from '../engine/projection';
import { ASSUMPTIONS } from '../engine/constants';
import { formatINR, formatLakhCr } from '../engine/format';
import type { Finding, Status } from '../engine/types';
import { FindingWhy, type Tab } from '../components/FindingCard';
import { Big, Chip, Dot, Drawer, Head, MoneyInput, StatusPill, Tile, WhyBlock } from '../components/ui';

type Why = { title: string; ids: string[]; extra?: ReactNode };

const NEXT_MOVE: Record<string, string> = {
  emergency: 'Rebuild your six-month buffer',
  idle: 'Give idle cash a job',
  savings: 'Lift your savings rate',
  unallocated: 'Plan your spare surplus',
  debt: 'Ease your EMI load',
  health: 'Get personal health cover',
  life: 'Review your term cover',
  fire: 'Invest more for the long run',
};
const ORDER: Status[] = ['act', 'watch', 'strong'];
const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1);

function Ring({ months, status }: { months: number; status: Status }) {
  const r = 52, C = 2 * Math.PI * r, arc = C * 0.75, max = 12;
  const frac = clamp01(months / max);
  const tick = (m: number) => {
    const a = ((135 + 270 * (m / max)) * Math.PI) / 180;
    return { x1: 64 + Math.cos(a) * 41, y1: 64 + Math.sin(a) * 41, x2: 64 + Math.cos(a) * 47, y2: 64 + Math.sin(a) * 47, tx: 64 + Math.cos(a) * 33, ty: 64 + Math.sin(a) * 33 };
  };
  return (
    <svg viewBox="0 0 128 128" className="ring" aria-hidden>
      <circle cx="64" cy="64" r={r} className="ring-bg" strokeDasharray={`${arc} ${C}`} transform="rotate(135 64 64)" />
      <circle cx="64" cy="64" r={r} className={`ring-fg ${status}`} strokeDasharray={`${arc * frac} ${C}`} transform="rotate(135 64 64)" />
      {[3, 6].map((m) => { const t = tick(m); return <g key={m}><line {...{ x1: t.x1, y1: t.y1, x2: t.x2, y2: t.y2 }} className="ring-tick" /><text x={t.tx} y={t.ty + 3} className="ring-tl">{m}</text></g>; })}
    </svg>
  );
}

function Donut({ parts, label }: { parts: { v: number; c: string }[]; label: ReactNode }) {
  const total = parts.reduce((s, p) => s + Math.max(0, p.v), 0) || 1;
  const r = 44, C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 112 112" aria-hidden>
        <circle cx="56" cy="56" r={r} className="donut-bg" />
        {parts.map((p, i) => {
          const len = (Math.max(0, p.v) / total) * C;
          const el = <circle key={i} cx="56" cy="56" r={r} className="donut-seg" stroke={p.c} strokeDasharray={`${Math.max(0, len - 3)} ${C}`} strokeDashoffset={-acc} transform="rotate(-90 56 56)" style={{ ['--d' as string]: `${i * 80}ms` }} />;
          acc += len;
          return el;
        })}
      </svg>
      <div className="donut-c">{label}</div>
    </div>
  );
}

export function Home({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const { profile, goalName, goalAmount, goals, addGoal, removeGoal } = useProfile();
  const d = useMemo(() => derive(profile), [profile]);
  const findings = useMemo(() => runXRay(profile), [profile]);
  const netWorth = useMemo(() => netWorthTimeline(profile)[0]!.netWorth, [profile]);
  const fire = useMemo(() => fireAge(profile), [profile]);
  const [why, setWhy] = useState<Why | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [goalForm, setGoalForm] = useState(false);
  const [gName, setGName] = useState('');
  const [gAmt, setGAmt] = useState(100000);

  const F = (id: string) => findings.find((f) => f.id === id) as Finding;
  const next = [...findings].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))[0]!;
  const allGood = next.status === 'strong';
  const count = (s: Status) => findings.filter((f) => f.status === s).length;
  const navFromWhy = (t: Tab) => { setWhy(null); setAllOpen(false); onNavigate(t); };

  const buffer = 6 * d.essentialOutflow;
  const liquid = profile.liquidSavings;
  const unplanned = Math.max(0, d.unallocated);
  const sipShown = Math.min(profile.monthlySIP, Math.max(0, d.monthlySurplus));
  const income = Math.max(profile.monthlyTakeHome, 1);
  const flow = [
    { k: 'Income', v: profile.monthlyTakeHome, cls: 'ink' },
    { k: 'Essentials', v: d.essentialOutflow, cls: 'grey' },
    { k: 'SIP', v: profile.monthlySIP, cls: 'ink2' },
    { k: 'Unplanned', v: d.unallocated, cls: 'watch' },
  ];
  const fireN = typeof fire === 'number' ? fire : null;
  const H = ASSUMPTIONS.horizonAge;
  const pos = (a: number) => `${clamp01((a - profile.age) / Math.max(1, H - profile.age)) * 100}%`;
  const scaleMax = Math.max(liquid, buffer, 1) * 1.18;
  const bufH = (buffer / scaleMax) * 100, liqH = (liquid / scaleMax) * 100;

  const protection = [
    { id: 'emergency', name: 'Emergency fund', icon: <LifeBuoy size={15} />, ratio: d.emergencyMonths / 6 },
    { id: 'health', name: 'Health cover', icon: <HeartPulse size={15} />, ratio: profile.healthCoverPersonal / 500000 },
    { id: 'life', name: 'Life cover', icon: <Umbrella size={15} />, ratio: profile.dependents === 0 ? 1 : profile.termCover / (10 * 12 * profile.monthlyTakeHome) },
  ];
  const submitGoal = (e: FormEvent) => {
    e.preventDefault();
    if (!gName.trim() || gAmt <= 0) return;
    addGoal(gName.trim(), gAmt); setGName(''); setGoalForm(false);
  };

  return (
    <div className="screen">
      <div className="screen-bar">
        <h1 className="screen-title">Hi {profile.name || 'there'}</h1>
        <div className="summary" data-testid="summary-xray">
          {(['strong', 'watch', 'act'] as Status[]).map((s) => (
            <span className="summary-item" key={s}><Dot status={s} /><b className="num">{count(s)}</b> <span>{s === 'strong' ? 'Good' : s === 'watch' ? 'Watch' : 'Fix'}</span></span>
          ))}
          <button className="pill-btn chipbg sm" onClick={() => setAllOpen(true)} data-testid="button-all-checks">All 8 checks</button>
        </div>
      </div>

      <div className="bento">
        {/* Net worth */}
        <Tile span={6} i={0} testId="card-networth" whyLabel="Net worth" onWhy={() => setWhy({ title: 'Net worth', ids: [], extra: (<>
          <WhyBlock k="What this is"><span className="num">Bank + FDs {formatINR(liquid)} plus investments {formatINR(profile.investedCorpus)}.</span></WhyBlock>
          <WhyBlock k="Snapshot only">FinSage stores no past balances, so there is no trend. The pixel pattern is decoration, not history.</WhyBlock>
        </>) })}>
          <Head icon={<Wallet size={16} />} label="Net worth" right={<Chip>Today · snapshot</Chip>} />
          <div className="nw-row">
            <div className="nw-left">
              <Big value={netWorth} format={formatLakhCr} testId="text-networth" />
              <div className="actions">
                <button className="pill-btn black" onClick={() => onNavigate('extra-money')} data-testid="button-add-money"><Plus size={14} /> Add money</button>
                <button className="pill-btn chipbg" onClick={() => onNavigate('simulator')} data-testid="button-run-decision">Run a decision</button>
              </div>
            </div>
            <div className="pixels" aria-hidden>
              {Array.from({ length: 12 * 6 }, (_, k) => { const col = k % 12, row = Math.floor(k / 12); return <i key={k} className={row >= 3 ? (col === 11 ? 'p3' : (col + row) % 3 ? 'p2' : 'p1') : (col + row * 5) % 7 === 0 ? 'p1' : ''} />; })}
            </div>
          </div>
        </Tile>

        {/* Emergency */}
        <Tile span={3} i={1} testId="card-emergency" whyLabel="Emergency fund" onWhy={() => setWhy({ title: 'Emergency fund', ids: ['emergency'] })}>
          <Head icon={<LifeBuoy size={16} />} label="Emergency fund" right={<Dot status={F('emergency').status} />} />
          <div className="ring-wrap">
            <Ring months={d.emergencyMonths} status={F('emergency').status} />
            <div className="ring-c">
              {Number.isFinite(d.emergencyMonths) ? <Big value={d.emergencyMonths} format={(n) => n.toFixed(1)} size="md" testId="text-emergency-months" /> : <span className="big md">∞</span>}
              <span className="ring-u">months</span>
            </div>
          </div>
        </Tile>

        {/* Next move (lime) */}
        <Tile span={3} i={2} tone="lime" testId="card-next-move" whyLabel="Your next move" onWhy={() => setWhy({ title: 'Your next move', ids: [next.id] })}>
          <Head icon={<Target size={16} />} label="Your next move" />
          <p className="lime-line" data-testid="text-next-move">{allGood ? 'All eight checks look good' : NEXT_MOVE[next.id]}</p>
          <div className="lime-foot">
            <StatusPill status={next.status} />
            <button className="round-btn black" aria-label={next.link ? `Go to ${next.link}` : 'Open details'} onClick={() => (next.link ? onNavigate(next.link) : setWhy({ title: 'Your next move', ids: [next.id] }))} data-testid="button-next-move"><ArrowUpRight size={18} /></button>
          </div>
        </Tile>

        {/* Savings rate */}
        <Tile span={4} i={3} testId="card-savings" whyLabel="Savings rate" onWhy={() => setWhy({ title: 'Savings rate', ids: ['savings'] })}>
          <Head icon={<PieChart size={16} />} label="Savings rate" right={<Dot status={F('savings').status} />} />
          <Donut parts={[{ v: d.essentialOutflow, c: 'var(--grey-2)' }, { v: sipShown, c: 'var(--ink)' }, { v: unplanned, c: 'var(--watch)' }]}
            label={<Big value={Math.round(d.savingsRate * 100)} format={(n) => `${Math.round(n)}%`} size="md" testId="text-savings-rate" />} />
          <div className="dots-legend"><span><i style={{ background: 'var(--grey-2)' }} />Essentials</span><span><i style={{ background: 'var(--ink)' }} />SIP</span><span><i style={{ background: 'var(--watch)' }} />Unplanned</span></div>
        </Tile>

        {/* Monthly flow */}
        <Tile span={4} i={4} testId="card-flow" whyLabel="Monthly flow" onWhy={() => setWhy({ title: 'Monthly flow', ids: ['unallocated', 'debt'] })}>
          <Head icon={<Waves size={16} />} label="Monthly flow" right={<Dot status={F('unallocated').status} />} />
          <div className="hbars">
            {flow.map((b, i) => (
              <div className="hbar" key={b.k}>
                <div className="hbar-top"><span>{b.k}</span><b className="num">{formatLakhCr(b.v)}</b></div>
                <div className="hbar-track"><span className={`hbar-fill ${b.cls}`} style={{ ['--w' as string]: clamp01(Math.max(0, b.v) / income), ['--d' as string]: `${i * 60}ms` }} /></div>
                {b.k === 'Unplanned' && d.unallocated > 0 && <button className="mini-pill watch" onClick={() => onNavigate('studio')} data-testid="button-plan-it">Plan it</button>}
              </div>
            ))}
          </div>
        </Tile>

        {/* FIRE */}
        <Tile span={4} i={5} testId="card-fire" whyLabel="FIRE age" onWhy={() => setWhy({ title: 'FIRE age', ids: ['fire'] })}>
          <Head icon={<Landmark size={16} />} label="FIRE age" right={<Chip>Nominal ₹</Chip>} />
          <div className="fire-big">
            {fireN !== null ? <Big value={fireN} format={(n) => n.toFixed(1)} testId="text-fire-age" /> : <span className="big" data-testid="text-fire-age">70+</span>}
            <span className="unit-l">years old</span>
          </div>
          <div className="tline" aria-hidden>
            <span className="tl-track" />
            <span className="tl-dot today" style={{ left: pos(profile.age) }} />
            <span className="tl-dot fire" style={{ left: fireN !== null ? pos(fireN) : '100%' }} />
          </div>
          <div className="tl-ends num"><span>{profile.age} today</span><span>{H}</span></div>
        </Tile>

        {/* Cash vs buffer */}
        <Tile span={7} i={6} testId="card-cash-buffer" whyLabel="Cash vs buffer" onWhy={() => setWhy({ title: 'Cash vs buffer', ids: ['idle'], extra: (
          <WhyBlock k="About this chart">Every bar repeats today's liquid balance ({formatINR(liquid)}). No monthly history is stored, so this is a snapshot, not a trend. The dashed line is six months of essentials ({formatINR(buffer)}).</WhyBlock>) })}>
          <Head icon={<Shield size={16} />} label="Cash vs buffer" right={<><Chip>Snapshot</Chip><Dot status={F('idle').status} /></>} />
          <div className="cbars" aria-hidden>
            <span className="buf-line" style={{ bottom: `${bufH}%` }}><em>6-mo buffer</em></span>
            {d.idleCash > 0 && <span className="float-pill num" style={{ bottom: `calc(${liqH}% + 8px)` }}>Idle {formatLakhCr(d.idleCash)}</span>}
            {Array.from({ length: 12 }, (_, i) => (
              <span className={`cbar${i === 11 ? ' last' : ''}`} key={i} style={{ height: `${liqH}%`, ['--d' as string]: `${i * 30}ms` }}>
                <span className="cbar-idle" style={{ height: `${liquid > 0 ? (Math.max(0, liquid - buffer) / liquid) * 100 : 0}%` }} />
              </span>
            ))}
          </div>
          <div className="cb-foot"><Big value={d.idleCash} format={formatLakhCr} size="sm" testId="text-idle-cash" /><span className="muted-s">idle beyond your buffer</span></div>
        </Tile>

        {/* Protection (dark) */}
        <Tile span={5} i={7} tone="dark" testId="card-protection">
          <Head icon={<ShieldCheck size={16} />} label="Protection" right={<button className="pill-btn white sm" onClick={() => setGoalForm((o) => !o)} aria-expanded={goalForm} data-testid="button-add-goal"><Plus size={13} /> Add goal</button>} />
          <div className="prot">
            {protection.map((p) => {
              const f = F(p.id);
              return (
                <button className="prot-row" key={p.id} onClick={() => setWhy({ title: f.title, ids: [p.id] })} data-testid={`row-protection-${p.id}`}>
                  <span className="prot-ico">{p.icon}</span>
                  <span className="prot-name">{p.name}</span>
                  <span className="prot-bar"><span style={{ ['--w' as string]: clamp01(p.ratio) }} className={f.status} /></span>
                  <Dot status={f.status} />
                </button>
              );
            })}
          </div>
          {goalForm && (
            <form className="goal-form" onSubmit={submitGoal} data-testid="form-add-goal">
              <input aria-label="Goal name" placeholder="Goal name" value={gName} maxLength={40} onChange={(e) => setGName(e.target.value)} data-testid="input-new-goal-name" />
              <MoneyInput value={gAmt} onChange={setGAmt} prefix="₹" min={1} testId="input-new-goal-amount" />
              <button type="submit" className="pill-btn lime-s sm" disabled={!gName.trim()} data-testid="button-save-goal">Save</button>
            </form>
          )}
          <ul className="goal-list">
            <li><Target size={13} /><span>{goalName || 'Short-term goal'}</span><b className="num">{formatLakhCr(goalAmount)}</b><em>Studio</em></li>
            {goals.map((g) => (
              <li key={g.id} data-testid={`row-goal-${g.id}`}><Target size={13} /><span>{g.name}</span><b className="num">{formatLakhCr(g.amount)}</b>
                <button className="x-btn" onClick={() => removeGoal(g.id)} aria-label={`Remove ${g.name}`} data-testid={`button-remove-goal-${g.id}`}><X size={12} /></button></li>
            ))}
          </ul>
        </Tile>
      </div>

      <Drawer open={!!why} onClose={() => setWhy(null)} title={why?.title ?? ''} subtitle="Why?" testId="drawer-why">
        {why?.extra}
        {why?.ids.map((id) => <FindingWhy key={id} f={F(id)} onNavigate={navFromWhy} />)}
      </Drawer>
      <Drawer open={allOpen} onClose={() => setAllOpen(false)} title="All 8 checks" subtitle={`${profile.name ? `${profile.name}'s` : 'Your'} profile, today`}>
        {findings.map((f) => <FindingWhy key={f.id} f={f} onNavigate={navFromWhy} />)}
      </Drawer>
    </div>
  );
}
