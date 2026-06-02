import { test, expect } from '@playwright/test';
import { ClpPage } from '../pages/ClpPage.js';
import { isNonDecreasing } from '../pages/PlpPage.js';

/**
 * CLP P0 functional cases (9 of 10; perf case CLP-028 deferred to Lighthouse).
 * Tests run against the `reliance-jewels` collection.
 *
 * KNOWN-DEFECT tests (assert the PRD, expected to FAIL): CLP-007/008/009/011 —
 * the PRD's hover-panel / "Discover More" collection-card design is NOT
 * implemented; collections reuse the standard PLP card (see BUG-CLP-1).
 */

test.use({ ignoreHTTPSErrors: true });
test.describe.configure({ timeout: 90_000 });

// ---- HEADER & CATEGORY NAVIGATION ----
test('TC_19 | CLP-001 header & nav on CLP matches HomePage', async ({ page }) => {
  const clp = new ClpPage(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const homeNav = await clp.categoryNavItems();

  await clp.goto();
  expect(await clp.categoryNavItems()).toEqual(homeNav);
  await expect(clp.searchBox.first()).toBeVisible();
  await expect(clp.logo.first()).toBeVisible();
});

// ---- PRODUCT CARDS (PRD hover-panel design — KNOWN DEFECTS) ----
test('TC_20 | CLP-007 card shows image and tag only in default state [KNOWN DEFECT]', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();
  // PRD: default card shows ONLY image + tag (name/price appear in hover panel).
  // Live shows the full PLP card, so the name is visible by default → FAILS.
  const name = await clp.cardName(0);
  const nameP = clp.card(0).locator('p', { hasText: name }).first();
  await expect(nameP, 'PRD expects name hidden until hover').toBeHidden({ timeout: 5000 });
});

test('TC_21 | CLP-008 detail panel slides in on hover [KNOWN DEFECT]', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();
  await clp.card(0).hover();
  // PRD: a detail panel (signed by the "Discover More" CTA) slides in → FAILS.
  await expect(clp.discoverMore.first(), 'PRD hover detail panel not implemented').toBeVisible({ timeout: 5000 });
});

test('TC_22 | CLP-009 hover detail panel shows required fields [KNOWN DEFECT]', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();
  await clp.card(0).hover();
  // PRD: hover panel shows name/price/discount/type with a "Discover More" CTA → FAILS.
  await expect(clp.discoverMore.first(), 'PRD hover detail panel not implemented').toBeVisible({ timeout: 5000 });
});

test('TC_23 | CLP-011 "Discover More" CTA on hover navigates to PDP [KNOWN DEFECT]', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();
  await clp.card(0).hover();
  // PRD: a "Discover More" CTA appears on hover and opens the PDP → FAILS (no CTA).
  await expect(clp.discoverMore.first(), 'PRD "Discover More" CTA not implemented').toBeVisible({ timeout: 5000 });
});

test('TC_24 | CLP-012 clicking a product card navigates to PDP', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();
  const expectedHref = await clp.cardHref(0);
  const pdp = await clp.openFirstCardInNewTab();
  expect(pdp.url()).toContain('/product/');
  expect(pdp.url()).toContain(expectedHref.replace(/^\//, ''));
  await pdp.close();
});

// ---- FILTERS & SORT (same as PLP) ----
test('TC_25 | CLP-014 filters work on CLP same as PLP', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();

  await page.evaluate(() => (window.__noReload = true));
  await clp.applyFilterValue('Category', 'Rings');

  expect(page.url()).toContain('category=rings');
  expect(await page.evaluate(() => window.__noReload), 'grid should update without full reload').toBe(true);
});

test('TC_26 | CLP-015 sort works on CLP same as PLP', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();
  await clp.selectSort('Price Low to High');

  const n = Math.min(8, await clp.cardCount());
  const prices = await clp.lowestPrices(n);
  expect(prices.every((p) => p !== null)).toBe(true);
  expect(isNonDecreasing(prices), `prices not ascending: ${prices}`).toBe(true);
});

// ---- UX & PERFORMANCE (functional part) ----
test('TC_27 | CLP-026 infinite scroll / load more on CLP', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();

  const initial = await clp.cardCount();
  for (let i = 0; i < 8 && (await clp.cardCount()) <= initial; i++) {
    await page.mouse.wheel(0, 5000);
    await page.waitForTimeout(1500);
  }
  expect(await clp.cardCount(), `started at ${initial}`).toBeGreaterThan(initial);
});
