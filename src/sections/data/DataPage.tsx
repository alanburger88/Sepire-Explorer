import { FileJson2, PenLine, RotateCcw, Waypoints } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Halftone } from '../../components/Halftone';
import { loadStatement, type JsonObject } from './payload';
import { OverviewPanel } from './OverviewPanel';
import './data.css';

const PayloadPanel = lazy(() => import('./PayloadPanel').then((m) => ({ default: m.PayloadPanel })));
const LivePanel = lazy(() => import('./LivePanel').then((m) => ({ default: m.LivePanel })));

export type Tab = 'overview' | 'payload' | 'live';

const TABS: Array<{ id: Tab; label: string; icon: typeof Waypoints }> = [
  { id: 'overview', label: 'How it works', icon: Waypoints },
  { id: 'payload', label: 'Explore the payload', icon: FileJson2 },
  { id: 'live', label: 'Edit & re-render', icon: PenLine },
];

export type DataState = {
  sample: JsonObject;
  full: JsonObject;
  /** The payload the statement currently renders (last successful submission). */
  published: JsonObject;
  version: number;
  publish: (payload: JsonObject) => void;
};

export function DataPage({ tabParam }: { tabParam?: string }) {
  const tab: Tab = TABS.some((t) => t.id === tabParam) ? (tabParam as Tab) : 'overview';
  const [loaded, setLoaded] = useState<{ full: JsonObject; payload: JsonObject } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<JsonObject | null>(null);
  const [version, setVersion] = useState(1);

  useEffect(() => {
    loadStatement()
      .then((l) => {
        setLoaded(l);
        setPublished((p) => p ?? l.payload);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const publish = useCallback((payload: JsonObject) => {
    setPublished(payload);
    setVersion((v) => v + 1);
  }, []);

  const reset = () => loaded && publish(loaded.payload);
  const sampleText = useMemo(() => (loaded ? JSON.stringify(loaded.payload) : ''), [loaded]);
  const changed = useMemo(() => !!published && !!loaded && published !== loaded.payload && JSON.stringify(published) !== sampleText, [published, loaded, sampleText]);

  const state: DataState | null =
    loaded && published ? { sample: loaded.payload, full: loaded.full, published, version, publish } : null;

  return (
    <div className={`data data-tab-${tab}`}>
      <header className="data-head">
        <Halftone corner="top-right" size={220} spacing={13} maxRadius={3.4} opacity={0.3} />
        <div className="data-head-copy">
          <span className="eyebrow">Data & integration · client → Sepire</span>
          <h1>One payload in. A complete statement out.</h1>
          <p>
            Your recordkeeping system sends each recipient’s statement to Sepire as one JSON payload through a
            secure API. Sepire validates it, publishes the interactive statement in English and Spanish, and serves
            the print edition on demand.
          </p>
        </div>
        {changed && (
          <button type="button" className="btn btn-secondary btn-sm data-reset" onClick={reset}>
            <RotateCcw size={15} aria-hidden /> Reset to the sample payload
          </button>
        )}
      </header>

      <nav className="data-tabs" aria-label="Data explorer">
        {TABS.map(({ id, label, icon: Icon }) => (
          <a key={id} href={`#/data${id === 'overview' ? '' : `/${id}`}`} className="data-tab" aria-current={tab === id ? 'page' : undefined}>
            <Icon size={16} aria-hidden /> {label}
          </a>
        ))}
        <span className="data-tabs-note">Demo data. Edits stay in your browser.</span>
      </nav>

      <div className="data-body">
        {error && <p className="data-error">{error}</p>}
        {!state && !error && (
          <div className="page-loading" role="status">
            <span className="spinner" aria-hidden="true" /> Loading the statement data…
          </div>
        )}
        {state && (
          <Suspense
            fallback={
              <div className="page-loading" role="status">
                <span className="spinner" aria-hidden="true" /> Loading…
              </div>
            }
          >
            {tab === 'overview' && <OverviewPanel state={state} />}
            {tab === 'payload' && <PayloadPanel state={state} />}
            {tab === 'live' && <LivePanel state={state} />}
          </Suspense>
        )}
      </div>
    </div>
  );
}
