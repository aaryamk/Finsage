import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Flame, HeartPulse, LifeBuoy, ShieldAlert, SlidersHorizontal, Sprout, Target, Wallet } from 'lucide-react';
import { useProfile } from '../state/ProfileContext';
import { derive } from '../engine/profile';
import { allocationOutcomes, allocationPreset, allocationRemaining, clampAllocation, updateBucket } from '../engine/allocation';
import { formatINR, formatLakhCr } from '../engine/format';
import type { Allocation } from '../engine/types';
import { Big, BigText, Chip, Drawer, Head, MoneyInput, Num, Slider, Tile, WhyBlock, WhyButton } from '../components/ui';

const BUCKETS: { key: keyof Allocation; label: string; short: string; color: string }[] = [
  { key: 'emergency', label: 'Emergency top-up', short: 'Emergency', color: '#3BA55C' },
  { key: 'insurance', label: 'Insurance premiums', short: 'Insurance', color: '#E8A33D' },
  { key: 'prepayment', label: 'Loan prepayment', short: 'Prepay', color: '#E5533D' },
  { key: 'shortTerm', label: 'Short-term goal', short: 'Goal', color: '#7C8CA3' },
  { key: 'longTerm', label: 'Long-term investing', short: 'Invest', color: '#141414' },
];
const PRESETS = [{ id: 'safety', label: 'Safety first' }, { id: 'balanced', label: 'Balanced' }, { id: 'growth', label: 'Growth' }] as const;
type PresetId = (typeof PRESETS)[number]['id'];

const r = (n: number) => formatINR(Math.round(n));

export function Studio() {
  const { profile, setField, allocation, setAllocation, goalName, setGoalName, goalAmount, setGoalAmount, todayRupees } = useProfile();
  const d = useMemo(() => derive(profile), [profile]);
  const surplus = Math.max(0, d.monthlySurplus);
  const hasLoans = profile.existingEMIs > 0;
  const [preset, setPreset] = useState<PresetId | null>(allocation ? null : 'balanced');
  const [applied, setApplied] = useState(false);
  const [why, setWhy] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const alloc = useMemo(
    () => clampAllocation(allocation ?? allocationPreset('balanced', surplus, hasLoans), surplus, hasLoans),
    [allocation, surplus, hasLoans],
  );
  const remaining = allocationRemaining(alloc, surplus);
  const out = useMemo(() => allocationOutcomes(profile, alloc, goalAmount), [profile, alloc, goalAmount]);

  const choosePreset = (id: PresetId) => { setPreset(id); setAllocation(allocationPreset(id, surplus, hasLoans)); };
  const move = (k: keyof Allocation, v: number) => { setPreset(null); setAllocation(updateBucket(alloc, k, v, surplus, hasLoans)); };
  const apply = () => {
    setField('monthlySIP', Math.round(alloc.longTerm));
    setApplied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setApplied(false), 2200);
  };
  const corpus = (age: number, c: { pess: number; base: number; opt: number }) => (age <= profile.age ? null : c);
  const basis = <Chip tone={todayRupees ? 'watch' : undefined}>{todayRupees ? 'Shown in nominal ₹' : 'Nominal ₹'}</Chip>;

  const whyDrawer = (
    <Drawer open={why} onClose={() => setWhy(false)} title="Studio" subtitle="Why?" testId="drawer-why">
      <WhyBlock k="Monthly surplus"><span className="num">{r(profile.monthlyTakeHome)} take-home − {r(d.essentialOutflow)} essential outflow.</span></WhyBlock>
      <WhyBlock k="Applying">Sets your monthly SIP to the long-term bucket ({r(alloc.longTerm)}). Current SIP: {r(profile.monthlySIP)}. Home and Simulator update immediately.</WhyBlock>
      <WhyBlock k="FIRE age">Investing {r(alloc.longTerm)}/mo with {profile.sipStepUpPct}% annual step-up.</WhyBlock>
      <WhyBlock k="Emergency in 12 months">Today: {Number.isFinite(d.emergencyMonths) ? d.emergencyMonths.toFixed(1) : '—'} months of outflow, plus the emergency bucket.</WhyBlock>
      <WhyBlock k="Corpus ranges">Pessimistic 7%, baseline 10%, optimistic 12% a year. Nominal ₹.</WhyBlock>
      <WhyBlock k="Goal">{out.goalMonths === null ? 'Add to the short-term bucket to start.' : `${r(goalAmount)} at 6% return.`}</WhyBlock>
      <WhyBlock k="Health cover">{out.healthCoverPlanned ? `${r(alloc.insurance)}/mo set aside for premiums.` : 'No premium budget yet.'}</WhyBlock>
    </Drawer>
  );

  if (d.monthlySurplus <= 0) {
    return (
      <div className="screen">
        <div className="screen-bar"><h1 className="screen-title">Studio</h1></div>
        <div className="bento">
          <Tile span={12} tone="lime" testId="state-no-surplus" className="empty-tile">
            <Head icon={<ShieldAlert size={16} />} label="No surplus yet" />
            <BigText text={d.monthlySurplus < 0 ? r(-d.monthlySurplus) : r(0)} />
            <p className="lime-line sm">{d.monthlySurplus < 0 ? 'Outflow exceeds take-home each month' : 'Outflow uses all take-home pay'}</p>
            <p className="body-line">Adjust expenses or EMIs in your profile.</p>
          </Tile>
        </div>
      </div>
    );
  }

  const c40 = corpus(40, out.corpus40), c60 = corpus(60, out.corpus60);
  const range = (c: { pess: number; base: number; opt: number } | null, age: number, testId: string) => (
    <Tile span={6} testId={testId} whyLabel={`Corpus at ${age}`} onWhy={() => setWhy(true)}>
      <Head icon={<Sprout size={16} />} label={`Corpus at ${age}`} right={basis} />
      {c ? <>
        <Big value={c.base} format={formatLakhCr} size="md" />
        <div className="range3 num"><span><em>7%</em><Num>{formatLakhCr(c.pess)}</Num></span><span className="mid"><em>10%</em><Num>{formatLakhCr(c.base)}</Num></span><span><em>12%</em><Num>{formatLakhCr(c.opt)}</Num></span></div>
      </> : <BigText text="Passed" size="md" />}
    </Tile>
  );

  return (
    <div className="screen">
      <div className="screen-bar">
        <h1 className="screen-title">Studio</h1>
        <WhyButton onClick={() => setWhy(true)} testId="button-why-studio" />
      </div>
      <div className="bento">
        <Tile span={12} i={0} testId="card-surplus">
          <Head icon={<Wallet size={16} />} label="Monthly surplus" right={
            <span className="chips">{PRESETS.map((p) => <button key={p.id} className={`mini-pill${preset === p.id ? ' black' : ''}`} onClick={() => choosePreset(p.id)} data-testid={`chip-preset-${p.id}`}>{p.label}</button>)}</span>} />
          <Big value={surplus} format={r} testId="text-surplus" />
          <div className="stack" role="img" aria-label="Allocation split">
            {BUCKETS.map((b) => {
              const share = surplus > 0 ? alloc[b.key] / surplus : 0;
              return (
                <div key={b.key} className="seg" style={{ flexGrow: alloc[b.key], flexBasis: 0, background: b.color }}>
                  {share > 0.12 && <span className="seg-label"><span>{b.short}</span><b>{Math.round(share * 100)}%</b></span>}
                </div>
              );
            })}
            <div className="seg rest" style={{ flexGrow: remaining, flexBasis: 0 }} />
          </div>
          <div className="unalloc"><span className={`mini-pill ${remaining > 0 ? 'watch' : 'good'}`} data-testid="text-unallocated"><Num>{`Unallocated: ${r(remaining)}`}</Num></span></div>
        </Tile>

        <Tile span={7} i={1} testId="card-buckets">
          <Head icon={<SlidersHorizontal size={16} />} label="Buckets" />
          {BUCKETS.map((b) => {
            const disabled = b.key === 'prepayment' && !hasLoans;
            const cap = alloc[b.key] + remaining;
            return (
              <div key={b.key}>
                <Slider testId={`slider-${b.key}`} label={b.label} value={alloc[b.key]} min={0} max={surplus} step={1000} color={b.color}
                  display={disabled ? 'No loans' : r(alloc[b.key])} disabled={disabled}
                  note={disabled ? 'No loans — nothing to prepay.' : alloc[b.key] >= cap && remaining === 0 ? 'At limit — free up another bucket.' : undefined}
                  onChange={(v) => move(b.key, Math.min(v, cap))} />
                {b.key === 'shortTerm' && (
                  <div className="goal-row">
                    <label className="field"><span className="field-label">Goal</span>
                      <div className="input-wrap"><input data-testid="input-goal-name" value={goalName} maxLength={40} onChange={(e) => setGoalName(e.target.value)} /></div></label>
                    <label className="field"><span className="field-label">Amount</span>
                      <MoneyInput testId="input-goal-amount" prefix="₹" value={goalAmount} min={1} onChange={setGoalAmount} /></label>
                  </div>
                )}
              </div>
            );
          })}
        </Tile>

        <div className="s-5 subgrid">
          <Tile span={12} tone="lime" i={2} testId="outcome-fire" whyLabel="FIRE age" onWhy={() => setWhy(true)}>
            <Head icon={<Flame size={16} />} label="FIRE age" right={basis} />
            {typeof out.fireAge === 'number' ? <Big value={out.fireAge} format={(n) => n.toFixed(1)} /> : <BigText text={out.fireAge} />}
            <p className="lime-line sm">Investing {r(alloc.longTerm)} a month</p>
          </Tile>
          <Tile span={6} i={3} testId="outcome-emergency" whyLabel="Emergency in 12 months" onWhy={() => setWhy(true)}>
            <Head icon={<LifeBuoy size={16} />} label="Buffer in 1 yr" />
            {Number.isFinite(out.emergencyMonths12) ? <Big value={out.emergencyMonths12} format={(n) => `${n.toFixed(1)} mo`} size="sm" /> : <BigText text="—" size="sm" />}
          </Tile>
          <Tile span={6} i={4} testId="outcome-goal" whyLabel="Goal" onWhy={() => setWhy(true)}>
            <Head icon={<Target size={16} />} label={goalName || 'Short-term goal'} />
            <BigText text={out.goalMonths === null ? 'Not funded' : `${out.goalMonths} mo`} size="sm" />
          </Tile>
          <Tile span={12} i={5} testId="outcome-health" whyLabel="Health cover" onWhy={() => setWhy(true)}>
            <Head icon={<HeartPulse size={16} />} label="Health cover" right={<span className={`mini-pill ${out.healthCoverPlanned ? 'good' : 'watch'}`}>{out.healthCoverPlanned ? 'Planned' : 'Not planned'}</span>} />
            <p className="body-line">{out.healthCoverPlanned ? `${r(alloc.insurance)}/mo for premiums` : 'No premium budget yet'}</p>
          </Tile>
        </div>

        {range(c40, 40, 'outcome-corpus40')}
        {range(c60, 60, 'outcome-corpus60')}

        <Tile span={12} tone="dark" i={6} testId="card-apply" className="apply-tile">
          <Head icon={<Check size={16} />} label="Apply to profile" />
          <div className="apply-row">
            <div><em className="muted-d">SIP now</em> <BigText text={r(profile.monthlySIP)} size="sm" /></div>
            <div><em className="muted-d">SIP after</em> <BigText text={r(alloc.longTerm)} size="sm" /></div>
            <button className={`pill-btn ${applied ? 'good' : 'white'}`} onClick={apply} data-testid="button-apply-allocation">
              {applied ? <><Check size={15} /> Applied to profile</> : <><Wallet size={15} /> Apply to my profile</>}
            </button>
          </div>
        </Tile>
      </div>
      {whyDrawer}
    </div>
  );
}
