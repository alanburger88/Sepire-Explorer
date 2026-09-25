import { ExternalLink } from 'lucide-react';
import { LOGO_URL, openStatementTab } from '../lib/assets';
import type { Theme } from '../lib/theme';
import { ThemeToggle } from './ThemeToggle';

export type SectionId = 'intro' | 'tour' | 'compare' | 'data';

export const SECTIONS: Array<{ id: SectionId; label: string; path: string }> = [
  { id: 'intro', label: 'Introduction', path: '/' },
  { id: 'tour', label: 'Guided tour', path: '/tour' },
  { id: 'compare', label: 'PDF → Interactive', path: '/compare' },
  { id: 'data', label: 'Data & integration', path: '/data' },
];

type Props = { active: SectionId; theme: Theme; onToggleTheme: () => void };

export function TopBar({ active, theme, onToggleTheme }: Props) {
  return (
    <header className="topbar">
      <a className="topbar-brand" href="#/" aria-label="Sepire Statement Explorer — introduction">
        <img src={LOGO_URL} alt="Sepire" width={112} height={28} />
        <span className="topbar-product">Statement Explorer</span>
      </a>
      <nav className="topbar-nav" aria-label="Explorer sections">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.path}`} className="topbar-link" aria-current={active === s.id ? 'page' : undefined}>
            {s.label}
          </a>
        ))}
      </nav>
      <div className="topbar-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openStatementTab()}>
          Open the statement <ExternalLink size={15} aria-hidden />
        </button>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
