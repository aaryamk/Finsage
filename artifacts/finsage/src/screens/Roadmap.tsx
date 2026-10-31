import { Compass, Flag } from 'lucide-react';
import { Head, Tile } from '../components/ui';

const PHASES = [
  { title: 'Decision workspace', body: 'Manual profile, calculation engine, FIRE projection, SIP comparison, emergency-fund model, one linked life-decision simulator.' },
  { title: 'Personal financial intelligence', body: 'Saved plans, investment import, portfolio analysis, full Financial X-Ray, tax and insurance tools, scenario history.' },
  { title: 'Connected financial life', body: 'Consent-based Account Aggregator integrations, live cash flow, detection of meaningful changes, proactive reviews.' },
  { title: 'Assisted action', body: 'Regulated partnerships for professional advice, products and approved actions.' },
];
const PRINCIPLES = ['One source of truth', 'Deterministic math', 'Visible uncertainty', 'India-specific rules', 'Privacy by consent', 'Clear regulatory boundaries'];

export function Roadmap() {
  return (
    <div className="screen">
      <div className="screen-bar"><h1 className="screen-title">Roadmap</h1></div>
      <div className="bento">
        {PHASES.map((p, i) => (
          <Tile key={p.title} span={3} i={i} tone={i === 0 ? 'lime' : undefined} testId={`card-phase-${i + 1}`}>
            <Head icon={i === 0 ? <Flag size={16} /> : <Compass size={16} />} label={`Phase ${i + 1}`} right={i === 0 ? <span className="mini-pill black">You are here</span> : undefined} />
            <h3 className="phase-t">{p.title}</h3>
            <p className="phase-b">{p.body}</p>
          </Tile>
        ))}
        <Tile span={12} i={4} tone="dark">
          <div className="principles">{PRINCIPLES.map((p) => <span key={p}>{p}</span>)}</div>
        </Tile>
      </div>
    </div>
  );
}
