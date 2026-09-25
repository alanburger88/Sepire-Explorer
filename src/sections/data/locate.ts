// Where a payload field shows up in the interactive statement: JSON path → route + element.
import { getAt, isObject, type Json, type Path } from './payload';

export type Location = { route: string; target: string; label: string };

type SectionRule = {
  route: string;
  target: string;
  label: string;
  /** Row-level: turns an array item into the statement's focus id. */
  row?: (item: Record<string, Json>) => string | null;
  /** Route and label for row-level matches, when rows live on another screen. */
  rowRoute?: string;
  rowLabel?: string;
  /** Field-level overrides, keyed by the first key below the section. */
  fields?: Record<string, { target: string; label: string; route?: string }>;
};

const focus = (id: string) => `[data-focus-id="${id}"]`;
const byId = (item: Record<string, Json>) => (typeof item.id === 'string' ? item.id : null);

const RULES: Record<string, SectionRule> = {
  metadata: {
    route: '/overview',
    target: focus('section:hero'),
    label: 'Overview › greeting',
    fields: {
      participant: { target: focus('section:hero'), label: 'Overview › greeting' },
      message: { target: focus('section:plan-message'), label: 'Overview › plan message' },
      planName: { target: '.plan-meta', label: 'Header › plan name' },
      planNumber: { target: '.plan-meta', label: 'Header › plan number' },
      planNumberDisplay: { target: '.plan-meta', label: 'Header › plan number' },
      periodLong: { target: '.plan-meta', label: 'Header › statement period' },
      contacts: { route: '/plan-profile/contacts', target: '.pp-service', label: 'Plan & Profile › contacts' },
    },
    row: (item) => (typeof item.id === 'string' && 'phone' in item ? `contact:${item.id}` : null),
    rowRoute: '/plan-profile/contacts',
    rowLabel: 'Plan & Profile › financial professionals',
  },
  balances: {
    route: '/overview',
    target: focus('section:balance-bridge'),
    label: 'Overview › what changed',
    fields: {
      ending: { target: focus('section:balance'), label: 'Overview › ending balance' },
      rateOfReturn: { target: focus('section:rate-of-return'), label: 'Overview › rate of return' },
    },
  },
  allocationSummary: { route: '/overview', target: focus('section:allocation'), label: 'Overview › how you’re invested', row: (i) => (typeof i.id === 'string' ? `category:${i.id}` : null) },
  contributionSourceActivity: { route: '/activity/sources', target: focus('section:sources'), label: 'Activity › by source', row: byId },
  investmentActivity: { route: '/activity/investments', target: focus('section:investments'), label: 'Activity › by investment', row: byId },
  holdings: { route: '/investments/holdings', target: focus('section:holdings'), label: 'Investments › holdings', row: (i) => (typeof i.id === 'string' ? `holding:${i.id}` : null) },
  allocation: { route: '/investments/allocation', target: 'section.inv-achart', label: 'Investments › allocation vs election', row: (i) => (typeof i.holdingId === 'string' ? `allocation:${i.holdingId}` : null) },
  lifetimeIncome: {
    route: '/retirement-income/lifetime-estimate',
    target: focus('section:lifetime'),
    label: 'Retirement income › lifetime estimate',
    fields: {
      singleLife: { target: focus('income:single'), label: 'Retirement income › single life annuity' },
      jointSurvivor: { target: focus('income:joint'), label: 'Retirement income › joint & survivor' },
      balance: { target: focus('income:balance'), label: 'Retirement income › account balance' },
    },
  },
  lifetimeAssumptions: { route: '/retirement-income/assumptions', target: focus('section:assumptions'), label: 'Retirement income › assumptions', row: (i) => (typeof i.id === 'string' ? `section:${i.id}` : null) },
  retirementReadiness: {
    route: '/retirement-income/readiness',
    target: focus('section:readiness'),
    label: 'Retirement income › readiness projection',
    fields: {
      improvement: { target: focus('section:improvement'), label: 'Retirement income › improvement tip' },
      disclaimer: { target: focus('section:readiness-disclaimer'), label: 'Retirement income › disclaimer' },
    },
  },
  loans: { route: '/loans-beneficiaries/loans', target: focus('section:payoff-timeline'), label: 'Loans › payoff timeline', row: byId },
  beneficiaries: { route: '/loans-beneficiaries/beneficiaries', target: '.lb-ben-grid', label: 'Beneficiaries', row: byId },
  expenses: { route: '/activity/fees', target: focus('section:fees'), label: 'Activity › fees', row: (i) => (typeof i.id === 'string' && i.id.startsWith('fee:') ? i.id : null) },
  contributionLimits: { route: '/activity/limits', target: focus('section:limits'), label: 'Activity › contribution limits', row: (i) => (typeof i.id === 'string' ? `limit:${i.id}` : null) },
  vesting: { route: '/activity/vesting', target: focus('section:vesting'), label: 'Activity › vesting', row: byId },
  contributionActivity: { route: '/activity/vesting', target: focus('section:contribution-activity'), label: 'Activity › contribution activity', row: byId },
  designReference: { route: '/activity/vesting', target: focus('section:contribution-activity'), label: 'Activity › contribution activity' },
  investmentPerformance: { route: '/investments/performance', target: '.inv-snap', label: 'Investments › performance', row: (i) => (typeof i.holdingId === 'string' ? `performance:${i.holdingId}` : null) },
  distributionsEligibleForRepayment: { route: '/activity/repayments', target: focus('section:repayments'), label: 'Activity › repayments', row: byId },
  rothRecapture: { route: '/activity/roth', target: focus('section:roth'), label: 'Activity › Roth recapture', row: byId },
  profile: { route: '/plan-profile/profile', target: focus('section:profile'), label: 'Plan & Profile › profile', row: (i) => (typeof i.id === 'string' ? `profile:${i.id}` : null) },
  investmentDirectionRules: { route: '/investments/direction', target: focus('section:direction'), label: 'Investments › right to direct', row: (i) => (typeof i.id === 'string' ? `direction:${i.id}` : null) },
  disclosures: { route: '/plan-profile/disclosures', target: focus('disclosure:diversification'), label: 'Plan & Profile › notices', row: (i) => (typeof i.id === 'string' ? `disclosure:${i.id}` : null) },
  balanceHistory: { route: '/overview', target: focus('section:balance-history'), label: 'Overview › balance history' },
  appendix: { route: '/print', target: '[data-sheet-id="p9"]', label: 'Print edition › appendix' },
};

/** Best location for a path: the deepest row with a known focus id, else the field or section. */
export function locate(root: Json, path: Path): Location | null {
  const section = path[0];
  if (typeof section !== 'string') return null;
  const rule = RULES[section];
  if (!rule) return null;
  // Deepest array item on the path that maps to its own element.
  if (rule.row) {
    for (let i = path.length; i > 1; i--) {
      if (typeof path[i - 1] !== 'number') continue;
      const item = getAt(root, path.slice(0, i));
      if (isObject(item)) {
        const id = rule.row(item);
        if (id) return { route: rule.rowRoute ?? rule.route, target: focus(id), label: `${rule.rowLabel ?? rule.label} › ${labelOf(item)}` };
      }
    }
  }
  const field = typeof path[1] === 'string' ? rule.fields?.[path[1]] : undefined;
  if (field) return { route: field.route ?? rule.route, target: field.target, label: field.label };
  return { route: rule.route, target: rule.target, label: rule.label };
}

function labelOf(item: Record<string, Json>): string {
  for (const k of ['name', 'label', 'title', 'heading', 'type', 'source', 'ticker', 'id', 'holdingId']) {
    const v = item[k];
    if (typeof v === 'string' && v) return v.length > 40 ? `${v.slice(0, 38)}…` : v;
  }
  return 'row';
}

/** The printed page for a path, from the nearest `source.page` on the way down. */
export function pdfPageOf(root: Json, path: Path): number | null {
  for (let i = path.length; i >= 1; i--) {
    const node = getAt(root, path.slice(0, i));
    if (isObject(node) && isObject(node.source) && typeof node.source.page === 'number') return node.source.page;
  }
  return null;
}
