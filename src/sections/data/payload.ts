// The statement payload: loading, paths, cells and sizes.

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };
export type Path = Array<string | number>;

/** Derived on Sepire's side (rendering and source-audit metadata); not part of what a client sends. */
export const SEPIRE_SIDE_KEYS = ['qaIssues', 'placeholders', 'traceability'];

export type CellKind = 'money' | 'pct' | 'num' | 'date' | 'blank' | 'dash';
export type Cell = { kind: CellKind; src: string; minor?: number; value?: number; iso?: string };

const KINDS: CellKind[] = ['money', 'pct', 'num', 'date', 'blank', 'dash'];

export function isCell(v: unknown): v is Cell {
  return !!v && typeof v === 'object' && !Array.isArray(v) && KINDS.includes((v as Cell).kind) && typeof (v as Cell).src === 'string';
}

export function isObject(v: unknown): v is JsonObject {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export type Loaded = { full: JsonObject; payload: JsonObject };

let loading: Promise<Loaded> | null = null;

/** Loads the recipient's statement data once. */
export function loadStatement(): Promise<Loaded> {
  loading ??= fetch('data/statement.json')
    .then((r) => {
      if (!r.ok) throw new Error(`Could not load statement data (${r.status})`);
      return r.json() as Promise<JsonObject>;
    })
    .then((full) => ({ full, payload: toPayload(full) }));
  return loading;
}

export function toPayload(full: JsonObject): JsonObject {
  return Object.fromEntries(Object.entries(full).filter(([k]) => !SEPIRE_SIDE_KEYS.includes(k)));
}

/** What the statement renders: the client payload plus Sepire's own metadata. */
export function forRender(payload: JsonObject, full: JsonObject): JsonObject {
  const extra = Object.fromEntries(SEPIRE_SIDE_KEYS.filter((k) => k in full).map((k) => [k, full[k]]));
  return { ...payload, ...extra };
}

export function getAt(root: Json, path: Path): Json | undefined {
  let cur: Json | undefined = root;
  for (const key of path) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, Json>)[key as string];
  }
  return cur;
}

/** Immutable update of the value at `path`. */
export function setAt<T extends Json>(root: T, path: Path, value: Json): T {
  if (!path.length) return value as T;
  const [head, ...rest] = path;
  if (Array.isArray(root)) {
    const copy = root.slice();
    copy[head as number] = setAt(copy[head as number], rest, value);
    return copy as T;
  }
  const obj = (root ?? {}) as JsonObject;
  return { ...obj, [head]: setAt(obj[head as string], rest, value) } as T;
}

export const pointer = (path: Path) => (path.length ? `/${path.join('/')}` : '/');

export function pathFromPointer(p: string): Path {
  return p
    .split('/')
    .filter(Boolean)
    .map((s) => (/^\d+$/.test(s) ? Number(s) : s));
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const formatMinor = (minor: number) => money.format(minor / 100);

/** Cents from a printed money string such as "($41.09)" or "-$14.50". */
export function centsFromSrc(src: string): number | null {
  const t = src.trim();
  if (!/\d/.test(t)) return null;
  const negative = /^[(\-−]/.test(t);
  const digits = t.replace(/[^0-9.]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(digits)) return Number.NaN;
  const [whole, frac = ''] = digits.split('.');
  const cents = parseInt(whole, 10) * 100 + parseInt((frac + '00').slice(0, 2), 10);
  return negative ? -cents : cents;
}

export function numberFromSrc(src: string): number | null {
  const t = src.trim();
  if (!/\d/.test(t)) return null;
  const n = parseFloat(t.replace(/[^0-9.]/g, ''));
  return /^[(\-−]/.test(t) ? -n : n;
}

const encoder = new TextEncoder();
export const byteSize = (value: Json | undefined) => encoder.encode(JSON.stringify(value ?? null)).length;

/** Real gzip size, computed in the browser. */
export async function gzipSize(text: string): Promise<number | null> {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return (await new Response(stream).arrayBuffer()).byteLength;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
}

export function countCells(v: Json | undefined): number {
  if (isCell(v)) return 1;
  if (Array.isArray(v)) return v.reduce<number>((a, x) => a + countCells(x), 0);
  if (isObject(v)) return Object.values(v).reduce<number>((a, x) => a + countCells(x), 0);
  return 0;
}

/** Friendly names for the payload's top-level sections, with the PDF page they print on. */
export const SECTION_INFO: Record<string, { title: string; page?: number }> = {
  metadata: { title: 'Plan, participant & contacts', page: 1 },
  balances: { title: 'Account at a glance', page: 1 },
  allocationSummary: { title: 'Allocation summary', page: 1 },
  contributionSourceActivity: { title: 'Activity by source', page: 2 },
  investmentActivity: { title: 'Activity by investment', page: 2 },
  holdings: { title: 'Holdings & share details', page: 3 },
  allocation: { title: 'Asset allocation vs election', page: 3 },
  lifetimeIncome: { title: 'Lifetime income estimate', page: 4 },
  lifetimeAssumptions: { title: 'Lifetime income assumptions', page: 5 },
  retirementReadiness: { title: 'Projected retirement income', page: 9 },
  loans: { title: 'Loans', page: 6 },
  beneficiaries: { title: 'Beneficiaries', page: 6 },
  expenses: { title: 'Plan expenses', page: 6 },
  contributionLimits: { title: 'Contribution limits', page: 10 },
  vesting: { title: 'Vesting', page: 10 },
  contributionActivity: { title: 'Contribution activity', page: 11 },
  designReference: { title: 'Contribution views', page: 13 },
  investmentPerformance: { title: 'Investment performance', page: 11 },
  distributionsEligibleForRepayment: { title: 'Repayment windows', page: 12 },
  rothRecapture: { title: 'Roth recapture', page: 12 },
  profile: { title: 'Profile', page: 12 },
  investmentDirectionRules: { title: 'Right to direct investments', page: 7 },
  disclosures: { title: 'Notices & disclosures', page: 8 },
  balanceHistory: { title: 'Balance history', page: 9 },
  appendix: { title: 'Appendix headings', page: 9 },
};

export const sectionTitle = (key: string) => SECTION_INFO[key]?.title ?? key;
