import type { Device } from '../../components/StatementStage';
import type { Lang, StatementDriver } from '../../statement/driver';
import { sleep } from '../../statement/driver';
import type { Overlay } from '../../statement/overlays';

export type TourStep = {
  id: string;
  chapter: ChapterId;
  /** Short name shown on the moving highlight. */
  tag: string;
  title: string;
  /** The feature being used. */
  what: string;
  /** Why it matters for a retirement-plan statement. */
  why: string;
  tryIt?: string;
  route: string;
  target?: string;
  /** Opens/prepares UI inside the statement; may return the element to highlight. */
  prepare?: (d: StatementDriver) => Promise<Element | null | void>;
  overlay?: Overlay;
  lang?: Lang;
  device?: Device;
  block?: 'start' | 'center';
  padding?: number;
  radius?: number;
  dim?: boolean;
  /** Seconds this step stays up in autoplay. */
  dwell?: number;
};

export type ChapterId = 'first' | 'understand' | 'insight' | 'act' | 'everyone' | 'record';

export const CHAPTERS: Array<{ id: ChapterId; label: string }> = [
  { id: 'first', label: 'First impressions' },
  { id: 'understand', label: 'Plain language' },
  { id: 'insight', label: 'Deeper insight' },
  { id: 'act', label: 'From reading to doing' },
  { id: 'everyone', label: 'Built for everyone' },
  { id: 'record', label: 'Statement of record' },
];

async function setSelectValue(d: StatementDriver, sel: string, value: string) {
  const el = d.query<HTMLSelectElement>(sel);
  const win = d.win;
  if (!el || !win) return;
  const setter = Object.getOwnPropertyDescriptor(win.HTMLSelectElement.prototype, 'value')?.set;
  setter?.call(el, value);
  el.dispatchEvent(new win.Event('change', { bubbles: true }));
}

export const STEPS: TourStep[] = [
  {
    id: 'welcome',
    chapter: 'first',
    tag: 'Personal welcome',
    title: 'A statement that greets Sidney by name',
    what:
      'The statement opens with a personal greeting, the ending balance and a short summary of the period in plain language, all generated from the same data that fills the statement of record.',
    why:
      'Participants decide in seconds whether to keep reading. Leading with "how am I doing?" turns a document people file away into one they open and understand.',
    route: '/overview',
    target: '[data-focus-id="section:hero"]',
    block: 'start',
  },
  {
    id: 'balance',
    chapter: 'first',
    tag: 'Headline numbers',
    title: 'The headline numbers, fully traceable',
    what:
      'Ending balance, net change and rate of return sit together. The net change is marked "Calculated"; every other figure appears exactly as printed, with a chip that links back to its page ("Statement p.1").',
    why:
      'A statement of record must never drift from its source. Labelling derived values and tying each figure to its printed page gives compliance an audit trail and gives participants confidence in the numbers.',
    route: '/overview',
    target: '[data-focus-id="section:balance"]',
  },
  {
    id: 'bridge',
    chapter: 'first',
    tag: 'Balance bridge',
    title: 'What changed, told as a story',
    what:
      'The "Account at a glance" table becomes an interactive balance bridge: beginning balance, each type of activity, then the ending balance. Select any step to see what it means, ask Sepi about it, or jump to the detail. "View as table" shows the exact printed rows.',
    why:
      '"Why did my balance change?" is one of the most common reasons participants call. The bridge answers it before the call happens, and the exact table is still one click away.',
    tryIt: 'Select "Fees and fee credits" in the chart.',
    route: '/overview',
    target: '[data-focus-id="section:balance-bridge"]',
    block: 'start',
  },
  {
    id: 'allocation',
    chapter: 'first',
    tag: 'Allocation',
    title: 'How the money is invested, at a glance',
    what:
      'The allocation summary becomes an interactive donut. Choosing a category shows the funds inside it and links through to full holdings, share prices and performance.',
    why:
      'Seeing diversification visually helps participants understand risk without decoding a table of percentages, and it is the first step toward engaging with their investment choices.',
    tryIt: 'Pick a category in the legend.',
    route: '/overview',
    target: '[data-focus-id="section:allocation"]',
    block: 'start',
  },
  {
    id: 'video',
    chapter: 'first',
    tag: 'Personal video',
    title: 'A personalized 90-second video',
    what:
      'A short video made for Sidney walks through this statement: balance, what changed, fees, retirement income and where to get help. It has chapters, captions and keyboard controls, and every scene is driven by the statement data.',
    why:
      'Video reaches people who will not read a statement. Because the scenes come from the same data, the video always matches the numbers.',
    route: '/overview',
    target: '[data-focus-id="section:video"]',
  },
  {
    id: 'review',
    chapter: 'first',
    tag: 'Things to review',
    title: 'Deadlines and open items come to the surface',
    what:
      'Cards bring forward what needs attention: fees paid, outstanding loans, a repayment window with 61 days remaining, contribution-limit usage, beneficiaries, vesting and retirement income, each linking to the full detail.',
    why:
      'Buried in a PDF, a repayment deadline is easy to miss. Surfacing time-sensitive items protects participants and reduces exceptions for the plan.',
    route: '/overview',
    target: '[data-focus-id="section:at-a-glance"]',
    block: 'start',
  },
  {
    id: 'sepi',
    chapter: 'understand',
    tag: 'Sepi',
    title: 'Sepi explains the statement, and only the statement',
    what:
      'Sepi, the statement guide, answers questions in plain language. Each answer cites its source page, shows the exact figures, and declines investment, tax or legal advice.',
    why:
      'Participants get answers at any hour without calling the service center, and compliance stays in control: answers come only from this statement and are guarded against advice.',
    tryIt: 'Ask Sepi your own question in the box at the bottom.',
    route: '/overview',
    overlay: 'sepi',
    radius: 0,
    padding: 0,
    dwell: 12,
    prepare: async (d) => {
      if (!d.query('aside.sepi-drawer')) await d.click('.sepi-launcher-btn');
      const drawer = await d.waitFor('aside.sepi-drawer', { timeout: 4000 });
      const suggestions = d.doc?.querySelectorAll<HTMLButtonElement>('.sepi-suggest-btn');
      if (suggestions && suggestions.length > 1 && !d.query('.sepi-answer')) {
        suggestions[1].click(); // "Why did my balance change this period?"
        await d.waitFor('.sepi-answer', { timeout: 4000 });
      }
      return drawer;
    },
  },
  {
    id: 'glossary',
    chapter: 'understand',
    tag: 'Glossary',
    title: 'Jargon, defined where it appears',
    what:
      'Terms such as "ending balance", "asset allocation" and "vested" carry a dotted underline. One tap shows a short definition, with "Learn more" and "Explain with Sepi" for depth. The full A–Z glossary lives in Help.',
    why:
      'Financial vocabulary is one of the biggest barriers to understanding a retirement statement. Defining terms in place keeps readers in the flow instead of sending them to search.',
    route: '/overview',
    overlay: 'term',
    padding: 8,
    radius: 16,
    prepare: async (d) => {
      const term = await d.waitFor<HTMLButtonElement>('[data-focus-id="section:balance"] button.term');
      if (!term) return null;
      await d.reveal(term, 'center');
      if (!d.query('.popover.term-pop')) term.click();
      return d.waitFor('.popover.term-pop', { timeout: 2500 });
    },
  },
  {
    id: 'fees',
    chapter: 'understand',
    tag: 'Fees',
    title: 'Fees made transparent',
    what:
      'Plan and individual expenses are broken out visually, with the exact amounts deducted, the administrative versus individual split, and a plain-language description of each charge.',
    why:
      'Fee transparency is a regulatory expectation and it builds trust. Showing where every dollar went answers questions before they become complaints.',
    route: '/activity/fees',
    target: '[data-focus-id="section:fees"]',
    block: 'start',
  },
  {
    id: 'limits',
    chapter: 'insight',
    tag: 'Contribution limits',
    title: 'Contribution limits you can see',
    what:
      'Gauges show how much of the annual elective-deferral and catch-up limits Sidney has used (16% and 19%) and exactly how much room remains.',
    why:
      'Saving more is one of the strongest levers for retirement readiness. A gauge makes the headroom obvious in a way a line of text never does.',
    route: '/activity/limits',
    target: '[data-focus-id="section:limits"]',
    block: 'start',
  },
  {
    id: 'drift',
    chapter: 'insight',
    tag: 'Allocation vs election',
    title: 'Where the money is, and where it was meant to be',
    what:
      'Each fund’s current allocation is compared with the investment election for future contributions, and the deviation is charted. These are the same figures as page 3 of the PDF, now visible at a glance.',
    why:
      'Drift is invisible in a table. Showing it clearly helps participants notice when their portfolio no longer matches their choices, without the statement giving advice.',
    route: '/investments/allocation',
    target: 'section.inv-achart',
    block: 'start',
  },
  {
    id: 'income',
    chapter: 'insight',
    tag: 'Retirement income',
    title: 'Two retirement-income estimates, never confused',
    what:
      'The federally required lifetime income illustration ($2,507.34 a month as a single life annuity) and the planning tool’s readiness projection ($2,821 a month) appear side by side, clearly labelled, color-coded and explained.',
    why:
      'Regulation requires the lifetime income illustration, and participants often confuse it with planning projections. Separating the two visually prevents misreading and supports compliance.',
    route: '/retirement-income',
    target: '.ri-duo',
  },
  {
    id: 'modeler',
    chapter: 'insight',
    tag: 'Scenario modeler',
    title: 'From a static tip to an interactive what-if',
    what:
      'The PDF’s single line, "contribute $30 more to reach $3,100 a month", becomes a scenario modeler. Change contributions, retirement age, returns or outside assets and the projection updates instantly.',
    why:
      'Exploring "what if I saved a little more?" is far more persuasive than a sentence in a footnote, and persuasion is what moves savings rates.',
    tryIt: 'Try another scenario chip.',
    route: '/retirement-income/modeler',
    padding: 8,
    prepare: async (d) => {
      const preset = await d.waitFor<HTMLButtonElement>('.ri-preset.ri-preset-demo');
      if (preset && !preset.classList.contains('is-active')) preset.click();
      await sleep(250);
      return d.waitFor('.ri-results');
    },
  },
  {
    id: 'beneficiaries',
    chapter: 'insight',
    tag: 'Beneficiaries',
    title: 'Beneficiaries, private by default',
    what:
      'Primary and contingent beneficiaries appear as clear allocation rings. Tax IDs, dates of birth and addresses stay masked until the participant chooses to reveal them.',
    why:
      'Statements get opened on shared screens and printers. Masking sensitive data by default reduces exposure without hiding anything from the owner.',
    route: '/loans-beneficiaries/beneficiaries',
    target: '.lb-ben-grid',
  },
  {
    id: 'inquiry',
    chapter: 'act',
    tag: 'Ask about this item',
    title: 'From question to service request, in context',
    what:
      'Eligible rows carry "Ask about this item". The request is pre-filled with the item, its value and its statement page; the participant adds a question, reviews it and submits, and gets a reference number back.',
    why:
      'Requests that arrive with full context resolve faster and cost less than phone calls. Service teams see exactly which item, on which page, the participant is asking about.',
    route: '/activity/fees',
    overlay: 'inquiry',
    padding: 0,
    radius: 22,
    dwell: 11,
    prepare: async (d) => {
      let modal = d.query('.modal[role="dialog"]');
      if (!modal) {
        const btn = await d.waitFor<HTMLButtonElement>('[data-focus-id="fee:plan-administrative"] button.item-action:not([aria-haspopup])');
        if (!btn) return null;
        await d.reveal(btn, 'center');
        btn.click();
        modal = await d.waitFor('.modal[role="dialog"]', { timeout: 3000 });
        await setSelectValue(d, '.modal select', 'fee');
        d.query<HTMLButtonElement>('.modal .inq-starter')?.click();
        await sleep(150);
      }
      return d.query('.modal[role="dialog"]');
    },
  },
  {
    id: 'access',
    chapter: 'act',
    tag: 'Account access',
    title: 'Straight to action: account access and QR',
    what:
      'Service contacts, financial professionals and a scannable QR code lead straight to the participant website to change deferrals or download statements. The same QR code appears on the printed edition.',
    why:
      'This is the shortest path from insight to action. A participant who realizes they should save more can act in the same moment.',
    route: '/plan-profile/contacts',
    target: '[data-focus-id="section:account-access"]',
  },
  {
    id: 'spanish',
    chapter: 'everyone',
    tag: 'Español',
    title: 'English or Spanish, instantly',
    what:
      'One tap on EN | ES switches the entire statement: every screen and chart, Sepi’s answers, the glossary, the video captions and even the printed edition. Values stay identical, and a courtesy notice states that the English version prevails.',
    why:
      'Serving Spanish-speaking participants no longer means a second print run. Language becomes a reader preference rather than a production job, and the notice keeps it compliant.',
    tryIt: 'Use the EN | ES switch above the statement at any step.',
    route: '/overview',
    lang: 'es',
    target: '[data-focus-id="section:hero"]',
    block: 'start',
    dwell: 11,
  },
  {
    id: 'accessibility',
    chapter: 'everyone',
    tag: 'Accessibility',
    title: 'Accessibility for every reader',
    what:
      'Beyond semantic structure, screen-reader text and full keyboard support, the statement includes the UserWay accessibility widget: contrast modes, larger text, text spacing, a dyslexia-friendly font, reading guides and more.',
    why:
      'Accessible communications are both an obligation and good service. Readers tailor the statement themselves, with no separate large-print or alternative-format request.',
    route: '/overview',
    overlay: 'userway',
    dwell: 12,
  },
  {
    id: 'mobile',
    chapter: 'everyone',
    tag: 'Mobile',
    title: 'Responsive on any screen',
    what:
      'The same statement reflows for a phone: stacked cards, touch-friendly controls and a thumb-reachable Sepi button. Use the Desktop | Mobile switch above to compare at any step.',
    why:
      'More and more participants read on their phones. A PDF forces pinching and zooming; a responsive statement is simply readable.',
    route: '/overview',
    device: 'mobile',
    target: '[data-focus-id="section:balance"]',
  },
  {
    id: 'print',
    chapter: 'record',
    tag: 'Print · Save as PDF',
    title: 'Print or save as PDF, on demand',
    what:
      'The interactive statement contains its own print edition: a paginated US Letter document with running headers, page numbers, full disclosures and a working QR code. Recipients print it or save it as a PDF whenever they like.',
    why:
      'The interactive document is the statement of record, so there is no PDF to generate, store or mail each cycle. The printed version is always available and always matches.',
    route: '/print',
    target: '[data-sheet-id="p1"]',
    block: 'start',
    padding: 6,
    radius: 6,
  },
  {
    id: 'guide',
    chapter: 'record',
    tag: 'Statement guide',
    title: 'Every printed page, mapped',
    what:
      'The statement guide shows where each page of the printed statement lives in the interactive version, and explains the conventions used throughout.',
    why:
      'Plan sponsors, auditors and service teams can trace any printed section to its interactive counterpart, which helps with reviews, training and call scripts.',
    route: '/help/guide',
    target: '.help-guide-split',
    block: 'start',
  },
];
