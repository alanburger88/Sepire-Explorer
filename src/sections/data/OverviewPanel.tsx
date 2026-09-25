import { ArrowRight, Download, FileCheck2, KeyRound, Link2, MonitorSmartphone, Send, ServerCog, ShieldCheck, Database } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { navigate } from '../../lib/router';
import { API_BASE } from './config';
import { AnatomyChart, type AnatomyRow } from './AnatomyChart';
import type { DataState } from './DataPage';
import { byteSize, countCells, formatBytes, gzipSize, SECTION_INFO, sectionTitle } from './payload';

const DOWNLOADS = [
  { href: 'data/sample-payload.json', file: 'sample-payload.json', label: 'Sample payload', note: 'One recipient, ready to send' },
  { href: 'data/statement.schema.json', file: 'statement.schema.json', label: 'JSON Schema', note: 'Validate before you send' },
  { href: 'data/openapi.yaml', file: 'openapi.yaml', label: 'OpenAPI 3.1', note: 'Import into Postman or Swagger' },
  { href: 'data/schema.graphql', file: 'schema.graphql', label: 'GraphQL schema', note: 'Types, mutations and docs' },
];

export function OverviewPanel({ state }: { state: DataState }) {
  const { sample } = state;
  const [gzip, setGzip] = useState<number | null>(null);
  const text = useMemo(() => JSON.stringify(sample), [sample]);
  const bytes = useMemo(() => new TextEncoder().encode(text).length, [text]);
  const cells = useMemo(() => countCells(sample), [sample]);

  useEffect(() => {
    void gzipSize(text).then(setGzip);
  }, [text]);

  const rows: AnatomyRow[] = useMemo(
    () =>
      Object.entries(sample)
        .map(([key, value]) => ({ key, title: sectionTitle(key), bytes: byteSize(value), cells: countCells(value), page: SECTION_INFO[key]?.page }))
        .sort((a, b) => b.bytes - a.bytes),
    [sample],
  );

  const openSection = (key: string) => navigate(`/data/payload?path=${encodeURIComponent(`/${key}`)}`);

  return (
    <div className="dov">
      <section className="dov-flow" aria-labelledby="dov-flow-h">
        <h2 id="dov-flow-h" className="sr-only">
          How statement data flows
        </h2>
        <ol>
          <li>
            <span className="dov-flow-icon">
              <Database size={22} aria-hidden />
            </span>
            <h3>Your recordkeeping system</h3>
            <p>Builds one JSON payload per recipient: balances, activity, holdings, loans, plan content and labels.</p>
          </li>
          <li>
            <span className="dov-flow-icon">
              <Send size={22} aria-hidden />
            </span>
            <h3>Send it to Sepire</h3>
            <p>
              <code>POST /v1/statements</code> or <code>mutation submitStatement</code>. Batches of up to 1,000.
            </p>
          </li>
          <li>
            <span className="dov-flow-icon">
              <ShieldCheck size={22} aria-hidden />
            </span>
            <h3>Validated on arrival</h3>
            <p>Types, required fields and printed values are checked; every problem is returned with its JSON path.</p>
          </li>
          <li>
            <span className="dov-flow-icon">
              <MonitorSmartphone size={22} aria-hidden />
            </span>
            <h3>Published statement</h3>
            <p>Interactive in English and Spanish on any device, with the print edition available on demand.</p>
          </li>
        </ol>
      </section>

      <dl className="dov-kpis">
        <div className="card">
          <dt>Payload sections</dt>
          <dd className="dov-kpi">{Object.keys(sample).length}</dd>
          <dd>From plan header to disclosures</dd>
        </div>
        <div className="card">
          <dt>Printed values</dt>
          <dd className="dov-kpi">{cells}</dd>
          <dd>Each exactly as printed, plus a machine value</dd>
        </div>
        <div className="card">
          <dt>Payload size</dt>
          <dd className="dov-kpi">{formatBytes(bytes)}</dd>
          <dd>{gzip ? `${formatBytes(gzip)} compressed on the wire` : 'Compressed on the wire'}</dd>
        </div>
        <div className="card">
          <dt>API calls per recipient</dt>
          <dd className="dov-kpi">1</dd>
          <dd>REST or GraphQL, same validation</dd>
        </div>
      </dl>

      <div className="dov-grid">
        <AnatomyChart rows={rows} total={bytes} onSelect={openSection} />

        <div className="dov-side">
          <section className="card dov-steps" aria-labelledby="dov-steps-h">
            <h3 id="dov-steps-h">Integrate in four steps</h3>
            <ol>
              <li>
                <KeyRound size={18} aria-hidden />
                <div>
                  <strong>Authenticate</strong>
                  <p>
                    OAuth 2.0 client credentials: exchange your client ID and secret at <code>{API_BASE.replace('https://', '')}/oauth2/token</code>.
                  </p>
                </div>
              </li>
              <li>
                <FileCheck2 size={18} aria-hidden />
                <div>
                  <strong>Map your data</strong>
                  <p>Use the JSON Schema or GraphQL schema below; the sample payload shows every field filled in.</p>
                </div>
              </li>
              <li>
                <ServerCog size={18} aria-hidden />
                <div>
                  <strong>Send one payload per recipient</strong>
                  <p>An Idempotency-Key header makes retries safe: the same statement is never published twice.</p>
                </div>
              </li>
              <li>
                <Link2 size={18} aria-hidden />
                <div>
                  <strong>Get the result</strong>
                  <p>
                    <code>201</code> with the statement ID and link, or <code>422</code> with every problem and its path.
                  </p>
                </div>
              </li>
            </ol>
            <div className="dov-try">
              <a className="btn btn-primary btn-sm" href="#/data/rest">
                Try the REST API <ArrowRight size={15} aria-hidden />
              </a>
              <a className="btn btn-secondary btn-sm" href="#/data/graphql">
                Try GraphQL
              </a>
            </div>
          </section>

          <section className="card dov-cell" aria-labelledby="dov-cell-h">
            <h3 id="dov-cell-h">Built for fidelity: every value carries its printed form</h3>
            <div className="dov-cell-demo">
              <pre>
                <code>{`"feesAndCredits": {
  "kind": "money",
  "minor": -4109,
  "src": "($41.09)"
}`}</code>
              </pre>
              <ArrowRight size={18} aria-hidden />
              <div className="dov-cell-out">
                <span>Fees and Fee Credits</span>
                <strong className="num">($41.09)</strong>
              </div>
            </div>
            <p>
              <code>src</code> is shown exactly as printed; <code>minor</code> (cents) drives charts and checks. Blank cells stay
              blank and dashes stay dashes, so the interactive statement always matches the record.
            </p>
          </section>
        </div>
      </div>

      <section className="dov-downloads" aria-labelledby="dov-dl-h">
        <h3 id="dov-dl-h">Downloads</h3>
        <ul>
          {DOWNLOADS.map((d) => (
            <li key={d.file}>
              <a className="card dov-dl" href={d.href} download={d.file}>
                <Download size={18} aria-hidden />
                <span>
                  <strong>{d.label}</strong>
                  <small>
                    {d.file} · {d.note}
                  </small>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
