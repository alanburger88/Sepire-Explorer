import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StatementStage, type Device } from '../../components/StatementStage';
import { STATEMENT_URL } from '../../lib/assets';
import type { StatementDriver } from '../../statement/driver';
import { closeOverlays } from '../../statement/overlays';
import type { Location } from './locate';
import { forRender, type JsonObject } from './payload';

type Props = {
  payload: JsonObject;
  full: JsonObject;
  /** Bump to re-render the statement from `payload`. */
  version: number;
  focus?: Location | null;
  device?: Device;
  className?: string;
};

declare global {
  interface Window {
    __sepireStatementJSON?: string;
  }
}

/**
 * The real statement, rendered from the given payload. The statement frame reads the JSON
 * published on this window when it loads with ?live=1 (see scripts/statement-patches.mjs).
 */
export function LiveStatement({ payload, full, version, focus, device = 'desktop', className = '' }: Props) {
  const driverRef = useRef<StatementDriver | null>(null);
  const routeRef = useRef(focus?.route ?? '/overview');
  const runRef = useRef(0);
  const [loads, setLoads] = useState(0);

  const json = useMemo(() => JSON.stringify(forRender(payload, full)), [payload, full]);
  useLayoutEffect(() => {
    window.__sepireStatementJSON = json;
  }, [json]);

  // A new version reloads the statement where the viewer left it.
  const src = useMemo(() => {
    const route = driverRef.current?.route() ?? routeRef.current;
    routeRef.current = route;
    return `${STATEMENT_URL}?live=1&v=${version}#${route}`;
  }, [version]);

  const onReady = useCallback((d: StatementDriver) => {
    driverRef.current = d;
    setLoads((n) => n + 1);
  }, []);

  useEffect(() => {
    const d = driverRef.current;
    if (!d || !loads) return;
    const id = ++runRef.current;
    const alive = () => id === runRef.current;
    void (async () => {
      if (!focus) {
        d.highlight()?.hide();
        return;
      }
      await closeOverlays(d);
      await d.go(focus.route);
      if (!alive()) return;
      const el = await d.waitFor(focus.target, { timeout: 4000 });
      if (!alive()) return;
      if (!el) {
        d.highlight()?.hide();
        return;
      }
      await d.reveal(el, 'center');
      if (alive()) d.highlight()?.moveTo(el, { label: focus.label, padding: 8, radius: 14 });
    })();
  }, [focus, loads]);

  useEffect(() => () => driverRef.current?.dispose(), []);

  return <StatementStage device={device} src={src} onReady={onReady} className={className} title="Interactive statement rendered from the payload" />;
}
