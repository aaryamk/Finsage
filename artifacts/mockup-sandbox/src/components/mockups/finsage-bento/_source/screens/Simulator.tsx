import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, ArrowUpRight, Building2, CalendarClock, Flame, Home as HomeIcon, LineChart as LineIcon, LifeBuoy, PiggyBank, Scale, TrendingUp, Wallet } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useProfile } from '../state/ProfileContext';
import { applyHomePurchase } from '../engine/decision';
import { compareOutcomes, decisionVerdict } from '../engine/profile';
import { netWorthTimeline } from '../engine/projection';
import { runXRay } from '../engine/xray';
import { formatINR, formatLakhCr } from '../engine/format';
import { emi } from '../engine/loan';
import { Big, Chip, Drawer, Head, Num, Slider, StatusPill, Tile, WhyBlock } from '../components/ui';
import { FindingWhy, type Tab } from '../components/FindingCard';

const PRESETS = [4000000, 5500000, 10000000];
const ROW_ICON: Record<string, typeof Wallet> = { surplus: Wallet, emergency: LifeBuoy, sip: PiggyBank, fire: Flame, runway: CalendarClock, networth: TrendingUp };

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
  const { profile, decision, setDecision, todayRupees } = useProfile();
  const [drawer, setDrawer] = useState(false);
  const [why, setWhy] = useState(false);
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
  const em = rows.find((r) => r.id === 'emergency')!;
  const surplusB = rows.find((r) => r.id === 'surplus')!.b as number;
  const shortVerdict = future.cashShortfall > 0
    ? `Short ${formatLakhCr(future.cashShortfall)} upfront`
    : surplusB < 0 ? `Monthly deficit of ${formatINR(Math.round(-surplusB))}`
    : `Affordable · buffer ${(em.a as number).toFixed(1)} → ${(em.b as number).toFixed(1)} mo`;
  const basis = <Chip tone={todayRupees ? 'watch' : undefined}>{todayRupees ? 'Shown in nominal ₹' : 'Nominal ₹'}</Chip>;

  return (
    <div className="screen">
      <div className="screen-bar">
        <h1 className="screen-title">Simulator</h1>
        <div className="chips">
          <button className="mini-pill black" aria-pressed="true" data-testid="chip-decision-home"><HomeIcon size={13} /> Buy a home</button>
          <button className="mini-pill" disabled title="Coming soon">Career break · soon</button>
        </div>
      </div>

      <div className="bento">
        <Tile span={8} i={0} testId="card-home-controls">
          <Head icon={<Building2 size={16} />} label="The home" right={
            <span className="chips">{PRESETS.map((p) => <button key={p} className={`mini-pill${decision.price === p ? ' black' : ''}`} onClick={() => set('price', p)} data-testid={`chip-price-${p}`}>{formatLakhCr(p)}</button>)}</span>} />
          <div className="sim-controls">
            <Slider testId="slider-price" label="Home price" value={decision.price} min={3000000} max={15000000} step={500000} display={formatLakhCr(decision.price)} endLabels={['₹30 L', '₹1.5 Cr']} onChange={(v) => set('price', v)} />
            <Slider testId="slider-down" label="Down payment" value={Math.round(decision.downPct * 100)} min={10} max={40} step={1} display={`${Math.round(decision.downPct * 100)}% · ${formatLakhCr(decision.price * decision.downPct)}`} endLabels={['10%', '40%']} onChange={(v) => set('downPct', v / 100)} />
            <Slider testId="slider-rate" label="Interest rate" value={Math.round(decision.annualRate * 1000) / 10} min={7} max={11} step={0.1} display={`${(decision.annualRate * 100).toFixed(1)}%`} endLabels={['7%', '11%']} onChange={(v) => set('annualRate', Math.round(v * 10) / 1000)} />
            <Slider testId="slider-tenure" label="Tenure" value={decision.years} min={10} max={30} step={1} display={`${decision.years} yrs`} endLabels={['10 yrs', '30 yrs']} onChange={(v) => set('years', v)} />
          </div>
          <div className="stat-strip">
            <span><em>Loan</em><b className="num"><Num>{formatLakhCr(future.loan.principal)}</Num></b></span>
            <span><em>EMI / mo</em><b className="num"><Num>{formatINR(Math.round(loanEmi))}</Num></b></span>
            <span><em>Cash today</em><b className="num"><Num>{formatINR(Math.round(future.cashNeeded))}</Num></b></span>
          </div>
        </Tile>

        <Tile span={4} tone="lime" i={1} testId="card-verdict" whyLabel="Verdict" onWhy={() => setWhy(true)}>
          <Head icon={<Scale size={16} />} label="Verdict" />
          <p className="lime-line" data-testid="text-verdict">{shortVerdict}</p>
          <div className="lime-foot">
            <StatusPill status={bStatus} />
            <button className="round-btn black" onClick={() => setWhy(true)} aria-label="Read the full verdict" data-testid="button-verdict-why"><ArrowUpRight size={18} /></button>
          </div>
        </Tile>

        <Tile span={8} i={2} testId="card-compare" className="flush">
          {future.cashShortfall > 0 && (
            <div className="banner" role="alert" data-testid="banner-shortfall"><AlertTriangle size={15} />
              <span>Short by {formatINR(Math.round(future.cashShortfall))} for upfront costs</span></div>
          )}
          <table className="ctable">
            <thead><tr>
              <th scope="col"><span className="sr-only">Measure</span></th>
              <th scope="col" data-testid="column-future-a">A · Rent</th>
              <th scope="col" data-testid="column-future-b">B · Buy</th>
              <th scope="col"><span className="sr-only">Change</span></th>
            </tr></thead>
            <tbody>
              {rows.map((r) => {
                const same = Math.abs(r.delta) < 0.05;
                const tone = same ? 'same' : r.better ? 'good' : 'bad';
                const Icon = ROW_ICON[r.id] ?? Wallet;
                return (
                  <tr key={r.id} data-testid={`row-${r.id}`}>
                    <th scope="row"><span className="ico xs"><Icon size={14} /></span>{r.label}</th>
                    <td className="num"><Num>{fmt(r.a, r.format)}</Num></td>
                    <td className="num strong-v"><Num>{fmt(r.b, r.format)}</Num></td>
                    <td><span className={`delta ${tone}`}><Num>{same ? 'Same' : `${r.delta > 0 ? '↑' : '↓'} ${fmtDelta(r.delta, r.format)}`}</Num></span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Tile>

        <Tile span={4} tone="dark" i={3} testId="card-future-b">
          <Head icon={<HomeIcon size={16} />} label="Future B · EMI" right={<StatusPill status={bStatus} dark />} />
          <Big value={Math.round(loanEmi)} format={(n) => formatINR(Math.round(n))} testId="text-future-emi" />
          <p className="body-line">every month for {decision.years} years</p>
          <button className="pill-btn white" onClick={() => setDrawer(true)} data-testid="button-xray-future">X-Ray this future <ArrowRight size={15} /></button>
        </Tile>

        <Tile span={12} i={4} testId="card-sim-chart" className="chart-tile">
          <Head icon={<LineIcon size={16} />} label="Net worth over time" right={basis} />
          <div className="chart-legend">
            <span><i className="swatch dash" />A · Rent</span>
            <span><i className="swatch" style={{ background: 'var(--ink)' }} />B · Buy</span>
          </div>
          <div className="chart-box">
            <ResponsiveContainer>
              <LineChart data={chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="age" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => `₹${(v / 1e7).toFixed(v >= 1e8 ? 0 : 1)} Cr`} />
                <Tooltip formatter={(v: number, n: string) => [formatLakhCr(v), n === 'a' ? 'Keep renting' : 'Buy this home']} labelFormatter={(l) => `Age ${l}`} contentStyle={{ borderRadius: 14, border: 0, fontSize: 13 }} />
                <Line type="monotone" dataKey="a" stroke="#B5B5AF" strokeWidth={2} dot={false} strokeDasharray="5 4" animationDuration={400} />
                <Line type="monotone" dataKey="b" stroke="#111111" strokeWidth={2.5} dot={false} animationDuration={400} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Tile>
      </div>

      <Drawer open={why} onClose={() => setWhy(false)} title="Verdict" subtitle="Why?" testId="drawer-why">
        <WhyBlock k="Full verdict"><span data-testid="text-verdict-full">{verdict}</span></WhyBlock>
        <WhyBlock k="Cash needed today">Down payment plus 7% stamp duty and registration: {formatINR(Math.round(future.cashNeeded))}.</WhyBlock>
        <WhyBlock k="Same assumptions">Both futures use your profile and the same rates. Net worth is in nominal ₹.</WhyBlock>
      </Drawer>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="X-Ray: Future B" subtitle={`Buy at ${formatLakhCr(decision.price)} with ${Math.round(decision.downPct * 100)}% down`}>
        {futureFindings.map((f) => <FindingWhy key={f.id} f={f} onNavigate={(t) => { setDrawer(false); onNavigate(t); }} />)}
      </Drawer>
    </div>
  );
}
