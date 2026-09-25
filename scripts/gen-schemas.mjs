#!/usr/bin/env node
// Generates the integration contract for the statement payload from source/statement.json:
//
//   public/data/sample-payload.json    what a client sends for one recipient
//   public/data/statement.schema.json  JSON Schema (2020-12) for the payload
//
// Run automatically by `npm run dev` / `npm run build` (via prepare-statement) or on its own.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = (f) => join(root, 'public', 'data', f);

/** Sections Sepire derives on its side (rendering and source-audit metadata). Clients don't send them. */
export const SEPIRE_SIDE_KEYS = ['qaIssues', 'placeholders', 'traceability'];

const CELL_KINDS = ['money', 'pct', 'num', 'date', 'blank', 'dash'];

// Friendlier names for shapes that repeat or read badly when derived from their path.
const NAMES = {
  '': 'Statement',
  'metadata.contacts.financialProfessionals[]': 'FinancialProfessional',
  'contributionSourceActivity.rows[]': 'ActivityRow',
  'investmentActivity.rows[]': 'ActivityRow',
  'contributionSourceActivity.total': 'ActivityTotal',
  'investmentActivity.total': 'ActivityTotal',
  'contributionSourceActivity.columns': 'ActivityColumns',
  'investmentActivity.columns': 'ActivityColumns',
  'holdings.rows[]': 'Holding',
  'allocation.groups[]': 'AllocationGroup',
  'allocation.groups[].rows[]': 'AllocationRow',
  'lifetimeIncome.definitions[]': 'AnnuityDefinition',
  'lifetimeAssumptions.sections[]': 'AssumptionSection',
  'loans.rows[]': 'Loan',
  'beneficiaries.primary[]': 'Beneficiary',
  'beneficiaries.contingent[]': 'Beneficiary',
  'expenses.groups[]': 'ExpenseGroup',
  'expenses.groups[].items[]': 'ExpenseItem',
  'contributionLimits.gauges[]': 'LimitGauge',
  'vesting.rows[]': 'VestingRow',
  'contributionActivity.rows[]': 'ContributionActivityRow',
  'designReference.options[]': 'DesignOption',
  'designReference.options[].rows[]': 'DesignOptionRow',
  'investmentPerformance.rows[]': 'PerformanceRow',
  'distributionsEligibleForRepayment.rows[]': 'RepaymentRow',
  'rothRecapture.rows[]': 'RothRecaptureRow',
  'profile.fields[]': 'ProfileField',
  'investmentDirectionRules.rules[]': 'DirectionRule',
  'investmentDirectionRules.rules[].blocks[]': 'TextBlock',
  'disclosures.items[]': 'Disclosure',
  'balanceHistory.bars[]': 'BalanceHistoryBar',
  contributionSourceActivity: 'ActivitySummary',
  investmentActivity: 'ActivitySummary',
  'retirementReadiness.chart.series[]': 'ChartSeries',
  'lifetimeIncome.singleLife': 'AnnuityEstimate',
  'lifetimeIncome.jointSurvivor': 'AnnuityEstimate',
  'beneficiaries.primaryTotal': 'BeneficiaryTotal',
  'beneficiaries.contingentTotal': 'BeneficiaryTotal',
  'metadata.contacts.manageAccount': 'ContactLink',
  'metadata.contacts.email': 'ContactLink',
  'metadata.contacts.phone': 'ContactLink',
  'holdings.investmentTotal': 'LabeledAmount',
  'holdings.accountTotal': 'LabeledAmount',
};
const KEY_NAMES = { source: 'SourceRef' };
// Fields that are null in this sample but carry a printed value when supplied.
const FORCE_CELL = new Set(['balanceHistory.bars[].value']);

const DESCRIPTIONS = {
  Statement: 'Everything needed to render one recipient’s statement: data, plan content and labels, in English.',
  Cell: 'A value exactly as printed (src) plus its machine-readable form. Sepire never reformats or rounds src.',
  SourceRef: 'Where this section appears in the printed statement of record.',
};
const FIELD_DOCS = {
  'Cell.kind': 'money | pct | num | date | blank | dash',
  'Cell.src': 'The exact string as printed, e.g. "($41.09)". Blank cells stay "" and are never shown as $0.',
  'Cell.minor': 'Money in minor units (cents), for kind = money.',
  'Cell.value': 'Numeric value, for kind = pct or num.',
  'Cell.iso': 'ISO-8601 date (YYYY-MM-DD), for kind = date.',
};

const isCell = (v) => v && typeof v === 'object' && !Array.isArray(v) && CELL_KINDS.includes(v.kind) && typeof v.src === 'string';
const pascal = (s) => s.replace(/(^|[^A-Za-z0-9]+)([A-Za-z0-9])/g, (_, __, c) => c.toUpperCase());
const singular = (s) => (s.endsWith('ies') ? s.slice(0, -3) + 'y' : s.endsWith('s') ? s.slice(0, -1) : s);

/** Infer one type node from all sample values seen at a path. */
function infer(values, path) {
  const present = values.filter((v) => v !== undefined);
  const nonNull = present.filter((v) => v !== null);
  const nullable = nonNull.length < present.length;
  if (FORCE_CELL.has(path)) return { t: 'cell', nullable: true };
  if (!nonNull.length) return { t: 'json', nullable: true };
  if (nonNull.every(isCell)) return { t: 'cell', nullable };
  if (nonNull.every(Array.isArray)) return { t: 'array', of: infer(nonNull.flat(), `${path}[]`), nullable };
  if (nonNull.every((v) => v && typeof v === 'object' && !Array.isArray(v))) {
    const keys = [...new Set(nonNull.flatMap(Object.keys))];
    const fields = keys.map((k) => {
      const vals = nonNull.map((o) => o[k]);
      const child = infer(vals, path ? `${path}.${k}` : k);
      const required = vals.every((v) => v !== undefined && v !== null) && !child.nullable;
      return { name: k, type: child, required };
    });
    return { t: 'object', path, key: path.replace(/\[\]$/, '').split('.').pop(), fields, nullable };
  }
  if (nonNull.every((v) => typeof v === 'string')) return { t: 'string', nullable };
  if (nonNull.every((v) => typeof v === 'boolean')) return { t: 'boolean', nullable };
  if (nonNull.every((v) => typeof v === 'number')) return { t: nonNull.every(Number.isInteger) ? 'int' : 'float', nullable };
  return { t: 'json', nullable };
}

const signature = (node) => {
  if (node.t === 'object') return `{${node.fields.map((f) => `${f.name}${f.required ? '!' : ''}:${signature(f.type)}`).join(',')}}`;
  if (node.t === 'array') return `[${signature(node.of)}]`;
  return node.t;
};

/** Name every object type, reusing one name for identical shapes. */
function nameTypes(rootNode) {
  const bySig = new Map();
  const used = new Map();
  const visit = (node) => {
    if (node.t === 'array') return visit(node.of);
    if (node.t !== 'object') return;
    node.fields.forEach((f) => visit(f.type));
    const sig = signature(node);
    if (bySig.has(sig)) {
      node.name = bySig.get(sig);
      return;
    }
    let name = NAMES[node.path] ?? KEY_NAMES[node.key];
    if (!name) {
      const parts = node.path.split('.').map((p) => (p.endsWith('[]') ? singular(p.slice(0, -2)) : p));
      name = pascal(parts.join(' '));
    }
    let unique = name;
    for (let i = 2; used.has(unique) && used.get(unique) !== sig; i++) unique = `${name}${i}`;
    used.set(unique, sig);
    bySig.set(sig, unique);
    node.name = unique;
  };
  visit(rootNode);
  return [...new Set([...bySig.values()])];
}

function collectObjects(node, acc = new Map()) {
  if (node.t === 'array') return collectObjects(node.of, acc);
  if (node.t !== 'object') return acc;
  if (!acc.has(node.name)) acc.set(node.name, node);
  node.fields.forEach((f) => collectObjects(f.type, acc));
  return acc;
}

// ---------- JSON Schema ----------
function jsonType(node) {
  let s;
  switch (node.t) {
    case 'cell':
      s = { $ref: '#/$defs/Cell' };
      break;
    case 'object':
      s = { $ref: `#/$defs/${node.name}` };
      break;
    case 'array':
      s = { type: 'array', items: jsonType(node.of) };
      break;
    case 'string':
      s = { type: 'string' };
      break;
    case 'boolean':
      s = { type: 'boolean' };
      break;
    case 'int':
      s = { type: 'integer' };
      break;
    case 'float':
      s = { type: 'number' };
      break;
    default:
      s = {};
  }
  if (node.nullable && s.$ref) return { anyOf: [s, { type: 'null' }] };
  if (node.nullable && s.type) return { ...s, type: [s.type, 'null'] };
  return s;
}

function toJSONSchema(rootNode, objects) {
  const defs = {
    Cell: {
      description: DESCRIPTIONS.Cell,
      type: 'object',
      required: ['kind', 'src'],
      additionalProperties: false,
      properties: {
        kind: { enum: CELL_KINDS, description: FIELD_DOCS['Cell.kind'] },
        src: { type: 'string', description: FIELD_DOCS['Cell.src'] },
        minor: { type: 'integer', description: FIELD_DOCS['Cell.minor'] },
        value: { type: 'number', description: FIELD_DOCS['Cell.value'] },
        iso: { type: 'string', format: 'date', description: FIELD_DOCS['Cell.iso'] },
      },
      allOf: [
        { if: { properties: { kind: { const: 'money' } } }, then: { required: ['minor'] } },
        { if: { properties: { kind: { enum: ['pct', 'num'] } } }, then: { required: ['value'] } },
        { if: { properties: { kind: { const: 'date' } } }, then: { required: ['iso'] } },
      ],
    },
  };
  for (const [name, node] of objects) {
    if (name === 'Statement') continue;
    defs[name] = objectSchema(node);
  }
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'Sepire statement payload',
    description: DESCRIPTIONS.Statement,
    ...objectSchema(rootNode),
    $defs: defs,
  };
}

function objectSchema(node) {
  return {
    ...(DESCRIPTIONS[node.name] ? { description: DESCRIPTIONS[node.name] } : {}),
    type: 'object',
    required: node.fields.filter((f) => f.required).map((f) => f.name),
    additionalProperties: false,
    properties: Object.fromEntries(node.fields.map((f) => [f.name, jsonType(f.type)])),
  };
}

export async function generate() {
  const statement = JSON.parse(await readFile(join(root, 'source', 'statement.json'), 'utf8'));
  const payload = Object.fromEntries(Object.entries(statement).filter(([k]) => !SEPIRE_SIDE_KEYS.includes(k)));
  const model = infer([payload], '');
  nameTypes(model);
  const objects = collectObjects(model);
  const jsonSchema = toJSONSchema(model, objects);
  await mkdir(join(root, 'public', 'data'), { recursive: true });
  await writeFile(out('sample-payload.json'), JSON.stringify(payload, null, 2) + '\n');
  await writeFile(out('statement.schema.json'), JSON.stringify(jsonSchema, null, 2) + '\n');
  return { types: objects.size, sections: Object.keys(payload).length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = await generate();
  console.log(`schemas: ${r.sections} sections, ${r.types} object types → public/data/{statement.schema.json,sample-payload.json}`);
}
