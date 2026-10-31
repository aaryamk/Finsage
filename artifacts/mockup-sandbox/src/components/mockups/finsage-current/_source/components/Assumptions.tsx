import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { ASSUMPTIONS as A } from '../engine/constants';

const pct = (n: number) => `${+(n * 100).toFixed(1)}%`;

export function Assumptions() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', click);
    window.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', click); window.removeEventListener('keydown', key); };
  }, [open]);
  const rows: [string, string][] = [
    ['Investment return (baseline)', `${pct(A.baselineReturn)} / yr`],
    ['Pessimistic / optimistic return', `${pct(A.pessimisticReturn)} / ${pct(A.optimisticReturn)}`],
    ['Inflation', `${pct(A.inflation)} / yr`],
    ['Cash / FD return', `${pct(A.cashReturn)} / yr`],
    ['Home appreciation', `${pct(A.homeAppreciation)} / yr`],
    ['FIRE multiple', `${A.fireMultiple} × annual expenses`],
    ['Home upfront costs', `${pct(A.upfrontCosts)} of price`],
    ['Home maintenance + tax', `${pct(A.homeMaintenance)} of price / yr`],
    ['Simulation horizon', `until age ${A.horizonAge}`],
  ];
  return (
    <div className="pop-wrap" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="button-assumptions">
        <SlidersHorizontal size={14} /> Assumptions
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Assumptions" data-testid="popover-assumptions">
          <h4>The same assumptions, everywhere</h4>
          <p className="muted">Every tab uses these fixed, illustrative rates. Nominal, before tax.</p>
          <table className="atable"><tbody>
            {rows.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
          </tbody></table>
        </div>
      )}
    </div>
  );
}
