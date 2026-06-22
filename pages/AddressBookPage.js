/**
 * Page Object for My Account → Address Book at /profile/address.
 *
 * Auth: requires a logged-in session. Tests use two stub layers:
 *   1. Session stub (fixtures.js loggedInPage / the always-logged-in variant)
 *   2. Cart address API stubs for deterministic CRUD
 *
 * Live selectors confirmed by probing the real DOM (2026-06-08):
 *   - Form opens at ?edit=true (same URL, SPA state)
 *   - Address Line 1  → input[name="address"]    label "Flat No"
 *   - Address Line 2  → input[name="area"]        label "Building Name/ Street no."
 *   - City            → input[name="city.name"]   auto-filled by pincode (required)
 *   - Pincode         → input[name="pincode"]      maxlength=6
 *   - State           → input[name="state"]        auto-filled
 *   - Country         → input[name="country"]      auto-filled
 *   - Name            → input[name="name"]
 *   - Email           → input[name="email"]
 *   - Phone           → input[name="phone"]        maxlength=10
 *   - Tag buttons     → button.address-button      default = "Home" (.selected)
 *   - Default chk     → input.rj-checkbox
 *   - Save button     → button.common-btn__filled  disabled until form valid
 *
 * Address list API: GET /api/service/application/cart/v1.0/address
 *   → { address: [ { id, name, phone, email, address, address2, pincode,
 *                    city, state, country, address_type, is_default_address } ] }
 *
 * KNOWN DEVIATIONS (live site vs PRD):
 *   - No map search box (AB-F-002)  → BUG-AB-MAP
 *   - All fields required incl. Line 2 & Email (AB-F-008) → BUG-AB-REQUIRED
 *   - Tag always defaults to Home; no blank-tag state (AB-F-028) → BUG-AB-TAG
 *   - 50-char limit on Address Line 1 instead of PRD's 200 (AB-F-037) → BUG-AB-LIMIT
 */
import { expect } from '@playwright/test';
import { FAKE_USER } from '../tests/fixtures.js';

// ---------------------------------------------------------------------------
// API stubs — used in beforeEach / test-level setup
// ---------------------------------------------------------------------------

/** Install the always-logged-in session stub on a page. */
export async function stubSession(page) {
  await page.route('**/user/authentication/v1.0/session**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ authenticated: true, user: FAKE_USER }) }));
  await page.route('**/user/authentication/v1.0/user**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ user: FAKE_USER }) }));
}

/**
 * Stub the address list API to return `addresses`.
 * Call once per test; subsequent navigations reuse the same stub.
 */
export async function stubAddressList(page, addresses = []) {
  await page.route('**/cart/v1.0/address', (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ address: addresses }) });
    }
    return route.continue();
  });
}

/** Stub POST (add), PUT (edit), DELETE with a success response. */
export async function stubAddressMutations(page, { addResponse, editResponse, deleteResponse } = {}) {
  await page.route('**/cart/v1.0/address', (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(addResponse || { success: true, address: { id: 'addr_new' } }) });
    }
    return route.continue();
  });
  await page.route('**/cart/v1.0/address/**', (route) => {
    const method = route.request().method();
    if (method === 'PUT') {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(editResponse || { success: true }) });
    }
    if (method === 'DELETE') {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(deleteResponse || { success: true }) });
    }
    return route.continue();
  });
}

/** Stub the pincode lookup API. `overrides` maps pincode → { city, state, country }.
 *  Real URL: GET /api/service/application/logistics/v1.0/pincode/<pin>
 */
export async function stubPincode(page, overrides = {}) {
  const defaults = {
    '400069': { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
    '560001': { city: 'Bengaluru', state: 'Karnataka', country: 'India' },
  };
  const map = { ...defaults, ...overrides };
  await page.route('**/logistics/v1.0/pincode/**', (route) => {
    const pin = route.request().url().match(/\/pincode\/(\d+)/)?.[1];
    const data = map[pin];
    if (data) return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ...data, pincode: pin }) });
    return route.fulfill({ status: 422, contentType: 'application/json',
      body: JSON.stringify({ message: 'Invalid pincode' }) });
  });
}

// ---------------------------------------------------------------------------
// Fake address factory
// ---------------------------------------------------------------------------
let _seq = 0;
export function fakeAddress(overrides = {}) {
  _seq++;
  return {
    id: `addr_${_seq.toString().padStart(3, '0')}`,
    name: 'Test Roshani', phone: '9876543210', email: 'roshani@example.com',
    address: 'A/2002', address2: 'Laxmi Nagar, Kohinoor Road',
    pincode: 400069, city: 'Mumbai', state: 'Maharashtra', country: 'India',
    address_type: 'home', is_default_address: true, is_active: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Page Object
// ---------------------------------------------------------------------------
export class AddressBookPage {
  constructor(page) {
    this.page = page;

    // ---- List page ----
    // Full card structure (confirmed by DOM probe with headed browser):
    //   div.address-wrapper > label > div.address-item
    //     ├── div.address-left  → input[type=radio].rj-checkbox   (default selector)
    //     ├── div.address-right → div.address-meta                 (cursor:pointer → opens edit)
    //     └── div.address-edit-btn
    //           ├── div.active-icon → svg[alt="delete"].edit-btn   (DELETE SVG icon)
    //           └── div            → svg[alt="edit"]               (EDIT SVG icon)
    this.heading       = page.locator('h2, h3').filter({ hasText: /address/i }).first();
    // Empty state text changed from "You haven't saved any address yet." to the title text.
    this.emptyText     = page.getByText(/haven.*saved|no.*address|view and manage/i).first();
    // button.add-addr-text is the specific class (confirmed by DOM probe).
    // getByRole is a reliable fallback; .first() ensures we get the button not the H2.
    this.addBtn        = page.getByRole('button', { name: /add new address/i })
                             .or(page.locator('button.add-addr-text')).first();
    // Each address card: use .address-item (wraps all card content per card)
    this.addressCards  = page.locator('.address-item');
    // Default radio: input[type=radio].rj-checkbox (one per card)
    this.defaultChkAll = page.locator('input.rj-checkbox');

    // Form fields
    this.line1Input    = page.locator('input[name="address"]');
    this.line2Input    = page.locator('input[name="area"]');
    this.cityInput     = page.locator('input[name="city.name"]');
    this.pincodeInput  = page.locator('input[name="pincode"]');
    this.stateInput    = page.locator('input[name="state"]');
    this.countryInput  = page.locator('input[name="country"]');
    this.nameInput     = page.locator('input[name="name"]');
    this.emailInput    = page.locator('input[name="email"]').first();
    this.phoneInput    = page.locator('input[name="phone"]');
    // Default radio on the form (only one radio per form load)
    this.defaultChk    = page.locator('input.rj-checkbox').first();
    this.saveBtn       = page.locator('button.common-btn__filled').filter({ hasText: /save/i }).first();
    // Tag buttons: textContent has surrounding whitespace (" Home "), so text-filter
    // doesn't work. Use positional indexing — order is always Home(0)/Work(1)/Other(2).
    this.tagHome       = page.locator('button.address-button').nth(0);
    this.tagWork       = page.locator('button.address-button').nth(1);
    this.tagOther      = page.locator('button.address-button').nth(2);

    // Delete confirmation modal
    this.deleteModal   = page.locator('[class*="modal" i], [role="dialog"]').first();
    this.deleteConfirm = page.getByRole('button', { name: /confirm|yes.*delete|delete/i }).first();
    this.deleteCancel  = page.getByRole('button', { name: /cancel/i }).first();

    // Google Maps
    this.mapContainer  = page.locator('[class*="map" i], iframe[src*="maps.google"]').first();
  }

  async goto() {
    // 'domcontentloaded' + 5s fixed wait: networkidle never fires (analytics
    // keep pinging) and would burn 30s of the 90s test budget.
    // 5s is enough for the SPA to render the account section and address list
    // (confirmed by probe: ab2/ab4 both succeeded with 4–5s waits).
    await this.page.goto('/profile/address', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(6000);
  }

  async openAddForm() {
    await this.addBtn.waitFor({ state: 'visible', timeout: 30_000 });
    await this.addBtn.click();
    await this.page.waitForURL(/edit=true/, { timeout: 10_000 }).catch(() => {});
    await this.page.waitForTimeout(1500);
    await expect(this.saveBtn).toBeVisible({ timeout: 10_000 });
  }

  /** Fill all required address form fields. */
  async fillAddress({
    line1 = 'A/2002', line2 = 'Laxmi Nagar', pincode = '', city = 'Mumbai',
    state = 'Maharashtra', country = 'India',
    name = 'Test Roshani', email = 'roshani@example.com', phone = '9876543210',
    tag = 'home', markDefault = false,
  } = {}) {
    if (line1)    await this.line1Input.fill(line1);
    if (line2)    await this.line2Input.fill(line2);
    if (pincode) {
      // pressSequentially triggers the pincode-lookup debounce correctly.
      await this.pincodeInput.pressSequentially(pincode, { delay: 80 });
      await this.pincodeInput.press('Tab');
      await this.page.waitForTimeout(2000); // wait for autofill response
    } else {
      // Fill city/state/country manually (no pincode lookup)
      if (city)    await this.cityInput.fill(city);
      if (state)   await this.stateInput.fill(state);
      if (country) await this.countryInput.fill(country);
    }
    if (name)  await this.nameInput.fill(name);
    if (email) await this.emailInput.fill(email);
    if (phone) await this.phoneInput.fill(phone);

    // Set tag
    if (/work/i.test(tag))  await this.tagWork.click();
    else if (/other/i.test(tag)) await this.tagOther.click();
    // 'home' is already selected by default — only click if switching

    if (markDefault && !(await this.defaultChk.isChecked())) {
      await this.defaultChk.click();
    }
  }

  /** Click Save and wait for the form to close (URL returns to /profile/address). */
  async saveAddress() {
    await this.saveBtn.click();
    await this.page.waitForURL(/\/profile\/address$/, { timeout: 10_000 }).catch(() => {});
    await this.page.waitForTimeout(1500);
  }

  /**
   * Click the Edit SVG icon on the Nth address card (0-indexed).
   * DOM: div.address-edit-btn > div > svg[alt="edit"]  (always visible, no hover needed)
   */
  async clickEdit(index = 0) {
    const card = this.addressCards.nth(index);
    // Edit SVG is inside .address-edit-btn, sibling to div.address-right.
    // The card wrapper is div.address-item; .address-edit-btn is inside it.
    const editSvg = card.locator('.address-edit-btn svg[alt="edit"]').first();
    await editSvg.waitFor({ state: 'visible', timeout: 10_000 });
    await editSvg.click();
    await this.page.waitForURL(/edit=true/, { timeout: 10_000 }).catch(() => {});
    await this.page.waitForTimeout(1500);
  }

  /**
   * Click the Delete SVG icon on the Nth address card (0-indexed).
   * DOM: div.address-edit-btn > div.active-icon > svg[alt="delete"].edit-btn
   */
  async clickDelete(index = 0) {
    const card = this.addressCards.nth(index);
    const delSvg = card.locator('.address-edit-btn svg[alt="delete"]').first();
    await delSvg.waitFor({ state: 'visible', timeout: 10_000 });
    await delSvg.click();
    await this.page.waitForTimeout(800);
  }

  /** Wait for the grid to settle after a mutation (same SPA pattern as PlpPage). */
  async waitForSettle() {
    await this.page.waitForTimeout(1500);
  }

  /** True if the Nth address card's default radio is selected. */
  async isDefault(index = 0) {
    const card = this.addressCards.nth(index);
    const radio = card.locator('input[type="radio"].rj-checkbox').first();
    return radio.isChecked().catch(() => false);
  }

  /** Text content of the Nth card's address-meta section. */
  async cardText(index = 0) {
    const meta = this.addressCards.nth(index).locator('.address-meta').first();
    return (await meta.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  }
}
