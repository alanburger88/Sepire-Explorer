import type { EditorView } from '@codemirror/view';
import { AlertTriangle, CheckCircle2, Play, ShieldCheck, XCircle } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { postStatement, type Issue, type RestResponse } from './api';
import { API_BASE } from './config';
import { CodeEditor } from './CodeEditor';
import type { DataState } from './DataPage';
import { revealPointer } from './jsonLocate';
import { LiveStatement } from './LiveStatement';
import { formatBytes, setAt, type JsonObject } from './payload';
import { restSnippet, SNIPPET_LANGS, type SnippetLang } from './snippets';

type Preset = { id: string; label: string; make: (sample: JsonObject) => string };

const pretty = (v: unknown) => JSON.stringify(v, null, 2);

const PRESETS: Preset[] = [
  { id: 'valid', label: 'Valid statement', make: (s) => pretty(s) },
  {
    id: 'missing-name',
    label: 'Missing required field',
    make: (s) => {
      const participant = { ...((s.metadata as JsonObject).participant as JsonObject) };
      delete participant.firstName;
      return pretty(setAt(s, ['metadata', 'participant'], participant));
    },
  },
  { id: 'dollars', label: 'Money sent in dollars, not cents', make: (s) => pretty(setAt(s, ['balances', 'ending', 'minor'], 417890.53)) },
  { id: 'mismatch', label: 'Machine value ≠ printed value', make: (s) => pretty(setAt(s, ['holdings', 'rows', 0, 'ending', 'minor'], 12273400)) },
  { id: 'unknown', label: 'Unknown field', make: (s) => pretty({ ...s, accountNumber: '0012-4418-33' }) },
  {
    id: 'unbalanced',
    label: 'Totals don’t reconcile (warning only)',
    make: (s) => pretty(setAt(s, ['balances', 'earnings'], { kind: 'money', minor: 700000, src: '$7,000.00' })),
  },
  { id: 'bad-json', label: 'Malformed JSON', make: (s) => pretty(s).replace('"balances": {', '"balances": {,') },
];

export function RestPanel({ state }: { state: DataState }) {
  const { sample, full, published, version, publish } = state;
  const [preset, setPreset] = useState('valid');
  const [body, setBody] = useState(() => pretty(sample));
  const [reqTab, setReqTab] = useState<'body' | 'headers' | 'code'>('body');
  const [lang, setLang] = useState<SnippetLang>('curl');
  const [resTab, setResTab] = useState<'response' | 'statement'>('response');
  const [res, setRes] = useState<RestResponse | null>(null);
  const [sending, setSending] = useState<'send' | 'validate' | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const bodyBytes = useMemo(() => new TextEncoder().encode(body).length, [body]);

  const applyPreset = (id: string) => {
    setPreset(id);
    const p = PRESETS.find((x) => x.id === id);
    if (p) setBody(p.make(sample));
    setReqTab('body');
  };

  const send = async (validateOnly = false) => {
    setSending(validateOnly ? 'validate' : 'send');
    try {
      const r = await postStatement(body, { validateOnly });
      setRes(r);
      setResTab('response');
      if (r.published) publish(r.published);
    } finally {
      setSending(null);
    }
  };

  const issues = res && typeof res.body === 'object' && res.body !== null ? (res.body as { errors?: Issue[]; warnings?: Issue[]; validation?: { errors: Issue[]; warnings: Issue[] } }) : null;
  const errors = issues?.errors ?? issues?.validation?.errors ?? [];
  const warnings = issues?.warnings ?? issues?.validation?.warnings ?? [];
  const ok = res && res.status < 300;

  return (
    <div className="dapi">
      <section className="dapi-req" aria-label="Request">
        <div className="dapi-url">
          <span className="dapi-method">POST</span>
          <code>{API_BASE}/v1/statements</code>
          <label className="dapi-preset">
            <span>Scenario</span>
            <select value={preset} onChange={(e) => applyPreset(e.target.value)}>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="dapi-tabs" role="tablist" aria-label="Request">
          {(['body', 'headers', 'code'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={reqTab === t} onClick={() => setReqTab(t)}>
              {t === 'body' ? `Body · ${formatBytes(bodyBytes)}` : t === 'headers' ? 'Headers' : 'Code'}
            </button>
          ))}
        </div>

        <div className="dapi-pane">
          {reqTab === 'body' && (
            <CodeEditor value={body} onChange={setBody} language="json" ariaLabel="Request body (JSON)" onView={(v) => (viewRef.current = v)} />
          )}
          {reqTab === 'headers' && (
            <table className="dapi-headers">
              <tbody>
                <tr>
                  <th scope="row">Authorization</th>
                  <td>
                    <code>Bearer eyJhbGciOi…</code> <span className="muted">OAuth 2.0 client-credentials token</span>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Content-Type</th>
                  <td>
                    <code>application/json</code>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Idempotency-Key</th>
                  <td>
                    <code>6f1c2a9e-3b7d-4e0a-9c51-2d8f4b7a1e03</code> <span className="muted">safe retries, never published twice</span>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
          {reqTab === 'code' && (
            <div className="dapi-code">
              <div className="seg" role="group" aria-label="Language">
                {SNIPPET_LANGS.map((l) => (
                  <button key={l.id} type="button" aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>
                    {l.label}
                  </button>
                ))}
              </div>
              <pre>
                <code>{restSnippet(lang)}</code>
              </pre>
            </div>
          )}
        </div>

        <div className="dapi-actions">
          <button type="button" className="btn btn-primary" onClick={() => void send(false)} disabled={!!sending}>
            {sending === 'send' ? <span className="spinner spinner-sm" aria-hidden /> : <Play size={16} aria-hidden />} Send request
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => void send(true)} disabled={!!sending}>
            <ShieldCheck size={16} aria-hidden /> Validate only
          </button>
          <span className="dapi-hint">
            Try a scenario, or edit the JSON directly (for example, change <code>firstName</code>).
          </span>
        </div>
      </section>

      <section className="dapi-res" aria-label="Response">
        <div className="dapi-res-head">
          {res ? (
            <span className={`dapi-status ${ok ? 'is-ok' : 'is-bad'}`}>
              {ok ? <CheckCircle2 size={16} aria-hidden /> : <XCircle size={16} aria-hidden />}
              <strong className="num">{res.status}</strong> {res.statusText}
              <span className="muted num">
                · {res.ms} ms · {formatBytes(new TextEncoder().encode(pretty(res.body)).length)}
              </span>
            </span>
          ) : (
            <span className="muted">Send the request to see Sepire’s response.</span>
          )}
          <div className="dapi-tabs dapi-tabs-inline" role="tablist" aria-label="Response">
            <button type="button" role="tab" aria-selected={resTab === 'response'} onClick={() => setResTab('response')}>
              Response
            </button>
            <button type="button" role="tab" aria-selected={resTab === 'statement'} onClick={() => setResTab('statement')}>
              Published statement
            </button>
          </div>
        </div>

        {resTab === 'response' ? (
          <div className="dapi-res-body">
            {res?.status === 201 && (
              <div className="dapi-banner is-ok">
                <CheckCircle2 size={18} aria-hidden />
                <div>
                  <strong>Published.</strong> Sepire rendered the statement from this payload
                  {warnings.length ? `, with ${warnings.length} warning${warnings.length > 1 ? 's' : ''}` : ''}.
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setResTab('statement')}>
                  See it rendered
                </button>
              </div>
            )}
            {res?.status === 422 && <div className="dapi-banner is-bad"><XCircle size={18} aria-hidden /> <div><strong>Rejected, nothing was published.</strong> Select a problem to jump to it in the body.</div></div>}
            {(errors.length > 0 || warnings.length > 0) && (
              <ul className="dapi-issues">
                {errors.map((e, i) => (
                  <li key={`e${i}`} className="is-error">
                    <button type="button" onClick={() => { setReqTab('body'); window.setTimeout(() => viewRef.current && revealPointer(viewRef.current, e.path), 30); }}>
                      <XCircle size={15} aria-hidden /> <code>{e.path}</code> {e.message}
                    </button>
                  </li>
                ))}
                {warnings.map((w, i) => (
                  <li key={`w${i}`} className="is-warning">
                    <button type="button" onClick={() => { setReqTab('body'); window.setTimeout(() => viewRef.current && revealPointer(viewRef.current, w.path), 30); }}>
                      <AlertTriangle size={15} aria-hidden /> <code>{w.path}</code> {w.message}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {res ? (
              <>
                <dl className="dapi-res-headers">
                  {Object.entries(res.headers).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <CodeEditor value={pretty(res.body)} language="json" readOnly ariaLabel="Response body" className="dapi-res-code" />
              </>
            ) : (
              <div className="dapi-empty">
                <p>
                  <strong>What happens:</strong> Sepire checks the payload against the schema (types, required fields, no
                  unknown fields), then checks that every machine value matches its printed form. Valid statements publish in
                  English and Spanish immediately.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="dapi-statement">
            {res && !ok && <p className="dapi-note">The rejected request didn’t change anything; this is the last published statement.</p>}
            <LiveStatement payload={published} full={full} version={version} />
          </div>
        )}
      </section>
    </div>
  );
}
