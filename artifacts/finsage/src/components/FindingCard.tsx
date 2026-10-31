import { ArrowUpRight } from 'lucide-react';
import type { Finding } from '../engine/types';
import { StatusPill, WhyBlock } from './ui';

export type Tab = 'xray' | 'time-machine' | 'extra-money' | 'simulator' | 'studio' | 'roadmap';

const LINK_TEXT = { studio: 'Open Studio', simulator: 'Open Simulator' } as const;

/** Full explanation for one engine finding, used inside Why drawers. */
export function FindingWhy({ f, onNavigate }: { f: Finding; onNavigate?: (t: Tab) => void }) {
  return (
    <section className="finding-why" data-testid={`card-finding-${f.id}`}>
      <div className="fw-head"><h4>{f.title}</h4><StatusPill status={f.status} /></div>
      <WhyBlock k="Evidence"><span className="num">{f.evidence}</span></WhyBlock>
      <WhyBlock k="What it means">{f.consequence}</WhyBlock>
      <WhyBlock k="Next step">{f.nextStep}</WhyBlock>
      {f.link && onNavigate && (
        <button className="pill-btn chipbg" onClick={() => onNavigate(f.link!)} data-testid={`link-finding-${f.id}`}>
          {LINK_TEXT[f.link]} <ArrowUpRight size={14} />
        </button>
      )}
    </section>
  );
}

export const FindingCard = FindingWhy;
