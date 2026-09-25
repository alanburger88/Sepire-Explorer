# Sepire Interactive Retirement Statement — functional prototype

> “Your retirement statement, made explorable.”

A self-contained React + TypeScript single-page application that turns the supplied **Sepire 401(k) statement** (`Sepire Statement v1.1.pdf`) into a premium, tabbed, explorable experience, with **Sepi by Sepire**, a statement-grounded assistant.

This is a **functional prototype** (PRD §2). It uses demo/test data only. It never calls a live AI, recordkeeper, CRM, authentication or video service. The only external script is the requested UserWay accessibility widget.

## Run it

```bash
npm install
npm run dev          # http://localhost:5188
```

```bash
npm run build        # static bundle → dist/  (serve with any static server, e.g. `npm run preview`)
npm run build:single # one self-contained file → dist-single/index.html (JS/CSS inlined; works from file://)
npm run typecheck
```

Deep links use hash routes, for example `#/overview`, `#/activity/fees`, `#/retirement-income/lifetime-estimate`, and `#/print` (print preview).

## What’s inside

| Tab | Highlights |
|---|---|
| **Overview** | Handshake greeting, ending balance, derived net change, balance-bridge waterfall with drill-ins, allocation donut, balance history, a playable personalized “statement in 90 seconds” video placeholder, and items to review |
| **Activity** | Summary, by contribution source, by investment, fees (visual and exact), contribution-limit gauges, vesting with one progressive-disclosure contribution view (replaces page 13’s three options), repayment deadline timeline, Roth five-year windows |
| **Investments** | Holdings with share detail, allocation vs election with deviation chart, sortable performance table with period emphasis and neutral heatmap, and an explorable “right to direct investments” rules view |
| **Retirement Income** | Federally required lifetime-income illustration (single and joint & 100% survivor infographic), verbatim assumptions, a separate readiness projection, and a scenario modeler driven by a curated demo matrix |
| **Loans & Beneficiaries** | Loan cards and payoff timeline, exact loan table (the source TOTAL row is kept as printed), beneficiary rings with privacy masking |
| **Plan & Profile** | Contacts, account access with a locally generated QR code, the configurable plan-message slot, a protected profile, and progressively disclosed notices |
| **Help** | FAQ, A–Z glossary, contacts, a statement guide (page → screen traceability), and your session’s tags and demo questions |

Cross-cutting features:
- **Explain with Sepi** on every major section.
- Glossary popovers on difficult terms.
- **Tag** and **Ask about this item** on eligible rows. This is a simulated inquiry flow that ends with “Prototype submission confirmed. No service request was sent.” and a *Demo reference number*.
- **Print statement**, a complete US Letter layout with page numbers, full disclosures and a working QR code.
- A **prototype panel** (from the dark ribbon) listing source-data QA issues, template placeholders and the privacy-safe analytics log.

## Architecture

```
src/
  data/        statement.ts (verbatim fixture), types.ts, values.ts (decimal-safe Money/Pct cells), selectors
  services/    adapters.ts — statement loader, simulated inquiry, account deep link, print (swap for live services later)
  app/         App, shell (ribbon, header, tab nav, footer), hash router, prototype/QA panel
  ui/          design-system components (Card, DataTable, Disclosure, Term, ExplainButton, ItemActions, Modal/Drawer, QR…)
  state/       tags, inquiries, QA-marker mode (session-scoped)
  sepi/        topics registry, provider, deterministic statement-grounded engine + guardrails, drawer, launcher
  glossary/    term ids, content, “Learn more” modal
  inquiry/     simulated inquiry modal (compose → review → processing → confirmation / failure)
  features/    one folder per tab
  print/       print document + #/print preview
  styles/      tokens (Sepire brand), base, components, shell
```

### Languages: English and Spanish (United States)

The **EN | ES** switch in the header changes the whole experience at once:
- all screens, tabs, charts and tooltips;
- screen-reader text;
- Sepi, including its question understanding, answers, suggestions and advice guardrails;
- the glossary and FAQ;
- the inquiry flow, the video scenes and captions, and the prototype panel;
- the print statement, including its `@page` headers and footers;
- text-bearing assets (the co-brand slot SVG).

The choice is saved per browser and sets `<html lang="en-US|es-US">` before first paint. The print route also accepts `?lang=es`, for example `/?lang=es#/print`.

How it's built:
- **UI copy** is in typed bundles: `src/i18n/messages/*.ts` with `defineMessages({ en, es })`. The Spanish must mirror the English shape, so missing keys fail the build.
- **Statement wording** is translated by a text-only overlay, `src/data/statement.es.ts`, merged by `src/data/localize.ts`. The overlay type cannot change money, percent, share or numeric-date values, so figures are identical in both languages.
- **Spanish mode** shows a courtesy-translation notice: if there is any difference, the English statement prevails.
- **Terminology and style** (formal *usted*, neutral U.S. Spanish, a retirement-plan term list) are in `src/i18n/TERMINOLOGY.md`.

### Fidelity rules

Enforced by the data model (PRD §22–23):
- Every value keeps its **exact source string** (`src`). Money is also stored as **integer cents**, used only for geometry and clearly labelled derived values.
- Blank source cells stay blank; they are never converted to zero. Dashes and `N/A` are kept as printed.
- Bracketed template tokens such as `[QDIA NAME]` are shown verbatim and highlighted. They are never filled in.
- Inconsistent showcase values are kept as supplied and listed as QA issues (`statement.qaIssues`). The UI never repairs them by guessing.
- The balance-history bars and the projected-income split are drawn from the source chart’s vector geometry, with no invented numbers.

## Asset slots

Drop final files into `public/assets/` using the same names. No code changes are needed.

| Slot | File |
|---|---|
| Sepire logo | `sepire-logo.svg` (currently wraps the supplied PNG unchanged) |
| Plan sponsor / co-brand logo | `plan-sponsor-logo.svg` (neutral placeholder) |
| Personalized video poster | `video-placeholder.svg` |
| Sepire “S” mark (derived from the supplied logo) | `sepire-mark.png`, `sepire-mark-white.png` |

## Going to production (not in prototype scope)

Replace the adapters in `src/services/adapters.ts` and `src/sepi/engine.ts` with live services. That means authenticated statement data, an approved retirement-planning engine for the modeler (with calculation source, version and timestamp), a servicing/case endpoint for inquiries, a personalized-video service, and optionally an AI endpoint that sends only the minimum data needed. Resolve the QA issues at the data-source level.
