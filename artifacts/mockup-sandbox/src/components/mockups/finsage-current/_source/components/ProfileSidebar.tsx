import { useState } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { useProfile } from '../state/ProfileContext';
import type { Profile } from '../engine/types';
import { MoneyInput } from './ui';

type NumKey = { [K in keyof Profile]: Profile[K] extends number ? K : never }[keyof Profile];
type F = { key: NumKey; label: string; prefix?: string; suffix?: string; min?: number; max?: number };

const GROUPS: { title: string; fields: F[] }[] = [
  { title: 'Monthly flow', fields: [
    { key: 'monthlyTakeHome', label: 'Take-home pay', prefix: '₹' },
    { key: 'monthlyExpenses', label: 'Expenses (incl. rent)', prefix: '₹' },
    { key: 'monthlyRent', label: 'Rent', prefix: '₹' },
    { key: 'existingEMIs', label: 'Existing EMIs', prefix: '₹' },
  ] },
  { title: 'Savings & investing', fields: [
    { key: 'liquidSavings', label: 'Bank + FDs', prefix: '₹' },
    { key: 'investedCorpus', label: 'Mutual funds / stocks', prefix: '₹' },
    { key: 'monthlySIP', label: 'Monthly SIP', prefix: '₹' },
    { key: 'sipStepUpPct', label: 'Annual SIP step-up', suffix: '%', max: 50 },
  ] },
  { title: 'Protection', fields: [
    { key: 'dependents', label: 'Dependents', max: 20 },
    { key: 'healthCoverEmployer', label: 'Health cover — employer', prefix: '₹' },
    { key: 'healthCoverPersonal', label: 'Health cover — personal', prefix: '₹' },
    { key: 'termCover', label: 'Term life cover', prefix: '₹' },
  ] },
];

export function ProfileSidebar() {
  const { profile, setField, reset, storageOk } = useProfile();
  const [open, setOpen] = useState(false);
  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <button className="sidebar-head" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="button-toggle-profile">
        <span><h2>Your profile</h2><span className="meta">{profile.name || 'You'}, {profile.age} · {profile.city || '—'}</span></span>
        <ChevronDown className="sidebar-chev" size={18} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      <div className="sidebar-body">
        <div className="group">
          <div className="group-title">About you</div>
          <label className="field"><span className="field-label">Name</span>
            <div className="input-wrap"><input data-testid="input-name" value={profile.name} maxLength={40} onChange={(e) => setField('name', e.target.value)} /></div>
          </label>
          <label className="field"><span className="field-label">Age</span>
            <MoneyInput testId="input-age" value={profile.age} min={18} max={69} suffix="yrs" onChange={(n) => setField('age', n)} />
          </label>
          <label className="field"><span className="field-label">City</span>
            <div className="input-wrap"><input data-testid="input-city" value={profile.city} maxLength={40} onChange={(e) => setField('city', e.target.value)} /></div>
          </label>
        </div>
        {GROUPS.map((g) => (
          <div className="group" key={g.title}>
            <div className="group-title">{g.title}</div>
            {g.fields.map((f) => (
              <label className="field" key={f.key}>
                <span className="field-label">{f.label}</span>
                <MoneyInput testId={`input-${f.key}`} value={profile[f.key]} prefix={f.prefix} suffix={f.suffix} min={f.min ?? 0} max={f.max} onChange={(n) => setField(f.key, n)} />
              </label>
            ))}
          </div>
        ))}
        <button className="reset-btn" onClick={reset} data-testid="button-reset-profile"><RotateCcw size={14} /> Reset to sample</button>
        <div className="saved-note">{storageOk ? 'Saved on this device only' : 'Storage unavailable — changes last this session'}</div>
      </div>
    </aside>
  );
}
