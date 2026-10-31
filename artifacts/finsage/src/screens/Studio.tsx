import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ShieldAlert, Wallet } from 'lucide-react';
import { useProfile } from '../state/ProfileContext';
import { derive } from '../engine/profile';
import { allocationOutcomes, allocationPreset, allocationRemaining, clampAllocation, updateBucket } from '../engine/allocation';
import { formatINR, formatLakhCr } from '../engine/format';
import type { Allocation } from '../engine/types';
import { MoneyInput, Num, OutcomeCard, Slider } from '../components/ui';

const BUCKETS: { key: keyof Allocation; label: string; color: string }[] = [
  { key: 'emergency', label: 'Emergency top-up', color: '#1E7A4C' },
  { key: 'insurance', label: 'Insurance premiums', color: '#B7791F' },
  { key: 'prepayment', label: 'Loan prepayment', color: '#C0392B' },
  { key: 'shortTerm', label: 'Short-term goal', color: '#5B7C99' },
  { key: 'longTerm', label: 'Long-term investing', color: '#1F4D3A' },
];
const PRESETS = [{ id: 'safety', label: 'Safety first' }, { id: 'balanced', label: 'Balanced' }, { id: 'growth', label: 'Growth' }] as const;
type PresetId = (typeof PRESETS)[number]['id'];

const r = (n: number) => formatINR(Math.round(n));

export function Studio() {
  const { profile, setField, allocation, setAllocation, goalName, setGoalName, goalAmount, setGoalAmount } = useProfile();
  const d = useMemo(() => derive(profile), [profile]);
  const surplus = Math.max(0, d.monthlySurplus);
  const hasLoans = profile.existingEMIs > 0;
  const [preset, setPreset] = useState<PresetId | null>(allocation ? null : 'balanced');
  const [applied, setApplied] = useState(false);
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
  const corpus = (age: number, c: { pess: number; base: number; opt: number }) =>
    age <= profile.age ? null : c;

  if (d.monthlySurplus <= 0) {
    return (
      <div className="screen">
        <div className="eyebrow">Money Allocation Studio</div>
        <h1 className="screen-title">Give every rupee of your surplus a job.</h1>
        <div className="card empty" data-testid="state-no-surplus">
          <ShieldAlert size={28} color="var(--act)" />
          <h3>There's no surplus to plan yet</h3>
          <p>Your essential outflow ({r(d.essentialOutflow)}) {d.monthlySurplus < 0 ? `exceeds take-home pay by ${r(-d.monthlySurplus)}` : 'uses all of your take-home pay'} each month. Adjust expenses or EMIs in your profile and this studio comes alive.</p>
        </div>
      </div>
    );
  }

  const c40 = corpus(40, out.corpus40), c60 = corpus(60, out.corpus60);
  const Range = ({ c }: { c: { pess: number; base: number; opt: number } | null }) => c ? (
    <div className="range3">
      <div><span className="k">7%</span><span className="v"><Num>{formatLakhCr(c.pess)}</Num></span></div>
      <div className="base"><span className="k">10%</span><span className="v"><Num>{formatLakhCr(c.base)}</Num></span></div>
      <div><span className="k">12%</span><span className="v"><Num>{formatLakhCr(c.opt)}</Num></span></div>
    </div>
  ) : <span className="big" style={{ fontSize: 20, color: 'var(--muted)' }}>Already passed</span>;

  return (
    <div className="screen">
      <div className="eyebrow">Money Allocation Studio</div>
      <h1 className="screen-title">Give every rupee of your surplus a job.</h1>

      <div className="card section">
        <div className="surplus-hero">
          <div><div className="label">Monthly surplus</div><div className="big" data-testid="text-surplus"><Num>{r(surplus)}</Num></div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>{r(profile.monthlyTakeHome)} take-home − {r(d.essentialOutflow)} essential outflow</div></div>
          <div className="chips">
            {PRESETS.map((p) => <button key={p.id} className={`chip${preset === p.id ? ' on' : ''}`} onClick={() => choosePreset(p.id)} data-testid={`chip-preset-${p.id}`}>{p.label}</button>)}
          </div>
        </div>
        <div className="stack" role="img" aria-label="Allocation split">
          {BUCKETS.map((b) => (
            <div key={b.key} className="seg" style={{ flexGrow: alloc[b.key], flexBasis: 0, background: b.color }}>
              {surplus > 0 && alloc[b.key] / surplus > 0.12 && <span className="seg-label">{Math.round((alloc[b.key] / surplus) * 100)}%</span>}
            </div>
          ))}
          <div className="seg" style={{ flexGrow: remaining, flexBasis: 0 }} />
        </div>
        <div className="legend">
          {BUCKETS.map((b) => <span key={b.key}><i className="swatch" style={{ background: b.color, height: 8, width: 8, borderRadius: 2 }} />{b.label} <b>{r(alloc[b.key])}</b></span>)}
        </div>
        <div className="unalloc"><span className="label">Unallocated</span><b className="num" data-testid="text-unallocated" style={{ color: remaining > 0 ? 'var(--watch)' : 'var(--strong)' }}><Num>{`Unallocated: ${r(remaining)}`}</Num></b></div>
      </div>

      <div className="studio-grid">
        <div className="card">
          {BUCKETS.map((b) => {
            const disabled = b.key === 'prepayment' && !hasLoans;
            const cap = alloc[b.key] + remaining;
            return (
              <div key={b.key}>
                <Slider testId={`slider-${b.key}`} label={b.label} value={alloc[b.key]} min={0} max={surplus} step={1000} color={b.color}
                  display={disabled ? 'No loans' : r(alloc[b.key])} disabled={disabled}
                  note={disabled ? 'No loans — nothing to prepay.' : alloc[b.key] >= cap && remaining === 0 ? 'At limit — free up another bucket to add more.' : undefined}
                  onChange={(v) => move(b.key, Math.min(v, cap))} />
                {b.key === 'shortTerm' && (
                  <div className="goal-row" style={{ marginTop: -6, marginBottom: 18 }}>
                    <label className="field"><span className="field-label">Goal</span>
                      <div className="input-wrap"><input data-testid="input-goal-name" value={goalName} maxLength={40} onChange={(e) => setGoalName(e.target.value)} /></div></label>
                    <label className="field"><span className="field-label">Amount</span>
                      <MoneyInput testId="input-goal-amount" prefix="₹" value={goalAmount} min={1} onChange={setGoalAmount} /></label>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="outcomes">
          <OutcomeCard testId="outcome-fire" label="FIRE age" value={typeof out.fireAge === 'number' ? out.fireAge.toFixed(1) : out.fireAge} sub={`Investing ${r(alloc.longTerm)}/mo with ${profile.sipStepUpPct}% step-up`} />
          <OutcomeCard testId="outcome-emergency" label="Emergency in 12 months" value={Number.isFinite(out.emergencyMonths12) ? `${out.emergencyMonths12.toFixed(1)} mo` : '—'} sub={`Today: ${d.emergencyMonths.toFixed(1)} months of outflow`} />
          <OutcomeCard testId="outcome-corpus40" label="Corpus at 40" wide sub="Pessimistic · baseline · optimistic returns"><Range c={c40} /></OutcomeCard>
          <OutcomeCard testId="outcome-corpus60" label="Corpus at 60" wide><Range c={c60} /></OutcomeCard>
          <OutcomeCard testId="outcome-goal" label={goalName || 'Short-term goal'} value={out.goalMonths === null ? 'Not funded' : `${out.goalMonths} mo`} sub={out.goalMonths === null ? 'Add to the short-term bucket to start' : `${r(goalAmount)} at 6% return`} />
          <OutcomeCard testId="outcome-health" label="Health cover" value={out.healthCoverPlanned ? 'Planned' : 'Not planned'} sub={out.healthCoverPlanned ? `${r(alloc.insurance)}/mo set aside for premiums` : 'No premium budget yet'} />
        </div>
      </div>

      <div className="apply-bar">
        <p>Applying sets your monthly SIP to the long-term bucket ({r(alloc.longTerm)}). X-Ray and Simulator update immediately. Current SIP: <b className="num" style={{ color: 'var(--ink)' }}><Num>{r(profile.monthlySIP)}</Num></b></p>
        <button className={`btn${applied ? ' done' : ''}`} onClick={apply} data-testid="button-apply-allocation">
          {applied ? <><Check size={16} /> Applied to profile</> : <><Wallet size={16} /> Apply to my profile</>}
        </button>
      </div>
    </div>
  );
}
