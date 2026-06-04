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

  /** All cell texts of a breakup row ([] if the row is absent). */
  async priceBreakupRowCells(component) {
    const row = this.priceBreakupRow(component);
    if (await row.count() === 0) return [];
    const cells = await row.locator('td').allInnerTexts().catch(() => []);
    return cells.map(c => c.trim());
  }

  /** The "Final Value" cell text for a component row ('' if absent). */
  async priceBreakupFinalValue(component) {
    const row = this.priceBreakupRow(component);
    if (await row.count() === 0) return '';
    return (await row.locator('td.final-value, td:last-child').first().innerText().catch(() => '')).trim();
  }

  /** Full text of a breakup row ('' if absent — guarded so a missing row
   *  doesn't block on innerText() for the whole test timeout). */
  async priceBreakupRowText(component) {
    const row = this.priceBreakupRow(component);
    if (await row.count() === 0) return '';
    return (await row.innerText().catch(() => '')).trim();
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

  // ── Pincode / delivery ────────────────────────────────────────
  // Delivery section: .delivery-info-wrapper > h5.info-clickable ("Click here
  // to check delivery date"). Clicking opens the .productRequestModal:
  //   h4.delivery-label (title) · p.delivery-subtitle · input.pincode-input
  //   (type=tel, maxlength=6, digit-only) · button.delivery-submit ·
  //   "OR" · button.delivery-locate ("Locate Me") · p.locate-info · .cross close

  get deliveryWrapper()    { return this.page.locator('.delivery-info-wrapper').first(); }
  get deliveryTrigger()    { return this.page.locator('.delivery-info-wrapper .info-clickable, .delivery-info-wrapper .click').first(); }
  get pincodeModal()       { return this.page.locator('.productRequestModal').first(); }
  get pincodeModalTitle()  { return this.page.locator('.productRequestModal .delivery-label').first(); }
  get pincodeModalSubtitle(){ return this.page.locator('.productRequestModal .delivery-subtitle').first(); }
  get pincodeInput()       { return this.page.locator('.productRequestModal input.pincode-input, .productRequestModal input[placeholder*="PIN" i]').first(); }
  get pincodeSubmit()      { return this.page.locator('.productRequestModal button.delivery-submit').first(); }
  get pincodeLocateBtn()   { return this.page.locator('.productRequestModal button.delivery-locate').first(); }
  get pincodeSecureText()  { return this.page.locator('.productRequestModal .locate-info').first(); }
  get pincodeOrSeparator() { return this.page.locator('.productRequestModal .or-lable-cont').first(); }
  get pincodeModalClose()  { return this.page.locator('.productRequestModal .cross').first(); }

  /** Any error/serviceability message shown inside the pincode modal. */
  get pincodeMessage() {
    return this.page.locator('.productRequestModal')
      .getByText(/incorrect pincode|valid 6-digit|required|not available|unavailable|book a store|nearby store/i)
      .first();
  }

  /**
   * The inline validation/serviceability error that renders in the delivery
   * section (NOT the modal) after submitting a bad/unserviceable pincode —
   * e.g. <p class="error">Please enter a valid PIN code</p>.
   */
  get pincodeError() {
    return this.page.locator('p.error, .delivery-info-wrapper .error')
      .filter({ hasText: /valid pin|not available|incorrect|serviceab|required/i })
      .first();
  }

  /** Submit a pincode and return the inline delivery-section error text ('' if none). */
  async pincodeErrorText(value) {
    await this.pincodeInput.fill(value);
    await this.pincodeSubmit.click();
    await this.page.waitForTimeout(2200);
    if (await this.pincodeError.count() === 0) return '';
    return (await this.pincodeError.innerText({ timeout: 2000 }).catch(() => '')).trim();
  }

  /** Open the pincode/delivery modal from the delivery section. */
  async openPincodeModal() {
    await this.deliveryTrigger.scrollIntoViewIfNeeded().catch(() => {});
    await this.deliveryTrigger.click();
    await this.pincodeModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  /** Fill the pincode field and click Submit. */
  async submitPincode(value) {
    await this.pincodeInput.fill(value);
    await this.pincodeSubmit.click();
    await this.page.waitForTimeout(900);
  }

  /** Type a raw string into the pincode field char-by-char (respects the
   *  field's digit-only / maxlength keypress filter), then read back the value. */
  async typePincodeRaw(raw) {
    await this.pincodeInput.click();
    await this.pincodeInput.fill('');
    await this.pincodeInput.pressSequentially(raw, { delay: 20 });
    return this.pincodeInput.inputValue();
  }

  /** Visible text of the delivery section (collapsed line or resolved date). */
  async deliveryText() {
    return (await this.deliveryWrapper.innerText().catch(() => '')).trim();
  }

  // ── Cart / CTA / certificates ─────────────────────────────────
  // In-stock CTAs are <button class="button"> ("Add to cart") and
  // <button class="button buy-now"> ("Buy Now"). Store/service CTAs are
  // <a class="btn-book-appointment"> / "Find Nearest Store". OOS replaces the
  // primary CTA with a disabled "Out Of Stock" button (button.hollow-btn).

  get buyNowBtn()          { return this.page.getByRole('button', { name: /buy now/i }).first(); }
  get scheduleCallBtn()    { return this.page.getByRole('button', { name: /schedule call/i }).or(this.page.getByText(/schedule call/i)).first(); }
  get bookAppointmentBtn() { return this.page.getByRole('link', { name: /book appointment/i }).or(this.page.getByRole('button', { name: /book appointment/i })).first(); }
  get findNearestStoreBtn(){ return this.page.getByText(/find nearest store|find.*store/i).first(); }
  get requestCallbackBtn() { return this.page.getByText(/request callback/i).first(); }
  get cartCountBadge()     { return this.page.locator('[class*="cart-count"], [class*="cart"] [class*="count"], [class*="cart"] [class*="badge"]').first(); }

  /** Click Add to Cart (no-op safe if disabled/absent is handled by caller). */
  async addToCart() {
    await this.addToCartBtn.scrollIntoViewIfNeeded().catch(() => {});
    await this.addToCartBtn.click();
    await this.page.waitForTimeout(1200);
  }

  /** Read the numeric cart count from the header badge (0 if none/absent). */
  async cartCount() {
    // count() returns immediately; innerText() on a 0-match locator would
    // otherwise block for the full test timeout.
    if (await this.cartCountBadge.count() === 0) return 0;
    const txt = (await this.cartCountBadge.innerText({ timeout: 2000 }).catch(() => '')).trim();
    const n = Number((txt.match(/\d+/) || [])[0]);
    return Number.isNaN(n) ? 0 : n;
  }

  /** Click the wishlist heart. */
  async clickWishlist() {
    await this.wishlistIcon.scrollIntoViewIfNeeded().catch(() => {});
    await this.wishlistIcon.click();
    await this.page.waitForTimeout(800);
  }

  /**
   * The HEADER wishlist heart (top-right, .wishlist-icon-wrapper > svg.wishlist-icon).
   * Targeted precisely so we don't hit the search bar's camera/mic container,
   * which also matches a loose [class*="wish"] selector. For a guest this is the
   * gated entry point — clicking it redirects to /auth/login.
   */
  get headerWishlist() {
    return this.page.locator('.wishlist-icon-wrapper').first();
  }

  /** Click the header wishlist heart (the login-gated entry point). */
  async clickHeaderWishlist() {
    await this.headerWishlist.scrollIntoViewIfNeeded().catch(() => {});
    await this.headerWishlist.click();
    await this.page.waitForTimeout(1500);
  }

  /** Is a login prompt/modal visible (e.g. after a guest wishlist click)? */
  async loginPromptVisible() {
    return this.page
      .getByText(/log\s?in|sign\s?in|otp|mobile number|continue with/i)
      .first()
      .isVisible()
      .catch(() => false);
  }

  // ── Detail accordion ──────────────────────────────────────────
  // Sections render as <div class="accordion-row" data-is-accordion-open>
  // (Product Details, Product Highlights, Price Breakup, More Info) with
  // .open-accordion (+) / .close-accordion (−) icons. Content sits in the
  // panel that follows each row (not inside the row itself).

  /** A detail accordion section row, by its header label. */
  accordionRow(name) {
    return this.page.locator('.accordion-row').filter({ hasText: new RegExp(name, 'i') }).first();
  }

  /** Header labels of all detail accordion sections, in order. */
  async accordionSections() {
    const rows = await this.page.locator('.accordion-row').allInnerTexts().catch(() => []);
    return rows.map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
  }

  /** Is a given section currently expanded? */
  async isAccordionOpen(name) {
    return (await this.accordionRow(name).getAttribute('data-is-accordion-open').catch(() => null)) === 'true';
  }

  /** Expand a section (no-op if already open). */
  async expandAccordion(name) {
    const row = this.accordionRow(name);
    await row.scrollIntoViewIfNeeded().catch(() => {});
    if (!(await this.isAccordionOpen(name))) {
      await row.click();
      await this.page.waitForTimeout(500);
    }
  }

  /** Collapse a section (no-op if already closed). */
  async collapseAccordion(name) {
    if (await this.isAccordionOpen(name)) {
      await this.accordionRow(name).click();
      await this.page.waitForTimeout(500);
    }
  }

  /** Text of the content panel that follows a section row (sibling walk). */
  async accordionBodyText(name) {
    await this.expandAccordion(name);
    return this.accordionRow(name).evaluate(row => {
      let sib = row.nextElementSibling, txt = '';
      while (sib && !sib.classList.contains('accordion-row')) {
        txt += ' ' + (sib.textContent || '');
        sib = sib.nextElementSibling;
      }
      return txt.replace(/\s+/g, ' ').trim();
    }).catch(() => '');
  }

  // ── Book Appointment (/form/book-appointment) ─────────────────
  // A Nitrozen form: each field is a .nitrozen-dropdown-container identified by
  // its label.nitrozen-dropdown-label ("Store Name *", "Reason For Visit *",
  // "Contact Number *", "Date *", "Time *"). Options are .nitrozen-option
  // [data-value]. There is NO City dropdown (Store Name lists stores directly).

  get appointmentHeading() {
    return this.page.locator('.form .title, h1, h2, h3').filter({ hasText: /book appointment/i }).first();
  }
  get appointmentSubmit() {
    return this.page.getByRole('button', { name: /^submit$/i }).first();
  }

  /** Navigate straight to the appointment form page. */
  async gotoAppointmentForm() {
    await this.page.goto('/form/book-appointment', { waitUntil: 'domcontentloaded' });
    await this.appointmentHeading.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    await this.page.waitForTimeout(800);
  }

  /** A Nitrozen field container by its label text. */
  apptField(label) {
    return this.page
      .locator('.nitrozen-dropdown-container, .nitrozen-custom-form-input')
      .filter({ has: this.page.locator('.nitrozen-dropdown-label', { hasText: new RegExp(label, 'i') }) })
      .first();
  }

  /** Open a Nitrozen dropdown field by label. */
  async openApptField(label) {
    const trigger = this.apptField(label).locator('.nitrozen-select__trigger, .nitrozen-select');
    await trigger.first().click().catch(() => {});
    await this.page.waitForTimeout(400);
  }

  /** Option elements of an appointment dropdown field. */
  apptOptions(label) {
    return this.apptField(label).locator('.nitrozen-option');
  }

  /**
   * Labels present on the appointment form. Required fields render their label
   * with a trailing "*", so we match those — this catches all field types
   * (dropdowns, the Contact input, and the Date/Time pickers), not just
   * .nitrozen-dropdown-label which only covers the dropdowns.
   */
  async appointmentFieldLabels() {
    const all = await this.page.locator('label, [class*="label"]').allInnerTexts().catch(() => []);
    return [...new Set(
      all.map(t => t.replace(/\s+/g, ' ').trim())
         .filter(t => t.includes('*') && t.length < 40)
         .map(t => t.replace('*', '').trim())
    )];
  }

  // ── Header / nav ──────────────────────────────────────────────
  // Top bar: Today's Gold Rate, GSV, Call Back, Locate Store, Log In.
  // Sub-header: logo (img[alt="Brand Logo"] → href="/"), #searchInput,
  // wishlist + cart icons (.wishlist-cart-container). Mega-menu: All Jewellery
  // → L2 (Metals/Gender/Styles) → L3 (Gold/Women/Jhumkas…).

  get searchInput() {
    return this.page.locator('#searchInput, input[placeholder*="Search" i]').first();
  }
  get headerLogo() {
    return this.page.locator('a[href="/"]:has(img[alt*="Brand Logo" i]), [class*="logo"] a, header a:has(img)').first();
  }
  get megaMenuTrigger() {
    return this.page.getByText(/all jewellery/i).first();
  }

  /** Is a header touchpoint with the given text visible? */
  async headerHasText(text) {
    return this.page.getByText(new RegExp(text, 'i')).first().isVisible().catch(() => false);
  }

  /** Type a query into the header search and submit (Enter). */
  async searchFor(query) {
    await this.searchInput.click();
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForTimeout(1500);
  }

  // ── Mobile / mWeb ─────────────────────────────────────────────
  // Mobile PDP markup (captured on iPhone 13 viewport): the image gallery is a
  // Glide.js swipe carousel `.mobile-pdp-carousel-box` (.glide--swipeable) with
  // an image counter `p.media-count` ("1/2"); the mobile zoom hint is
  // `p.zoom-info` ("Press and hold to zoom"); category nav opens from
  // `.hamburger-menu-trigger`; product sections are `.accordion` blocks with an
  // `.accordion-row` header and `.accordion-data` body.

  // The VISIBLE mobile gallery is `.mobile .glide-cont` (the `.mobile-pdp-carousel-box`
  // wrapper is rendered 0-size, so don't target it). The on-screen slide is the
  // Glide active slide; off-screen slides sit at negative x and aren't clickable.
  get mobileCarousel()    { return this.page.locator('.mobile .glide-cont').first(); }
  get activeSlideImage()  { return this.page.locator('.mobile .glide__slide--active img, .mobile .glide-cont img').first(); }
  // Two `p.media-count` exist (hidden desktop + visible mobile) — scope to .mobile.
  get mediaCounter()      { return this.page.locator('.mobile p.media-count').first(); }
  get zoomInstruction()  { return this.page.getByText(/press and hold to zoom/i).first(); }
  get hamburgerTrigger() { return this.page.locator('.hamburger-menu-trigger, .hamburger-icon, [class*="hamburger"]').first(); }
  get scheduleCallCta()  { return this.page.getByText(/schedule call/i).first(); }
  get accordionRows()    { return this.page.locator('.accordion .accordion-row'); }
  accordionRow(name)     { return this.page.locator('.accordion-row').filter({ hasText: new RegExp(name, 'i') }).first(); }
  accordionBodyFor(name) {
    return this.page.locator('.accordion').filter({ hasText: new RegExp(name, 'i') }).locator('.accordion-data').first();
  }

  /** Counter text like "1/2" → [current, total] (or [null,null]). */
  async mediaCounterValues() {
    if (await this.mediaCounter.count() === 0) return [null, null];
    const m = (await this.mediaCounter.innerText().catch(() => '')).match(/(\d+)\s*\/\s*(\d+)/);
    return m ? [Number(m[1]), Number(m[2])] : [null, null];
  }

  /**
   * Horizontal touch-swipe across a locator (Glide listens to touch events).
   * `dir` 'left' advances to the next slide, 'right' to the previous.
   */
  async swipe(locator, dir = 'left') {
    const box = await locator.boundingBox();
    if (!box) return false;
    const y  = box.y + box.height / 2;
    const x1 = dir === 'left' ? box.x + box.width * 0.85 : box.x + box.width * 0.15;
    const x2 = dir === 'left' ? box.x + box.width * 0.15 : box.x + box.width * 0.85;
    await locator.evaluate((el, { x1, x2, y }) => {
      const t = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y, radiusX: 2, radiusY: 2, force: 1 });
      el.dispatchEvent(new TouchEvent('touchstart', { touches: [t(x1)], bubbles: true, cancelable: true }));
      el.dispatchEvent(new TouchEvent('touchmove',  { touches: [t((x1 + x2) / 2)], bubbles: true, cancelable: true }));
      el.dispatchEvent(new TouchEvent('touchmove',  { touches: [t(x2)], bubbles: true, cancelable: true }));
      el.dispatchEvent(new TouchEvent('touchend',   { touches: [], changedTouches: [t(x2)], bubbles: true, cancelable: true }));
    }, { x1, x2, y });
    await this.page.waitForTimeout(700);
    return true;
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
