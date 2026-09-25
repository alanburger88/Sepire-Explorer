import type { GraphQLSchema } from 'graphql';
import { CheckCircle2, Play, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { loadSchema, runGraphQL, tidy } from './api';
import { API_BASE } from './config';
import { CodeEditor } from './CodeEditor';
import type { DataState } from './DataPage';
import { LiveStatement } from './LiveStatement';
import { formatBytes } from './payload';
import { graphqlSnippet, SNIPPET_LANGS, type SnippetLang } from './snippets';

const OPERATIONS = [
  {
    id: 'submit',
    label: 'Submit a statement',
    query: `mutation SubmitStatement($input: StatementInput!) {
  submitStatement(input: $input) {
    statementId
    status
    recipient { fullName }
    languages
    validation {
      valid
      errors { path message }
      warnings { path message }
    }
    links { statement print }
    receivedBytes
  }
}`,
  },
  {
    id: 'validate',
    label: 'Validate only (dry run)',
    query: `query ValidateStatement($input: StatementInput!) {
  validateStatement(input: $input) {
    valid
    errors { path message }
    warnings { path message }
  }
}`,
  },
  {
    id: 'version',
    label: 'Schema version',
    query: `query {
  schemaVersion
}`,
  },
];

type Outcome = { json: string; ms: number; ok: boolean; published: boolean };

export function GraphqlPanel({ state }: { state: DataState }) {
  const { sample, full, published, version, publish } = state;
  const [schema, setSchema] = useState<GraphQLSchema | null>(null);
  const [sdl, setSdl] = useState('');
  const [op, setOp] = useState(OPERATIONS[0].id);
  const [query, setQuery] = useState(OPERATIONS[0].query);
  const [vars, setVars] = useState(() => JSON.stringify({ input: sample }, null, 2));
  const [leftTab, setLeftTab] = useState<'variables' | 'code'>('variables');
  const [lang, setLang] = useState<SnippetLang>('node');
  const [rightTab, setRightTab] = useState<'response' | 'statement' | 'schema'>('response');
  const [out, setOut] = useState<Outcome | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    void loadSchema().then((s) => {
      setSchema(s.schema);
      setSdl(s.sdl);
    });
  }, []);

  const pickOp = (id: string) => {
    setOp(id);
    setQuery(OPERATIONS.find((o) => o.id === id)!.query);
  };

  const run = async () => {
    setRunning(true);
    try {
      let variables: Record<string, unknown> | undefined;
      try {
        variables = vars.trim() ? (JSON.parse(vars) as Record<string, unknown>) : undefined;
      } catch (e) {
        setOut({ json: JSON.stringify({ errors: [{ message: `Variables are not valid JSON: ${(e as Error).message}` }] }, null, 2), ms: 0, ok: false, published: false });
        return;
      }
      const { result, ms, published: p } = await runGraphQL(query, variables);
      const shown = result.errors ? { ...result, errors: result.errors.map((e) => ({ message: tidy(e.message), ...(e.path ? { path: e.path } : {}) })) } : result;
      setOut({ json: JSON.stringify(shown, null, 2), ms, ok: !result.errors?.length, published: !!p });
      setRightTab('response');
      if (p) publish(p);
    } finally {
      setRunning(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void run();
    }
  };

  const varBytes = useMemo(() => new TextEncoder().encode(vars).length, [vars]);

  return (
    <div className="dapi dgql" onKeyDown={onKeyDown}>
      <section className="dapi-req" aria-label="GraphQL operation">
        <div className="dapi-url">
          <span className="dapi-method">POST</span>
          <code>{API_BASE}/graphql</code>
          <label className="dapi-preset">
            <span>Operation</span>
            <select value={op} onChange={(e) => pickOp(e.target.value)}>
              {OPERATIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="dgql-op">
          <CodeEditor value={query} onChange={setQuery} language="graphql" schema={schema ?? undefined} ariaLabel="GraphQL operation" />
        </div>
        <div className="dapi-tabs" role="tablist" aria-label="Operation inputs">
          <button type="button" role="tab" aria-selected={leftTab === 'variables'} onClick={() => setLeftTab('variables')}>
            Variables · {formatBytes(varBytes)}
          </button>
          <button type="button" role="tab" aria-selected={leftTab === 'code'} onClick={() => setLeftTab('code')}>
            Code
          </button>
        </div>
        <div className="dapi-pane dgql-vars">
          {leftTab === 'variables' ? (
            <CodeEditor value={vars} onChange={setVars} language="json" ariaLabel="GraphQL variables (JSON)" />
          ) : (
            <div className="dapi-code">
              <div className="seg" role="group" aria-label="Language">
                {SNIPPET_LANGS.map((l) => (
                  <button key={l.id} type="button" aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>
                    {l.label}
                  </button>
                ))}
              </div>
              <pre>
                <code>{graphqlSnippet(lang, query)}</code>
              </pre>
            </div>
          )}
        </div>
        <div className="dapi-actions">
          <button type="button" className="btn btn-primary" onClick={() => void run()} disabled={running}>
            {running ? <span className="spinner spinner-sm" aria-hidden /> : <Play size={16} aria-hidden />} Run
          </button>
          <span className="dapi-hint">
            <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd> runs · autocomplete comes from the schema
          </span>
        </div>
      </section>

      <section className="dapi-res" aria-label="Result">
        <div className="dapi-res-head">
          {out ? (
            <span className={`dapi-status ${out.ok ? 'is-ok' : 'is-bad'}`}>
              {out.ok ? <CheckCircle2 size={16} aria-hidden /> : <XCircle size={16} aria-hidden />}
              {out.ok ? (out.published ? 'Published' : 'OK') : 'Errors'}
              <span className="muted num">· {out.ms} ms</span>
            </span>
          ) : (
            <span className="muted">Run the operation to see the result.</span>
          )}
          <div className="dapi-tabs dapi-tabs-inline" role="tablist" aria-label="Result">
            <button type="button" role="tab" aria-selected={rightTab === 'response'} onClick={() => setRightTab('response')}>
              Response
            </button>
            <button type="button" role="tab" aria-selected={rightTab === 'statement'} onClick={() => setRightTab('statement')}>
              Published statement
            </button>
            <button type="button" role="tab" aria-selected={rightTab === 'schema'} onClick={() => setRightTab('schema')}>
              Schema
            </button>
          </div>
        </div>
        {rightTab === 'response' && (
          <div className="dapi-res-body">
            {out?.published && (
              <div className="dapi-banner is-ok">
                <CheckCircle2 size={18} aria-hidden />
                <div>
                  <strong>Published.</strong> The statement now renders from these variables.
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setRightTab('statement')}>
                  See it rendered
                </button>
              </div>
            )}
            {out ? (
              <CodeEditor value={out.json} language="json" readOnly ariaLabel="GraphQL response" className="dapi-res-code" />
            ) : (
              <div className="dapi-empty">
                <p>
                  <strong>Same payload, same validation.</strong> The variables hold the statement exactly as the REST API
                  takes it. GraphQL checks every field against the schema before Sepire applies its content rules.
                </p>
              </div>
            )}
          </div>
        )}
        {rightTab === 'statement' && (
          <div className="dapi-statement">
            <LiveStatement payload={published} full={full} version={version} />
          </div>
        )}
        {rightTab === 'schema' && (
          <div className="dapi-res-body">
            <CodeEditor value={sdl} language="graphql" readOnly ariaLabel="GraphQL schema (SDL)" className="dapi-res-code" />
          </div>
        )}
      </section>
    </div>
  );
}
