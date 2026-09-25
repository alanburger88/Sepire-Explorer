// The Sepire ingestion API, simulated in the browser. REST and GraphQL share one validator:
// the generated GraphQL input types check the shape, then content rules check the values.
import {
  buildSchema,
  graphql,
  GraphQLError,
  type ExecutionResult,
  type GraphQLInputType,
  type GraphQLScalarType,
  type GraphQLSchema,
  validateInputValue,
} from 'graphql';
import { byteSize, centsFromSrc, formatMinor, getAt, isCell, isObject, numberFromSrc, type Json, type JsonObject } from './payload';

import { STATEMENTS_BASE } from './config';

export type Issue = { path: string; message: string };
export type Validation = { valid: boolean; errors: Issue[]; warnings: Issue[] };

type Loaded = { schema: GraphQLSchema; sdl: string };
let loading: Promise<Loaded> | null = null;

export function loadSchema(): Promise<Loaded> {
  loading ??= fetch('data/schema.graphql')
    .then((r) => r.text())
    .then((sdl) => {
      const schema = buildSchema(sdl);
      const cents = schema.getType('Cents') as GraphQLScalarType;
      const coerceCents = (value: unknown) => {
        if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
        throw new GraphQLError(`Cents must be a whole number of cents, found ${JSON.stringify(value)}.`);
      };
      cents.coerceInputValue = coerceCents;
      cents.parseValue = coerceCents;
      return { schema, sdl };
    });
  return loading;
}

const jsonPath = (path: ReadonlyArray<string | number>) => `/${path.join('/')}`;

/** Shorter, friendlier versions of graphql-js input errors. */
export function tidy(message: string): string {
  let m = message.replace(/^Variable "\$\w+" has invalid value at \S+: /, '');
  m = m.replace(/^Expected value of type "\w+" to include required field "(\w+)".*$/s, 'Required field "$1" is missing.');
  m = m.replace(/^Expected value of type "\w+" not to include unknown field "(\w+)".*$/s, 'Unknown field "$1".');
  m = m.replace(/^(\w+) cannot represent a non[ -](\w+) value: (.*)$/s, (_, t: string, __, v: string) => `Expected ${t === 'String' ? 'text' : t}, found ${v.length > 40 ? `${v.slice(0, 38)}…` : v}.`);
  m = m.replace(/, found: .{60,}$/s, '.');
  return m;
}

/** Checks the payload's shape against the schema, then its values against content rules. */
export async function validate(payload: unknown): Promise<Validation> {
  const { schema } = await loadSchema();
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const type = schema.getType('StatementInput') as GraphQLInputType;
  validateInputValue(payload, type, (error, path) => {
    errors.push({ path: jsonPath(path), message: tidy(error.message) });
  });
  if (!errors.length && isObject(payload)) contentRules(payload, errors, warnings);
  return { valid: errors.length === 0, errors: errors.slice(0, 50), warnings };
}

function contentRules(p: JsonObject, errors: Issue[], warnings: Issue[]) {
  // Every value keeps its printed form and a machine form; the two must agree.
  const walk = (v: Json, path: Array<string | number>) => {
    if (isCell(v)) {
      const at = jsonPath(path);
      if (v.kind === 'money') {
        const c = centsFromSrc(v.src);
        if (Number.isNaN(c)) errors.push({ path: `${at}/src`, message: `"${v.src}" is not a money amount.` });
        else if (c !== null && c !== v.minor) errors.push({ path: `${at}/minor`, message: `${v.minor} cents doesn’t match the printed "${v.src}" (${formatMinor(c)}).` });
      } else if (v.kind === 'pct' || v.kind === 'num') {
        const n = numberFromSrc(v.src);
        if (n !== null && typeof v.value === 'number' && Math.abs(n - v.value) > 0.0005) errors.push({ path: `${at}/value`, message: `${v.value} doesn’t match the printed "${v.src}".` });
        if (typeof v.value !== 'number') errors.push({ path: `${at}/value`, message: 'A value is required for pct and num cells.' });
      } else if (v.kind === 'date') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v.iso ?? '')) errors.push({ path: `${at}/iso`, message: 'Dates need an ISO-8601 value (YYYY-MM-DD).' });
      } else if (v.kind === 'blank' && v.src !== '') {
        errors.push({ path: `${at}/src`, message: 'A blank cell must have an empty src.' });
      }
      return;
    }
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...path, i]));
    else if (isObject(v)) Object.entries(v).forEach(([k, x]) => walk(x, [...path, k]));
  };
  walk(p, []);

  const first = getAt(p, ['metadata', 'participant', 'firstName']);
  if (typeof first !== 'string' || !first.trim()) errors.push({ path: '/metadata/participant/firstName', message: 'The participant’s first name is required for the greeting.' });

  const start = getAt(p, ['metadata', 'periodStart', 'iso']);
  const end = getAt(p, ['metadata', 'periodEnd', 'iso']);
  if (typeof start === 'string' && typeof end === 'string' && start > end) errors.push({ path: '/metadata/periodEnd', message: 'The statement period ends before it starts.' });

  // Account at a glance must reconcile: beginning balance + activity = ending balance.
  const b = p.balances;
  if (isObject(b)) {
    const keys = ['beginning', 'contributions', 'withdrawals', 'feesAndCredits', 'otherActivity', 'earnings'];
    const cells = keys.map((k) => b[k]);
    const ending = b.ending;
    if (cells.every((c) => isCell(c) && typeof c.minor === 'number') && isCell(ending) && typeof ending.minor === 'number') {
      const sum = cells.reduce<number>((a, c) => a + ((c as { minor: number }).minor ?? 0), 0);
      if (sum !== ending.minor) {
        warnings.push({ path: '/balances/ending', message: `Beginning balance plus this period’s activity is ${formatMinor(sum)}, but the ending balance is ${formatMinor(ending.minor)}.` });
      }
    }
  }

  const pctSum = (arr: Json | undefined, key: string) =>
    Array.isArray(arr) ? arr.reduce<number>((a, r) => a + (isObject(r) && isCell(r[key]) ? (r[key] as { value?: number }).value ?? 0 : 0), 0) : null;
  const alloc = pctSum(getAt(p, ['allocationSummary', 'items']), 'pct');
  if (alloc !== null && Math.abs(alloc - 100) > 0.05) warnings.push({ path: '/allocationSummary/items', message: `Allocation categories add up to ${alloc.toFixed(2)}%, not 100%.` });
  const hold = pctSum(getAt(p, ['holdings', 'rows']), 'pctOfTotal');
  if (hold !== null && Math.abs(hold - 100) > 0.05) warnings.push({ path: '/holdings/rows', message: `Holdings add up to ${hold.toFixed(2)}% of the total, not 100%.` });
  const primary = pctSum(getAt(p, ['beneficiaries', 'primary']), 'pct');
  if (primary !== null && Math.abs(primary - 100) > 0.05) warnings.push({ path: '/beneficiaries/primary', message: `Primary beneficiaries add up to ${primary}%, not 100%.` });
}

function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).padStart(7, '0');
}

function submission(payload: JsonObject, v: Validation, bytes: number) {
  const participant = getAt(payload, ['metadata', 'participant']);
  const fullName = isObject(participant) && typeof participant.fullName === 'string' ? participant.fullName : '';
  const firstName = isObject(participant) && typeof participant.firstName === 'string' ? participant.firstName : null;
  const planNumber = getAt(payload, ['metadata', 'planNumber']);
  const endIso = getAt(payload, ['metadata', 'periodEnd', 'iso']);
  const id = `stm_${planNumber ?? 'plan'}_${String(endIso ?? '').replace(/-/g, '')}_${hash(JSON.stringify(payload))}`;
  return {
    statementId: id,
    status: 'PUBLISHED' as const,
    recipient: { fullName, firstName },
    languages: ['en-US', 'es-US'],
    validation: v,
    links: { statement: `${STATEMENTS_BASE}/s/${id}`, print: `${STATEMENTS_BASE}/s/${id}/print` },
    receivedBytes: bytes,
  };
}

export type RestResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  ms: number;
  /** The payload that was published, when the request succeeded. */
  published?: JsonObject;
};

const latency = () => new Promise((r) => setTimeout(r, 140 + Math.random() * 160));

/** POST /v1/statements, simulated. */
export async function postStatement(body: string, opts: { validateOnly?: boolean } = {}): Promise<RestResponse> {
  const t0 = performance.now();
  await latency();
  const requestId = `req_${hash(body + Date.now())}`;
  const base = { 'content-type': 'application/json', 'x-request-id': requestId };
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch (e) {
    return { status: 400, statusText: 'Bad Request', headers: base, body: { error: 'invalid_json', message: (e as Error).message }, ms: performance.now() - t0 };
  }
  const v = await validate(payload);
  const ms = () => Math.round(performance.now() - t0);
  if (opts.validateOnly) return { status: 200, statusText: 'OK', headers: base, body: v, ms: ms() };
  if (!v.valid) return { status: 422, statusText: 'Unprocessable Entity', headers: base, body: v, ms: ms() };
  const result = submission(payload as JsonObject, v, new TextEncoder().encode(body).length);
  return {
    status: 201,
    statusText: 'Created',
    headers: { ...base, location: `/v1/statements/${result.statementId}` },
    body: result,
    ms: ms(),
    published: payload as JsonObject,
  };
}

/** Executes a GraphQL operation against the ingestion schema, in the browser. */
export async function runGraphQL(source: string, variables: Record<string, unknown> | undefined, operationName?: string): Promise<{ result: ExecutionResult; ms: number; published?: JsonObject }> {
  const t0 = performance.now();
  const { schema } = await loadSchema();
  await latency();
  let published: JsonObject | undefined;
  const rootValue = {
    schemaVersion: () => '2024-10-01',
    validateStatement: ({ input }: { input: JsonObject }) => validate(input),
    submitStatement: async ({ input }: { input: JsonObject }) => {
      const raw = (variables?.input ?? input) as JsonObject;
      const v = await validate(raw);
      if (!v.valid) return { status: 'REJECTED', languages: [], validation: v, receivedBytes: byteSize(raw) };
      published = raw;
      return submission(raw, v, byteSize(raw));
    },
    submitStatements: async ({ inputs }: { inputs: JsonObject[] }) => {
      const results = await Promise.all(
        inputs.map(async (input) => {
          const v = await validate(input);
          return v.valid ? submission(input, v, byteSize(input)) : { status: 'REJECTED', languages: [], validation: v, receivedBytes: byteSize(input) };
        }),
      );
      const accepted = results.filter((r) => r.status === 'PUBLISHED').length;
      if (accepted && inputs.length) published = inputs[inputs.length - 1];
      return { accepted, rejected: results.length - accepted, results };
    },
  };
  const result = await graphql({ schema, source, variableValues: variables, rootValue, operationName });
  return { result, ms: Math.round(performance.now() - t0), published };
}
