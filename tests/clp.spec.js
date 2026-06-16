import { test, expect } from '@playwright/test';
import { ClpPage } from '../pages/ClpPage.js';
import { isNonDecreasing } from '../pages/PlpPage.js';

/**
 * CLP test suite — P0 + P1 functional cases, one test per sheet TC ID.
 * Tests run against the live `reliance-jewels` collection at /collection/<slug>.
 *
 *   P0 : TC_01–TC_09   (9 of 10 P0 cases; perf case CLP-028 page-load <3s is
 *                       verified separately via Lighthouse)
 *   P1 : TC_10–TC_23   (all 14 P1 cases)
 *
 * The live storefront renders collections with the SAME `a.product-wrapper`
 * cards as the PLP, so filters / sort / cards / pagination / wishlist all reuse
 * PlpPage behaviour (ClpPage extends PlpPage).
 *
 * KNOWN-DEFECT tests assert the PRD and are EXPECTED TO FAIL against the live
 * site, surfacing real gaps:
 *   - CLP-007/008/009/010/011 : the PRD's hover-panel collection-card design
 *                (image+tag only → slide-in detail panel → "Discover More" CTA)
 *                is NOT implemented; collections reuse the standard PLP card.
 *                                                              → BUG-CLP-CARD
 *   - CLP-002  : nav/header is persistently sticky; it does NOT slide up/hide
 *                on scroll-down as the PRD requires.            → BUG-CLP-NAV
 *   - CLP-024  : no skeleton/shimmer loader is shown while data loads.
 *                                                              → BUG-CLP-SKEL
 *   - CLP-027  : product images have no native lazy-loading (no loading="lazy").
 *                                                              → BUG-CLP-LAZY
 *
 * NOT AUTOMATABLE (require CMS-configured pages — covered as documented fixmes):
 *   - CLP-017 / 018 / 019 : header/banner page-type configuration.
 */

test.use({ ignoreHTTPSErrors: true });
test.describe.configure({ timeout: 90_000 });

// ###########################################################################
// P0 — CORE FUNCTIONAL CASES (TC_01–TC_09)
// ###########################################################################

// ---- HEADER & CATEGORY NAVIGATION ----
test('TC_01 | CLP-001 header & nav on CLP matches HomePage', async ({ page }) => {
  const clp = new ClpPage(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const homeNav = await clp.categoryNavItems();

  await clp.goto();
  expect(await clp.categoryNavItems()).toEqual(homeNav);
  await expect(clp.searchBox.first()).toBeVisible();
  await expect(clp.logo.first()).toBeVisible();
});

// ---- PRODUCT CARDS (PRD hover-panel design — KNOWN DEFECTS) ----
test('TC_02 | CLP-007 card shows image and tag only in default state [KNOWN DEFECT]', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();
  // PRD: default card shows ONLY image + tag (name/price appear in hover panel).
  // Live shows the full PLP card, so the name is visible by default → FAILS.
  const name = await clp.cardName(0);
  const nameP = clp.card(0).locator('p', { hasText: name }).first();
  await expect(nameP, 'PRD expects name hidden until hover').toBeHidden({ timeout: 5000 });
});

test('TC_03 | CLP-008 detail panel slides in on hover [KNOWN DEFECT]', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();
  await clp.card(0).hover();
  // PRD: a detail panel (signed by the "Discover More" CTA) slides in → FAILS.
  await expect(clp.discoverMore.first(), 'PRD hover detail panel not implemented').toBeVisible({ timeout: 5000 });
});

test('TC_04 | CLP-009 hover detail panel shows required fields [KNOWN DEFECT]', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();
  await clp.card(0).hover();
  // PRD: hover panel shows name/price/discount/type with a "Discover More" CTA → FAILS.
  await expect(clp.discoverMore.first(), 'PRD hover detail panel not implemented').toBeVisible({ timeout: 5000 });
});

test('TC_05 | CLP-011 "Discover More" CTA on hover navigates to PDP [KNOWN DEFECT]', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();
  await clp.card(0).hover();
  // PRD: a "Discover More" CTA appears on hover and opens the PDP → FAILS (no CTA).
  await expect(clp.discoverMore.first(), 'PRD "Discover More" CTA not implemented').toBeVisible({ timeout: 5000 });
});

test('TC_06 | CLP-012 clicking a product card navigates to PDP', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();
  const expectedHref = await clp.cardHref(0);
  const pdp = await clp.openFirstCardInNewTab();
  expect(pdp.url()).toContain('/product/');
  expect(pdp.url()).toContain(expectedHref.replace(/^\//, ''));
  await pdp.close();
});

// ---- FILTERS & SORT (same as PLP) ----
test('TC_07 | CLP-014 filters work on CLP same as PLP', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();

  await page.evaluate(() => (window.__noReload = true));
  await clp.applyFilterValue('Category', 'Rings');

  expect(page.url()).toContain('category=rings');
  expect(await page.evaluate(() => window.__noReload), 'grid should update without full reload').toBe(true);
});

test('TC_08 | CLP-015 sort works on CLP same as PLP', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();
  await clp.selectSort('Price Low to High');

  const n = Math.min(8, await clp.cardCount());
  const prices = await clp.lowestPrices(n);
  expect(prices.every((p) => p !== null)).toBe(true);
  expect(isNonDecreasing(prices), `prices not ascending: ${prices}`).toBe(true);
});

// ---- UX & PERFORMANCE (functional part) ----
test('TC_09 | CLP-026 infinite scroll / load more on CLP', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();

  const initial = await clp.cardCount();
  for (let i = 0; i < 8 && (await clp.cardCount()) <= initial; i++) {
    await page.mouse.wheel(0, 5000);
    await page.waitForTimeout(1500);
  }
  expect(await clp.cardCount(), `started at ${initial}`).toBeGreaterThan(initial);
});

// ###########################################################################
// P1 — FUNCTIONAL CASES (TC_10–TC_23)
// ###########################################################################

// ---------------------------------------------------------------------------
// HEADER & CATEGORY NAVIGATION
// ---------------------------------------------------------------------------
test('TC_10 | CLP-002 nav bar & page title hide on scroll down [KNOWN DEFECT]', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();

  await expect(clp.header).toBeVisible();
  const before = await clp.header.boundingBox();
  expect(before.y).toBeCloseTo(0, 0); // header docked at the top initially

  await page.mouse.wheel(0, 800); // scroll well past 100px
  await page.waitForTimeout(900);

  // PRD: the nav bar should slide up and hide (top moves above the viewport).
  // Live: the header is persistently sticky at top:0 → this assertion FAILS.
  const after = await clp.header.boundingBox();
  expect(after.y, 'PRD: nav bar should slide up off-screen on scroll-down').toBeLessThan(0);
});

test('TC_11 | CLP-003 nav bar & page title reappear on scroll up', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();

  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(700);
  await page.mouse.wheel(0, -1200); // scroll back to the top
  await page.waitForTimeout(900);

  // Nav header stays accessible and the title returns to view at the top.
  await expect(clp.header).toBeVisible();
  await expect(clp.breadcrumb).toBeInViewport();
});

test('TC_12 | CLP-004 total product count is displayed on CLP', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();

  // The collection breadcrumb ends with "<Collection> (N)".
  await expect(clp.page.getByText(/\(\d+\)/).first()).toBeVisible();
  expect(await clp.productCount()).toBeGreaterThan(0);
});

test('TC_13 | CLP-005 product count updates when filters applied on CLP', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();

  const before = await clp.productCount();
  // The collection facet list is NOT scoped to the collection (it offers global
  // categories, some absent from this collection). "Rings" is present in the
  // reliance-jewels collection (see CLP-014), so it reliably narrows the set.
  await clp.applyFilterValue('Category', 'Rings');
  const after = await clp.productCount();

  expect(page.url()).toContain('category=rings');
  expect(after).not.toBeNull();
  expect(after).toBeGreaterThan(0);
  expect(after, `count should drop after filtering (before=${before})`).toBeLessThan(before);
});

// ---------------------------------------------------------------------------
// BREADCRUMB
// ---------------------------------------------------------------------------
test('TC_14 | CLP-006 breadcrumb on CLP with clickable segments', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();

  // Breadcrumb shows the full path, e.g. "Home > Products > Reliance Jewels (N)".
  const text = (await clp.breadcrumbText()).toLowerCase();
  expect(text).toContain('home');

  // The "Home" segment is an anchor that navigates back to the homepage.
  const home = clp.breadcrumbHome();
  await expect(home).toBeVisible();
  await expect(home).toHaveAttribute('href', '/');
  await home.click();
  await expect(page).toHaveURL(/\/$|\/\?/);
});

// ---------------------------------------------------------------------------
// PRODUCT CARDS
// ---------------------------------------------------------------------------
test('TC_15 | CLP-010 detail panel slides out on hover-off [KNOWN DEFECT]', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();
  await clp.card(0).hover();
  // Slide-out can only be verified if the panel slides IN first — but the PRD
  // hover-panel design (incl. the "Discover More" CTA) is not implemented, so
  // the slide-in/out behaviour does not exist → FAILS at the precondition.
  await expect(clp.discoverMore.first(), 'PRD hover detail panel not implemented').toBeVisible({ timeout: 5000 });
});

test('TC_16 | CLP-013 wishlist icon visible on hover', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();

  // The hover-reveal of the wishlist icon is auth-independent (the click action
  // is what gates on login — covered by PLP-037/038), so a guest session
  // reliably verifies visibility here.
  const wishlist = clp.cardWishlist(0);
  expect(await wishlist.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
  await clp.card(0).hover();
  await page.waitForTimeout(400);
  expect(Number(await wishlist.evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0.5);
});

// ---------------------------------------------------------------------------
// FILTERS & SORT
// ---------------------------------------------------------------------------
test('TC_17 | CLP-016 filter + sort combination on CLP', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();

  await clp.applyFirstValueByParam('Category', 'category=');
  await clp.selectSort('Price Low to High');

  expect(page.url()).toContain('category=');
  const n = Math.min(8, await clp.cardCount());
  const prices = await clp.lowestPrices(n);
  expect(prices.every((p) => p !== null)).toBe(true);
  expect(isNonDecreasing(prices), `prices not ascending: ${prices}`).toBe(true);
});

// ---------------------------------------------------------------------------
// PAGE CONFIGURATION (require CMS-configured pages — manual / not automatable)
// ---------------------------------------------------------------------------
test('TC_18 | CLP-017 Text-only header on CLP', async () => {
  test.fixme(true, 'Requires a CMS-configured text-only-header CLP; verify manually.');
});
test('TC_19 | CLP-018 Image banner header on CLP', async () => {
  test.fixme(true, 'Requires a CMS-configured image-banner CLP; verify manually.');
});
test('TC_20 | CLP-019 Video banner header on CLP (auto-play + muted)', async () => {
  test.fixme(true, 'Requires a CMS-configured video-banner CLP; verify manually.');
});

// ---------------------------------------------------------------------------
// UX & PERFORMANCE
// ---------------------------------------------------------------------------
test('TC_21 | CLP-024 skeleton/shimmer loader while loading [KNOWN DEFECT]', async ({ page }) => {
  const clp = new ClpPage(page);

  // Sample the DOM as early as possible during load for a loader element.
  const nav = page.goto('/collection/' + clp.collection, { waitUntil: 'commit' });
  let skeletonSeen = false;
  for (let i = 0; i < 25 && !skeletonSeen; i++) {
    skeletonSeen = await page
      .locator('[class*="skeleton" i], [class*="shimmer" i], [class*="placeholder" i]')
      .first()
      .isVisible()
      .catch(() => false);
    if (!skeletonSeen) await page.waitForTimeout(120);
  }
  await nav.catch(() => {});
  await clp.cards.first().waitFor({ timeout: 30_000 }).catch(() => {});

  // PRD: a skeleton/shimmer loader is shown while data loads. Live: none → FAILS.
  expect(skeletonSeen, 'PRD: a skeleton/shimmer loader should display while loading').toBe(true);
});

test('TC_22 | CLP-025 scroll position restoration on return from PDP', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();

  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(600);
  const scrollY = await page.evaluate(() => window.scrollY);
  expect(scrollY).toBeGreaterThan(0);

  // Cards open the PDP in a NEW tab (target="_blank"), so the CLP tab never
  // navigates away — its scroll position is retained when the user returns.
  const pdp = await clp.openCardInNewTab(await clp.firstVisibleCard());
  expect(pdp.url()).toContain('/product/');
  await pdp.close();

  await page.bringToFront();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
});

test('TC_23 | CLP-027 product images are lazy-loaded [KNOWN DEFECT]', async ({ page }) => {
  const clp = new ClpPage(page);
  await clp.goto();

  const imgs = clp.cards.locator('img');
  const total = await imgs.count();
  expect(total).toBeGreaterThan(4);

  // PRD: below-the-fold images should be lazy-loaded. Live: no image carries
  // loading="lazy" (nor a deferred data-src) → this assertion FAILS.
  let lazyCount = 0;
  for (let i = 0; i < total; i++) {
    if ((await imgs.nth(i).getAttribute('loading')) === 'lazy') lazyCount++;
  }
  expect(lazyCount, 'PRD: product images should use native lazy-loading').toBeGreaterThan(0);
});
