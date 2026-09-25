import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  Maximize2,
  Minimize2,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatementStage, type Device } from '../../components/StatementStage';
import { openStatementTab, STATEMENT_URL } from '../../lib/assets';
import { navigate } from '../../lib/router';
import { type Lang, type StatementDriver } from '../../statement/driver';
import { closeOverlays } from '../../statement/overlays';
import { detectUserWay, openUserWay, USERWAY_FEATURES } from '../../statement/userway';
import { CHAPTERS, STEPS } from './steps';
import './tour.css';

const FINISH = STEPS.length;

function clampIndex(n: number) {
  return Math.min(Math.max(n, 0), FINISH);
}

export function TourPage({ stepParam }: { stepParam?: string }) {
  const [index, setIndex] = useState(() => clampIndex((parseInt(stepParam ?? '1', 10) || 1) - 1));
  const [userDevice, setUserDevice] = useState<Device>('desktop');
  const [userLang, setUserLang] = useState<Lang>('en');
  const [shownLang, setShownLang] = useState<Lang>('en');
  const [autoplay, setAutoplay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [userway, setUserway] = useState<'checking' | 'available' | 'blocked'>('checking');
  const [fullscreen, setFullscreen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const driverRef = useRef<StatementDriver | null>(null);
  const runRef = useRef(0);
  const userLangRef = useRef(userLang);
  userLangRef.current = userLang;
  const userwayRef = useRef(userway);
  userwayRef.current = userway;

  const step = STEPS[index];
  const device: Device = step?.device ?? userDevice;
  const chapterIdx = step ? CHAPTERS.findIndex((c) => c.id === step.chapter) : CHAPTERS.length;

  // Keep the URL in sync (#/tour/N) without filling the browser history.
  useEffect(() => {
    navigate(`/tour/${index + 1}`, true);
  }, [index]);

  // Follow deep links while mounted.
  useEffect(() => {
    const n = clampIndex((parseInt(stepParam ?? '1', 10) || 1) - 1);
    setIndex((i) => (i === n ? i : n));
  }, [stepParam]);

  const run = useCallback(async (i: number) => {
    const d = driverRef.current;
    if (!d) return;
    const id = ++runRef.current;
    const alive = () => runRef.current === id;
    const ring = d.highlight();
    setBusy(true);
    try {
      const s = STEPS[i];
      if (!s) {
        await closeOverlays(d, 'none');
        ring?.hide();
        await d.setLang(userLangRef.current);
        setShownLang(d.lang());
        await d.go('/overview');
        return;
      }
      await closeOverlays(d, s.overlay ?? 'none');
      if (!alive()) return;
      await d.setLang(s.lang ?? userLangRef.current);
      setShownLang(d.lang());
      if (!alive()) return;
      await d.go(s.route);
      if (!alive()) return;
      let target: Element | null = null;
      if (s.overlay === 'userway') {
        target = userwayRef.current === 'blocked' ? null : await openUserWay(d);
      } else if (s.prepare) {
        target = (await s.prepare(d)) ?? null;
      }
      if (!target && s.target) target = await d.waitFor(s.target, { timeout: 5000 });
      if (!alive()) return;
      if (!target) {
        ring?.hide();
        return;
      }
      if (!s.overlay || s.overlay === 'none') await d.reveal(target, s.block ?? 'center');
      if (!alive()) return;
      ring?.moveTo(target, { padding: s.padding, radius: s.radius, label: s.tag, index: i + 1, dim: s.dim });
    } finally {
      if (alive()) setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (ready) void run(index);
  }, [index, ready, device, run]);

  const onReady = useCallback((d: StatementDriver) => {
    driverRef.current = d;
    setReady(true);
    void detectUserWay(d, 12000).then((el) => setUserway(el ? 'available' : 'blocked'));
  }, []);

  const go = useCallback((n: number) => {
    setListOpen(false);
    setIndex(clampIndex(n));
  }, []);
  const next = useCallback(() => setIndex((i) => clampIndex(i + 1)), []);
  const back = useCallback(() => setIndex((i) => clampIndex(i - 1)), []);
  const restart = useCallback(() => {
    setAutoplay(false);
    setIndex(0);
    if (index === 0) void run(0);
  }, [index, run]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const on = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  const setLang = useCallback(async (l: Lang) => {
    setUserLang(l);
    userLangRef.current = l;
    const d = driverRef.current;
    if (!d) return;
    await d.setLang(l);
    setShownLang(d.lang());
    d.highlight()?.refresh();
  }, []);

  const toggleDevice = useCallback(() => setUserDevice((v) => (v === 'desktop' ? 'mobile' : 'desktop')), []);

  // Keyboard shortcuts (only while focus is in the explorer, never inside the statement).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return;
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          next();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          back();
          break;
        case 'Home':
          restart();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          toggleDevice();
          break;
        case 'l':
        case 'L':
          void setLang((driverRef.current?.lang() ?? userLangRef.current) === 'en' ? 'es' : 'en');
          break;
        case 'p':
        case 'P':
          setAutoplay((a) => !a);
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, back, restart, toggleFullscreen, toggleDevice, setLang]);

  // Autoplay advances after each step has settled.
  const dwell = (step?.dwell ?? 9) * 1000;
  useEffect(() => {
    if (!autoplay || busy || !ready) return;
    if (index >= FINISH) {
      setAutoplay(false);
      return;
    }
    const t = window.setTimeout(() => setIndex((i) => clampIndex(i + 1)), dwell);
    return () => window.clearTimeout(t);
  }, [autoplay, busy, ready, index, dwell]);

  // Leaving the tour: stop anything the statement was showing.
  useEffect(() => () => driverRef.current?.dispose(), []);

  const src = useMemo(() => `${STATEMENT_URL}#/overview`, []);
  const openTab = () => openStatementTab(driverRef.current?.route() ?? step?.route ?? '/overview');

  return (
    <div className={`tour ${fullscreen ? 'is-fullscreen' : ''}`} ref={rootRef}>
      <section className="tour-main" aria-label="Interactive statement">
        <div className="tour-toolbar">
          <div className="seg" role="group" aria-label="Device">
            <button type="button" aria-pressed={device === 'desktop'} onClick={() => setUserDevice('desktop')} disabled={!!step?.device}>
              <Monitor size={15} aria-hidden /> Desktop
            </button>
            <button type="button" aria-pressed={device === 'mobile'} onClick={() => setUserDevice('mobile')} disabled={!!step?.device}>
              <Smartphone size={15} aria-hidden /> Mobile
            </button>
          </div>
          <div className="seg" role="group" aria-label="Statement language">
            <button type="button" aria-pressed={shownLang === 'en'} onClick={() => void setLang('en')} lang="en">
              EN
            </button>
            <button type="button" aria-pressed={shownLang === 'es'} onClick={() => void setLang('es')} lang="es">
              ES
            </button>
          </div>
          <span className="tour-toolbar-spacer" />
          <button type="button" className={`btn btn-sm ${autoplay ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAutoplay((a) => !a)} aria-pressed={autoplay}>
            {autoplay ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />} {autoplay ? 'Pause' : 'Autoplay'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={toggleFullscreen} aria-pressed={fullscreen}>
            {fullscreen ? <Minimize2 size={15} aria-hidden /> : <Maximize2 size={15} aria-hidden />} {fullscreen ? 'Exit full screen' : 'Full screen'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={openTab}>
            New tab <ExternalLink size={15} aria-hidden />
          </button>
        </div>
        <StatementStage device={device} src={src} onReady={onReady} title="Sepire interactive statement (guided tour)" />
      </section>

      <aside className="tour-panel" aria-label="Tour">
        <div className="tour-progress">
          <div className="tour-progress-meta">
            <span className="eyebrow">{step ? CHAPTERS[chapterIdx].label : 'Tour complete'}</span>
            <span className="tour-count num">
              {Math.min(index + 1, FINISH)} / {FINISH}
            </span>
          </div>
          <div className="tour-bar" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s.id} className={`tour-bar-seg ${i < index ? 'is-done' : ''} ${i === index ? 'is-current' : ''} ${i > 0 && STEPS[i - 1].chapter !== s.chapter ? 'is-chapter' : ''}`} />
            ))}
          </div>
        </div>

        <div className="tour-body" key={index} aria-live="polite">
          {step ? (
            <>
              <h2 className="tour-title">{step.title}</h2>
              <div className="tour-block">
                <h3>
                  <Sparkles size={15} aria-hidden /> The feature
                </h3>
                <p>{step.what}</p>
              </div>
              <div className="tour-block tour-why">
                <h3>Why it matters</h3>
                <p>{step.why}</p>
              </div>
              {step.overlay === 'userway' && (
                <div className={`tour-note ${userway === 'blocked' ? 'is-warn' : ''}`}>
                  {userway === 'available' && <p>The widget panel is open in the statement. Try any setting, then continue.</p>}
                  {userway === 'checking' && <p>Loading the accessibility widget…</p>}
                  {userway === 'blocked' && (
                    <>
                      <p>
                        <strong>The widget couldn’t load in this browser.</strong> It’s served by UserWay; a network policy or
                        content blocker can stop it. Where it loads, a round accessibility button appears on the statement
                        and opens these options:
                      </p>
                      <ul className="tour-uw-list">
                        {USERWAY_FEATURES.map((f) => (
                          <li key={f}>
                            <Check size={14} aria-hidden /> {f}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
              {step.tryIt && (
                <p className="tour-try">
                  <span className="chip chip-orange">Try it</span> {step.tryIt}
                </p>
              )}
            </>
          ) : (
            <div className="tour-finish">
              <h2 className="tour-title">You’ve seen the statement come alive</h2>
              <p>
                {STEPS.length} stops across {CHAPTERS.length} themes: personalization, plain language, insight, action,
                inclusion, and a printable statement of record.
              </p>
              <ul className="tour-finish-list">
                {CHAPTERS.map((c) => (
                  <li key={c.id}>
                    <Check size={15} aria-hidden /> {c.label}
                  </li>
                ))}
              </ul>
              <div className="tour-finish-ctas">
                <a className="btn btn-primary" href="#/compare">
                  Compare it with the PDF <ArrowRight size={16} aria-hidden />
                </a>
                <a className="btn btn-secondary" href="#/data">
                  See the data behind it
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="tour-nav">
          <button type="button" className="btn btn-ghost btn-sm" onClick={restart} title="Restart (Home)">
            <RotateCcw size={15} aria-hidden /> Restart
          </button>
          <span className="tour-nav-spacer" />
          <button type="button" className="btn btn-secondary" onClick={back} disabled={index === 0} title="Back (←)">
            <ArrowLeft size={16} aria-hidden /> Back
          </button>
          <button
            type="button"
            className={`btn btn-primary tour-next ${autoplay && !busy && index < FINISH ? 'is-autoplay' : ''}`}
            onClick={next}
            disabled={index >= FINISH}
            title="Next (→)"
            style={{ '--dwell': `${dwell}ms` } as React.CSSProperties}
            key={`next-${index}-${autoplay}-${busy}`}
          >
            Next <ArrowRight size={16} aria-hidden />
          </button>
        </div>

        <div className="tour-list">
          <button type="button" className="tour-list-toggle" aria-expanded={listOpen} onClick={() => setListOpen((o) => !o)}>
            All stops <ChevronDown size={16} aria-hidden />
          </button>
          {listOpen && (
            <ol className="tour-list-items">
              {CHAPTERS.map((c) => (
                <li key={c.id}>
                  <span className="tour-list-chapter">{c.label}</span>
                  <ol>
                    {STEPS.map((s, i) =>
                      s.chapter === c.id ? (
                        <li key={s.id}>
                          <button type="button" aria-current={i === index ? 'step' : undefined} onClick={() => go(i)}>
                            <span className="num">{i + 1}</span> {s.tag}
                          </button>
                        </li>
                      ) : null,
                    )}
                  </ol>
                </li>
              ))}
            </ol>
          )}
        </div>

        <ul className="tour-keys" aria-label="Keyboard shortcuts">
          <li>
            <kbd>←</kbd>
            <kbd>→</kbd> step
          </li>
          <li>
            <kbd>M</kbd> device
          </li>
          <li>
            <kbd>L</kbd> language
          </li>
          <li>
            <kbd>P</kbd> autoplay
          </li>
          <li>
            <kbd>F</kbd> full screen
          </li>
        </ul>
      </aside>
    </div>
  );
}
