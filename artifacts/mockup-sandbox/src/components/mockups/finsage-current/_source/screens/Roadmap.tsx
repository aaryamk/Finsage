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
      <div className="eyebrow">Roadmap</div>
      <h1 className="screen-title">Where FinSage is going.</h1>
      <p className="screen-sub">Built in phases, each earning the trust the next one needs.</p>
      <div className="phases" style={{ marginTop: 20 }}>
        {PHASES.map((p, i) => (
          <div key={p.title} className={`card phase${i === 0 ? ' current' : ''}`} style={{ animationDelay: `${i * 60}ms` }} data-testid={`card-phase-${i + 1}`}>
            {i === 0 && <span className="badge">You are here</span>}
            <span className="phase-no">Phase {i + 1}</span>
            <h3>{p.title}</h3>
            <p>{p.body}</p>
          </div>
        ))}
      </div>
      <div className="principles">{PRINCIPLES.map((p) => <span key={p}>{p}</span>)}</div>
    </div>
  );
}
