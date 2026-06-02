import { expect } from '@playwright/test';

/**
 * Page Object for the Product Detail Page (PDP).
 *
 * Flow: Navigate to PLP (/products) → click any product card → land on PDP.
 * No hardcoded product URLs — products are selected dynamically from the grid.
 *
 * Selectors from the live Fynd storefront (reliancejewels.snghostz5.de):
 *   - PLP cards         : a.product-wrapper (opens in new tab)
 *   - product name      : h1 (first on PDP)
 *   - brand name        : text above h1 e.g. "RELIANCE JEWELS"
 *   - marked price      : .product__price--marked
 *   - slashed MRP       : <s> or strikethrough element
 *   - discount %        : element containing "% Off"
 *   - tax text          : "Price inclusive of all taxes"
 *   - price breakdown   : "Price Breakdown" / "Price Breakup" link
 *   - breadcrumbs       : Home > Products > Category > Product Name
 *   - thumbnail strip   : left-side vertical strip of small images
 *   - main image        : large center product image
 *   - prev/next arrows  : carousel navigation buttons
 *   - image counter     : "1/4" text below main image
 *   - zoom hint         : "Roll over image to zoom in"
 *   - fullscreen popup  : lightbox overlay on image click
 *   - wishlist icon     : heart icon (filled = wishlisted)
 *   - share icon        : share button
 *   - variant dropdowns : PRODUCT SIZE / METAL PURITY / METAL COLOR / STONE CODE
 *   - out of stock      : "Out Of Stock" button
 *   - certificates      : BIS Hallmark / IGI Certified
 *   - price breakup tbl : Component / Rate / Weight / Unit / Final Value
 */

// Variant dropdown field names shown in the UI
export const VARIANT_FIELDS = [
  'PRODUCT SIZE',
  'METAL PURITY',
  'METAL COLOR',
  'STONE CODE',
];

// Price breakup table row components per spec
export const PRICE_BREAKUP_COMPONENTS = [
  'Gold', 'Silver', 'Diamond', 'Stone', 'Making Charges',
  'MRP', 'Discount', 'GST (3%)', 'Selling Price',
];

export class PDPPage {
  constructor(page) {
    this.page = page;

    // ── PLP product cards (used to navigate TO a PDP) ────────────
    this.plpCards     = page.locator('a.product-wrapper');
    this.plpCardImages = page.locator('a.product-wrapper img');

    // ── Header ───────────────────────────────────────────────────
    this.logo      = page.getByRole('link', { name: /brand logo|reliance jewels/i });
    this.searchBox = page.getByRole('textbox', { name: /search/i });
    this.cartIcon  = page.locator('[class*="cart"], a[href*="cart"]').first();

    // ── Breadcrumbs ──────────────────────────────────────────────
    this.breadcrumbNav   = page.locator('[class*="breadcrumb"], nav[aria-label*="breadcrumb"]').first();
    this.breadcrumbLinks = page.locator('[class*="breadcrumb"] a');

    // ── Image Gallery ────────────────────────────────────────────
    // Real Fynd markup: .image-gallery > .image-box > .image-item > img.pdp-image
    // thumbnails live in .thumb-slider; slide indicators in .product-dots-container
    this.mainImage         = page.locator('img.pdp-image').first();
    this.thumbnailStrip    = page.locator('.thumb-slider, [class*="thumbnail"], [class*="thumb-list"]').first();
    this.thumbnails        = page.locator('.thumb-slider img, [class*="thumbnail"] img, [class*="thumb-list"] img');
    this.imageDots         = page.locator('.product-dots-container [class*="dot"], .product-dots-container > *');
    this.prevArrow         = page.locator('button[class*="prev"], [class*="arrow-left"], .slick-prev').first();
    this.nextArrow         = page.locator('button[class*="next"], [class*="arrow-right"], .slick-next').first();
    this.imageCounter      = page.locator('[class*="counter"], [class*="slide-count"]').first();
    this.zoomHint          = page.getByText('Roll over image to zoom in').first();
    // Clicking the main image opens a vue-lightbox modal (.vue-lb-* classes)
    this.fullscreenOverlay = page.locator('.vue-lb-container, [class*="lightbox"], [role="dialog"]').first();
    this.fullscreenClose   = page.locator('.vue-lb-button-close, [class*="lightbox"] [class*="close"], [aria-label*="close" i]').first();

    // ── Product Info ─────────────────────────────────────────────
    this.productName    = page.locator('h1').first();
    this.brandName      = page.locator('[class*="brand"], [class*="brand-name"]').first();
    this.newTag         = page.getByText('NEW', { exact: true }).first();
    // Fynd: --effective = selling price (always shown); --marked = struck MRP (discounted only)
    this.markedPrice    = page.locator('.product__price--effective, .product__price--marked').first();
    this.slashedMRP     = page.locator('.product__price--marked, s, [class*="strikethrough"], [class*="original-price"]').first();
    this.discountBadge  = page.locator('[class*="discount"], :text("% Off")').first();
    this.taxText        = page.getByText(/price inclusive of all taxes/i).first();
    this.priceBreakLink = page.getByText(/price breakdown|price breakup/i).first();
    this.wishlistIcon   = page.locator('[class*="wishlist-icon"], [aria-label*="wishlist" i], [class*="wish"]').first();
    this.shareIcon      = page.locator('[class*="share"], [aria-label*="share" i]').first();

    // ── Variant Dropdowns ─────────────────────────────────────────
    this.productSizeDropdown = page.locator('[class*="product-size"], select[name*="size"]').first();
    this.metalPurityDropdown = page.locator('[class*="metal-purity"], select[name*="purity"]').first();
    this.metalColorDropdown  = page.locator('[class*="metal-color"], select[name*="color"]').first();
    this.stoneCodeDropdown   = page.locator('[class*="stone-code"], select[name*="stone"]').first();

    // ── Stock / CTA ───────────────────────────────────────────────
    this.outOfStockBtn  = page.getByRole('button', { name: /out of stock/i }).first();
    this.outOfStockText = page.getByText(/this product is currently out of stock/i).first();
    this.addToCartBtn   = page.getByRole('button', { name: /add to cart/i }).first();

    // ── Certificates ─────────────────────────────────────────────
    this.bisHallmark  = page.getByText(/BIS Hallmark/i).first();
    this.igiCertified = page.getByText(/IGI Certified/i).first();

    // ── Price Breakup Table ───────────────────────────────────────
    this.priceBreakupSection = page.getByText('Price Breakup').first();
    this.breakupRows         = page.locator('[class*="price-breakup"] tr, table tr');
  }

  // ── PLP Navigation ────────────────────────────────────────────

  /** Go to the PLP grid page */
  async goToPlp() {
    await this.page.goto('/products', { waitUntil: 'domcontentloaded' });
    await this.plpCards.first().waitFor({ state: 'visible', timeout: 30_000 });
  }

  /**
   * Click a product card by index from the PLP grid and wait for PDP to load.
   * Default index 0 = first product. Pass any index to pick a different card.
   * Returns the product name shown on the card (for later assertion on PDP).
   */
  async selectProductFromPlp(index = 0) {
    await this.goToPlp();

    // Get the product name from the card image alt text before clicking
    const cardName = (await this.plpCardImages.nth(index).getAttribute('alt') ?? '').trim();

    // Cards open in a NEW TAB on desktop (target=_blank) but navigate in the
    // SAME TAB on mobile. Listen for a popup, but don't block on it forever —
    // if none arrives, fall back to the same-tab navigation.
    const popupPromise = this.page.context()
      .waitForEvent('page', { timeout: 8_000 })
      .catch(() => null);
    await this.plpCards.nth(index).click();
    const popup = await popupPromise;

    if (popup) {
      // Desktop: PDP opened in a new tab — switch this.page to it.
      await popup.waitForLoadState('domcontentloaded');
      this.page = popup;
    } else {
      // Mobile: same-tab navigation — wait for the current page to settle.
      await this.page.waitForLoadState('domcontentloaded');
    }
    this._rebindLocators();

    // Wait for product name to be visible on PDP
    await this.productName.waitFor({ state: 'visible', timeout: 30_000 });

    return { pdpPage: this.page, cardName };
  }

  /**
   * Re-bind all locators to the new page (popup tab) after navigation.
   * Called automatically after selectProductFromPlp().
   */
  _rebindLocators() {
    const page = this.page;

    this.plpCards          = page.locator('a.product-wrapper');
    this.plpCardImages     = page.locator('a.product-wrapper img');
    this.logo              = page.getByRole('link', { name: /brand logo|reliance jewels/i });
    this.searchBox         = page.getByRole('textbox', { name: /search/i });
    this.cartIcon          = page.locator('[class*="cart"], a[href*="cart"]').first();
    this.breadcrumbNav     = page.locator('[class*="breadcrumb"], nav[aria-label*="breadcrumb"]').first();
    this.breadcrumbLinks   = page.locator('[class*="breadcrumb"] a');
    this.mainImage         = page.locator('img.pdp-image').first();
    this.thumbnailStrip    = page.locator('.thumb-slider, [class*="thumbnail"], [class*="thumb-list"]').first();
    this.thumbnails        = page.locator('.thumb-slider img, [class*="thumbnail"] img, [class*="thumb-list"] img');
    this.imageDots         = page.locator('.product-dots-container [class*="dot"], .product-dots-container > *');
    this.prevArrow         = page.locator('button[class*="prev"], [class*="arrow-left"], .slick-prev').first();
    this.nextArrow         = page.locator('button[class*="next"], [class*="arrow-right"], .slick-next').first();
    this.imageCounter      = page.locator('[class*="counter"], [class*="slide-count"]').first();
    this.zoomHint          = page.getByText('Roll over image to zoom in').first();
    // Clicking the main image opens a vue-lightbox modal (.vue-lb-* classes)
    this.fullscreenOverlay = page.locator('.vue-lb-container, [class*="lightbox"], [role="dialog"]').first();
    this.fullscreenClose   = page.locator('.vue-lb-button-close, [class*="lightbox"] [class*="close"], [aria-label*="close" i]').first();
    this.productName       = page.locator('h1').first();
    this.brandName         = page.locator('[class*="brand"], [class*="brand-name"]').first();
    this.newTag            = page.getByText('NEW', { exact: true }).first();
    this.markedPrice       = page.locator('.product__price--effective, .product__price--marked').first();
    this.slashedMRP        = page.locator('.product__price--marked, s, [class*="strikethrough"], [class*="original-price"]').first();
    this.discountBadge     = page.locator('[class*="discount"], :text("% Off")').first();
    this.taxText           = page.getByText(/price inclusive of all taxes/i).first();
    this.priceBreakLink    = page.getByText(/price breakdown|price breakup/i).first();
    this.wishlistIcon      = page.locator('[class*="wishlist-icon"], [aria-label*="wishlist" i], [class*="wish"]').first();
    this.shareIcon         = page.locator('[class*="share"], [aria-label*="share" i]').first();
    this.outOfStockBtn     = page.getByRole('button', { name: /out of stock/i }).first();
    this.outOfStockText    = page.getByText(/this product is currently out of stock/i).first();
    this.addToCartBtn      = page.getByRole('button', { name: /add to cart/i }).first();
    this.bisHallmark       = page.getByText(/BIS Hallmark/i).first();
    this.igiCertified      = page.getByText(/IGI Certified/i).first();
    this.priceBreakupSection = page.getByText('Price Breakup').first();
    this.breakupRows       = page.locator('[class*="price-breakup"] tr, table tr');
  }

  // ── Gallery helpers ───────────────────────────────────────────

  async mainImageSrc() {
    return this.mainImage.getAttribute('src');
  }

  async thumbnailCount() {
    return this.thumbnails.count();
  }

  async clickThumbnail(index) {
    await this.thumbnails.nth(index).click();
    await this.page.waitForTimeout(500);
  }

  async clickNext() {
    await this.nextArrow.click();
    await this.page.waitForTimeout(500);
  }

  async clickPrev() {
    await this.prevArrow.click();
    await this.page.waitForTimeout(500);
  }

  async hoverMainImage() {
    await this.mainImage.hover();
    await this.page.waitForTimeout(800);
  }

  async clickMainImage() {
    await this.mainImage.click();
    await this.page.waitForTimeout(1000);
  }

  async closeFullscreen() {
    await this.fullscreenClose.click();
    await this.page.waitForTimeout(500);
  }

  async imageCounterText() {
    return (await this.imageCounter.innerText()).trim();
  }

  // ── Price helpers ─────────────────────────────────────────────

  async markedPriceText() {
    return (await this.markedPrice.innerText()).trim();
  }

  // ── Wishlist helpers ──────────────────────────────────────────

  async toggleWishlist() {
    await this.wishlistIcon.click();
    await this.page.waitForTimeout(800);
  }

  // ── Price Breakup helpers ─────────────────────────────────────

  async openPriceBreakdown() {
    await this.priceBreakLink.click();
    await this.page.waitForTimeout(800);
  }

  // ── Placeholder / broken image ────────────────────────────────

  async blockAllImages() {
    // Route at the CONTEXT level so the block reaches the PDP popup tab too,
    // and match by resourceType — the Pixelbin CDN serves extension-less URLs
    // that a "*.jpg/png" glob would never catch.
    await this.page.context().route('**/*', route =>
      route.request().resourceType() === 'image' ? route.abort() : route.continue()
    );
  }

  async brokenImageCount() {
    return this.page.evaluate(() =>
      Array.from(document.images)
        .filter(img => !img.complete || img.naturalWidth === 0)
        .filter(img => !img.src.includes('placeholder') && !img.alt.toLowerCase().includes('reliance'))
        .length
    );
  }

  // ── Mobile pinch-zoom ─────────────────────────────────────────

  async pinchZoom() {
    // Make sure the image is in the viewport so its centre maps to a real
    // element — otherwise elementFromPoint() returns null and the gesture
    // can't be dispatched.
    await this.mainImage.scrollIntoViewIfNeeded().catch(() => {});
    const box = await this.mainImage.boundingBox();
    if (!box) return;
    const cx = box.x + box.width  / 2;
    const cy = box.y + box.height / 2;
    await this.page.evaluate(({ cx, cy }) => {
      const el = document.elementFromPoint(cx, cy);
      if (!el) return; // centre not in viewport — nothing to pinch
      const t  = (id, x, y) => new Touch({ identifier: id, target: el, clientX: x, clientY: y, radiusX: 2, radiusY: 2, rotationAngle: 0, force: 1 });
      el.dispatchEvent(new TouchEvent('touchstart', { touches: [t(1, cx - 30, cy), t(2, cx + 30, cy)], bubbles: true, cancelable: true }));
      el.dispatchEvent(new TouchEvent('touchmove',  { touches: [t(1, cx - 80, cy), t(2, cx + 80, cy)], bubbles: true, cancelable: true }));
      el.dispatchEvent(new TouchEvent('touchend',   { touches: [], changedTouches: [t(1, cx - 80, cy), t(2, cx + 80, cy)], bubbles: true, cancelable: true }));
    }, { cx, cy });
    await this.page.waitForTimeout(800);
  }

  // ── Category nav ─────────────────────────────────────────────

  async categoryNavItems() {
    const navList = this.page.getByRole('list').filter({ hasText: 'All Jewellery' }).first();
    const items   = await navList.getByRole('listitem').allInnerTexts();
    return items.map(s => s.trim()).filter(Boolean);
  }

  // ── PLP card count ────────────────────────────────────────────

  async plpCardCount() {
    return this.plpCards.count();
  }

  // ── Variant dropdowns ─────────────────────────────────────────
  // The Fynd PDP renders custom (div-based) dropdowns, each with a visible
  // label ("METAL PURITY", "STONE CODE", …). We locate fields by that label
  // rather than guessed class names, so the helpers survive class churn.

  /**
   * Variant labels actually present on this PDP — read straight from the
   * dropdown placeholders (.pdp-variant-custom-select .placeholder), so there
   * are no text-scan false positives and no COLOUR/COLOR-style duplicates.
   * Returned uppercased to match the spec's label casing.
   */
  async variantLabelsPresent() {
    const placeholders = await this.page
      .locator('.pdp-variant-custom-select .placeholder, .custom-select-wrapper .placeholder')
      .allInnerTexts()
      .catch(() => []);
    return [...new Set(placeholders.map(t => t.trim().toUpperCase()).filter(Boolean))];
  }

  /**
   * Scan the PLP and switch to the first product that actually exposes variant
   * dropdowns. Returns { found, index, labels, cardName }. Keeps the suite
   * free of hardcoded product URLs.
   */
  async selectVariantProduct(maxTries = 12) {
    for (let i = 0; i < maxTries; i++) {
      const res = await this.selectProductFromPlp(i);
      const labels = await this.variantLabelsPresent();
      if (labels.length > 0) return { found: true, index: i, labels, cardName: res.cardName };
    }
    return { found: false, index: -1, labels: [] };
  }

  /**
   * Locator for a variant dropdown, identified by its placeholder label.
   * Real markup: <div class="custom-select-wrapper pdp-variant-custom-select"
   *   data-isopen data-isdisabled> <p class="placeholder">Metal Purity</p>
   *   <p class="select-label">22K</p> … </div>
   * Labels render uppercase via CSS but are mixed-case in the DOM, so we match
   * case-insensitively against the placeholder.
   */
  variantField(label) {
    return this.page
      .locator('.pdp-variant-custom-select, .custom-select-wrapper')
      .filter({ has: this.page.locator('.placeholder', { hasText: new RegExp(label, 'i') }) })
      .first();
  }

  /** Current displayed value of a variant field (the .select-label text). */
  async variantValue(label) {
    return (await this.variantField(label).locator('.select-label').innerText().catch(() => '')).trim();
  }

  /** Is a variant field disabled (data-isdisabled="true")? */
  async variantDisabled(label) {
    return (await this.variantField(label).getAttribute('data-isdisabled').catch(() => null)) === 'true';
  }

  /** Open a variant dropdown by label (idempotent — no-op if already open). */
  async openVariant(label) {
    const field = this.variantField(label);
    await field.scrollIntoViewIfNeeded().catch(() => {});
    const isOpen = (await field.getAttribute('data-isopen').catch(() => null)) === 'true';
    if (!isOpen) {
      await field.click();
      await this.page.waitForTimeout(300);
    }
  }

  /** Option <li> elements of a (currently open) variant dropdown. */
  variantOptions(label) {
    return this.variantField(label).locator('.options-wrapper li.option');
  }

  /** Visible option labels for a variant (opens the dropdown first). */
  async variantOptionLabels(label) {
    await this.openVariant(label);
    const texts = await this.variantOptions(label).locator('.option-label').allInnerTexts().catch(() => []);
    return texts.map(t => t.trim()).filter(Boolean);
  }

  /** Open a variant dropdown and pick an option by its (partial) text. */
  async selectVariantOption(label, optionText) {
    await this.openVariant(label);
    const opt = this.variantOptions(label).filter({ hasText: new RegExp(optionText, 'i') }).first();
    if (await opt.count() === 0) throw new Error(`variant option "${optionText}" not found for "${label}"`);
    await opt.click();
    await this.page.waitForTimeout(700);
  }

  /**
   * Option labels that are disabled/greyed-out (unavailable) in a variant
   * dropdown — detected via data-isdisabled="true" or a "disabled" class.
   */
  async disabledVariantOptions(label) {
    await this.openVariant(label);
    return this.variantField(label).evaluate(field =>
      Array.from(field.querySelectorAll('.options-wrapper li.option'))
        .filter(li => li.getAttribute('data-isdisabled') === 'true' || /disabled|unavailable|sold/i.test(li.className))
        .map(li => (li.textContent || '').trim())
    ).catch(() => []);
  }

  // ── Price Breakup ─────────────────────────────────────────────

  /** The Price Breakup / Breakdown accordion header (also the expand toggle). */
  get priceBreakupToggle() {
    return this.page.getByText(/price break(up|down)/i).first();
  }

  /** Expand the Price Breakup accordion if it isn't already open. */
  async expandPriceBreakup() {
    await this.priceBreakupToggle.scrollIntoViewIfNeeded().catch(() => {});
    await this.priceBreakupToggle.click().catch(() => {});
    await this.page.waitForTimeout(700);
  }

  /** The price-breakup <table> (identified by a row label that's always present). */
  get priceBreakupTable() {
    return this.page.locator('table').filter({ hasText: /Making Charges/i }).first();
  }

  /** Column headers of the breakup table. */
  async priceBreakupHeaders() {
    const ths = await this.priceBreakupTable.locator('thead th, thead td').allInnerTexts().catch(() => []);
    return ths.map(t => t.trim()).filter(Boolean);
  }

  /** A breakup row located by its component name (e.g. "Making Charges", "GST"). */
  priceBreakupRow(component) {
    return this.priceBreakupTable
      .locator('tbody tr')
      .filter({ hasText: new RegExp(component, 'i') })
      .first();
  }

  /** All cell texts of a breakup row. */
  async priceBreakupRowCells(component) {
    const cells = await this.priceBreakupRow(component).locator('td').allInnerTexts().catch(() => []);
    return cells.map(c => c.trim());
  }

  /** The "Final Value" cell text for a component row. */
  async priceBreakupFinalValue(component) {
    return (await this.priceBreakupRow(component).locator('td.final-value, td:last-child').first().innerText().catch(() => '')).trim();
  }

  /** Full text of a breakup row (for parsing rate/weight/value). */
  async priceBreakupRowText(component) {
    return (await this.priceBreakupRow(component).innerText().catch(() => '')).trim();
  }

  /** Is the breakup table currently visible/expanded? */
  async priceBreakupVisible() {
    return this.page
      .getByText(/selling price|grand total|making charges/i)
      .first()
      .isVisible()
      .catch(() => false);
  }

  // ── Stock / CTA helpers ───────────────────────────────────────

  /** True when the PDP is showing an out-of-stock state. */
  async isOutOfStock() {
    return this.page.getByText(/out of stock|sold out/i).first().isVisible().catch(() => false);
  }

  /** Is Add to Cart present AND enabled? */
  async addToCartEnabled() {
    const visible = await this.addToCartBtn.isVisible().catch(() => false);
    if (!visible) return false;
    return this.addToCartBtn.isEnabled().catch(() => false);
  }

  /** Locator for a "Notify Me" CTA (replaces Add to Cart on some OOS sites). */
  get notifyMeBtn() {
    return this.page.getByRole('button', { name: /notify me/i }).first();
  }

  /**
   * Walk the first `maxTries` PLP products and return the index of the first
   * out-of-stock one (or { found:false }). Each attempt re-opens the PDP, so
   * this is intentionally used sparingly by the OOS tests.
   */
  async findOutOfStockProduct(maxTries = 8) {
    for (let i = 0; i < maxTries; i++) {
      await this.selectProductFromPlp(i);
      if (await this.isOutOfStock()) return { index: i, found: true };
    }
    return { found: false };
  }
}

/** All ₹ amounts from a price string (handles ranges, commas). */
export function parseRupees(text) {
  return (text.match(/[\d,]+(?:\.\d+)?/g) || [])
    .map(n => Number(n.replace(/,/g, '')))
    .filter(n => !Number.isNaN(n) && n > 0);
}

/** Lowest ₹ amount from a string like "₹42,428 - ₹1,00,099". */
export function parseLowestRupee(text) {
  const nums = parseRupees(text);
  return nums.length ? Math.min(...nums) : null;
}

/** [min, max] band from a price string; single value → [v, v]. */
export function parseRange(text) {
  const nums = parseRupees(text);
  return nums.length ? [Math.min(...nums), Math.max(...nums)] : [null, null];
}

/** Do two [min, max] bands overlap? */
export function rangesOverlap([aMin, aMax], [bMin, bMax]) {
  return Math.max(aMin, bMin) <= Math.min(aMax, bMax);
}
