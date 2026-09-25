#!/usr/bin/env node
// Generates the integration contract for the statement payload from source/statement.json:
//
//   public/data/sample-payload.json    what a client sends for one recipient
//   public/data/schema.graphql         GraphQL SDL (input types + submit/validate operations)
//   public/data/statement.schema.json  JSON Schema (2020-12) for the REST body
//   public/data/openapi.yaml           OpenAPI 3.1 description of the REST endpoints
//
// One inferred type model feeds all three, so REST and GraphQL validate exactly the same shape.
// Run automatically by `npm run dev` / `npm run build` (via prepare-statement) or on its own.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = (f) => join(root, 'public', 'data', f);

/** Sections Sepire derives on its side (rendering and source-audit metadata). Clients don't send them. */
export const SEPIRE_SIDE_KEYS = ['qaIssues', 'placeholders', 'traceability'];

const API_BASE = 'https://api.sepire.com';
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

// ---------- GraphQL SDL ----------
function gqlType(node, required) {
  let t;
  switch (node.t) {
    case 'cell':
      t = 'CellInput';
      break;
    case 'object':
      t = `${node.name}Input`;
      break;
    case 'array':
      t = `[${gqlType(node.of, !node.of.nullable)}]`;
      break;
    case 'string':
      t = 'String';
      break;
    case 'boolean':
      t = 'Boolean';
      break;
    case 'int':
      t = 'Int';
      break;
    case 'float':
      t = 'Float';
      break;
    default:
      t = 'JSON';
  }
  return required ? `${t}!` : t;
}

const doc = (text, indent = '') => (text ? `${indent}"""${text.replace(/"""/g, '\\"""')}"""\n` : '');

function toSDL(rootNode, objects) {
  let s = `# Sepire statement ingestion API — GraphQL schema (generated from the sample statement).
# Send one recipient's statement with submitStatement, or validate it first with validateStatement.

"""Arbitrary JSON value."""
scalar JSON

"""Money in minor units (cents). A 53-bit safe integer, so balances above $21M are fine."""
scalar Cents

${doc('What kind of value a cell holds.')}enum CellKind {
  money
  pct
  num
  date
  blank
  dash
}

${doc(DESCRIPTIONS.Cell)}input CellInput {
${['kind: CellKind!', 'src: String!', 'minor: Cents', 'value: Float', 'iso: String']
  .map((f) => `${doc(FIELD_DOCS[`Cell.${f.split(':')[0]}`], '  ')}  ${f}`)
  .join('\n')}
}
`;
  for (const [name, node] of objects) {
    s += `\n${doc(DESCRIPTIONS[name] ?? (node.path ? `Payload section: ${node.path}` : ''))}input ${name}Input {\n`;
    s += node.fields.map((f) => `  ${f.name}: ${gqlType(f.type, f.required)}`).join('\n');
    s += '\n}\n';
  }
  s += `
${doc('A problem found in a submitted statement, located by JSON path.')}type ValidationIssue {
  path: String!
  message: String!
}

type ValidationResult {
  valid: Boolean!
  errors: [ValidationIssue!]!
  warnings: [ValidationIssue!]!
}

type Recipient {
  fullName: String!
  firstName: String
}

type StatementLinks {
  """The recipient's interactive statement."""
  statement: String!
  """The print edition (print or save as PDF)."""
  print: String!
}

enum SubmissionStatus {
  PUBLISHED
  REJECTED
}

type SubmissionResult {
  statementId: String
  status: SubmissionStatus!
  recipient: Recipient
  """Languages the statement is available in."""
  languages: [String!]!
  validation: ValidationResult!
  links: StatementLinks
  receivedBytes: Int!
}

type BatchResult {
  accepted: Int!
  rejected: Int!
  results: [SubmissionResult!]!
}

type Query {
  """Dry run: validate a statement without publishing it."""
  validateStatement(input: StatementInput!): ValidationResult!
  """Version of this schema."""
  schemaVersion: String!
}

type Mutation {
  """Validate and publish one recipient's statement."""
  submitStatement(input: StatementInput!): SubmissionResult!
  """Validate and publish up to 1,000 statements in one request."""
  submitStatements(inputs: [StatementInput!]!): BatchResult!
}
`;
  return s;
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
    $id: `${API_BASE}/schemas/statement.schema.json`,
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

// ---------- OpenAPI 3.1 (YAML) ----------
function toYAML(value, indent = 0) {
  const pad = '  '.repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    return value
      .map((v) => {
        if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length) {
          const body = toYAML(v, indent + 1).trimStart();
          return `${pad}- ${body}`;
        }
        return `${pad}- ${toYAML(v, indent + 1)}`;
      })
      .join('\n');
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return '{}';
    return entries
      .map(([k, v]) => {
        const key = /^[A-Za-z_$][\w$-]*$/.test(k) ? k : JSON.stringify(k);
        if (v && typeof v === 'object' && (Array.isArray(v) ? v.length : Object.keys(v).length)) {
          return `${pad}${key}:\n${toYAML(v, indent + 1)}`;
        }
        return `${pad}${key}: ${toYAML(v, indent + 1)}`;
      })
      .join('\n');
  }
  if (typeof value === 'string') return JSON.stringify(value);
  return String(value);
}

function toOpenAPI(jsonSchema) {
  const rewrite = (v) =>
    JSON.parse(JSON.stringify(v).replaceAll('"#/$defs/', '"#/components/schemas/'));
  const { $defs, $schema, $id, ...statement } = jsonSchema;
  void $schema;
  void $id;
  const issue = { type: 'object', required: ['path', 'message'], properties: { path: { type: 'string', example: '/balances/ending/minor' }, message: { type: 'string' } } };
  return {
    openapi: '3.1.0',
    info: {
      title: 'Sepire Statements API',
      version: '1.0.0',
      description: 'Send each recipient’s statement data to Sepire as one JSON payload. Sepire validates it, publishes the interactive statement (English and Spanish, web and mobile) and makes the print edition available on demand. Endpoint names are illustrative.',
    },
    servers: [{ url: `${API_BASE}/v1` }],
    security: [{ oauth2: ['statements:write'] }],
    paths: {
      '/statements': {
        post: {
          operationId: 'submitStatement',
          summary: 'Validate and publish one recipient’s statement',
          parameters: [{ name: 'Idempotency-Key', in: 'header', required: false, description: 'Retry safely: the same key never publishes twice.', schema: { type: 'string', format: 'uuid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Statement' } } } },
          responses: {
            201: { description: 'Published', content: { 'application/json': { schema: { $ref: '#/components/schemas/SubmissionResult' } } } },
            400: { description: 'Body is not valid JSON' },
            401: { description: 'Missing or expired access token' },
            422: { description: 'Validation failed; nothing was published', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationResult' } } } },
          },
        },
      },
      '/statements/validate': {
        post: {
          operationId: 'validateStatement',
          summary: 'Dry run: validate without publishing',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Statement' } } } },
          responses: { 200: { description: 'Validation result', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationResult' } } } } },
        },
      },
      '/statement-batches': {
        post: {
          operationId: 'submitStatements',
          summary: 'Validate and publish up to 1,000 statements',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'array', maxItems: 1000, items: { $ref: '#/components/schemas/Statement' } } } } },
          responses: { 202: { description: 'Accepted for processing' } },
        },
      },
    },
    components: {
      securitySchemes: {
        oauth2: { type: 'oauth2', flows: { clientCredentials: { tokenUrl: `${API_BASE}/oauth2/token`, scopes: { 'statements:write': 'Submit statements' } } } },
      },
      schemas: {
        Statement: rewrite(statement),
        ...rewrite($defs),
        ValidationIssue: issue,
        ValidationResult: {
          type: 'object',
          required: ['valid', 'errors', 'warnings'],
          properties: { valid: { type: 'boolean' }, errors: { type: 'array', items: { $ref: '#/components/schemas/ValidationIssue' } }, warnings: { type: 'array', items: { $ref: '#/components/schemas/ValidationIssue' } } },
        },
        SubmissionResult: {
          type: 'object',
          required: ['status', 'validation'],
          properties: {
            statementId: { type: 'string' },
            status: { enum: ['PUBLISHED', 'REJECTED'] },
            languages: { type: 'array', items: { type: 'string' }, example: ['en-US', 'es-US'] },
            validation: { $ref: '#/components/schemas/ValidationResult' },
            links: { type: 'object', properties: { statement: { type: 'string', format: 'uri' }, print: { type: 'string', format: 'uri' } } },
            receivedBytes: { type: 'integer' },
          },
        },
      },
    },
  };
}

export async function generate() {
  const statement = JSON.parse(await readFile(join(root, 'source', 'statement.json'), 'utf8'));
  const payload = Object.fromEntries(Object.entries(statement).filter(([k]) => !SEPIRE_SIDE_KEYS.includes(k)));
  const model = infer([payload], '');
  nameTypes(model);
  const objects = collectObjects(model);
  const sdl = toSDL(model, objects);
  const jsonSchema = toJSONSchema(model, objects);
  await mkdir(join(root, 'public', 'data'), { recursive: true });
  await writeFile(out('sample-payload.json'), JSON.stringify(payload, null, 2) + '\n');
  await writeFile(out('schema.graphql'), sdl);
  await writeFile(out('statement.schema.json'), JSON.stringify(jsonSchema, null, 2) + '\n');
  await writeFile(out('openapi.yaml'), `# Sepire Statements API — OpenAPI 3.1 (generated)\n${toYAML(toOpenAPI(jsonSchema))}\n`);
  return { types: objects.size, sections: Object.keys(payload).length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = await generate();
  console.log(`schemas: ${r.sections} sections, ${r.types} object types → public/data/{schema.graphql,statement.schema.json,openapi.yaml,sample-payload.json}`);
}
