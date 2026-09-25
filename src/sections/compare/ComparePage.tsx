import { ArrowLeft, ArrowRight, ExternalLink, FileText, LayoutGrid, MonitorSmartphone, Printer, Sparkles, SplitSquareHorizontal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatementStage } from '../../components/StatementStage';
import { openStatementTab, PDF_URL, pdfPageUrl, pdfThumbUrl, STATEMENT_URL } from '../../lib/assets';
import { navigate } from '../../lib/router';
import type { StatementDriver } from '../../statement/driver';
import { closeOverlays } from '../../statement/overlays';
import { MAPPINGS, PAGE_SIZE, PAGE_TITLES, PDF_PAGES, PRINT_SHEETS, mappingsForPage, type Mapping } from './mappings';
import { Scorecard } from './Scorecard';
import './compare.css';

type Right = 'interactive' | 'print';

const PRINT_WHY =
  'No PDF has to be generated, stored or mailed each cycle. Recipients print or save the record whenever they need it, and it always matches the interactive statement.';

function printAfter(m: Mapping): string {
  if (m.page > PRINT_SHEETS) {
    return 'Not a separate page: the three design options become one progressive view, printed on page 11 of the print edition.';
  }
  return `Page ${m.page} of the statement’s own print edition: the same content, rendered from the same data on US Letter with running headers, page numbers and disclosures.`;
}
type View = 'side' | 'scorecard';

export function ComparePage({ pageParam }: { pageParam?: string }) {
  const view: View = pageParam === 'scorecard' ? 'scorecard' : 'side';
  const initialPage = Math.min(Math.max(parseInt(pageParam ?? '1', 10) || 1, 1), PDF_PAGES);
  const [page, setPage] = useState(initialPage);
  const [selected, setSelected] = useState<Mapping>(() => mappingsForPage(initialPage)[0] ?? MAPPINGS[0]);
  const [right, setRight] = useState<Right>('interactive');
  const [ready, setReady] = useState(false);
  const driverRef = useRef<StatementDriver | null>(null);
  const runRef = useRef(0);
  const thumbsRef = useRef<HTMLDivElement>(null);

  const index = MAPPINGS.findIndex((m) => m.id === selected.id);

  useEffect(() => {
    if (view === 'side') navigate(`/compare/${page}`, true);
  }, [page, view]);

  useEffect(() => {
    thumbsRef.current?.querySelector(`[data-page="${page}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [page]);

  const show = useCallback(async (m: Mapping, mode: Right) => {
    const d = driverRef.current;
    if (!d) return;
    const id = ++runRef.current;
    const alive = () => runRef.current === id;
    await closeOverlays(d);
    if (!alive()) return;
    let target: Element | null;
    let label: string;
    if (mode === 'print') {
      await d.go('/print');
      const sheet = Math.min(m.page, PRINT_SHEETS);
      target = await d.waitFor(`[data-sheet-id="p${sheet}"]`, { timeout: 5000 });
      label = m.page > PRINT_SHEETS ? 'Replaced by one interactive view' : `Printed page ${sheet}`;
    } else {
      await d.go(m.route);
      target = await d.waitFor(m.target, { timeout: 5000 });
      label = m.title;
    }
    if (!alive() || !target) return;
    await d.reveal(target, 'start');
    if (!alive()) return;
    d.highlight()?.moveTo(target, { label, padding: mode === 'print' ? 6 : 10, radius: mode === 'print' ? 6 : 18 });
  }, []);

  useEffect(() => {
    if (ready && view === 'side') void show(selected, right);
  }, [ready, selected, right, view, show]);

  const onReady = useCallback(async (d: StatementDriver) => {
    driverRef.current = d;
    await d.setLang('en');
    setReady(true);
  }, []);

  useEffect(() => () => driverRef.current?.dispose(), []);

  const selectPage = (p: number) => {
    setPage(p);
    const first = mappingsForPage(p)[0];
    if (first) setSelected(first);
  };

  const step = useCallback(
    (delta: number) => {
      const next = MAPPINGS[(index + delta + MAPPINGS.length) % MAPPINGS.length];
      setSelected(next);
      setPage(next.page);
    },
    [index],
  );

  useEffect(() => {
    if (view !== 'side') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'PageDown') selectPage(Math.min(page + 1, PDF_PAGES));
      else if (e.key === 'PageUp') selectPage(Math.max(page - 1, 1));
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const pageMappings = useMemo(() => mappingsForPage(page), [page]);
  const src = useMemo(() => `${STATEMENT_URL}#/overview`, []);

  return (
    <div className={`cmp ${view === 'scorecard' ? 'is-scorecard' : ''}`}>
      <header className="cmp-head">
        <div>
          <span className="eyebrow">PDF → Interactive</span>
          <h1>The same statement, transformed</h1>
        </div>
        <div className="seg cmp-view" role="group" aria-label="View">
          <a className="seg-link" href="#/compare/1" aria-current={view === 'side' ? 'page' : undefined}>
            <SplitSquareHorizontal size={15} aria-hidden /> Side by side
          </a>
          <a className="seg-link" href="#/compare/scorecard" aria-current={view === 'scorecard' ? 'page' : undefined}>
            <LayoutGrid size={15} aria-hidden /> Scorecard
          </a>
        </div>
        <p className="cmp-lede">
          The interactive document is the statement of record: it replaces the PDF entirely, prints or saves to PDF on
          demand, and is typically around 25% of the PDF’s size.
        </p>
      </header>

      {view === 'scorecard' ? (
        <Scorecard />
      ) : (
        <div className="cmp-body">
          <nav className="cmp-thumbs" aria-label="PDF pages" ref={thumbsRef}>
            {Array.from({ length: PDF_PAGES }, (_, i) => i + 1).map((p) => (
              <button key={p} type="button" data-page={p} className="cmp-thumb" aria-current={p === page ? 'page' : undefined} onClick={() => selectPage(p)} title={PAGE_TITLES[p]}>
                <img src={pdfThumbUrl(p)} alt="" width={220} height={285} loading="lazy" />
                <span className="num">{p}</span>
              </button>
            ))}
          </nav>

          <section className="cmp-pdf" aria-label="PDF statement">
            <div className="cmp-pane-head">
              <span className="cmp-pane-title">
                <FileText size={16} aria-hidden /> The PDF
              </span>
              <span className="cmp-page-title">
                Page {page} of {PDF_PAGES} · {PAGE_TITLES[page]}
              </span>
              <a className="btn btn-ghost btn-sm" href={PDF_URL} target="_blank" rel="noopener">
                Original PDF <ExternalLink size={14} aria-hidden />
              </a>
            </div>
            <div className="cmp-page-wrap">
              <div className="cmp-page" style={{ aspectRatio: `${PAGE_SIZE.w} / ${PAGE_SIZE.h}` }}>
                <img src={pdfPageUrl(page)} alt={`PDF statement, page ${page}: ${PAGE_TITLES[page]}`} width={1224} height={1584} />
                {pageMappings.map((m) => {
                  const [x0, y0, x1, y1] = m.rect;
                  const n = MAPPINGS.indexOf(m) + 1;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className="cmp-hotspot"
                      aria-pressed={m.id === selected.id}
                      aria-label={`${m.title}: show in the interactive statement`}
                      style={{
                        left: `${(x0 / PAGE_SIZE.w) * 100}%`,
                        top: `${(y0 / PAGE_SIZE.h) * 100}%`,
                        width: `${((x1 - x0) / PAGE_SIZE.w) * 100}%`,
                        height: `${((y1 - y0) / PAGE_SIZE.h) * 100}%`,
                      }}
                      onClick={() => setSelected(m)}
                    >
                      <span className="cmp-hotspot-n num">{n}</span>
                      <span className="cmp-hotspot-label">{m.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="cmp-live" aria-label="Interactive statement">
            <div className="cmp-pane-head">
              <span className="cmp-pane-title">
                <Sparkles size={16} aria-hidden /> The interactive statement
              </span>
              <div className="seg" role="group" aria-label="Show">
                <button type="button" aria-pressed={right === 'interactive'} onClick={() => setRight('interactive')}>
                  <MonitorSmartphone size={15} aria-hidden /> Interactive
                </button>
                <button type="button" aria-pressed={right === 'print'} onClick={() => setRight('print')}>
                  <Printer size={15} aria-hidden /> Print edition
                </button>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => openStatementTab(driverRef.current?.route() ?? selected.route)}>
                New tab <ExternalLink size={14} aria-hidden />
              </button>
            </div>
            <StatementStage device="desktop" src={src} onReady={onReady} title="Sepire interactive statement (comparison)" />
          </section>

          <footer className="cmp-story" aria-live="polite">
            <div className="cmp-story-meta">
              <span className="cmp-story-n num">
                {index + 1}
                <small>/{MAPPINGS.length}</small>
              </span>
              <div>
                <span className="eyebrow">PDF page {selected.page}</span>
                <h2>{selected.title}</h2>
              </div>
            </div>
            <div className="cmp-story-cols" key={selected.id}>
              <div className="cmp-story-col">
                <h3>On paper</h3>
                <p>{selected.before}</p>
              </div>
              <ArrowRight className="cmp-story-arrow" size={20} aria-hidden />
              <div className="cmp-story-col">
                <h3>{right === 'print' ? 'Printed on demand' : 'Interactive'}</h3>
                <p>{right === 'print' ? printAfter(selected) : selected.after}</p>
              </div>
              <div className="cmp-story-col cmp-story-why">
                <h3>Why it matters</h3>
                <p>{right === 'print' ? PRINT_WHY : selected.why}</p>
              </div>
            </div>
            <div className="cmp-story-nav">
              <button type="button" className="icon-btn" onClick={() => step(-1)} aria-label="Previous section (←)" title="Previous section (←)">
                <ArrowLeft size={18} aria-hidden />
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => step(1)} title="Next section (→)">
                Next section <ArrowRight size={16} aria-hidden />
              </button>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
