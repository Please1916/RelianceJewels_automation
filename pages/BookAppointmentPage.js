import { expect } from '@playwright/test';

/**
 * Page Object for the Book Appointment form at /c/book-appointment.
 *
 * ── SCAFFOLD NOTE ──────────────────────────────────────────────────────────
 * Selectors below were derived from the live screenshot + Figma (floating-label
 * form). They use accessible/placeholder locators that are resilient to markup,
 * but the custom dropdowns (State/City/Store/Reason/Time) and inline error nodes
 * MUST be confirmed with one live run — see `npm run test -- book-appointment`.
 * Adjust the `*_DROPDOWNS` openers / `errorText` regexes if the run reports
 * misses, then this POM is locked.
 *
 * Form layout (PRD 7.1 + Figma):
 *   NAME · EMAIL · [STATE | CITY] · STORE NAME · REASON FOR VISIT
 *   (Others → MENTION YOUR REASON textarea + char counter) · [DATE | TIME]
 *   · MOBILE NUMBER · Submit · ToS / Privacy Policy links
 *
 * Validation copy (from sheet; Figma differs slightly — regexes stay loose):
 *   name   : /please enter your.*full name/i
 *   email  : /valid email/i
 *   mobile : /correct 10 digit mobile/i
 *   select : /please select a (state|city|store|reason)/i
 *   date   : /select.*date/i
 *   time   : /select.*time/i
 *   reason : /mention your reason/i
 */

export const PATH = '/c/book-appointment';

// Inline validation messages keyed by field. CONFIRMED against the live form:
//   "Please enter your legal full name" · "Please check and enter a valid email ID"
//   "Please Select State/City/Store Name/Reason for Visit/Date/Time" (note: no "a")
//   "Please enter a correct 10 digit mobile number" · "Please fill Required field"
export const ERROR = {
  name:   /please enter your (legal )?full name/i,
  email:  /check and enter a valid email/i,
  mobile: /correct 10 digit mobile number/i,
  state:  /please select state/i,
  city:   /please select city/i,
  store:  /please select store name/i,
  reason: /please select reason for visit/i,
  mention:/mention your reason|please fill required field/i,
  date:   /please select date/i,
  time:   /please select time/i,
};

export class BookAppointmentPage {
  constructor(page) {
    this.page = page;

    // ── Text inputs (floating-label → placeholder visible when empty) ──
    // EXACT placeholders: a footer newsletter "Enter Email Address" input also
    // exists, so loose /enter email/i matches two elements — keep these exact.
    this.heading    = page.getByRole('heading', { name: /book appointment/i });
    this.nameInput  = page.getByPlaceholder('Enter Name', { exact: true });
    this.emailInput = page.getByPlaceholder('Enter Email', { exact: true });
    this.mobileInput= page.getByPlaceholder('Enter Mobile Number', { exact: true });
    this.dateInput  = page.getByPlaceholder('Enter date', { exact: true });
    this.mentionArea= page.locator('textarea').first();

    // ── Buttons / links ──
    this.submit       = page.getByRole('button', { name: /^submit$/i });
    // .first() — a footer also carries ToS/Privacy links; the form's come first.
    this.tosLink      = page.getByRole('link', { name: /terms of service/i }).first();
    this.privacyLink  = page.getByRole('link', { name: /privacy policy/i }).first();

    // ── Per-field inline error locators (each targets its exact message) ──
    this.nameError   = page.getByText(ERROR.name).first();
    this.emailError  = page.getByText(ERROR.email).first();
    this.mobileError = page.getByText(ERROR.mobile).first();
    this.stateError  = page.getByText(ERROR.state).first();
    this.cityError   = page.getByText(ERROR.city).first();
    this.storeError  = page.getByText(ERROR.store).first();
    this.reasonError = page.getByText(ERROR.reason).first();
    this.dateError   = page.getByText(ERROR.date).first();
    this.timeError   = page.getByText(ERROR.time).first();

    // ── Character counter (bottom-right of Mention textarea, e.g. "53/240") ──
    this.charCounter  = page.locator(':text-matches("\\d+\\s*/\\s*240")').first();

    // ── Submit result screens (CONFIRMED live) ──
    // Success (body === true): a transient toast "Form Submitted Successfully"
    // appears, then the form RESETS (no "Book Another" button).
    // Error (HTTP failure): heading "Failed to submit" + "Try Again" button.
    this.successToast       = page.getByText(/submitted successfully/i).first();
    this.errorScreenHeading = page.getByText(/failed to submit/i).first();
    this.tryAgainBtn        = page.getByRole('button', { name: /try again/i });
  }

  // CONFIRMED submit endpoint + payload shape (see TC_BA_050 notes).
  static SUBMIT_URL = '**/ext/crm/contact/bookAppointment';

  async goto() {
    await this.page.goto(PATH, { waitUntil: 'domcontentloaded' });
    await this.heading.waitFor({ state: 'visible', timeout: 30_000 });
    // The Vue form hydrates its submit/validation handlers a beat after paint;
    // submitting before that is a no-op (no errors render). Wait for hydration.
    await this.submit.waitFor({ state: 'visible', timeout: 15_000 });
    await this.page.waitForTimeout(1500);
  }

  // ---------- Generic field helpers ----------
  async fillName(v)   { await this.nameInput.fill(v); }
  async fillEmail(v)  { await this.emailInput.fill(v); }
  async fillMobile(v) { await this.mobileInput.fill(v); }

  async clickSubmit() {
    await this.submit.scrollIntoViewIfNeeded().catch(() => {});
    await this.submit.click();
    await this.page.waitForTimeout(600); // let client-side validation paint
  }

  // ---------- Inline errors ----------
  /** Is the validation error for `field` (a key of ERROR) currently visible? */
  async hasError(field) {
    const re = ERROR[field];
    if (!re) throw new Error(`Unknown error field: ${field}`);
    return this.page.getByText(re).first().isVisible().catch(() => false);
  }
  /** The actual inline error message text for `field` (or '' if none shown). */
  async errorMessage(field) {
    const re = ERROR[field];
    if (!re) throw new Error(`Unknown error field: ${field}`);
    const el = this.page.getByText(re).first();
    if (!(await el.isVisible().catch(() => false))) return '';
    return (await el.innerText().catch(() => '')).trim();
  }
  /** All visible inline validation strings on the form (for "all errors at once"). */
  async allErrorTexts() {
    return this.page.locator('p, span, div').evaluateAll((els) =>
      [...new Set(els
        .map((e) => (e.childElementCount === 0 ? (e.textContent || '').trim() : ''))
        .filter((t) => /please (enter|check|select|fill)/i.test(t)))]
    ).catch(() => []);
  }

  // ---------- Field validity styling (red border on error) ----------
  /** Does the input wrapper show an error/red state? Best-effort across markup. */
  async fieldHasErrorState(input) {
    return input.evaluate((el) => {
      const box = el.closest('[class*="field"], [class*="input"], .form-control') || el;
      const cls = (box.className || '') + ' ' + (el.className || '');
      if (/error|invalid|red/i.test(cls)) return true;
      const border = getComputedStyle(box).borderColor || getComputedStyle(el).borderColor;
      // crude red detection: high R, low G/B
      const m = border.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return false;
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      return r > 150 && g < 100 && b < 100;
    }).catch(() => false);
  }

  // ---------- Custom dropdowns (State → City → Store → Reason → Time) ----------
  // CONFIRMED markup: each is a <div> wrapping a <p> placeholder ("Select State",
  // …) + a chevron <img>. The <p> text becomes the selected value after pick.
  // Disabled dropdowns carry CSS `cursor: not-allowed` (enabled = `pointer`).
  static PLACEHOLDER = {
    STATE: 'Select State', CITY: 'Select City', 'STORE NAME': 'Select Store Name',
    'REASON FOR VISIT': 'Select Reason for Visit', TIME: 'Select Time',
  };
  /** The clickable control <div> for a dropdown, located via its placeholder <p>. */
  dropdown(label) {
    const placeholder = BookAppointmentPage.PLACEHOLDER[label] ?? label;
    return this.page.getByText(placeholder, { exact: true }).first().locator('xpath=ancestor::div[1]');
  }
  async selectFromDropdown(label, optionText) {
    const placeholder = BookAppointmentPage.PLACEHOLDER[label] ?? label;
    await this.page.getByText(placeholder, { exact: true }).first().click();
    await this.page.waitForTimeout(400);
    await this.page.getByText(optionText, { exact: true }).first().click();
    await this.page.waitForTimeout(400);
  }
  /** Is a dropdown disabled — detected via `cursor: not-allowed` on the control. */
  async dropdownDisabled(label) {
    const placeholder = BookAppointmentPage.PLACEHOLDER[label] ?? label;
    return this.page.getByText(placeholder, { exact: true }).first().evaluate((el) => {
      const box = el.closest('div') || el;
      return getComputedStyle(box).cursor === 'not-allowed';
    }).catch(() => false);
  }

  // ---------- Mention / Reason=Others ----------
  async selectReason(text) { await this.selectFromDropdown('REASON FOR VISIT', text); }
  async mentionVisible()   { return this.mentionArea.isVisible().catch(() => false); }
  async counterText()      { return (await this.charCounter.innerText().catch(() => '')).trim(); }

  async selectState(s) { await this.selectFromDropdown('STATE', s); }
  async selectCity(c)   { await this.selectFromDropdown('CITY', c); }
  async selectStore(s)  { await this.selectFromDropdown('STORE NAME', s); }

  /** Re-open an already-selected dropdown (its label now shows the chosen value,
   *  not the placeholder) and pick a different option. */
  async changeDropdown(currentValue, newOption) {
    await this.page.getByText(currentValue, { exact: true }).first().click();
    await this.page.waitForTimeout(400);
    await this.page.getByText(newOption, { exact: true }).first().click();
    await this.page.waitForTimeout(400);
  }

  /** Options currently listed under a dropdown (open it, read leaf nodes, …). */
  async dropdownOptions(label) {
    const placeholder = BookAppointmentPage.PLACEHOLDER[label] ?? label;
    await this.page.getByText(placeholder, { exact: true }).first().click();
    await this.page.waitForTimeout(500);
    return this.page.locator('[class*="option"], [class*="dropdown"] p, li').evaluateAll((els) =>
      [...new Set(els.filter((e) => e.offsetParent !== null && e.childElementCount === 0)
        .map((e) => e.textContent.trim()).filter(Boolean))]);
  }

  // ---------- Date picker (vue2 mx-datepicker; popup = .mx-datepicker-main) ----------
  /** Open picker, pick the last selectable (future) day, return the field value. */
  async pickFutureDate() {
    await this.dateInput.click();
    await this.page.waitForTimeout(500);
    await this.page
      .locator('.mx-datepicker-main td:not(.disabled):not(.not-current-month)')
      .filter({ hasText: /^\d+$/ }).last().click();
    await this.page.waitForTimeout(400);
    return (await this.dateInput.inputValue()).trim();
  }
  /** Counts of disabled (past/today) vs enabled (future) day cells — for TC_BA_037. */
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

  // ---------- Time dropdown (enabled once Store + Date are set) ----------
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
      state: 'Maharashtra', city: 'Mumbai', store: null,
      reason: 'Product Enquiry', ...o,
    };
    await this.fillName(v.name);
    await this.fillEmail(v.email);
    await this.fillMobile(v.mobile);
    await this.selectState(v.state);
    await this.selectCity(v.city);
    // Store cascade is unreliable on live — pick first available option, skip if none.
    const availableStores = await this.dropdownOptions('STORE NAME').catch(() => []);
    if (availableStores.length > 0) {
      await this.selectFromDropdown('STORE NAME', availableStores[0]);
    }
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
  /** Success = form reset (Name cleared) and no error screen. */
  async formWasReset() {
    const name = await this.nameInput.inputValue().catch(() => 'x');
    return name === '' && !(await this.errorScreenShown());
  }

  // ---------- Submit button style (TC_BA_004) ----------
  async submitButtonStyle() {
    return this.submit.evaluate((el) => {
      const c = getComputedStyle(el);
      return { bg: c.backgroundColor, color: c.color, width: Math.round(el.getBoundingClientRect().width) };
    });
  }

  /** Is the inline error text for `field` rendered in red? (TC_BA_043) */
  async errorIsRed(field) {
    return this.page.getByText(ERROR[field]).first().evaluate((n) => {
      const m = getComputedStyle(n).color.match(/\d+/g);
      return !!m && Number(m[0]) > 150 && Number(m[1]) < 100 && Number(m[2]) < 100;
    }).catch(() => false);
  }

  // ---------- Responsive ----------
  async hasHorizontalScroll() {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
  }

  /** Are two locators laid out in the same row (vertical overlap)? */
  async sameRow(a, b) {
    const [ba, bb] = [await a.boundingBox(), await b.boundingBox()];
    if (!ba || !bb) return false;
    return Math.abs(ba.y - bb.y) < Math.max(ba.height, bb.height) * 0.5;
  }
}
