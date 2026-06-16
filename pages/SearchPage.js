/**
 * Search interactions for the Reliance Jewels storefront.
 *
 * Captured from the live site:
 *   - search box   : header textbox "Search product, brand, category"
 *   - type-ahead   : .suggestions  → products in .suggestions__products--item,
 *                    a "SHOP BY CATEGORY" section for categories
 *   - submit       : Enter → /products/?q=<query> (PLP layout: product-wrapper
 *                    cards + Sort By + Reset All)
 */
export class SearchPage {
  constructor(page) {
    this.page = page;
    this.box = page.getByRole('textbox', { name: /search/i }).first();
    this.results = page.locator('a.product-wrapper');
    this.suggestionPanel = page.locator('.suggestions');
    this.productSuggestions = page.locator('.suggestions__products--item');
    this.categorySection = page.getByText(/shop by category/i);
  }

  async goto(pathname = '/') {
    await this.page.goto(pathname, { waitUntil: 'domcontentloaded' });
    await this.box.waitFor({ state: 'visible', timeout: 30000 });
  }

  /**
   * Type a query and wait for the type-ahead to actually react (no submit).
   * Polls until suggestions render (the UAT host's latency varies, so a fixed
   * wait is flaky). Returns the latency in ms from keystroke to first suggestion.
   *
   * @param {object} [opts]
   * @param {number} [opts.timeout=10000]      max time to wait for suggestions
   * @param {boolean} [opts.requireProducts]   wait specifically for product items
   *                                           (not just the category section)
   */
  async typeAhead(query, { timeout = 10_000, requireProducts = false } = {}) {
    await this.box.click();
    await this.box.fill(''); // clear any prior value
    const t0 = Date.now();
    // Real per-character keystrokes (keydown/input/keyup) reliably trigger the
    // type-ahead's debounced fetch — a single fill() sometimes does not.
    await this.box.pressSequentially(query, { delay: 70 });
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const products = await this.productSuggestions.count();
      const cat = await this.categorySection.first().isVisible().catch(() => false);
      if (requireProducts ? products > 0 : products > 0 || cat) break;
      await this.page.waitForTimeout(150);
    }
    return Date.now() - t0;
  }

  /** Type a query and submit it; lands on the results page. */
  async search(query) {
    // The type-ahead occasionally swallows Enter, so re-type + submit until the
    // results URL (?q=) is reached.
    for (let i = 0; i < 4; i++) {
      await this.box.click();
      await this.box.fill(query);
      await this.page.waitForTimeout(1200);
      await this.box.press('Enter');
      try {
        await this.page.waitForURL(/[?&]q=/i, { timeout: 4_000 });
        break;
      } catch {
        /* retry */
      }
    }
    await this.results.first().waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
    await this.page.waitForTimeout(1500);
  }

  async resultCount() {
    return this.results.count();
  }

  /** hrefs of the result cards (to assert a specific product is present). */
  async resultHrefs() {
    return this.results.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  }
}
