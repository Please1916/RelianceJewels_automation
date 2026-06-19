import { expect } from '@playwright/test';

/**
 * Page Object for the Call Back form at /c/callback.
 *
 * Same engine as Book Appointment (Vue form, mx-datepicker, cascading State→City
 * →Store dropdowns, reason list from /ext/crm/lead) but with its OWN submit
 * endpoint and a few label differences — all verified live on 2026-06-10:
 *   - dropdowns : "Select State" · "Select City" · "Select Store" (NOT "Store
 *                 Name") · "Select Reason for Contact" · "Select Time"
 *   - date input: placeholder "Enter Date" (capital D)
 *   - submit    : POST /ext/crm/contact/callBack  → body `true` on success
 *   - success   : form RESETS (no toast / "Book Another")
 *   - error     : "Failed to submit" + "Try Again" (returns to data-preserved form)
 *
 * GAP (shared with Book Appointment): the reason list has NO "Others" option, so
 * the Mention textarea + 240 counter never render (TC_CB_013).
 */

export const PATH = '/c/callback';
export const SUBMIT_URL = '**/ext/crm/contact/callBack';

// Inline validation messages keyed by field — CONFIRMED live copy.
export const ERROR = {
  name:   /please enter your (legal )?full name/i,
  email:  /check and enter a valid email/i,
  mobile: /correct 10 digit mobile number/i,
  state:  /please select state/i,
  city:   /please select city/i,
  store:  /please select store/i,
  reason: /please select reason for contact/i,
  date:   /please select date/i,
  time:   /please select time/i,
  mention:/mention your reason|please fill all required/i,
};

export class CallBackPage {
  constructor(page) {
    this.page = page;

    // ── Text inputs (exact placeholders — footer newsletter "Enter Email
    //    Address" also exists, so keep Email exact). ──
    this.heading    = page.getByRole('heading', { name: /call back/i });
    this.nameInput  = page.getByPlaceholder('Enter Name', { exact: true });
    this.emailInput = page.getByPlaceholder('Enter Email', { exact: true });
    this.mobileInput= page.getByPlaceholder('Enter Mobile Number', { exact: true });
    this.dateInput  = page.getByPlaceholder('Enter Date', { exact: true });
    this.mentionArea= page.locator('textarea').first();

    // ── Buttons / links ──
    this.submit      = page.getByRole('button', { name: /^submit$/i });
    this.tosLink     = page.getByRole('link', { name: /terms of service/i }).first();
    this.privacyLink = page.getByRole('link', { name: /privacy policy/i }).first();

    // ── Per-field inline error locators ──
    this.nameError   = page.getByText(ERROR.name).first();
    this.emailError  = page.getByText(ERROR.email).first();
    this.mobileError = page.getByText(ERROR.mobile).first();
    this.stateError  = page.getByText(ERROR.state).first();
    this.cityError   = page.getByText(ERROR.city).first();
    this.storeError  = page.getByText(ERROR.store).first();
    this.reasonError = page.getByText(ERROR.reason).first();
    this.dateError   = page.getByText(ERROR.date).first();
    this.timeError   = page.getByText(ERROR.time).first();

    this.charCounter = page.locator(':text-matches("\\d+\\s*/\\s*240")').first();

    // ── Submit result screens ──
    // Success: a transient toast "Form Submitted Successfully" then the form
    // resets. Error: "Failed to submit" + "Try Again".
    this.successToast       = page.getByText(/submitted successfully/i).first();
    this.errorScreenHeading = page.getByText(/failed to submit/i).first();
    this.tryAgainBtn        = page.getByRole('button', { name: /try again/i });
  }

  static PLACEHOLDER = {
    STATE: 'Select State', CITY: 'Select City', STORE: 'Select Store',
    REASON: 'Select Reason for Contact', TIME: 'Select Time',
  };

  async goto() {
    await this.page.goto(PATH, { waitUntil: 'domcontentloaded' });
    await this.heading.waitFor({ state: 'visible', timeout: 30_000 });
    await this.submit.waitFor({ state: 'visible', timeout: 15_000 });
    await this.page.waitForTimeout(1500); // Vue hydrates validation handlers after paint
  }

  // ---------- Field helpers ----------
  async fillName(v)   { await this.nameInput.fill(v); }
  async fillEmail(v)  { await this.emailInput.fill(v); }
  async fillMobile(v) { await this.mobileInput.fill(v); }

  async clickSubmit() {
    await this.submit.scrollIntoViewIfNeeded().catch(() => {});
    await this.submit.click();
    await this.page.waitForTimeout(600);
  }

  // ---------- Inline errors ----------
  async hasError(field) {
    const re = ERROR[field];
    if (!re) throw new Error(`Unknown error field: ${field}`);
    return this.page.getByText(re).first().isVisible().catch(() => false);
  }
  async errorMessage(field) {
    const re = ERROR[field];
    if (!re) throw new Error(`Unknown error field: ${field}`);
    const el = this.page.getByText(re).first();
    if (!(await el.isVisible().catch(() => false))) return '';
    return (await el.innerText().catch(() => '')).trim();
  }
  async allErrorTexts() {
    return this.page.locator('p, span, div').evaluateAll((els) =>
      [...new Set(els
        .map((e) => (e.childElementCount === 0 ? (e.textContent || '').trim() : ''))
        .filter((t) => /please (enter|check|select|fill)/i.test(t)))]
    ).catch(() => []);
  }
  async fieldHasErrorState(input) {
    return input.evaluate((el) => {
      const box = el.closest('[class*="field"], [class*="input"], .form-control') || el;
      const cls = (box.className || '') + ' ' + (el.className || '');
      if (/error|invalid|red/i.test(cls)) return true;
      const border = getComputedStyle(box).borderColor || getComputedStyle(el).borderColor;
      const m = border.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return false;
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      return r > 150 && g < 100 && b < 100;
    }).catch(() => false);
  }
  async errorIsRed(field) {
    return this.page.getByText(ERROR[field]).first().evaluate((n) => {
      const m = getComputedStyle(n).color.match(/\d+/g);
      return !!m && Number(m[0]) > 150 && Number(m[1]) < 100 && Number(m[2]) < 100;
    }).catch(() => false);
  }

  // ---------- Dropdowns ----------
  async selectFromDropdown(label, optionText) {
    const placeholder = CallBackPage.PLACEHOLDER[label] ?? label;
    await this.page.getByText(placeholder, { exact: true }).first().click();
    await this.page.waitForTimeout(400);
    await this.page.getByText(optionText, { exact: true }).first().click();
    await this.page.waitForTimeout(400);
  }
  async dropdownDisabled(label) {
    const placeholder = CallBackPage.PLACEHOLDER[label] ?? label;
    return this.page.getByText(placeholder, { exact: true }).first().evaluate((el) =>
      getComputedStyle(el.closest('div') || el).cursor === 'not-allowed'
    ).catch(() => false);
  }
  async dropdownOptions(label) {
    const placeholder = CallBackPage.PLACEHOLDER[label] ?? label;
    await this.page.getByText(placeholder, { exact: true }).first().click();
    await this.page.waitForTimeout(500);
    return this.page.locator('[class*="option"], [class*="dropdown"] p, li').evaluateAll((els) =>
      [...new Set(els.filter((e) => e.offsetParent !== null && e.childElementCount === 0)
        .map((e) => e.textContent.trim()).filter(Boolean))]);
  }
  async changeDropdown(currentValue, newOption) {
    await this.page.getByText(currentValue, { exact: true }).first().click();
    await this.page.waitForTimeout(400);
    await this.page.getByText(newOption, { exact: true }).first().click();
    await this.page.waitForTimeout(400);
  }
  async selectState(s) { await this.selectFromDropdown('STATE', s); }
  async selectCity(c)  { await this.selectFromDropdown('CITY', c); }
  async selectStore(s) { await this.selectFromDropdown('STORE', s); }
  async selectReason(r){ await this.selectFromDropdown('REASON', r); }

  // ---------- Date picker (mx-datepicker) ----------
  async pickFutureDate() {
    await this.dateInput.click();
    await this.page.waitForTimeout(500);
    await this.page
      .locator('.mx-datepicker-main td:not(.disabled):not(.not-current-month)')
      .filter({ hasText: /^\d+$/ }).last().click();
    await this.page.waitForTimeout(400);
    return (await this.dateInput.inputValue()).trim();
  }
  async datePickerDayCounts() {
    await this.dateInput.click();
    await this.page.waitForTimeout(500);
    return this.page.locator('.mx-datepicker-main').first().evaluate((pop) => {
      const cells = [...pop.querySelectorAll('td')].filter((c) => /^\d+$/.test(c.textContent.trim()) && !/not-current-month/.test(c.className));
      return {
        disabled: cells.filter((c) => /disabled/.test(c.className)).length,
        enabled:  cells.filter((c) => !/disabled/.test(c.className)).length,
      };
    });
  }

  // ---------- Time ----------
  async timeOptions() {
    await this.page.getByText('Select Time', { exact: true }).first().click();
    await this.page.waitForTimeout(500);
    return this.page.locator('[class*="option"], [class*="dropdown"] p, li').evaluateAll((els) =>
      [...new Set(els.filter((e) => e.offsetParent !== null && e.childElementCount === 0)
        .map((e) => e.textContent.trim()).filter((t) => /\d{1,2}:\d{2}/.test(t)))]);
  }
  async selectFirstTime() {
    await this.page.getByText('Select Time', { exact: true }).first().click();
    await this.page.waitForTimeout(500);
    const opt = this.page.locator('[class*="option"], [class*="dropdown"] p, li')
      .filter({ hasText: /\d{1,2}:\d{2}\s*(am|pm)/i }).first();
    const t = (await opt.innerText()).trim();
    await opt.click();
    await this.page.waitForTimeout(300);
    return t;
  }

  // ---------- Whole-form fill (happy path) ----------
  async fillValidForm(o = {}) {
    const v = {
      name: 'Anjali Singh', email: 'anjali@test.com', mobile: '9876543210',
      state: 'Maharashtra', city: 'Mumbai', store: 'Mumbai_Infinity Mall',
      reason: 'Product Enquiry', ...o,
    };
    await this.fillName(v.name);
    await this.fillEmail(v.email);
    await this.fillMobile(v.mobile);
    await this.selectState(v.state);
    await this.selectCity(v.city);
    await this.selectStore(v.store);
    await this.selectReason(v.reason);
    await this.pickFutureDate();
    await this.selectFirstTime();
  }

  // ---------- Submit result ----------
  async errorScreenShown() { return this.errorScreenHeading.isVisible().catch(() => false); }
  /** The success toast text (waits for it to appear; '' if it never shows). */
  async successMessage() {
    try {
      await this.successToast.waitFor({ state: 'visible', timeout: 5000 });
      return (await this.successToast.innerText()).trim();
    } catch { return ''; }
  }
  async formWasReset() {
    const name = await this.nameInput.inputValue().catch(() => 'x');
    return name === '' && !(await this.errorScreenShown());
  }

  async submitButtonStyle() {
    return this.submit.evaluate((el) => {
      const c = getComputedStyle(el);
      return { bg: c.backgroundColor, color: c.color, width: Math.round(el.getBoundingClientRect().width) };
    });
  }

  // ---------- Responsive / layout ----------
  async hasHorizontalScroll() {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
  }
  async sameRow(a, b) {
    const [ba, bb] = [await a.boundingBox(), await b.boundingBox()];
    if (!ba || !bb) return false;
    return Math.abs(ba.y - bb.y) < Math.max(ba.height, bb.height) * 0.5;
  }
  /** Bounding-box of a dropdown control by its placeholder (for same-row checks). */
  dropdownControl(label) {
    const placeholder = CallBackPage.PLACEHOLDER[label] ?? label;
    return this.page.getByText(placeholder, { exact: true }).first();
  }
}
