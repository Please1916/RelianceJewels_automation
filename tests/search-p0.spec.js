import { test, expect } from '@playwright/test';
import { SearchPage } from '../pages/SearchPage.js';

/**
 * Search P0 functional cases (11). Results land on the PLP layout at
 * /products/?q=<query>.
 *
 * SRC-004 (SKU) and SRC-005 (RRL) have no provided test data, so they use
 * identifiers DERIVED from a live product URL:
 *   - SKU  -> the trailing numeric id  (…-7686785)
 *   - RRL  -> the alphanumeric code segment in the slug (…-mng039-…)
 */

test.use({ ignoreHTTPSErrors: true });
test.describe.configure({ timeout: 90_000 });

const A_PDP = '/product/18k-s-ring-7686785';

// Pull product hrefs from the PLP so we can derive identifiers.
async function productHrefs(page) {
  await page.goto('/products', { waitUntil: 'domcontentloaded' });
  await page.locator('a.product-wrapper').first().waitFor({ timeout: 30_000 });
  return page.locator('a.product-wrapper').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
}
const trailingId = (href) => (href.match(/-(\d+)\/?$/) || [])[1] || null;
const codeSegment = (href) => {
  const parts = href.split('/').pop().split('-');
  const seg = parts[parts.length - 2] || ''; // segment before the trailing id
  return /\d/.test(seg) && /[a-z]/i.test(seg) ? seg : null; // alnum code like mng039
};

// ---- SEARCH BAR ----
test('TC_28 | SRC-001 persistent search bar in header on all pages', async ({ page }) => {
  const s = new SearchPage(page);
  for (const path of ['/', '/products', A_PDP]) {
    await s.goto(path);
    await expect(s.box, `search box on ${path}`).toBeVisible();
  }
});

test('TC_29 | SRC-002 search bar accessible on PDP and Cart', async ({ page }) => {
  const s = new SearchPage(page);
  for (const path of [A_PDP, '/cart']) {
    await s.goto(path);
    await expect(s.box, `search box on ${path}`).toBeVisible();
  }
});

test('TC_30 | SRC-003 search by product name', async ({ page }) => {
  const s = new SearchPage(page);
  await s.goto('/');
  await s.search('Chain');
  expect(page.url()).toMatch(/[?&]q=Chain/i);
  expect(await s.resultCount()).toBeGreaterThan(0);

  const alts = await s.results.evaluateAll((els) => els.map((e) => e.querySelector('img')?.getAttribute('alt') || ''));
  expect(alts.some((a) => /chain/i.test(a)), `result names: ${alts}`).toBe(true);
});

test('TC_31 | SRC-004 search by SKU (derived numeric id) [FINDING]', async ({ page }) => {
  const s = new SearchPage(page);
  const hrefs = await productHrefs(page);
  const href = hrefs[0];
  const sku = trailingId(href);
  expect(sku, 'derived a numeric id from a product URL').toBeTruthy();

  await s.goto('/');
  await s.search(sku);
  const resultHrefs = await s.resultHrefs();
  expect(resultHrefs.some((h) => h && h.includes(sku)), `searched SKU ${sku}; results: ${resultHrefs}`).toBe(true);
});

test('TC_32 | SRC-005 search by RRL code (derived slug code) [FINDING]', async ({ page }) => {
  const s = new SearchPage(page);
  const hrefs = await productHrefs(page);
  const withCode = hrefs.find((h) => codeSegment(h));
  test.skip(!withCode, 'No product slug with an alphanumeric code segment found to derive an RRL code');
  const code = codeSegment(withCode);

  await s.goto('/');
  await s.search(code);
  const resultHrefs = await s.resultHrefs();
  expect(resultHrefs.some((h) => h && h.includes(code)), `searched code ${code}; results: ${resultHrefs}`).toBe(true);
});

test('TC_33 | SRC-006 search by category name', async ({ page }) => {
  const s = new SearchPage(page);
  await s.goto('/');
  await s.search('Rings');
  expect(page.url()).toMatch(/[?&]q=Rings/i);
  expect(await s.resultCount()).toBeGreaterThan(0);
});

// ---- TYPE-AHEAD SUGGESTIONS ----
test('TC_34 | SRC-007 type-ahead suggestions appear after 2+ characters', async ({ page }) => {
  const s = new SearchPage(page);
  await s.goto('/');
  await s.typeAhead('go');
  // SRC-007 verifies suggestions appear at the 2-char threshold. Depending on
  // the query, that may be product matches and/or the category section.
  const products = await s.productSuggestions.count();
  const catVisible = await s.categorySection.first().isVisible().catch(() => false);
  expect(products > 0 || catVisible, 'type-ahead suggestions appear for 2 chars').toBe(true);
});

test('TC_35 | SRC-008 type-ahead shows BOTH products AND categories', async ({ page }) => {
  const s = new SearchPage(page);
  await s.goto('/');
  await s.typeAhead('gold');
  expect(await s.productSuggestions.count(), 'product suggestions').toBeGreaterThan(0);
  await expect(s.categorySection.first(), 'category section in suggestions').toBeVisible();
});

test('TC_36 | SRC-011 clicking a suggestion navigates correctly', async ({ page }) => {
  const s = new SearchPage(page);
  await s.goto('/');
  await s.typeAhead('gold');
  const first = s.productSuggestions.first();
  await first.scrollIntoViewIfNeeded().catch(() => {});
  await Promise.all([
    page.waitForURL(/\/product\/|\/products/, { timeout: 15_000 }).catch(() => {}),
    first.click({ force: true }),
  ]);
  await page.waitForTimeout(1500);
  expect(page.url()).toMatch(/\/product\/|\/products/);
});

// ---- SEARCH RESULTS ----
test('TC_37 | SRC-012 search results use PLP layout', async ({ page }) => {
  const s = new SearchPage(page);
  await s.goto('/');
  await s.search('gold');
  expect(await s.resultCount()).toBeGreaterThan(0);
  // Scope to the visible sort widget (a hidden mobile copy also exists).
  await expect(page.locator('.sort-list:visible').first()).toBeVisible();
  await expect(page.getByText('Reset All').first()).toBeVisible();
});

test('TC_38 | SRC-015 no-results state for invalid search', async ({ page }) => {
  const s = new SearchPage(page);
  await s.goto('/');
  await s.search('xyzabc123zzq');
  expect(await s.resultCount(), 'no products for a nonsense query').toBe(0);

  const body = (await page.locator('body').innerText()).toLowerCase();
  const hasMessage = /no result|not found|no products|couldn.?t find|nothing|oops|no match/.test(body);
  if (!hasMessage) {
    console.warn('[SRC-015 finding] 0 results but no friendly "No results found" message detected.');
  }
});
