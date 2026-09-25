import { Moon, Sun } from 'lucide-react';
import type { Theme } from '../lib/theme';

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="icon-btn theme-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}
