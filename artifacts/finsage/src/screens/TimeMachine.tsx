import { useMemo, useState } from 'react';
import { ArrowUpRight, Hourglass, Landmark, LineChart as LineIcon, Sprout } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useProfile } from '../state/ProfileContext';
import { corpusRange, fireAge, netWorthAtAge, netWorthTimeline } from '../engine/projection';
import { ASSUMPTIONS } from '../engine/constants';
import { formatLakhCr } from '../engine/format';
import { AssumptionsTable } from '../components/Assumptions';
import { Big, Chip, Drawer, Head, Slider, Tile, WhyBlock, WhyButton } from '../components/ui';

const H = ASSUMPTIONS.horizonAge;
const tickCr = (v: number) => (Math.abs(v) >= 1e7 ? `₹${(v / 1e7).toFixed(v >= 1e8 ? 0 : 1)} Cr` : `₹${Math.round(v / 1e5)} L`);

export function TimeMachine() {
  const { profile, todayRupees } = useProfile();
  const min = Math.ceil(profile.age);
  const [rawAge, setAge] = useState(() => Math.min(H, Math.max(min, 40)));
  const age = Math.min(H, Math.max(min, rawAge));
  const [why, setWhy] = useState(false);
  const timeline = useMemo(() => netWorthTimeline(profile), [profile]);
  const nw = useMemo(() => netWorthAtAge(profile, age), [profile, age]);
  const cr = useMemo(() => corpusRange(profile, age), [profile, age]);
  const fire = useMemo(() => fireAge(profile), [profile]);
  const data = useMemo(() => timeline.map((p) => ({ age: Math.round(p.age * 10) / 10, nw: p.netWorth })), [timeline]);
  const chips = [30, 40, 50, 60, 70].filter((a) => a > min);
  const span = Math.max(1, cr.opt - cr.pess);
  const x = (v: number) => `${8 + ((v - cr.pess) / span) * 84}%`;
  const basis = <Chip tone={todayRupees ? 'watch' : undefined}>{todayRupees ? 'Shown in nominal ₹' : 'Nominal ₹'}</Chip>;

  return (
    <div className="screen">
      <div className="screen-bar">
        <h1 className="screen-title">Time Machine</h1>
        <WhyButton onClick={() => setWhy(true)} testId="button-why-time-machine" />
      </div>
      <div className="bento">
        <Tile span={4} tone="lime" i={0} testId="card-tm-networth" whyLabel="Net worth at this age" onWhy={() => setWhy(true)}>
          <Head icon={<Hourglass size={16} />} label={`Net worth at ${age}`} right={basis} />
          <Big value={nw} format={formatLakhCr} testId="text-tm-networth" />
          <p className="lime-line sm">{age === min ? "Today's snapshot" : `${age - min} years from today`}</p>
          <div className="age-chips">
            {chips.map((a) => <button key={a} className={`mini-pill${age === a ? ' black' : ''}`} onClick={() => setAge(a)} data-testid={`chip-age-${a}`}>{a}</button>)}
          </div>
        </Tile>

        <Tile span={8} i={1} testId="card-tm-chart" className="chart-tile">
          <Head icon={<LineIcon size={16} />} label="Net worth path" right={basis} />
          <Slider testId="slider-tm-age" label="Travel to age" value={age} min={min} max={H} step={1} display={`Age ${age}`} onChange={setAge} />
          <div className="chart-box">
            <ResponsiveContainer>
              <AreaChart data={data} margin={{ top: 28, right: 12, left: 0, bottom: 0 }}>
                <defs><linearGradient id="tmFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#111" stopOpacity={0.12} /><stop offset="100%" stopColor="#111" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="age" type="number" domain={[min, H]} tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={false} width={60} tickFormatter={tickCr} />
                <Tooltip formatter={(v: number) => [formatLakhCr(v), 'Net worth']} labelFormatter={(l) => `Age ${l}`} contentStyle={{ borderRadius: 14, border: 0, fontSize: 13 }} />
                <Area type="monotone" dataKey="nw" stroke="var(--ink)" strokeWidth={2.2} fill="url(#tmFill)" animationDuration={400} />
                <ReferenceLine x={age} stroke="var(--ink)" strokeDasharray="3 4" />
                <ReferenceDot x={age} y={nw} r={6} fill="var(--accent)" stroke="var(--ink)" strokeWidth={2} label={{ value: formatLakhCr(nw), position: 'top', fontSize: 12, fill: 'var(--ink)', fontWeight: 600 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Tile>

        <Tile span={7} i={2} testId="card-tm-corpus" whyLabel="Investments range" onWhy={() => setWhy(true)}>
          <Head icon={<Sprout size={16} />} label={`Investments at ${age}`} right={basis} />
          <Big value={cr.base} format={formatLakhCr} testId="text-tm-corpus" />
          <div className="crange" aria-hidden>
            <span className="cr-track" style={{ left: x(cr.pess), width: `calc(${x(cr.opt)} - ${x(cr.pess)})` }} />
            {([['pess', '7%'], ['base', '10%'], ['opt', '12%']] as const).map(([k, l]) => (
              <span key={k} className={`cr-mark ${k}`} style={{ left: x(cr[k]) }}><em>{l}</em><b className="num">{formatLakhCr(cr[k])}</b></span>
            ))}
          </div>
          <p className="body-line">Pessimistic · baseline · optimistic returns</p>
        </Tile>

        <Tile span={5} tone="dark" i={3} testId="card-tm-fire">
          <Head icon={<Landmark size={16} />} label="FIRE age" right={<button className="round-btn white sm" aria-label="Jump to FIRE age" disabled={typeof fire !== 'number'} onClick={() => typeof fire === 'number' && setAge(Math.min(H, Math.max(min, Math.round(fire))))} data-testid="button-tm-fire"><ArrowUpRight size={15} /></button>} />
          {typeof fire === 'number' ? <Big value={fire} format={(n) => n.toFixed(1)} testId="text-tm-fire" /> : <span className="big" data-testid="text-tm-fire">70+</span>}
          <p className="body-line">Projected, not promised</p>
        </Tile>
      </div>

      <Drawer open={why} onClose={() => setWhy(false)} title="Time Machine" subtitle="Why?" testId="drawer-why">
        <WhyBlock k="What you see">Your existing projection, viewed at any age from today to {H}. Net worth includes bank savings, investments and any home, less loans.</WhyBlock>
        <WhyBlock k="Nominal rupees">Projections are in future (nominal) ₹, not adjusted for inflation. The Today's ₹ toggle only changes Extra Money.</WhyBlock>
        <WhyBlock k="Investments range">Corpus from your current investments and SIP with step-up, at 7%, 10% and 12% a year.</WhyBlock>
        <WhyBlock k="No past data">FinSage stores no history. Ages before today are not shown.</WhyBlock>
        <AssumptionsTable />
      </Drawer>
    </div>
  );
}
