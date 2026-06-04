import { expect } from '@playwright/test';

/**
 * Page Object for the Product Listing Page (PLP) at /products.
 *
 * Behaviour captured from the live Fynd storefront:
 *   - product card  : a.product-wrapper (href=/product/<slug>, opens in NEW TAB)
 *   - card image    : img (alt = product name)
 *   - card price    : p containing "₹" (often a range "₹X - ₹Y")
 *   - product count : text "...Products (N)"
 *   - filter tabs   : Category / Price / Discount / Metal Purity / Product Size / Metal Color / Tags
 *   - filter values : <a> links that add query params, e.g. ?category=rings
 *                     (multi-select accumulates params; combining across filters = AND)
 *   - sort widget   : .sort-list  -> "Sort By: <value>" ; options are list items
 *   - grid updates  : client-side (SPA) — no full page reload
 *   - PDP price      : span.product__price--marked (matches PLP card price)
 */
export const FILTER_TABS = [
  'Category', 'Price', 'Discount', 'Metal Purity', 'Product Size', 'Metal Color', 'Tags',
];

// Sort options per the PRD/spec (PLP-019). NOTE: live site differs — see BUG-2.
export const SPEC_SORT_OPTIONS = [
  'Relevance', 'New Arrival', 'Popularity', 'Ratings',
  'Price Low to High', 'Price High to Low',
];

// Sort options the live storefront actually offers (used for the presence check).
export const LIVE_SORT_OPTIONS = [
  'Popularity', 'Latest Products',
  'Price Low to High', 'Price High to Low',
  'Discount Low to High', 'Discount High to Low',
];

export class PlpPage {
  constructor(page) {
    this.page = page;
    this.cards = page.locator('a.product-wrapper');
    this.resetAll = page.getByText('Reset All').first();
    this.searchBox = page.getByRole('textbox', { name: /search/i });
    this.logo = page.getByRole('link', { name: /brand logo/i });
    // Persistent sticky site header (holds the search box + category nav).
    this.header = page.locator('.ct-header-wrapper').first();
    // Breadcrumb trail: "Home | Products (N)". Only "Home" is an anchor.
    this.breadcrumb = page.locator('.breadcrumbs').first();
    // Selected-filter chips area (each chip = .option-button-active + an ✕ svg).
    this.appliedFilters = page.locator('.applied-filters').first();
  }

  async goto() {
    await this.page.goto('/products', { waitUntil: 'domcontentloaded' });
    await this.cards.first().waitFor({ state: 'visible', timeout: 30000 });
  }

  // ---------- Product count ----------
  // The result count lives in the breadcrumb's last segment: it reads
  // "Products (N)" unfiltered and "<Category> (N)" once a category filter is
  // applied — so we take the LAST "(N)" in the breadcrumb text.
  async productCount() {
    await this.breadcrumb.waitFor({ state: 'visible', timeout: 15_000 });
    const matches = (await this.breadcrumb.innerText()).match(/\((\d+)\)/g);
    if (!matches || !matches.length) return null;
    return Number(matches[matches.length - 1].replace(/\D/g, ''));
  }

  // ---------- Breadcrumb (PLP-007 / PLP-008) ----------
  breadcrumbHome() {
    return this.breadcrumb.getByRole('link', { name: 'Home', exact: true });
  }
  async breadcrumbText() {
    return (await this.breadcrumb.innerText()).replace(/\s+/g, ' ').trim();
  }

  // ---------- Selected-filter chips (PLP-016 / PLP-017) ----------
  chip(label) {
    return this.appliedFilters.locator('.option-button-active', { hasText: label }).first();
  }
  async chipLabels() {
    const txt = await this.appliedFilters.locator('.option-button-active span').allInnerTexts();
    return txt.map((s) => s.trim()).filter(Boolean);
  }
  /** Remove one chip by clicking its ✕ icon, then wait for the grid to settle. */
  async removeChip(label) {
    await this.chip(label).locator('svg').first().click({ force: true });
    await this.waitForGridSettle();
  }

  // ---------- Card sub-elements ----------
  cardWishlist(i = 0) {
    return this.card(i).locator('.wishlist-container');
  }
  cardQuickView(i = 0) {
    return this.card(i).locator('.quick-view-btn');
  }
  cardTag(i = 0) {
    return this.card(i).locator('.product-tag-text');
  }
  cardSubtitle(i = 0) {
    return this.card(i).locator('.product-subTitle');
  }
  cardStrikePrice(i = 0) {
    return this.card(i).locator('.product-price-strike');
  }
  cardDiscount(i = 0) {
    return this.card(i).locator('.product-price-discount');
  }

  // ---------- Cards ----------
  card(i = 0) {
    return this.cards.nth(i);
  }
  async cardCount() {
    return this.cards.count();
  }
  async cardName(i = 0) {
    return (await this.card(i).locator('img').first().getAttribute('alt'))?.trim() ?? '';
  }
  async cardHref(i = 0) {
    return this.card(i).getAttribute('href');
  }
  async cardPriceText(i = 0) {
    return (await this.card(i).locator('p', { hasText: '₹' }).first().innerText()).trim();
  }
  async cardLowestPrice(i = 0) {
    return parseLowestRupee(await this.cardPriceText(i));
  }
  /** Lowest price for the first `n` visible cards. */
  async lowestPrices(n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(await this.cardLowestPrice(i));
    return out;
  }

  /** Open the first product card (opens in a new tab) and return the popup Page. */
  async openFirstCardInNewTab() {
    return this.openCardInNewTab(this.card(0));
  }

  /**
   * Open a product card in a new tab and return the popup Page. Pass a card
   * locator; defaults to one that is currently within the viewport so the
   * click does not auto-scroll the page (preserving scroll position).
   */
  async openCardInNewTab(target) {
    const card = target ?? (await this.firstVisibleCard());
    const [popup] = await Promise.all([
      this.page.context().waitForEvent('page'),
      card.click(),
    ]);
    await popup.waitForLoadState('domcontentloaded');
    return popup;
  }

  /** The first product card whose box is currently inside the viewport. */
  async firstVisibleCard() {
    const h = this.page.viewportSize()?.height ?? 800;
    const n = await this.cardCount();
    for (let i = 0; i < n; i++) {
      const box = await this.card(i).boundingBox();
      if (box && box.y >= 0 && box.y < h) return this.card(i);
    }
    return this.card(0);
  }

  // ---------- Header / category nav (PLP-001) ----------
  async categoryNavItems() {
    const navList = this.page.getByRole('list').filter({ hasText: 'All Jewellery' }).first();
    const items = await navList.getByRole('listitem').allInnerTexts();
    return items.map((s) => s.trim()).filter(Boolean);
  }

  // ---------- Filters ----------
  filterTab(name) {
    return this.page.getByText(name, { exact: true }).first();
  }
  async openFilter(name) {
    await this.filterTab(name).click();
    await this.page.waitForTimeout(600);
  }
  /** Open a filter tab and click one of its value links by visible label. */
  async applyFilterValue(filterName, valueName, { timeout = 15_000 } = {}) {
    await this.openFilter(filterName);
    const link = this.page.getByRole('link', { name: valueName, exact: true }).first();
    await this.clickValueLink(link, timeout);
  }

  /**
   * Open a filter tab and click the FIRST value link whose href contains the
   * given query-param substring (e.g. "metal-purity="). Robust to dynamic
   * filter values. Returns the clicked value's label.
   */
  async applyFirstValueByParam(filterName, paramSubstr, { timeout = 15_000 } = {}) {
    await this.openFilter(filterName);
    const link = this.page.locator(`a[href*="${paramSubstr}"]`).first();
    const label = (await link.innerText().catch(() => '')).trim();
    await this.clickValueLink(link, timeout);
    return label;
  }

  async clickValueLink(link, timeout) {
    await link.waitFor({ state: 'visible', timeout });
    await link.scrollIntoViewIfNeeded().catch(() => {});
    // force: the link is the confirmed target; the filter dropdown's open
    // animation otherwise makes it intermittently fail Playwright's
    // stability/intercept check.
    await link.click({ timeout, force: true });
    await this.waitForGridSettle();
  }

  async waitForGridSettle() {
    // NOTE: this SPA streams analytics beacons, so 'networkidle' never fires —
    // use a short fixed settle instead.
    await this.page.waitForTimeout(2000);
  }

  // ---------- Sort ----------
  sortWidget() {
    return this.page.locator('.sort-list:visible').first();
  }
  async currentSortValue() {
    return (await this.page.locator('.sort-list:visible .selectedSort').first().innerText()).trim();
  }
  async openSort() {
    await this.sortWidget().click();
    await this.page.waitForTimeout(500);
  }
  /** Is a sort option with this exact label visible in the open dropdown? */
  async sortOptionVisible(name) {
    return this.page.getByText(name, { exact: true }).first().isVisible().catch(() => false);
  }
  async selectSort(name) {
    await this.openSort();
    await this.page.getByText(name, { exact: true }).last().click();
    await this.waitForGridSettle();
  }
}

/** All ₹ amounts in a price string, as numbers (handles commas/decimals). */
export function parseRupees(text) {
  return (text.match(/[\d,]+(?:\.\d+)?/g) || [])
    .map((n) => Number(n.replace(/,/g, '')))
    .filter((n) => !Number.isNaN(n) && n > 0);
}

/** Lowest ₹ amount from a price string with ranges/commas. */
export function parseLowestRupee(text) {
  const nums = parseRupees(text);
  return nums.length ? Math.min(...nums) : null;
}

/** [min, max] price band from a price string (single value => [v, v]). */
export function parseRange(text) {
  const nums = parseRupees(text);
  return nums.length ? [Math.min(...nums), Math.max(...nums)] : [null, null];
}

/** Do two [min,max] bands overlap? */
export function rangesOverlap([aMin, aMax], [bMin, bMax]) {
  return Math.max(aMin, bMin) <= Math.min(aMax, bMax);
}

/** Assert a numeric array is sorted non-decreasing (for price L→H). */
export function isNonDecreasing(arr) {
  return arr.every((v, i) => i === 0 || v >= arr[i - 1]);
}
export function isNonIncreasing(arr) {
  return arr.every((v, i) => i === 0 || v <= arr[i - 1]);
}
