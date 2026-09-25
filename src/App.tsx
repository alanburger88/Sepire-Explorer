import { lazy, Suspense, useEffect } from 'react';
import { DesktopNotice } from './components/DesktopNotice';
import { TopBar, type SectionId } from './components/TopBar';
import { useRoute } from './lib/router';
import { useTheme } from './lib/theme';
import { IntroPage } from './sections/intro/IntroPage';

const TourPage = lazy(() => import('./sections/tour/TourPage').then((m) => ({ default: m.TourPage })));
const ComparePage = lazy(() => import('./sections/compare/ComparePage').then((m) => ({ default: m.ComparePage })));
const DataPage = lazy(() => import('./sections/data/DataPage').then((m) => ({ default: m.DataPage })));

const TITLES: Record<SectionId, string> = {
  intro: 'Sepire Statement Explorer',
  tour: 'Guided tour · Sepire Statement Explorer',
  compare: 'PDF → Interactive · Sepire Statement Explorer',
  data: 'Data & integration · Sepire Statement Explorer',
};

export function App() {
  const route = useRoute();
  const { theme, toggle } = useTheme();
  const head = route.parts[0];
  const section: SectionId = head === 'tour' ? 'tour' : head === 'compare' ? 'compare' : head === 'data' ? 'data' : 'intro';

  useEffect(() => {
    document.title = TITLES[section];
  }, [section]);

  useEffect(() => {
    if (section === 'intro') window.scrollTo(0, 0);
  }, [section]);

  return (
    <div className="app">
      <TopBar active={section} theme={theme} onToggleTheme={toggle} />
      <main className="page" id="main">
        <Suspense fallback={<div className="page-loading" role="status">Loading…</div>}>
          {section === 'intro' && <IntroPage />}
          {section === 'tour' && <TourPage stepParam={route.parts[1]} />}
          {section === 'compare' && <ComparePage pageParam={route.parts[1]} />}
          {section === 'data' && <DataPage tabParam={route.parts[1]} />}
        </Suspense>
      </main>
      <DesktopNotice />
    </div>
  );
}
