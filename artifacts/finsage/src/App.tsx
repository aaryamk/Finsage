import { useState } from 'react';
import { ProfileProvider } from './state/ProfileContext';
import { ProfileSidebar } from './components/ProfileSidebar';
import { Assumptions } from './components/Assumptions';
import { Footer } from './components/ui';
import type { Tab } from './components/FindingCard';
import { XRay } from './screens/XRay';
import { Simulator } from './screens/Simulator';
import { Studio } from './screens/Studio';
import { Roadmap } from './screens/Roadmap';
import { ExtraMoney } from './screens/ExtraMoney';

const TABS: { id: Tab; label: string }[] = [
  { id: 'xray', label: 'X-Ray' },
  { id: 'simulator', label: 'Decision Simulator' },
  { id: 'extra-money', label: 'Extra Money' },
  { id: 'studio', label: 'Allocation Studio' },
  { id: 'roadmap', label: 'Roadmap' },
];

function initialTab(): Tab {
  try {
    const q = new URLSearchParams(window.location.search).get('tab');
    return TABS.some((t) => t.id === q) ? (q as Tab) : 'xray';
  } catch { return 'xray'; }
}

function App() {
  const [tab, setTab] = useState<Tab>(initialTab);
  const go = (t: Tab) => { setTab(t); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  return (
    <ProfileProvider>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="logo"><span className="logo-mark">F</span>FinSage</span>
            <span className="tagline">See what a big money decision does to the rest of your life.</span>
          </div>
          <nav className="tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" className="tab" aria-selected={tab === t.id} onClick={() => go(t.id)} data-testid={`tab-${t.id}`}>{t.label}</button>
            ))}
          </nav>
          <Assumptions />
        </div>
      </header>
      <div className="shell">
        <ProfileSidebar />
        <main className="main">
          <div key={tab}>
            {tab === 'xray' && <XRay onNavigate={go} />}
            {tab === 'simulator' && <Simulator onNavigate={go} />}
            {tab === 'extra-money' && <ExtraMoney />}
            {tab === 'studio' && <Studio />}
            {tab === 'roadmap' && <Roadmap />}
          </div>
          <Footer />
        </main>
      </div>
    </ProfileProvider>
  );
}

export default App;
