/**
 * Page Object for Wishlist touchpoints on the Reliance Jewels (Fynd) storefront.
 *
 * On this storefront the wishlist is fully login-gated: as a guest, tapping any
 * wishlist heart (PLP card or header) or opening /wishlist directly performs a
 * FULL-PAGE redirect to /auth/login?redirectUrl=… (no modal/bottom-sheet).
 *
 * Selectors (verified live):
 *   - PLP card heart : .wishlist-container   (40×40 hit area)
 *   - header heart   : .wishlist-icon-wrapper
 *   - login page     : /auth/login  + a "Mobile Number" field
 */
export class WishlistPage {
  constructor(page) {
    this.page = page;
    this.headerWishlist = page.locator('.wishlist-icon-wrapper').first();
    this.plpHearts = page.locator('.wishlist-container');
    this.mobileNumberField = page.getByPlaceholder(/mobile number/i).first();

    // ── Wishlist page (/wishlist) — selectors captured from the rendered page ──
    this.cards = page.locator('a.wl-link');                     // one per wishlisted item
    this.emptyState = page.getByText(/wishlist is empty/i).first();
    this.headerCount = page.locator(':text-matches("\\d+\\s*Products?", "i")').first();
    this.filledHearts = page.locator('a.wl-link .wishlist-active-icon'); // click = remove
    this.continueShopping = page.getByRole('link', { name: /continue shopping|shop now|start shopping|browse/i }).first();
  }

  plpHeart(i = 0) { return this.plpHearts.nth(i); }

  /** A PLP/search card heart's state: 'active' (filled/wishlisted) or 'inactive'. */
  async heartState(i = 0) {
    const cls = (await this.plpHeart(i).locator('svg').first().getAttribute('class').catch(() => '')) || '';
    return /wishlist-active-icon/.test(cls) ? 'active' : 'inactive';
  }
  async clickPlpHeart(i = 0) {
    await this.plpHeart(i).scrollIntoViewIfNeeded().catch(() => {});
    await this.plpHeart(i).click();
    await this.page.waitForTimeout(1200);
  }

  card(i = 0) { return this.cards.nth(i); }
  async cardCount() { return this.cards.count(); }

  /** Header "N Products" count (or null). */
  async productCountLabel() {
    if (await this.headerCount.count() === 0) return null;
    return (await this.headerCount.innerText().catch(() => '')).trim();
  }

  /** Is the empty-wishlist state shown? */
  async isEmpty() { return this.emptyState.isVisible().catch(() => false); }

  /** Remove the i-th item by clicking its (filled) heart. */
  async removeCard(i = 0) {
    await this.card(i).locator('.wishlist-container').first().click();
    await this.page.waitForTimeout(1200);
  }

  /** The "Move to Cart" control within the i-th card (icon-based; class move/cart/cta). */
  cardMoveToCart(i = 0) {
    return this.card(i).locator('[class*="move-to-cart"], [class*="moveToCart"], [class*="move"], [class*="cart"], [class*="cta"]').first();
  }
  async cardHasMoveToCart(i = 0) { return (await this.cardMoveToCart(i).count()) > 0; }

  /** No horizontal overflow on the page body (msite layout check). */
  async hasHorizontalScroll() {
    return this.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  }

  async gotoPlp() {
    await this.page.goto('/products', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2500); // let cards + hearts hydrate
  }

  async gotoWishlist() {
    await this.page.goto('/wishlist', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
  }

  onLoginPage() { return /\/auth\/login/i.test(this.page.url()); }

  /** The decoded redirectUrl param on the login page (or null). */
  redirectTarget() {
    const m = decodeURIComponent(this.page.url()).match(/redirectUrl=([^&]+)/i);
    try { return m ? decodeURIComponent(m[1]) : null; } catch { return m ? m[1] : null; }
  }

  /** Touch-target size of a PLP heart (or null if absent). */
  async heartHitArea(i = 0) {
    if (await this.plpHearts.count() === 0) return null;
    const box = await this.plpHeart(i).boundingBox();
    return box ? { w: Math.round(box.width), h: Math.round(box.height) } : null;
  }
}
