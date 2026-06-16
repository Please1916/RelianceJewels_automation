/**
 * Page Object for My Account → Policies at /profile/policy.
 *
 * Auth: session stub makes the SPA think the user is logged in.
 * Individual policy pages (/page/…) are public — no auth stub needed.
 *
 * Live selectors confirmed by DOM probe (2026-06-08):
 *   - Policies list URL : /profile/policy
 *   - Policy links      : a[href*="/page/"][target="_blank"]  (all open new tab)
 *   - Sidebar link      : has class="remove-events" → navigate via goto, not click
 *   - Policy page URLs  : /page/refund-return-policy  /page/shipping-policy
 *                         /page/privacy-policy         /page/fees-payments-policy
 *                         /page/terms-and-conditions   /page/golden-steps-terms-and-conditions
 *                         /page/rone-tnc               /page/disclaimer
 *
 * KNOWN DEVIATIONS (live vs PRD):
 *   - POL-F-002 : Live shows 8 items (PRD expects 7). "Terms & Conditions" is
 *                 labeled "Reliance Jewels TnC"; extra "Golden Steps TnC" present.
 *                                                              → BUG-POL-LIST
 *   - POL-F-047 : XSS URL blocked by WAF (Corporate IPS), not app-level sanitisation.
 *                 Script still does not execute → test passes.  → BUG-POL-XSS-WAF
 */
import { FAKE_USER } from '../tests/fixtures.js';

// ---------------------------------------------------------------------------
// Auth stub (session only — policies list requires login)
// ---------------------------------------------------------------------------
// Augment FAKE_USER with an email so the SPA doesn't force a profile-completion
// redirect (empty emails[] causes /profile/details/ redirect instead of showing
// the requested My Account page).
const SESSION_USER = {
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
// Policy definitions (PRD expected list)
// ---------------------------------------------------------------------------
export const POLICIES = [
  { label: 'Return & Refund Policy', href: '/page/refund-return-policy',  heading: 'Return' },
  { label: 'Shipping Policy',        href: '/page/shipping-policy',         heading: 'Shipping' },
  { label: 'Privacy Policy',         href: '/page/privacy-policy',          heading: 'Privacy' },
  { label: 'Fee & Payment Policy',   href: '/page/fees-payments-policy',    heading: 'Fee' },
  { label: 'Terms & Conditions',     href: '/page/terms-and-conditions',    heading: 'Terms' },
  { label: 'RelianceOne Loyalty TnC',href: '/page/rone-tnc',                heading: 'RelianceOne' },
  { label: 'Disclaimer',             href: '/page/disclaimer',              heading: 'Disclaimer' },
];

// PRD-expected labels (what the list should show).
export const PRD_LABELS = POLICIES.map((p) => p.label);

// ---------------------------------------------------------------------------
// Page Object
// ---------------------------------------------------------------------------
export class PoliciesPage {
  constructor(page) {
    this.page = page;
    // Policy links — precisely the known policy hrefs (not all /page/ links;
    // footer has other /page/ links like about-us, certifications, faqs that
    // should not be counted as policy items).
    this.policyLinks = page.locator([
      'a[href="/page/refund-return-policy"]',
      'a[href="/page/shipping-policy"]',
      'a[href="/page/privacy-policy"]',
      'a[href="/page/fees-payments-policy"]',
      'a[href="/page/terms-and-conditions"]',
      'a[href="/page/golden-steps-terms-and-conditions"]',
      'a[href="/page/rone-tnc"]',
      'a[href="/page/disclaimer"]',
    ].join(', '));
    // Sidebar nav link for Policies (has remove-events class — use goto, not click).
    this.sidebarPolicies = page.getByText('Policies', { exact: true }).first();
    // Sidebar nav links for other My Account sections.
    this.sidebarAccountInfo = page.getByRole('link', { name: /account information/i }).first();
    this.sidebarOrders      = page.getByRole('link', { name: /^orders$/i }).first();
  }

  /**
   * Navigate to the Policies list page.
   * Two-step: load My Account shell first, then SPA-navigate to /profile/policy.
   * The Policies sidebar link has `pointer-events:none` so we use goto instead.
   */
  async goto() {
    await this.page.goto('/profile/address', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(3000);
    await this.page.goto('/profile/policy', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(3000);
  }

  /** Navigate directly to a public policy detail page (no auth needed). */
  async gotoPolicy(href) {
    await this.page.goto(href, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
  }

  /**
   * Click a policy link on the list page and wait for the new tab.
   * Returns the new Page object (caller must close it).
   */
  async openPolicy(labelOrHref) {
    const link = this.page.locator(`a[href*="${labelOrHref}"][target="_blank"]`)
      .or(this.page.getByText(labelOrHref, { exact: false })).first();
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      link.click(),
    ]);
    await newPage.waitForLoadState('domcontentloaded');
    await newPage.waitForTimeout(1500);
    return newPage;
  }

  /** Text labels of all policy links visible on the current page. */
  async policyLinkLabels() {
    return this.policyLinks.evaluateAll((els) =>
      els.map((e) => e.textContent?.trim()).filter(Boolean));
  }

  /** True if `href` policy link is present on the list page. */
  async hasPolicyLink(href) {
    return this.page.locator(`a[href="${href}"][target="_blank"]`).isVisible().catch(() => false);
  }

  /** Heading of the current page (h1 or h2). */
  async heading() {
    return (await this.page.locator('h1, h2').first().innerText().catch(() => '')).trim();
  }

  /** Body text of the page (for checking no placeholder text). */
  async bodyText() {
    return (await this.page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  }
}
