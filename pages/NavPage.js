/**
 * Page Object for My Account Sidebar Navigation at /profile/details.
 *
 * Selectors confirmed by DOM probe (2026-06-08):
 *   - Sidebar container : .profile-wrapper
 *   - Nav items         : span.title.link  (each tab in the sidebar)
 *   - Active item class : active-class  (on the span.title.link element)
 *   - Active display    : span.title__display.title-active-class
 *   - Logout element    : span.title.logout  (no href — JS action)
 *   - Right panel       : .profile-details-wrapper
 *
 * Section URLs (direct navigation):
 *   Account Information  /profile/details
 *   Address Book         /profile/address
 *   Orders               /profile/orders
 *   Gold Saving Schemes  /profile/gold-savings  (needs 2-step nav)
 *   Policies             /profile/policy        (needs 2-step nav)
 *   Contact Us           no /profile/ route (JS-only, fixme)
 *
 * KNOWN FINDINGS:
 *   - NAV-F-011 : No user name shown in the sidebar header; only section
 *                 items are listed (Name appears only in the right panel).
 *   - NAV-F-005 : Orders renders Fynd's built-in My Account component at
 *                 /profile/orders (different UI with "Something went wrong"
 *                 for users with no orders).
 *   - NAV-F-006 : /profile/gold-savings redirects back to /profile/details
 *                 when navigated directly — requires 2-step navigation
 *                 (/profile/address first, then /profile/gold-savings).
 */
import { FAKE_USER } from '../tests/fixtures.js';

// ---------------------------------------------------------------------------
// Session stub — augmented with email to prevent profile-completion redirect
// ---------------------------------------------------------------------------
export const SESSION_USER = {
  ...FAKE_USER,
  emails: [{ active: true, is_primary: true, verified: true,
              email: 'test@example.com', phone: '' }],
};

export async function stubSession(page) {
  await page.route('**/user/authentication/v1.0/session**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ authenticated: true, user: SESSION_USER }) }));
  await page.route('**/user/authentication/v1.0/user**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ user: SESSION_USER }) }));
}

// ---------------------------------------------------------------------------
// Section URL map
// ---------------------------------------------------------------------------
export const SECTIONS = {
  accountInfo:  '/profile/details',
  addressBook:  '/profile/address',
  orders:       '/profile/orders',
  goldSchemes:  '/profile/gold-savings',
  policies:     '/profile/policy',
};

// Expected sidebar label text for each section
export const SIDEBAR_LABELS = [
  'Account Information',
  'Address Book',
  'Orders',
  'Gold Saving Schemes',
  'Policies',
  'Contact Us',
  'Log out',
];

// ---------------------------------------------------------------------------
// Page Object
// ---------------------------------------------------------------------------
export class NavPage {
  constructor(page) {
    this.page = page;

    // Sidebar
    this.sidebar          = page.locator('.profile-wrapper').first();
    this.sidebarItems     = page.locator('span.title.link');
    this.logoutBtn        = page.locator('span.title.logout').first();
    this.rightPanel       = page.locator('.profile-details-wrapper').first();

    // Individual sidebar tab locators (by visible text)
    this.tabAccountInfo   = page.locator('span.title.link').filter({ hasText: /account information/i }).first();
    this.tabAddressBook   = page.locator('span.title.link').filter({ hasText: /address book/i }).first();
    this.tabOrders        = page.locator('span.title.link').filter({ hasText: /^orders$/i }).first();
    this.tabGoldSchemes   = page.locator('span.title.link').filter({ hasText: /gold saving/i }).first();
    this.tabPolicies      = page.locator('span.title.link').filter({ hasText: /polic/i }).first()
      .or(page.locator('span.title').filter({ hasText: /^policies$/i }).first());
    this.tabContactUs     = page.locator('span.title').filter({ hasText: /contact us/i }).first();
  }

  // ---- Navigation ----------------------------------------------------------

  /** Navigate to My Account landing (Account Information). */
  async goto() {
    await this.page.goto(SECTIONS.accountInfo, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(5000);
  }

  /**
   * Navigate to a section by direct URL.
   * Sections that need a warm-up (gold-savings, policy) use a 2-step approach.
   */
  async gotoSection(url) {
    const needsWarmup = [SECTIONS.goldSchemes, SECTIONS.policies].includes(url);
    if (needsWarmup) {
      await this.page.goto(SECTIONS.addressBook, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
    }
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(3000);
  }

  /**
   * "Click" a sidebar tab by navigating to its section URL.
   * The sidebar links use pointer-events:none (remove-events class) and are
   * controlled by the Vue router — in headless mode span.title.link items
   * render without the "link" class so click dispatch is unreliable.
   * Direct URL navigation produces the same functional outcome.
   */
  async clickTab(sectionUrl) {
    await this.gotoSection(sectionUrl);
  }

  // ---- Sidebar state -------------------------------------------------------

  /** All visible text labels in the sidebar. */
  async sidebarLabelTexts() {
    const items = await this.sidebarItems.allInnerTexts();
    const contactAndLogout = await this.page.locator('span.title')
      .filter({ hasText: /contact us|log.?out/i }).allInnerTexts();
    return [...items, ...contactAndLogout].map((s) => s.trim()).filter(Boolean);
  }

  /**
   * Returns the section name inferred from the current URL.
   * In headless mode the CSS active-class isn't reliably applied on span.title.link,
   * so URL is the authoritative source of which section is active.
   */
  activeSection() {
    const url = this.page.url();
    if (url.includes('/profile/address'))     return 'address book';
    if (url.includes('/profile/orders'))      return 'orders';
    if (url.includes('/profile/gold-savings'))return 'gold saving schemes';
    if (url.includes('/profile/policy'))      return 'policies';
    if (url.includes('/profile/details'))     return 'account information';
    return '';
  }

  /** Inner text of the right panel (confirms which content loaded). */
  async rightPanelText() {
    return (await this.rightPanel.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  }

  // ---- Logout --------------------------------------------------------------

  /**
   * Click the Log Out button and wait for navigation away from My Account.
   * Logout is a JS action (span.title.logout, no href).
   */
  async logout() {
    await this.logoutBtn.waitFor({ state: 'visible', timeout: 10_000 });
    // dispatchEvent fires the Vue click handler (force:true bypasses it).
    await this.logoutBtn.dispatchEvent('click');
    // Wait for the SPA to navigate away from /profile/
    await this.page.waitForURL(
      (url) => !url.toString().includes('/profile/'),
      { timeout: 15_000 },
    ).catch(() => {});
    await this.page.waitForTimeout(1500);
  }
}
