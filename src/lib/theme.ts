import { useCallback, useEffect, useState } from 'react';
import { readPref, writePref } from './storage';

export type Theme = 'light' | 'dark';
const KEY = 'sepire-explorer-theme';

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Defaults to the OS setting and follows it live until the visitor picks a theme. */
export function useTheme() {
  const [state, setState] = useState<{ theme: Theme; explicit: boolean }>(() => {
    const saved = readPref(KEY);
    if (saved === 'light' || saved === 'dark') return { theme: saved, explicit: true };
    return { theme: systemTheme(), explicit: false };
  });

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  useEffect(() => {
    if (state.explicit) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setState({ theme: mq.matches ? 'dark' : 'light', explicit: false });
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [state.explicit]);

  const toggle = useCallback(() => {
    setState((s) => {
      const theme: Theme = s.theme === 'dark' ? 'light' : 'dark';
      writePref(KEY, theme);
      return { theme, explicit: true };
    });
  }, []);

  return { theme: state.theme, toggle };
}
