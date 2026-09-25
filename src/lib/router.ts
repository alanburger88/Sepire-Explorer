import { useEffect, useState } from 'react';

export type Route = {
  /** Path without the leading '#', e.g. '/tour/3'. */
  path: string;
  /** Path segments, e.g. ['tour', '3']. */
  parts: string[];
  query: URLSearchParams;
};

export function parseHash(hash = window.location.hash): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [p, q = ''] = raw.split('?');
  const path = p.startsWith('/') ? p : `/${p}`;
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(q) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

/** Navigate the explorer. `replace` updates the URL without adding a history entry. */
export function navigate(path: string, replace = false): void {
  const url = `#${path}`;
  if (replace) {
    if (window.location.hash === url) return;
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = path;
  }
}
