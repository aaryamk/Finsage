import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Status } from '../engine/types';

/* ---------- status ---------- */
const STATUS_LABEL: Record<Status, string> = { strong: 'Good', watch: 'Watch', act: 'Fix' };
export const statusLabel = (s: Status) => STATUS_LABEL[s];

export function StatusPill({ status, dark }: { status: Status; dark?: boolean }) {
  return <span className={`pill ${status}${dark ? ' on-dark' : ''}`} data-testid={`status-${status}`}>{STATUS_LABEL[status]}</span>;
}
export function Dot({ status }: { status: Status }) {
  return <span className={`sdot ${status}`} aria-label={STATUS_LABEL[status]} role="img" />;
}

/* ---------- motion ---------- */
export function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/** Counts from the previous value to the new one in 300ms. Skips animation when reduced motion is set. */
export function useCountUp(target: number) {
  const [v, setV] = useState(() => (prefersReducedMotion() || !Number.isFinite(target) ? target : 0));
  const shown = useRef(v);
  shown.current = v;
  useEffect(() => {
    if (!Number.isFinite(target) || prefersReducedMotion() || !Number.isFinite(shown.current)) { setV(target); return; }
    const from = shown.current;
    if (from === target) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 300);
      const e = 1 - (1 - k) ** 3;
      setV(k >= 1 ? target : from + (target - from) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

/** Renders a formatted figure with the ₹ symbol, decimals and unit at 60% size, muted. */
export function Money({ text }: { text: string }) {
  const m = /^([−-]?)(₹?)([\d,]+)(\.\d+)?(\s?[A-Za-z%+ ]+)?$/.exec(text);
  if (!m) return <>{text}</>;
  const [, sign, cur, int, dec, unit] = m;
  return (
    <>
      {sign}{cur && <span className="fx">{cur}</span>}{int}{dec && <span className="fx">{dec}</span>}{unit && <span className="fx unit">{unit}</span>}
    </>
  );
}

/** Big number: counts up, splits symbol/decimals. */
export function Big({ value, format, testId, size }: { value: number; format: (n: number) => string; testId?: string; size?: 'md' | 'sm' }) {
  const v = useCountUp(value);
  return <span className={`big num${size ? ` ${size}` : ''}`} data-testid={testId}><Money text={format(v)} /></span>;
}
export function BigText({ text, testId, size }: { text: string; testId?: string; size?: 'md' | 'sm' }) {
  return <span className={`big num${size ? ` ${size}` : ''}`} data-testid={testId}><Money text={text} /></span>;
}

/** Re-mounts on change so the value fades in (150ms). */
export function Num({ children }: { children: string | number }) {
  return <span key={String(children)} className="fade num">{children}</span>;
}

/* ---------- bento ---------- */
export function Tile({ span = 4, tone, onWhy, whyLabel, className = '', children, testId, i = 0, style }: {
  span?: 3 | 4 | 5 | 6 | 7 | 8 | 12; tone?: 'lime' | 'dark'; onWhy?: () => void; whyLabel?: string; className?: string;
  children: ReactNode; testId?: string; i?: number; style?: CSSProperties;
}) {
  return (
    <div className={`card tile s-${span}${tone ? ` ${tone}` : ''}${onWhy ? ' has-why' : ''} ${className}`} style={{ ['--i' as string]: i, ...style }} data-testid={testId}>
      {onWhy && <button type="button" className="tile-hit" onClick={onWhy} aria-label={`Why? ${whyLabel ?? ''}`} data-testid={testId ? `why-${testId}` : undefined} />}
      {children}
    </div>
  );
}

export function Head({ icon, label, right }: { icon: ReactNode; label: string; right?: ReactNode }) {
  return (
    <div className="head">
      <span className="ico" aria-hidden>{icon}</span>
      <span className="lbl">{label}</span>
      {right && <span className="head-r">{right}</span>}
    </div>
  );
}

export function WhyButton({ onClick, testId, label = 'Why?' }: { onClick: () => void; testId?: string; label?: string }) {
  return <button type="button" className="why-btn" onClick={onClick} data-testid={testId}>{label}</button>;
}

export function Chip({ children, tone }: { children: ReactNode; tone?: 'watch' | 'dark' }) {
  return <span className={`tchip${tone ? ` ${tone}` : ''}`}>{children}</span>;
}

/* ---------- controls ---------- */
export function Slider({ label, value, min, max, step, display, onChange, disabled, note, endLabels, color, testId }: {
  label: string; value: number; min: number; max: number; step: number; display: string;
  onChange: (v: number) => void; disabled?: boolean; note?: string; endLabels?: [string, string]; color?: string; testId?: string;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className={`slider${disabled ? ' disabled' : ''}`}>
      <div className="slider-top">
        {color && <span className="cdot" style={{ background: color }} aria-hidden />}
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

/* ---------- drawer ---------- */
export function Drawer({ open, onClose, title, subtitle, children, testId = 'drawer-xray', icon }: { open: boolean; onClose: () => void; title: string; subtitle?: ReactNode; children: ReactNode; testId?: string; icon?: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key !== 'Tab') return;
      const elements = [...(drawerRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
      ) ?? [])].filter(element => element.offsetParent !== null);
      const first = elements[0], last = elements[elements.length - 1];
      if (!first || !last) { e.preventDefault(); return; }
      if (!drawerRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; prevFocus?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside ref={drawerRef} className="drawer" role="dialog" aria-modal="true" aria-label={title} data-testid={testId}>
        <div className="drawer-head">
          {icon && <span className="ico" aria-hidden>{icon}</span>}
          <div className="drawer-title"><h3>{title}</h3>{subtitle && <div className="drawer-sub">{subtitle}</div>}</div>
          <button ref={closeRef} className="round-btn" onClick={onClose} aria-label="Close" data-testid="button-close-drawer"><X size={16} /></button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>
  );
}

/** One block inside a Why drawer. */
export function WhyBlock({ k, children }: { k: string; children: ReactNode }) {
  return <div className="why-block"><div className="why-k">{k}</div><div className="why-v">{children}</div></div>;
}
