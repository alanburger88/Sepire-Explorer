import { Check, Copy, FileText, MapPin, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { pdfThumbUrl } from '../../lib/assets';
import { parseHash } from '../../lib/router';
import type { DataState } from './DataPage';
import { JsonTree } from './JsonTree';
import { LiveStatement } from './LiveStatement';
import { locate, pdfPageOf, type Location } from './locate';
import { countCells, formatMinor, getAt, isCell, isObject, pathFromPointer, pointer, SECTION_INFO, sectionTitle, type Json, type Path } from './payload';

function describe(v: Json | undefined): string {
  if (v === undefined) return 'Not present';
  if (isCell(v)) return { money: 'Money value', pct: 'Percentage', num: 'Number', date: 'Date', blank: 'Blank cell', dash: 'Dash' }[v.kind];
  if (Array.isArray(v)) return `List · ${v.length} item${v.length === 1 ? '' : 's'}`;
  if (isObject(v)) return `Object · ${Object.keys(v).length} field${Object.keys(v).length === 1 ? '' : 's'}`;
  if (v === null) return 'Null';
  return { string: 'Text', number: 'Number', boolean: 'True / false' }[typeof v as 'string' | 'number' | 'boolean'] ?? typeof v;
}

export function PayloadPanel({ state }: { state: DataState }) {
  const { published, full, version } = state;
  const [selected, setSelected] = useState<Path>(() => {
    const p = parseHash().query.get('path');
    return p ? pathFromPointer(p) : ['balances', 'ending'];
  });
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const ptr = pointer(selected);

  const node = getAt(published, selected);
  const loc = useMemo(() => locate(published, selected), [published, ptr]); // eslint-disable-line react-hooks/exhaustive-deps
  const page = useMemo(() => pdfPageOf(published, selected) ?? (typeof selected[0] === 'string' ? SECTION_INFO[selected[0]]?.page ?? null : null), [published, ptr]); // eslint-disable-line react-hooks/exhaustive-deps

  // Settle before moving the preview, so arrowing through the tree stays smooth.
  const [focus, setFocus] = useState<Location | null>(loc);
  useEffect(() => {
    const t = window.setTimeout(() => setFocus((f) => (f && loc && f.route === loc.route && f.target === loc.target && f.label === loc.label ? f : loc)), 280);
    return () => window.clearTimeout(t);
  }, [loc]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(node, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const crumbs = selected.map((k, i) => ({ key: k, path: selected.slice(0, i + 1), label: i === 0 && typeof k === 'string' ? sectionTitle(k) : typeof k === 'number' ? `[${k}]` : k }));

  return (
    <div className="dpay">
      <section className="dpay-tree" aria-label="Payload fields">
        <label className="dpay-search">
          <Search size={16} aria-hidden />
          <span className="sr-only">Search the payload</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search keys and values, e.g. ticker" />
        </label>
        <JsonTree data={published} selected={selected} onSelect={setSelected} query={query} labelFor={(k) => SECTION_INFO[k]?.title} />
      </section>

      <section className="dpay-detail" aria-label="Selected field" aria-live="polite">
        <nav className="dpay-crumbs" aria-label="Path">
          {crumbs.map((c, i) => (
            <span key={i}>
              {i > 0 && <span className="dpay-sep">›</span>}
              <button type="button" onClick={() => setSelected(c.path)} aria-current={i === crumbs.length - 1 ? 'location' : undefined}>
                {c.label}
              </button>
            </span>
          ))}
        </nav>
        <div className="dpay-pointer">
          <code>{ptr}</code>
          <button type="button" className="icon-btn" onClick={copy} aria-label="Copy this value as JSON" title="Copy JSON">
            {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
          </button>
        </div>

        <div className="dpay-type">
          <span className="chip">{describe(node)}</span>
        </div>

        {isCell(node) ? (
          <div className="dpay-cell">
            <div>
              <span className="dpay-k">As printed (src)</span>
              <span className="dpay-printed num">{node.src || <em>blank — shown blank, never $0</em>}</span>
            </div>
            {node.kind === 'money' && typeof node.minor === 'number' && (
              <div>
                <span className="dpay-k">Machine value (minor)</span>
                <span className="dpay-machine num">
                  {node.minor.toLocaleString('en-US')} cents = {formatMinor(node.minor)}
                </span>
              </div>
            )}
            {(node.kind === 'pct' || node.kind === 'num') && typeof node.value === 'number' && (
              <div>
                <span className="dpay-k">Machine value</span>
                <span className="dpay-machine num">{node.value}</span>
              </div>
            )}
            {node.kind === 'date' && (
              <div>
                <span className="dpay-k">ISO date</span>
                <span className="dpay-machine num">{node.iso}</span>
              </div>
            )}
          </div>
        ) : typeof node === 'string' ? (
          <blockquote className="dpay-text">{node || <em>empty</em>}</blockquote>
        ) : node !== null && typeof node === 'object' ? (
          <ul className="dpay-children">
            {(Array.isArray(node) ? node.map((v, i) => [i, v] as const) : Object.entries(node)).slice(0, 40).map(([k, v]) => (
              <li key={String(k)}>
                <button type="button" onClick={() => setSelected([...selected, k])}>
                  <span className="dpay-child-k">{typeof k === 'number' ? `[${k}]` : k}</span>
                  <span className="dpay-child-v">
                    {isCell(v) ? v.src || '(blank)' : typeof v === 'string' ? `“${v.length > 36 ? `${v.slice(0, 34)}…` : v}”` : describe(v)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dpay-literal num">{String(node)}</p>
        )}

        {!isCell(node) && (isObject(node) || Array.isArray(node)) ? (
          <p className="dpay-note">
            {countCells(node)} printed {countCells(node) === 1 ? 'value' : 'values'} in this part of the payload.
          </p>
        ) : null}

        <div className="dpay-where">
          <h3>
            <MapPin size={15} aria-hidden /> Where it appears
          </h3>
          {loc ? <p>{loc.label}</p> : <p className="muted">Not rendered as its own element.</p>}
          {page && (
            <a className="dpay-pdf" href={`#/compare/${page}`}>
              <img src={pdfThumbUrl(page)} alt="" width={220} height={285} />
              <span>
                <FileText size={14} aria-hidden /> PDF page {page}
                <small>See it side by side</small>
              </span>
            </a>
          )}
        </div>
      </section>

      <section className="dpay-preview" aria-label="Interactive statement rendered from this payload">
        <LiveStatement payload={published} full={full} version={version} focus={focus} />
      </section>
    </div>
  );
}
