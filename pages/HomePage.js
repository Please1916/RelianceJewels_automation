/**
 * Page Object for the Reliance Jewels Homepage.
 *
 * Selectors confirmed by DOM probe (2026-06-10):
 *   Top bar     : p.top-bar-gold-rate  ·  a[href="/c/callback"]  ·  p.locate-store-link
 *                 p.my-account-section  ·  p:has-text("GSV")
 *   Subheader   : img[alt="Brand Logo"]  ·  div.search-wrapper  ·  div#view-wishlist
 *                 div.cart-bag-icon-wrapper  ·  button.btn-golden-steps
 *                 a.btn-book-appointment
 *   L1 nav (11) : li.l1-category   L2 : li.l2-category
 *   Sections    : div.custom-carousel-container.full-width-section (hero)
 *                 div.top-collection-wrapper  ·  section.four-image-banner (diamond)
 *                 div.side_img_wrapper (bridal/discover)  ·  div.glide_wrapper
 *                 div.shop-by-category-wrapper  ·  div.product-cards-wrapper
 *                 div.exclusive-look-container  ·  div.jio-stream-tube-wrapper
 *                 div.gender-tabs  ·  div.top-seller-wrapper
 *                 div.cr-testimonial  ·  div.social-media-container
 */
import { FAKE_USER } from '../tests/fixtures.js';

const BASE = 'https://reliancejewels.snghostz5.de';

export const SESSION_USER = {
  ...FAKE_USER,
  emails: [{ active: true, is_primary: true, verified: true,
             email: 'test@example.com', phone: '' }],
};

export async function stubSession(page) {
  await page.route('**/user/authentication/v1.0/session**', r =>
    r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ authenticated: true, user: SESSION_USER }) }));
  await page.route('**/user/authentication/v1.0/user**', r =>
    r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ user: SESSION_USER }) }));
}

export async function stubCart(page, itemCount = 2) {
  const body = JSON.stringify({ items_count: itemCount, cart_id: 'stub-cart',
    items: Array(itemCount).fill({ quantity: 1, article: { uid: 'art-1' } }) });
  await page.route('**/cart/v1.0/basic**', r =>
    r.fulfill({ status: 200, contentType: 'application/json', body }));
  await page.route('**/cart/v1.0/detail**', r =>
    r.fulfill({ status: 200, contentType: 'application/json', body }));
}

export class HomePage {
  constructor(page) {
    this.page = page;

    // ── Top bar ──────────────────────────────────────────────────────────────
    this.goldRate    = page.locator('p.top-bar-gold-rate');
    this.callBack    = page.locator('a[href="/c/callback"]');
    this.locateStore = page.locator('p.locate-store-link');
    this.myAccount   = page.locator('p.my-account-section');
    this.gsv         = page.locator('p').filter({ hasText: /^GSV$/ }).first();

    // ── Subheader ─────────────────────────────────────────────────────────────
    this.logo         = page.locator('img[alt="Brand Logo"]');
    this.searchWrapper = page.locator('div.search-wrapper');
    this.wishlist     = page.locator('div#view-wishlist');
    this.cart         = page.locator('div.cart-bag-icon-wrapper');
    this.goldenSteps  = page.locator('button.btn-golden-steps');
    this.bookAppt     = page.locator('a.btn-book-appointment').first();

    // ── Category navigation ───────────────────────────────────────────────────
    this.l1Items = page.locator('li.l1-category');
    this.l2Items = page.locator('li.l2-category');

    // ── Content sections (scroll-dependent) ──────────────────────────────────
    // Hero: primary selector + fallback for different carousel implementations
    this.heroBanner     = page.locator('div.custom-carousel-container.full-width-section')
      .or(page.locator('div.custom-carousel-container'))
      .first();
    this.topCollections = page.locator('div.top-collection-wrapper');
    this.diamondSection = page.locator('section.four-image-banner');
    this.bridalBanner   = page.locator('div.side_img_wrapper');
    this.productGlide   = page.locator('div.glide_wrapper').first();
    this.shopByCategory = page.locator('div.shop-by-category-wrapper');
    this.productCards   = page.locator('div.product-cards-wrapper').first();
    this.exclusiveLook  = page.locator('div.exclusive-look-container');
    this.shopTheLook    = page.locator('div.jio-stream-tube-wrapper');
    this.genderTabs     = page.locator('div.gender-tabs');
    this.topSellers     = page.locator('div.top-seller-wrapper');
    this.testimonials   = page.locator('div.cr-testimonial');
    this.socialMedia    = page.locator('div.social-media-container');
  }

  async goto() {
    await this.page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(5000);
  }

  async scrollTo(locator) {
    // Many homepage sections are lazy-rendered — they only enter the DOM after the
    // browser scrolls past them. Scroll progressively (600px steps) until the
    // element appears, then use scrollIntoViewIfNeeded to centre it in view.
    for (let y = 400; y <= 12000; y += 600) {
      await this.page.evaluate(yy => window.scrollTo(0, yy), y);
      await this.page.waitForTimeout(150);
      if (await locator.count() > 0) break;
    }
    await locator.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
    await this.page.waitForTimeout(800);
  }
}
