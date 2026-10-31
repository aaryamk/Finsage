import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Status } from '../engine/types';

const STATUS_LABEL: Record<Status, string> = { strong: 'Strong', watch: 'Watch', act: 'Act now' };

export function StatusPill({ status }: { status: Status }) {
  return <span className={`pill ${status}`} data-testid={`status-${status}`}>{STATUS_LABEL[status]}</span>;
}
export const statusLabel = (s: Status) => STATUS_LABEL[s];

/** Re-mounts on change so the value fades in (150ms). */
export function Num({ children }: { children: string | number }) {
  return <span key={String(children)} className="fade num">{children}</span>;
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head"><h2>{title}</h2>{action}</div>
      {children}
    </section>
  );
}

export function OutcomeCard({ label, value, sub, wide, children, testId }: { label: string; value?: string; sub?: ReactNode; wide?: boolean; children?: ReactNode; testId?: string }) {
  return (
    <div className={`card outcome${wide ? ' wide' : ''}`} data-testid={testId}>
      <span className="label">{label}</span>
      {value !== undefined && <span className="big"><Num>{value}</Num></span>}
      {children}
      {sub && <span className="sub">{sub}</span>}
    </div>
  );
}

export function Slider({ label, value, min, max, step, display, onChange, disabled, note, endLabels, color, testId }: {
  label: string; value: number; min: number; max: number; step: number; display: string;
  onChange: (v: number) => void; disabled?: boolean; note?: string; endLabels?: [string, string]; color?: string; testId?: string;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className={`slider${disabled ? ' disabled' : ''}`}>
      <div className="slider-top">
        <label className="slider-label" htmlFor={testId}>{label}</label>
        <span className="value-chip"><Num>{display}</Num></span>
      </div>
      <input
        id={testId} data-testid={testId} className="range" type="range" min={min} max={Math.max(max, min)} step={step}
        value={value} disabled={disabled}
        style={{ ['--p' as string]: `${Math.min(100, Math.max(0, pct))}%`, ...(color ? { ['--c' as string]: color } : {}) }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {endLabels && <div className="range-ends"><span>{endLabels[0]}</span><span>{endLabels[1]}</span></div>}
      {note && <div className="slider-note">{note}</div>}
    </div>
  );
}

const fmtIN = (n: number) => n.toLocaleString('en-IN');

/** Numeric input with Indian grouping. Commits live while valid; reverts on blur if invalid. */
export function MoneyInput({ value, onChange, prefix, suffix, min = 0, max, integer = true, testId, id }: {
  value: number; onChange: (n: number) => void; prefix?: string; suffix?: string; min?: number; max?: number; integer?: boolean; testId?: string; id?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const shown = draft ?? fmtIN(value);

  const handle = (s: string) => {
    const clean = s.replace(/[^0-9.]/g, '');
    setDraft(clean === '' ? '' : integer ? fmtIN(Number(clean.replace(/\./g, ''))) : clean);
    if (clean === '') { setErr('Required'); return; }
    const n = integer ? Math.round(Number(clean.replace(/\./g, ''))) : Number(clean);
    if (!Number.isFinite(n)) { setErr('Enter a number'); return; }
    if (n < min) { setErr(`Minimum ${fmtIN(min)}`); return; }
    if (max !== undefined && n > max) { setErr(`Maximum ${fmtIN(max)}`); return; }
    setErr(null);
    onChange(n);
  };

  return (
    <>
      <div className={`input-wrap${err ? ' invalid' : ''}`}>
        {prefix && <span className="affix pre">{prefix}</span>}
        <input
          id={id} data-testid={testId} inputMode="numeric" value={shown}
          onFocus={() => setDraft(fmtIN(value))}
          onChange={(e) => handle(e.target.value)}
          onBlur={() => { setDraft(null); setErr(null); }}
          aria-invalid={!!err}
        />
        {suffix && <span className="affix">{suffix}</span>}
      </div>
      {err && <div className="field-err">{err} — keeping {fmtIN(value)}</div>}
    </>
  );
}

export function Drawer({ open, onClose, title, subtitle, children }: { open: boolean; onClose: () => void; title: string; subtitle?: ReactNode; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [open]);
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title} data-testid="drawer-xray">
        <div className="drawer-head">
          <div><h3 style={{ fontSize: 18 }}>{title}</h3>{subtitle && <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{subtitle}</div>}</div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close" data-testid="button-close-drawer"><X size={16} /></button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <span>Educational tool, not financial advice. Illustrative assumptions.</span>
      <span>Your numbers stay in this browser.</span>
    </footer>
  );
}
