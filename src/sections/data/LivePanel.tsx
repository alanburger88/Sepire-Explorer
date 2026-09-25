import { Monitor, RotateCcw, Smartphone, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Device } from '../../components/StatementStage';
import type { DataState } from './DataPage';
import { LiveStatement } from './LiveStatement';
import type { Location } from './locate';
import { formatMinor, getAt, isObject, setAt, type Json, type JsonObject } from './payload';

type Form = { firstName: string; lastName: string; message: string; deferrals: number; beneficiary: string };
type Field = keyof Form;

const str = (v: Json | undefined) => (typeof v === 'string' ? v : '');
const cents = (v: Json | undefined) => (isObject(v) && typeof v.minor === 'number' ? v.minor : 0);
const moneyCell = (minor: number): JsonObject => ({ kind: 'money', minor, src: formatMinor(minor) });

function readForm(p: JsonObject): Form {
  return {
    firstName: str(getAt(p, ['metadata', 'participant', 'firstName'])),
    lastName: str(getAt(p, ['metadata', 'participant', 'lastName'])),
    message: str(getAt(p, ['metadata', 'message', 'body'])),
    deferrals: cents(getAt(p, ['contributionLimits', 'gauges', 0, 'ytd'])),
    beneficiary: str(getAt(p, ['beneficiaries', 'primary', 0, 'name'])),
  };
}

function applyForm(base: JsonObject, f: Form): JsonObject {
  let p = base;
  p = setAt(p, ['metadata', 'participant', 'firstName'], f.firstName);
  p = setAt(p, ['metadata', 'participant', 'lastName'], f.lastName);
  p = setAt(p, ['metadata', 'participant', 'fullName'], `${f.firstName} ${f.lastName}`.trim());
  p = setAt(p, ['metadata', 'message', 'body'], f.message);
  const limit = cents(getAt(p, ['contributionLimits', 'gauges', 0, 'limit']));
  if (limit > 0) {
    const used = Math.round((f.deferrals / limit) * 100);
    p = setAt(p, ['contributionLimits', 'gauges', 0, 'ytd'], moneyCell(f.deferrals));
    p = setAt(p, ['contributionLimits', 'gauges', 0, 'usedPct'], used);
    p = setAt(p, ['contributionLimits', 'gauges', 0, 'usedLabel'], `${used}% of limit used`);
    p = setAt(p, ['contributionLimits', 'gauges', 0, 'remaining'], moneyCell(limit - f.deferrals));
  }
  p = setAt(p, ['beneficiaries', 'primary', 0, 'name'], f.beneficiary);
  const fields = getAt(p, ['profile', 'fields']);
  const i = Array.isArray(fields) ? fields.findIndex((x) => isObject(x) && x.id === 'primary-beneficiary') : -1;
  if (i >= 0) p = setAt(p, ['profile', 'fields', i, 'value'], f.beneficiary);
  return p;
}

const FOCUS: Record<Field, Location> = {
  firstName: { route: '/overview', target: '[data-focus-id="section:hero"]', label: 'Greeting' },
  lastName: { route: '/overview', target: '[data-focus-id="section:hero"]', label: 'Greeting' },
  message: { route: '/overview', target: '[data-focus-id="section:plan-message"]', label: 'Plan message' },
  deferrals: { route: '/activity/limits', target: '[data-focus-id="limit:elective"]', label: 'Elective deferral gauge' },
  beneficiary: { route: '/loans-beneficiaries/beneficiaries', target: '.lb-ben-grid', label: 'Beneficiaries' },
};

const PATHS: Record<Field, string> = {
  firstName: '/metadata/participant/firstName',
  lastName: '/metadata/participant/lastName',
  message: '/metadata/message/body',
  deferrals: '/contributionLimits/gauges/0/ytd',
  beneficiary: '/beneficiaries/primary/0/name',
};

export function LivePanel({ state }: { state: DataState }) {
  const { sample, full, published, version, publish } = state;
  const baseRef = useRef(published);
  const [form, setForm] = useState<Form>(() => readForm(published));
  const [last, setLast] = useState<Field>('firstName');
  const [device, setDevice] = useState<Device>('desktop');
  const initial = useMemo(() => readForm(sample), [sample]);
  const limit = cents(getAt(sample, ['contributionLimits', 'gauges', 0, 'limit'])) || 2450000;

  const payload = useMemo(() => applyForm(baseRef.current, form), [form]);
  const publishedRef = useRef(published);
  publishedRef.current = published;

  // Publish shortly after the last edit, as a client integration would after a data change.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (JSON.stringify(payload) !== JSON.stringify(publishedRef.current)) publish(payload);
    }, 700);
    return () => window.clearTimeout(t);
  }, [payload, publish]);

  const update = <K extends Field>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setLast(k);
  };

  const reset = () => {
    baseRef.current = sample;
    setForm(initial);
    setLast('firstName');
  };

  const changes = (Object.keys(PATHS) as Field[]).filter((k) => form[k] !== initial[k]);
  const show = (k: Field, v: Form[Field]) => (k === 'deferrals' ? formatMinor(v as number) : `“${String(v).length > 48 ? `${String(v).slice(0, 46)}…` : v}”`);

  return (
    <div className="dlive">
      <section className="dlive-form" aria-label="Edit the statement data">
        <div className="dlive-intro">
          <Sparkles size={18} aria-hidden />
          <p>
            Change the data and Sepire re-renders the real statement, just as it would after a new payload arrives. Every
            screen that uses a value updates, in both languages.
          </p>
        </div>

        <fieldset>
          <legend>Participant</legend>
          <div className="dlive-row">
            <label>
              First name
              <input type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} maxLength={40} />
            </label>
            <label>
              Last name
              <input type="text" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} maxLength={40} />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Plan-sponsor message</legend>
          <label>
            <span className="sr-only">Message</span>
            <textarea rows={4} value={form.message} onChange={(e) => update('message', e.target.value)} maxLength={400} />
          </label>
          <button type="button" className="link-btn" onClick={() => update('message', 'Open enrollment runs through November 15. Review your contribution rate and investment elections before the window closes.')}>
            Use an example message
          </button>
        </fieldset>

        <fieldset>
          <legend>Elective deferrals, year to date</legend>
          <div className="dlive-range">
            <input
              type="range"
              min={0}
              max={limit}
              step={25000}
              value={form.deferrals}
              onChange={(e) => update('deferrals', Number(e.target.value))}
              aria-valuetext={`${formatMinor(form.deferrals)} of ${formatMinor(limit)}`}
            />
            <output className="num">
              {formatMinor(form.deferrals)} <span className="muted">of {formatMinor(limit)}</span>
            </output>
          </div>
        </fieldset>

        <fieldset>
          <legend>Primary beneficiary</legend>
          <label>
            <span className="sr-only">Name</span>
            <input type="text" value={form.beneficiary} onChange={(e) => update('beneficiary', e.target.value)} maxLength={60} />
          </label>
        </fieldset>

        <div className="dlive-changes" aria-live="polite">
          <h3>Payload changes</h3>
          {changes.length ? (
            <ul>
              {changes.map((k) => (
                <li key={k}>
                  <code>{PATHS[k]}</code>
                  <span className="dlive-diff">
                    <del>{show(k, initial[k])}</del> → <ins>{show(k, form[k])}</ins>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No changes yet. Edit a field to see the payload change and the statement re-render.</p>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset} disabled={!changes.length}>
            <RotateCcw size={15} aria-hidden /> Reset
          </button>
        </div>
      </section>

      <section className="dlive-preview" aria-label="Re-rendered statement">
        <div className="dlive-toolbar">
          <span className="muted">
            Showing: <strong>{FOCUS[last].label}</strong>
          </span>
          <div className="seg" role="group" aria-label="Device">
            <button type="button" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>
              <Monitor size={15} aria-hidden /> Desktop
            </button>
            <button type="button" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>
              <Smartphone size={15} aria-hidden /> Mobile
            </button>
          </div>
        </div>
        <LiveStatement payload={published} full={full} version={version} focus={FOCUS[last]} device={device} />
      </section>
    </div>
  );
}
