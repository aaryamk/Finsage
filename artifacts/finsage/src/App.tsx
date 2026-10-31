import { useState } from 'react';
import { Coins, GitCompareArrows, History, House, LayoutGrid } from 'lucide-react';
import { ProfileProvider, useProfile } from './state/ProfileContext';
import { ProfileDrawer, initials } from './components/ProfileDrawer';
import { AssumptionsTable } from './components/Assumptions';
import { Drawer } from './components/ui';
import type { Tab } from './components/FindingCard';
import { Home } from './screens/Home';
import { TimeMachine } from './screens/TimeMachine';
import { Simulator } from './screens/Simulator';
import { Studio } from './screens/Studio';
import { Roadmap } from './screens/Roadmap';
import { ExtraMoney } from './screens/ExtraMoney';

const TABS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: 'xray', label: 'Home', icon: House },
  { id: 'time-machine', label: 'Time Machine', icon: History },
  { id: 'extra-money', label: 'Extra Money', icon: Coins },
  { id: 'simulator', label: 'Simulator', icon: GitCompareArrows },
  { id: 'studio', label: 'Studio', icon: LayoutGrid },
];
const ALL: Tab[] = [...TABS.map((t) => t.id), 'roadmap'];

function initialTab(): Tab {
  try {
    const q = new URLSearchParams(window.location.search).get('tab');
    if (q === 'home') return 'xray';
    return ALL.includes(q as Tab) ? (q as Tab) : 'xray';
  } catch { return 'xray'; }
}

function RupeeToggle({ fixedToday = false }: { fixedToday?: boolean }) {
  const { todayRupees: shared, setTodayRupees } = useProfile();
  const todayRupees = fixedToday || shared;
  return (
    <div className={`rtoggle${fixedToday ? ' fixed' : ''}`} role="group" aria-label="Rupee basis" title={fixedToday ? 'Extra Money uses today’s after-tax rupees' : undefined}>
      <button aria-pressed={todayRupees} className={todayRupees ? 'on' : ''} onClick={() => setTodayRupees(true)} disabled={fixedToday} data-testid="toggle-rupees-today">Today's ₹</button>
      <button aria-pressed={!todayRupees} className={!todayRupees ? 'on' : ''} onClick={() => setTodayRupees(false)} disabled={fixedToday} data-testid="toggle-rupees-future">Future ₹</button>
    </div>
  );
}

function Shell() {
  const { profile } = useProfile();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [profileOpen, setProfileOpen] = useState(false);
  const [assumeOpen, setAssumeOpen] = useState(false);
  const go = (t: Tab) => { setTab(t); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  return (
    <div className="canvas">
      <div className="frame">
        <header className="topbar">
          <button className="brand" onClick={() => go('xray')} aria-label="FinSage home" data-testid="link-brand">
            <span className="logo-mark">F</span><span className="logo">FinSage</span>
          </button>
          <nav className="tabs" role="tablist" aria-label="Main">
            {TABS.map((t) => (
              <button key={t.id} role="tab" className="tab" aria-selected={tab === t.id} onClick={() => go(t.id)} data-testid={`tab-${t.id}`}>
                <t.icon size={15} aria-hidden /> <span>{t.label}</span>
              </button>
            ))}
          </nav>
          <div className="top-r">
            <RupeeToggle fixedToday={tab === 'extra-money'} />
            <button className="avatar" onClick={() => setProfileOpen(true)} aria-label="Open your profile" data-testid="button-toggle-profile">{initials(profile.name)}</button>
          </div>
        </header>
        <main className="main">
          <div key={tab}>
            {tab === 'xray' && <Home onNavigate={go} />}
            {tab === 'time-machine' && <TimeMachine />}
            {tab === 'simulator' && <Simulator onNavigate={go} />}
            {tab === 'extra-money' && <ExtraMoney />}
            {tab === 'studio' && <Studio />}
            {tab === 'roadmap' && <Roadmap />}
          </div>
        </main>
        <footer className="footer">
          <span>Educational, not financial advice.</span>
          <span className="foot-links">
            <button className="foot-link" onClick={() => setAssumeOpen(true)} data-testid="button-assumptions">Assumptions</button>
            <button className="foot-link" onClick={() => go('roadmap')} data-testid="link-roadmap">Roadmap</button>
            <span>Your numbers stay in this browser.</span>
          </span>
        </footer>
      </div>
      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
      <Drawer open={assumeOpen} onClose={() => setAssumeOpen(false)} title="Assumptions" subtitle="The same rates, everywhere" testId="drawer-assumptions">
        <AssumptionsTable />
      </Drawer>
    </div>
  );
}

function App() {
  return (
    <ProfileProvider>
      <Shell />
    </ProfileProvider>
  );
}

export default App;
