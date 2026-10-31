import { ArrowRight, CornerDownRight } from 'lucide-react';
import type { Finding } from '../engine/types';
import { StatusPill } from './ui';

export type Tab = 'xray' | 'simulator' | 'studio' | 'roadmap';

const LINK_TEXT = { studio: 'Plan it in Allocation Studio', simulator: 'Open the Decision Simulator' } as const;

export function FindingCard({ f, i, onNavigate }: { f: Finding; i: number; onNavigate?: (t: Tab) => void }) {
  return (
    <article className={`card finding ${f.status}`} style={{ animationDelay: `${i * 40}ms` }} data-testid={`card-finding-${f.id}`}>
      <div className="finding-head"><h3>{f.title}</h3><StatusPill status={f.status} /></div>
      <div className="evidence">{f.evidence}</div>
      <p className="consequence">{f.consequence}</p>
      <p className="next">
        <CornerDownRight size={14} />
        <span>
          {f.nextStep}
          {f.link && onNavigate && (
            <> <button className="link-btn" onClick={() => onNavigate(f.link!)} data-testid={`link-finding-${f.id}`}>
              {LINK_TEXT[f.link]} <ArrowRight size={13} />
            </button></>
          )}
        </span>
      </p>
    </article>
  );
}
