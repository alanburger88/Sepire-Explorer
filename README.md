# Sepire Statement Explorer

Live at **https://sepire-explorer.netlify.app**

A desktop showcase that takes a prospect from a flat 13-page PDF to Sepire's interactive
investment statement: a guided tour of the live statement, the PDF and the interactive
statement side by side, and the data and API that power it.

The interactive statement is the statement of record and fully replaces the PDF. Recipients
print or save it as a PDF from inside the statement whenever they need to.

## Sections

| Route | Section | What visitors do |
| --- | --- | --- |
| `#/` | Introduction | See what the explorer covers and jump into any section. Shows the HITRUST and SOC 2 badges. |
| `#/tour` | Guided tour | 21 stops in six chapters. A highlight ring moves across the live statement while the panel explains each feature and why it matters. Includes Next / Back / Restart, desktop and mobile views, the English / Spanish switch, the UserWay accessibility widget, autoplay, full-screen presenter mode and "open in a new tab". Keys: ← → M L P F. |
| `#/compare` | PDF → Interactive | The PDF on the left, the statement on the right. 33 mapped sections, each with "on paper", "interactive" and "why it matters", plus a print-edition view and a scorecard (`#/compare/scorecard`). |
| `#/data` | Data & integration | How statement data reaches Sepire (client → Sepire) with the compliance badges, a payload explorer tied to the statement and PDF, and an "edit & re-render" view. Downloads: sample payload and JSON Schema. |

Everything in the Data section runs in the browser with demo data; nothing is sent anywhere.
Endpoint names (`api.sepire.com`) are illustrative.

The explorer is built for desktop (smaller screens get a notice), follows the OS light or dark
setting with a toggle, and uses the Sepire palette with Montserrat and Inter.

## Run it

Needs Node 22.

```sh
npm install
npm run dev        # http://localhost:5190
npm run build      # production build in dist/
npm run preview    # serve dist/ on http://localhost:4173
npm run test:e2e   # build, then run the Playwright smoke suite (Chromium)
```

## Deploy to Netlify

`netlify.toml` holds all the settings: build command, publish directory, Node version, and headers
(long-lived caching for fingerprinted assets, `X-Frame-Options: SAMEORIGIN`, nosniff and a
referrer policy). Choose one:

- **Git:** in Netlify, import this repository as a new project; every push to the branch redeploys.
- **CLI:** `npx netlify-cli deploy --build --prod`
- **Drag and drop:** `npm run build`, then drop `dist/` on https://app.netlify.com/drop

If the UserWay account restricts domains, allow the Netlify domain. Until then the tour
describes the widget instead of opening it.

## How it works

- **`source/`** holds the supplied originals, never edited: the statement build
  (`statement/index.html`), `statement.json`, the PDF, the brand guide and logo, and the
  plan-sponsor logo.
- **`scripts/prepare-statement.mjs`** runs before every dev and build. It:
  - copies the statement into `public/statement/`, applying the patches in `scripts/statement-patches.mjs`;
  - removes prototype-only wording in English and Spanish, hides demo chrome on screen and in print, and adds a live-data hook.

  Every patch asserts how many times it matches, so a statement build that no longer matches fails
  the build instead of shipping prototype text.
- **`scripts/gen-schemas.mjs`** derives the integration contract from `statement.json`: a JSON
  Schema (2020-12) and the sample payload. It leaves out the Sepire-side keys
  `qaIssues`, `placeholders` and `traceability`. The outputs in `public/statement/` and `public/data/`
  are generated, so they are not committed.
- **Driving the statement.** The explorer frames the statement from the same origin and drives it
  with `src/statement/driver.ts`: routes, language, overlays and the highlight ring, which is
  injected into the statement's document.
- **Live data.** With `?live=1`, the statement reads its payload from the explorer
  (`window.__SEPIRE_STATEMENT__`), so edits in the Data section re-render the real statement.

## Updating content

| To change | Do this |
| --- | --- |
| Statement build | Replace `source/statement/index.html` and run `npm run prepare:statement`. If a patch no longer matches, the error names it; update `scripts/statement-patches.mjs`. |
| Statement data | Replace `source/statement.json`. The sample payload and JSON Schema regenerate on the next dev or build run. |
| PDF | Replace `source/Sepire_Statement_v1.1.pdf` (same name) and run `python3 scripts/render-pdf.py` (needs PyMuPDF and Pillow). Check `PDF_PAGES` and the hotspots in `src/sections/compare/mappings.ts`. |
| Tour stops | `src/sections/tour/steps.ts` |
| Compliance badges | `src/components/ComplianceBadges.tsx` (wording for every badge) |
| API host and endpoints | `src/sections/data/config.ts` and `API_BASE` in `scripts/gen-schemas.mjs` |
| Sepire logo | Drop official artwork into `public/brand/` under the same names (`sepire-logo.svg`, `sepire-mark.svg`, `sepire-mark.png`, `sepire-mark-white.png`, `favicon-64.png`). The current files are traced from the supplied PNG by `scripts/build-logo.py`. |
| Plan-sponsor logo | `source/brand/plan-sponsor-logo.svg` (a "Test Company" placeholder; text converted to paths with `scripts/text-to-path.py`) |
| Intro screenshots | `node scripts/capture-shots.mjs` |

## Project layout

```text
e2e/                  Playwright smoke tests
public/               static files served as-is (brand, PDF page images, screenshots)
scripts/              statement preparation, schema generation, asset tooling
source/               supplied originals (never edited)
src/components/       app shell: top bar, theme toggle, statement stage (device frames), badges
src/sections/intro    Introduction
src/sections/tour     Guided tour (steps.ts holds every stop)
src/sections/compare  PDF → Interactive (mappings.ts holds every section)
src/sections/data     Data & integration (overview, payload explorer, live edit)
src/statement/        statement driver, overlays, UserWay integration
src/styles/           design tokens (light and dark), base and app styles
```
