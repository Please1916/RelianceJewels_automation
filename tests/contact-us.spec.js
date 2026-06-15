import { test, expect } from '@playwright/test';
import { ContactUsPage } from '../pages/ContactUsPage.js';

/**
 * Contact Us — P0 + P1 suite (live: /c/contact-us).
 * Each test maps 1:1 to a TC_CU_* ID.
 *
 * Contact Us is the simplest form of the three — only Name, Email, Mobile and
 * Reason for Contact (no cascade, no date/time, no message textarea). So the
 * cascade/date-time cases from the Call Back sheet do not apply here.
 *
 * Verified live 2026-06-10. Submit endpoint: POST /ext/crm/contact/contactUs
 * → body `true`; success toast "Form Submitted Successfully" then form resets.
 * Route-mocked here (deterministic, no real CRM leads).
 *
 * test.fixme = blocked by a confirmed spec-vs-live gap or env need:
 *   - No "Others" reason option live → TC_CU_010
 *   - Name length not enforced live → TC_CU_006
 *   - Auto-fill needs a REAL session → TC_CU_004 (run npm run auth:login)
 */

test.use({ ignoreHTTPSErrors: true });
test.describe.configure({ timeout: 90_000 });

const SUBMIT = '**/ext/crm/contact/contactUs';

test.beforeEach(async ({ page }) => {
  await new ContactUsPage(page).goto();
});

// ===========================================================================
// FORM STRUCTURE (001)
// ===========================================================================

test('TC_CU_001 | P1 | Heading CONTACT US uppercase + Submit full-width dark red', async ({ page }) => {
  const cu = new ContactUsPage(page);
  const heading = (await cu.heading.innerText()).trim();
  console.log(`[TC_CU_001] heading="${heading}"`);
  expect(heading).toBe(heading.toUpperCase());
  expect(heading).toMatch(/contact us/i);
  const s = await cu.submitButtonStyle();
  console.log(`[TC_CU_001] submit style ${JSON.stringify(s)}`);
  expect(s.color).toMatch(/255,\s*255,\s*255/);
  const [r, g, b] = (s.bg.match(/\d+/g) || []).map(Number);
  expect(r).toBeGreaterThan(100); expect(g).toBeLessThan(80); expect(b).toBeLessThan(80);
});

// ===========================================================================
// HAPPY PATH (002, 003)
// ===========================================================================

test('TC_CU_002 | P0 | Logged-in submission succeeds (success toast)', async ({ page, context }) => {
  await context.route('**/user/authentication/v1.0/session**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true }) }));
  const cu = new ContactUsPage(page);
  await page.route(SUBMIT, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'true' }));
  await cu.goto();
  await cu.fillValidForm();
  await cu.clickSubmit();     
  const msg = await cu.successMessage();
  console.log(`[TC_CU_002] logged-in submit → success toast: "${msg}"`);
  expect(msg).toMatch(/submitted successfully/i);
  expect(await cu.formWasReset()).toBe(true);
});

test('TC_CU_003 | P0 | Guest submits all fields manually — success', async ({ page }) => {
  const cu = new ContactUsPage(page);
  await page.route(SUBMIT, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'true' }));
  await cu.fillValidForm();
  await cu.clickSubmit();
  const msg = await cu.successMessage();
  console.log(`[TC_CU_003] guest submit → success toast: "${msg}"`);
  expect(msg).toMatch(/submitted successfully/i);
  expect(await cu.errorScreenShown()).toBe(false);
  expect(await cu.formWasReset()).toBe(true);
});

// Auto-fill needs a REAL session — the SPA stub flips login but doesn't prefill.
test.fixme('TC_CU_004 | P1 | Name, Email, Mobile auto-filled for logged-in user', async () => {});

// ===========================================================================
// NAME (005, 006)
// ===========================================================================

test('TC_CU_005 | P0 | Name empty / numbers / special chars all error', async ({ page }) => {
  const cu = new ContactUsPage(page);
  await cu.clickSubmit();
  console.log(`[TC_CU_005] empty → "${await cu.errorMessage('name')}"`);
  await expect(cu.nameError).toBeVisible();
  await cu.fillName('Rahul123');
  await cu.clickSubmit();
  console.log(`[TC_CU_005] 'Rahul123' → "${await cu.errorMessage('name')}"`);
  await expect(cu.nameError).toBeVisible();
  await cu.fillName('Rahul@');
  await cu.clickSubmit();
  console.log(`[TC_CU_005] 'Rahul@' → "${await cu.errorMessage('name')}"`);
  await expect(cu.nameError).toBeVisible();
});

// GAP: live accepts a 1-char name and does NOT cap at 100 (spec wants 2–100).
test.fixme('TC_CU_006 | P1 | Name boundary — 2 valid, 1 invalid, 100 valid, 101 rejected', async () => {});

// ===========================================================================
// EMAIL & MOBILE (007, 008)
// ===========================================================================

test('TC_CU_007 | P0 | Invalid email and mobile starting with 5 show errors', async ({ page }) => {
  const cu = new ContactUsPage(page);
  await cu.fillEmail('invalid-email');
  await cu.fillMobile('5123456789');
  await cu.clickSubmit();
  console.log(`[TC_CU_007] email: "${await cu.errorMessage('email')}" | mobile: "${await cu.errorMessage('mobile')}"`);
  await expect(cu.emailError).toBeVisible();
  await expect(cu.mobileError).toBeVisible();
});

test('TC_CU_008 | P0 | Empty email and empty mobile both error on submit', async ({ page }) => {
  const cu = new ContactUsPage(page);
  await cu.clickSubmit();
  console.log(`[TC_CU_008] email: "${await cu.errorMessage('email')}" | mobile: "${await cu.errorMessage('mobile')}"`);
  await expect(cu.emailError).toBeVisible();
  await expect(cu.mobileError).toBeVisible();
});

// ===========================================================================
// REASON (009, 010)
// ===========================================================================

test('TC_CU_009 | P0 | Reason not selected shows error; list is data-driven', async ({ page }) => {
  const cu = new ContactUsPage(page);
  await cu.clickSubmit();
  console.log(`[TC_CU_009] no reason → "${await cu.errorMessage('reason')}"`);
  await expect(cu.reasonError).toBeVisible();
  const opts = await cu.reasonOptions();
  console.log(`[TC_CU_009] reason options (${opts.length}): ${opts.slice(0, 5).join(', ')}…`);
  expect(opts.length).toBeGreaterThan(0);
});

// GAP: live reason list has no "Others" → no Mention field on Contact Us.
test.fixme('TC_CU_010 | P0 | Reason=Others → Mention mandatory, counter, max 240', async () => {});

// ===========================================================================
// UX — ERROR STATE (011)
// ===========================================================================

test('TC_CU_011 | P1 | Red error border on invalid; cleared after correction', async ({ page }) => {
  const cu = new ContactUsPage(page);
  await cu.clickSubmit();
  const before = await cu.fieldHasErrorState(cu.nameInput);
  console.log(`[TC_CU_011] empty submit → name red border=${before}`);
  expect(before).toBe(true);
  await cu.fillName('Anjali Singh');
  await cu.clickSubmit();
  expect(await cu.fieldHasErrorState(cu.nameInput)).toBe(false);
});

// ===========================================================================
// SUCCESS & API ERROR (012), ALL-EMPTY (013), CRM (014)
// ===========================================================================

test('TC_CU_012 | P0 | Success toast; API error shows Failed-to-submit + Try Again', async ({ page }) => {
  const cu = new ContactUsPage(page);
  await page.route(SUBMIT, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'true' }));
  await cu.fillValidForm();
  await cu.clickSubmit();
  const msg = await cu.successMessage();
  console.log(`[TC_CU_012] success toast: "${msg}"`);
  expect(msg).toMatch(/submitted successfully/i);
  // API error
  await page.unroute(SUBMIT);
  await page.route(SUBMIT, (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));
  await cu.fillValidForm();
  await cu.clickSubmit();
  // Web-first assertions retry until the error screen renders — no fixed sleep.
  await expect(cu.errorScreenHeading).toBeVisible();
  await expect(cu.tryAgainBtn).toBeVisible();
});

test('TC_CU_013 | P0 | All fields empty — all validation errors shown at once', async ({ page }) => {
  const cu = new ContactUsPage(page);
  await cu.clickSubmit();
  await expect(page).toHaveURL(/contact-us/);
  const errs = await cu.allErrorTexts();
  console.log(`[TC_CU_013] all errors (${errs.length}): ${errs.join(' | ')}`);
  expect(errs.length).toBeGreaterThanOrEqual(3);
});

test('TC_CU_014 | P0 | Submit payload carries contact-us data (CRM)', async ({ page }) => {
  const cu = new ContactUsPage(page);
  let payload = null, url = '';
  await page.route(SUBMIT, (r) => {
    payload = r.request().postDataJSON();
    url = r.request().url();
    r.fulfill({ status: 200, contentType: 'application/json', body: 'true' });
  });
  await cu.fillValidForm();
  await cu.clickSubmit();
  // Wait until the submit request has fired and the payload is captured.
  await expect.poll(() => payload, { timeout: 8000 }).not.toBeNull();
  console.log('[TC_CU_014] endpoint =', url, '| payload =', JSON.stringify(payload));
  expect(url).toMatch(/\/ext\/crm\/contact\/contactUs/); // distinguishes contact-us from the other forms
  expect(payload).toMatchObject({ name: 'Anjali Singh', email: 'anjali@test.com', mobileNumber: '9876543210' });
  expect(payload.reasonForVisit).toBeTruthy(); // backend reason ID
  // SPEC DEVIATION: no `lead_type`/`source`; payload also carries a stray
  // `birthdate` defaulted to today (no birthdate field exists on the form).
});
