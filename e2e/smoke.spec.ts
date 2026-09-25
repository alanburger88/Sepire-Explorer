import { test as base, expect, type Page } from '@playwright/test';

// UserWay is a third-party widget; keep runs deterministic by blocking it. The tour then
// shows its built-in description of the widget instead of the live panel.
const THIRD_PARTY = /accessibilityserver\.org|userway/i;

const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ context, page }, use) => {
      const errors: string[] = [];
      await context.route(THIRD_PARTY, (route) => route.abort());
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error' && !THIRD_PARTY.test(m.text()) && !/net::ERR_FAILED/.test(m.text())) errors.push(m.text());
      });
      await use(errors);
      expect(errors, 'no errors in the console').toEqual([]);
    },
    { auto: true },
  ],
});

const ring = (page: Page, frame: string) => page.frameLocator(frame).locator('#sx-ring');

test.describe('Intro', () => {
  test('introduces the explorer and links every section', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const href of ['#/tour', '#/compare', '#/data']) {
      await expect(page.locator(`main a[href^="${href}"]`).first()).toBeVisible();
    }
    const [tab] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: /open the statement/i }).click()]);
    await expect(tab).toHaveURL(/statement\/index\.html/);
    await expect(tab.getByText('Hi Sidney,')).toBeVisible();
  });

  test('shows the compliance badges', async ({ page }) => {
    await page.goto('./');
    const badges = page.locator('.intro-hero .badge');
    await expect(badges).toHaveCount(2);
    await expect(badges.nth(0)).toContainText('HITRUST');
    await expect(badges.nth(1)).toContainText('SOC 2');
  });

  test('theme follows the OS, and the toggle persists', async ({ page }) => {
    await page.goto('./');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('Guided tour', () => {
  test('every step moves the highlight to its feature', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('#/tour/1');
    const count = page.locator('.tour-count');
    await expect(count).toHaveText(/^1 \/ \d+$/);
    const total = Number((await count.textContent())!.split('/')[1]);
    const r = ring(page, '.tour iframe');

    for (let n = 1; n <= total; n++) {
      if (n > 1) await page.locator('.tour-next').click();
      await expect(count).toHaveText(new RegExp(`^${n} / ${total}$`));
      const title = (await page.locator('.tour-title').textContent()) ?? '';
      if (/accessibility/i.test(title)) {
        // Widget blocked in tests: the step explains the widget instead.
        await expect(page.locator('.tour-note')).toBeVisible();
        continue;
      }
      await expect(r.locator('.sx-tag b'), `step ${n}: ${title}`).toHaveText(String(n));
      await expect(r).toHaveClass(/sx-on/);
      if (/spanish/i.test(title)) {
        await expect(page.frameLocator('.tour iframe').locator('html')).toHaveAttribute('lang', /^es/);
      }
    }

    await page.locator('.tour-next').click();
    await expect(page.getByRole('heading', { name: /seen the statement come alive/i })).toBeVisible();
  });

  test('back, restart, keyboard, device and language controls', async ({ page }) => {
    await page.goto('#/tour/3');
    const count = page.locator('.tour-count');
    await expect(count).toHaveText(/^3 \//);
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(count).toHaveText(/^2 \//);
    await page.getByRole('button', { name: 'Restart' }).click();
    await expect(count).toHaveText(/^1 \//);

    await page.locator('.tour-panel').click({ position: { x: 4, y: 4 } });
    await page.keyboard.press('ArrowRight');
    await expect(count).toHaveText(/^2 \//);
    await page.keyboard.press('ArrowLeft');
    await expect(count).toHaveText(/^1 \//);

    await page.getByRole('button', { name: 'Mobile', exact: true }).click();
    await expect(page.locator('.device-mobile')).toBeVisible();
    await expect(ring(page, '.tour iframe')).toHaveClass(/sx-on/);
    await page.getByRole('button', { name: 'Desktop', exact: true }).click();
    await expect(page.locator('.device-desktop')).toBeVisible();

    const frameHtml = page.frameLocator('.tour iframe').locator('html');
    await page.locator('.tour button[lang="es"]').click();
    await expect(frameHtml).toHaveAttribute('lang', /^es/);
    await page.locator('.tour button[lang="en"]').click();
    await expect(frameHtml).toHaveAttribute('lang', /^en/);
  });
});

test.describe('PDF → Interactive', () => {
  test('every PDF section maps to a live part of the statement', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('#/compare/1');
    const n = page.locator('.cmp-story-n');
    await expect(n).toHaveText(/^1\/\d+$/);
    const total = Number((await n.textContent())!.split('/')[1]);
    const r = ring(page, '.cmp iframe');

    for (let i = 1; i <= total; i++) {
      if (i > 1) await page.locator('.cmp-story-nav .btn-primary').click();
      await expect(n).toHaveText(new RegExp(`^${i}/${total}$`));
      const title = (await page.locator('.cmp-story h2').textContent())!;
      await expect(r.locator('.sx-tag'), `section ${i}: ${title}`).toHaveText(title);
      await expect(r).toHaveClass(/sx-on/);
    }
  });

  test('scorecard summarises the transformation', async ({ page }) => {
    await page.goto('#/compare/scorecard');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/25%/).first()).toBeVisible();
  });
});

test.describe('Data & integration', () => {
  test('overview: sample payload and JSON Schema only, with compliance badges', async ({ page, request }) => {
    await page.goto('#/data');
    await expect(page.locator('.data-tab')).toHaveText(['How it works', 'Explore the payload', 'Edit & re-render']);
    await expect(page.locator('.dov-trust .badge')).toHaveCount(2);
    await expect(page.locator('main')).not.toContainText(/graphql|openapi/i, { useInnerText: true });
    const links = page.locator('.dov-downloads a');
    await expect(links).toHaveCount(2);
    for (const href of await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')!))) {
      const res = await request.get(href);
      expect(res.status(), href).toBe(200);
      expect((await res.body()).length, href).toBeGreaterThan(500);
    }
    for (const gone of ['data/schema.graphql', 'data/openapi.yaml']) {
      expect(await (await request.get(gone)).text(), gone).not.toMatch(/submitStatement|openapi:/);
    }
  });

  test('old REST and GraphQL links land on the overview', async ({ page }) => {
    for (const tab of ['rest', 'graphql']) {
      await page.goto(`#/data/${tab}`);
      await expect(page.locator('.data-tab[aria-current="page"]')).toHaveText('How it works');
    }
  });

  test('payload explorer ties a field to the statement and the PDF', async ({ page }) => {
    await page.goto(`#/data/payload?path=${encodeURIComponent('/holdings/rows/1')}`);
    await expect(page.locator('.dpay-pointer code')).toHaveText('/holdings/rows/1');
    await expect(page.locator('.dpay-pdf')).toContainText('PDF page 3');
    await expect(ring(page, '.dpay-preview iframe')).toHaveClass(/sx-on/);
  });

  test('editing the data re-renders the statement', async ({ page }) => {
    await page.goto('#/data/live');
    const statement = page.frameLocator('.dlive-preview iframe');
    await expect(statement.getByText('Hi Sidney,')).toBeVisible();
    await page.locator('.dlive-form input[type="text"]').first().fill('Jordan');
    await expect(statement.getByText('Hi Jordan,')).toBeVisible();
    await expect(page.getByRole('button', { name: /reset to the sample payload/i })).toBeVisible();
  });
});

test.describe('Statement', () => {
  // Prototype-only chrome stays in the bundle's DOM but is hidden for screen and print,
  // so check rendered text (innerText), not textContent.
  const PROTOTYPE = /prototype|prototipo|demo statement data|datos de demostraci|QA issue/i;

  for (const lang of ['en', 'es'] as const) {
    test(`reads as a finished statement on screen and in print (${lang})`, async ({ page }) => {
      await page.goto('statement/index.html#/overview');
      await expect(page.getByText(/Hi Sidney,|Hola Sidney,/)).toBeVisible();
      if (lang === 'es') {
        await page.locator('button[data-locale="es"]').first().click();
        await expect(page.locator('html')).toHaveAttribute('lang', /^es/);
      }
      const body = page.locator('body');
      await expect(body).not.toContainText(PROTOTYPE, { useInnerText: true });

      await page.goto(`statement/index.html#/print`);
      await expect(page.locator('[data-sheet-id="p1"]')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', lang === 'es' ? /^es/ : /^en/);
      await page.emulateMedia({ media: 'print' });
      await expect(body).not.toContainText(PROTOTYPE, { useInnerText: true });
    });
  }
});
