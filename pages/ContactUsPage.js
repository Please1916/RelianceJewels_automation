import { expect } from '@playwright/test';

/**
 * Page Object for the Contact Us form at /c/contact-us.
 *
 * Same form engine as Book Appointment / Call Back, but the SIMPLEST of the
 * three — only four fields (verified live 2026-06-10):
 *   Name · Email · Mobile · Reason for Contact (dropdown)
 *   NO State/City/Store cascade · NO Date/Time · NO message textarea.
 *
 *   - submit  : POST /ext/crm/contact/contactUs  → body `true` on success
 *   - success : transient toast "Form Submitted Successfully" then form resets
 *   - error   : "Failed to submit" + "Try Again"
 *
 * GAP (shared): reason list has NO "Others" → no Mention field (TC_CU_010).
 */

export const PATH = '/c/contact-us';
export const SUBMIT_URL = '**/ext/crm/contact/contactUs';

// Inline validation messages — CONFIRMED live copy.
export const ERROR = {
  name:   /please enter your (legal )?full name/i,
  email:  /check and enter a valid email/i,
  mobile: /correct 10 digit mobile number/i,
  reason: /please select reason for contact/i,
};

export class ContactUsPage {
  constructor(page) {
    this.page = page;

    this.heading    = page.getByRole('heading', { name: /contact us/i });
    this.nameInput  = page.getByPlaceholder('Enter Name', { exact: true });
    this.emailInput = page.getByPlaceholder('Enter Email', { exact: true });
    this.mobileInput= page.getByPlaceholder('Enter Mobile Number', { exact: true });

    this.submit      = page.getByRole('button', { name: /^submit$/i });
    this.tosLink     = page.getByRole('link', { name: /terms of service/i }).first();
    this.privacyLink = page.getByRole('link', { name: /privacy policy/i }).first();

    this.nameError   = page.getByText(ERROR.name).first();
    this.emailError  = page.getByText(ERROR.email).first();
    this.mobileError = page.getByText(ERROR.mobile).first();
    this.reasonError = page.getByText(ERROR.reason).first();

    this.successToast       = page.getByText(/submitted successfully/i).first();
    this.errorScreenHeading = page.getByText(/failed to submit/i).first();
    this.tryAgainBtn        = page.getByRole('button', { name: /try again/i });
  }

  static REASON_PLACEHOLDER = 'Select Reason for Contact';

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

  async selectReason(text) {
    await this.page.getByText(ContactUsPage.REASON_PLACEHOLDER, { exact: true }).first().click();
    await this.page.waitForTimeout(400);
    await this.page.getByText(text, { exact: true }).first().click();
    await this.page.waitForTimeout(400);
  }
  async reasonOptions() {
    await this.page.getByText(ContactUsPage.REASON_PLACEHOLDER, { exact: true }).first().click();
    await this.page.waitForTimeout(500);
    return this.page.locator('[class*="option"], [class*="dropdown"] p, li').evaluateAll((els) =>
      [...new Set(els.filter((e) => e.offsetParent !== null && e.childElementCount === 0)
        .map((e) => e.textContent.trim()).filter(Boolean))]);
  }

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

  // ---------- Whole-form fill (happy path) ----------
  async fillValidForm(o = {}) {
    const v = { name: 'Anjali Singh', email: 'anjali@test.com', mobile: '9876543210', reason: 'Product Enquiry', ...o };
    await this.fillName(v.name);
    await this.fillEmail(v.email);
    await this.fillMobile(v.mobile);
    await this.selectReason(v.reason);
  }

  // ---------- Submit result ----------
  async errorScreenShown() { return this.errorScreenHeading.isVisible().catch(() => false); }
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
}
