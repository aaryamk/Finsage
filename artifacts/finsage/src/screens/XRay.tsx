import { useMemo } from 'react';
import { runXRay } from '../engine/xray';
import { useProfile } from '../state/ProfileContext';
import { FindingCard, type Tab } from '../components/FindingCard';
import { Num, StatusPill } from '../components/ui';
import type { Status } from '../engine/types';

export function XRay({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const { profile } = useProfile();
  const findings = useMemo(() => runXRay(profile), [profile]);
  const count = (s: Status) => findings.filter((f) => f.status === s).length;
  return (
    <div className="screen">
      <div className="eyebrow">Financial X-Ray</div>
      <h1 className="screen-title">Here's what your money is telling us.</h1>
      <p className="screen-sub">Eight checks on {profile.name ? `${profile.name}'s` : 'your'} profile. No score — just what we see, the numbers behind it, and what to do next.</p>
      <div className="summary" data-testid="summary-xray">
        {(['strong', 'watch', 'act'] as Status[]).map((s) => (
          <span className="summary-item" key={s}><StatusPill status={s} /><span className="summary-count"><Num>{count(s)}</Num></span></span>
        ))}
      </div>
      <div className="findings">
        {findings.map((f, i) => <FindingCard key={f.id} f={f} i={i} onNavigate={onNavigate} />)}
      </div>
    </div>
  );
}
