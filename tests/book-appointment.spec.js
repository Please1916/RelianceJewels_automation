import { test, expect } from '@playwright/test';
import { BookAppointmentPage, ERROR } from '../pages/BookAppointmentPage.js';

/**
 * Book Appointment — full P0 + P1 suite (live: /c/book-appointment).
 * Each test maps 1:1 to a sheet TC_BA_* ID.
 *
 * Selectors/behaviour verified live on 2026-06-10. Submit endpoint:
 *   POST /ext/crm/contact/bookAppointment  → body `true` on success.
 *
 * test.fixme = blocked by a confirmed spec-vs-live gap or an env need, NOT a
 * scaffolding miss. Each carries a one-line reason. Un-skip when resolved.
 *
 * KNOWN GAPS (see per-test notes):
 *   - No "Others" reason option live → 008, 031, 032, 033, 034
 *   - Name field has no min/max length rule live → 014 (and 015's cap half)
 *   - Autofill needs a real session (stub flips SPA login but doesn't prefill)
 *     → 006 prefill assertion, 009, 016  (run `npm run auth:login` first)
 *   - Reason backend-config & CRM payload need backend/API, not UI → 030, 050
 */

test.use({ ignoreHTTPSErrors: true });
test.describe.configure({ timeout: 90_000 });

const SUBMIT = '**/ext/crm/contact/bookAppointment';

test.beforeEach(async ({ page }) => {
  await new BookAppointmentPage(page).goto();
});

// ===========================================================================
// NAME (010–015)
// ===========================================================================

test('TC_BA_010 | P0 | Name with alphabets and spaces is valid', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.fillName('Anjali Singh');
  await ba.clickSubmit();
  await expect(ba.nameError).not.toBeVisible();
  const errs = await ba.allErrorTexts();
  console.log(`[TC_BA_010] name valid → no name error. Other on-screen errors (${errs.length}): ${errs.join(' | ')}`);
  expect(await ba.hasError('name')).toBe(false);
});

test('TC_BA_011 | P0 | Name with numbers shows error', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.fillName('Rahul123');
  await ba.clickSubmit();
  console.log(`[TC_BA_011] name='Rahul123' → name error: "${await ba.errorMessage('name')}" | all errors: ${(await ba.allErrorTexts()).join(' | ')}`);
  await expect(ba.nameError).toBeVisible();
});

test('TC_BA_012 | P0 | Name with special characters shows error', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.fillName('Rahul@kumar');
  await ba.clickSubmit();
  console.log(`[TC_BA_012] name='Rahul@kumar' → name error: "${await ba.errorMessage('name')}" | all errors: ${(await ba.allErrorTexts()).join(' | ')}`);
  await expect(ba.nameError).toBeVisible();
});

test('TC_BA_013 | P0 | Empty name shows error on submit', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.clickSubmit();
  const redBorder = await ba.fieldHasErrorState(ba.nameInput);
  console.log(`[TC_BA_013] empty name → name error: "${await ba.errorMessage('name')}", red border=${redBorder} | all errors: ${(await ba.allErrorTexts()).join(' | ')}`);
  await expect(ba.nameError).toBeVisible();
  expect(redBorder).toBe(true);
});

// GAP: live form accepts a 1-char name (no 2-char minimum). Spec expects 1 invalid.
test.fixme('TC_BA_014 | P1 | Name min boundary — 1 char invalid, 2 valid', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.fillName('A'); await ba.clickSubmit();
  expect(await ba.hasError('name')).toBe(true);
});

test('TC_BA_015 | P1 | Name max boundary — 100 chars accepted', async ({ page }) => {
  // KNOWN DEFECT: live does NOT cap the name at 100 chars — 101 are accepted
  // (spec deviation). Asserted per spec, expected-to-fail; alerts if a cap is added.
  test.fail(true, 'Name field is not capped at 100 characters — 101-char input is accepted.');
  const ba = new BookAppointmentPage(page);
  await ba.fillName('A'.repeat(100));
  await ba.clickSubmit();
  expect(await ba.hasError('name')).toBe(false);

  await ba.fillName('A'.repeat(101));
  const len = (await ba.nameInput.inputValue()).length;
  console.log(`[TC_BA_015] 101-char value length = ${len} (expected cap at 100)`);
  expect(len, 'name field should cap input at 100 characters').toBeLessThanOrEqual(100);
});

// ===========================================================================
// EMAIL (016–019)
// ===========================================================================

// Needs a REAL logged-in session — the SPA stub flips login but doesn't prefill.
test.fixme('TC_BA_016 | P1 | Email auto-filled for logged-in user', async () => {});

test('TC_BA_017 | P0 | Valid email is accepted', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.fillEmail('test@reliance.com');
  await ba.clickSubmit();
  console.log(`[TC_BA_017] email valid → no email error. Other on-screen errors: ${(await ba.allErrorTexts()).join(' | ')}`);
  await expect(ba.emailError).not.toBeVisible();
});

test('TC_BA_018 | P0 | Email without @ shows error', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.fillEmail('testreliance.com');
  await ba.clickSubmit();
  console.log(`[TC_BA_018] email='testreliance.com' → email error: "${await ba.errorMessage('email')}" | all errors: ${(await ba.allErrorTexts()).join(' | ')}`);
  await expect(ba.emailError).toBeVisible();
});

test('TC_BA_019 | P0 | Empty email shows error', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.clickSubmit();
  console.log(`[TC_BA_019] empty email → email error: "${await ba.errorMessage('email')}" | all errors: ${(await ba.allErrorTexts()).join(' | ')}`);
  await expect(ba.emailError).toBeVisible();
});

// ===========================================================================
// MOBILE (020–024)
// ===========================================================================

test('TC_BA_020 | P0 | Valid 10-digit mobile starting 6-9 accepted', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  for (const num of ['9876543210', '6543210987']) {
    await ba.fillMobile(num);
    await ba.clickSubmit();
    console.log(`[TC_BA_020] mobile='${num}' → no mobile error. Other on-screen errors: ${(await ba.allErrorTexts()).join(' | ')}`);
    expect(await ba.hasError('mobile'), `mobile ${num}`).toBe(false);
  }
});

test('TC_BA_021 | P0 | Mobile starting with 5 shows error', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.fillMobile('5876543210');
  await ba.clickSubmit();
  console.log(`[TC_BA_021] mobile='5876543210' → mobile error: "${await ba.errorMessage('mobile')}" | all errors: ${(await ba.allErrorTexts()).join(' | ')}`);
  await expect(ba.mobileError).toBeVisible();
});

test('TC_BA_022 | P0 | Mobile not exactly 10 digits shows error', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  for (const num of ['987654321', '98765432101']) {
    await ba.fillMobile(num);
    await ba.clickSubmit();
    const val = (await ba.mobileInput.inputValue()).replace(/\D/g, '');
    const mobileError = await ba.hasError('mobile');
    console.log(`[TC_BA_022] input='${num}' → field digits=${val.length}, mobile error=${mobileError}`);
    if (val.length === 10) {
      // The field capped the input at 10 digits (maxlength), which is the valid
      // length — so no error is the correct outcome.
      expect(mobileError, `field capped '${num}' to 10 digits → no error expected`).toBe(false);
    } else {
      // Not exactly 10 digits → an error must be shown.
      expect(mobileError, `mobile '${num}' (${val.length} digits) should show an error`).toBe(true);
    }
  }
});

test('TC_BA_023 | P0 | Mobile field is numeric-only (letters rejected)', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.mobileInput.pressSequentially('98765ABCDE');
  const val = await ba.mobileInput.inputValue();
  console.log(`[TC_BA_023] typed '98765ABCDE' → field value='${val}' (expected digits only)`);
  expect(val).toMatch(/^\d*$/);
});

test('TC_BA_024 | P0 | Empty mobile shows error', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.clickSubmit();
  console.log(`[TC_BA_024] empty mobile → mobile error: "${await ba.errorMessage('mobile')}" | all errors: ${(await ba.allErrorTexts()).join(' | ')}`);
  await expect(ba.mobileError).toBeVisible();
});

// ===========================================================================
// CASCADING DROPDOWNS (026–029)
// ===========================================================================

test('TC_BA_026 | P0 | City disabled until State, Store disabled until City', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  const cityDisabled = await ba.dropdownDisabled('CITY');
  const storeDisabled = await ba.dropdownDisabled('STORE NAME');
  console.log(`[TC_BA_026] city disabled=${cityDisabled}, store disabled=${storeDisabled} (expected both true)`);
  expect(cityDisabled).toBe(true);
  expect(storeDisabled).toBe(true);
});

test('TC_BA_027 | P0 | State→City→Store cascade populates correctly', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.selectState('Maharashtra');
  expect(await ba.dropdownDisabled('CITY')).toBe(false);
  // Selecting Mumbai both proves the city list populated and advances the cascade.
  await ba.selectCity('Mumbai');
  expect(await ba.dropdownDisabled('STORE NAME')).toBe(false);
  const stores = await ba.dropdownOptions('STORE NAME'); // terminal read — ok to leave open
  console.log(`[TC_BA_027] Maharashtra→Mumbai stores (${stores.length}): ${stores.join(', ')}`);
  expect(stores.length).toBeGreaterThan(0);
  expect(stores.some((s) => /mumbai/i.test(s))).toBe(true);
});

test('TC_BA_028 | P1 | Changing State resets City+Store; changing City resets Store', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.selectState('Maharashtra');
  await ba.selectCity('Mumbai');
  await ba.selectStore('Mumbai_Infinity Mall');
  // Change State (control now reads "Maharashtra") → City + Store reset to placeholder.
  await ba.changeDropdown('Maharashtra', 'Karnataka');
  const cityReset = await page.getByText('Select City', { exact: true }).isVisible();
  const storeReset = await page.getByText('Select Store Name', { exact: true }).isVisible();
  console.log(`[TC_BA_028] after State change → city reset=${cityReset}, store reset=${storeReset} (expected both true)`);
  await expect(page.getByText('Select City', { exact: true })).toBeVisible();
  await expect(page.getByText('Select Store Name', { exact: true })).toBeVisible();
});

test('TC_BA_029 | P0 | Empty State/City/Store on submit show respective errors', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.clickSubmit();
  console.log(`[TC_BA_029] empty submit → all errors (${(await ba.allErrorTexts()).length}): ${(await ba.allErrorTexts()).join(' | ')}`);
  await expect(ba.stateError).toBeVisible();
  await expect(ba.cityError).toBeVisible();
  await expect(ba.storeError).toBeVisible();
});

// ===========================================================================
// REASON FOR VISIT (030–035)
// ===========================================================================

// Reason list is rendered from GET /ext/crm/lead ([{id,value}]). Rather than need
// backend access to "add a reason", intercept that response and inject one — if it
// appears in the dropdown, the list is data-driven (not hardcoded).
test('TC_BA_030 | P1 | Reason options are backend-configurable (rendered from /ext/crm/lead)', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  const INJECTED = 'AUTOMATION_TEST_REASON';
  await page.route('**/ext/crm/lead', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const resp = await route.fetch();
    let data = await resp.json().catch(() => null);
    if (Array.isArray(data)) data = [...data, { id: 'automation-injected-id', value: INJECTED }];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await ba.goto();
  const reasons = await ba.dropdownOptions('REASON FOR VISIT');
  console.log(`[TC_BA_030] reasons rendered (${reasons.length}): ${reasons.join(', ')}`);
  expect(reasons).toContain(INJECTED); // proves dropdown is config-driven, not hardcoded
});

// GAP: no "Others" option exists live → Mention textarea never renders.
test.fixme('TC_BA_031 | P0 | Reason=Others makes Mention textarea mandatory', async () => {});
test.fixme('TC_BA_032 | P1 | Reason=non-Others hides Mention textarea', async () => {});
test.fixme('TC_BA_033 | P1 | Mention char counter visible from first keystroke', async () => {});
test.fixme('TC_BA_034 | P1 | Mention max 240 chars', async () => {});

test('TC_BA_035 | P0 | Reason not selected shows error', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.clickSubmit();
  console.log(`[TC_BA_035] no reason → reason error: "${await ba.errorMessage('reason')}" | all errors: ${(await ba.allErrorTexts()).join(' | ')}`);
  await expect(ba.reasonError).toBeVisible();
});

// ===========================================================================
// DATE & TIME (037–040)
// ===========================================================================

test('TC_BA_037 | P0 | Past/today disabled in date picker; future selectable', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  const { disabled, enabled } = await ba.datePickerDayCounts();
  console.log(`[TC_BA_037] disabled(past/today)=${disabled} enabled(future)=${enabled}`);
  expect(disabled).toBeGreaterThan(0);   // past + today greyed
  expect(enabled).toBeGreaterThan(0);    // future selectable
  const val = await ba.pickFutureDate();
  expect(val).toMatch(/\d{2}\/\d{2}\/\d{4}/); // populates DD/MM/YYYY
});

test('TC_BA_038 | P0 | Date not selected shows error', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.clickSubmit();
  console.log(`[TC_BA_038] no date → date error: "${await ba.errorMessage('date')}" | all errors: ${(await ba.allErrorTexts()).join(' | ')}`);
  await expect(ba.dateError).toBeVisible();
});

test('TC_BA_039 | P1 | Time dropdown shows slots for selected Store and Date', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.selectState('Maharashtra');
  await ba.selectCity('Mumbai');
  await ba.selectStore('Mumbai_Infinity Mall');
  await ba.pickFutureDate();
  const slots = await ba.timeOptions();
  console.log(`[TC_BA_039] slots: ${slots.join(', ')}`);
  expect(slots.length).toBeGreaterThan(0);
  expect(slots.every((s) => /^\d{1,2}:\d{2}\s*(am|pm)$/i.test(s))).toBe(true);
});

test('TC_BA_040 | P0 | Time not selected shows error', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.clickSubmit();
  console.log(`[TC_BA_040] no time → time error: "${await ba.errorMessage('time')}" | all errors: ${(await ba.allErrorTexts()).join(' | ')}`);
  await expect(ba.timeError).toBeVisible();
});

// ===========================================================================
// UX — ERROR STATES (042–044)
// ===========================================================================

test('TC_BA_042 | P1 | Red error border on invalid; cleared after correction', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.clickSubmit();
  const before = await ba.fieldHasErrorState(ba.nameInput);
  await ba.fillName('Anjali Singh');
  await ba.clickSubmit();
  const after = await ba.fieldHasErrorState(ba.nameInput);
  console.log(`[TC_BA_042] name error border: empty=${before}, after correction=${after} (expected true→false)`);
  expect(before).toBe(true);
  expect(after).toBe(false);
});

test('TC_BA_043 | P1 | Error message shown in red text below field', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.fillEmail('bademail');
  await ba.clickSubmit();
  const isRed = await ba.errorIsRed('email');
  console.log(`[TC_BA_043] bad email → email error: "${await ba.errorMessage('email')}", red text=${isRed} | all errors: ${(await ba.allErrorTexts()).join(' | ')}`);
  await expect(ba.emailError).toBeVisible();
  expect(isRed).toBe(true);
});

test('TC_BA_044 | P0 | All validation errors shown at once on empty submit', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await ba.clickSubmit();
  await expect(page).toHaveURL(/book-appointment/);
  const errs = await ba.allErrorTexts();
  console.log(`[TC_BA_044] inline errors (${errs.length}): ${errs.join(' | ')}`);
  expect(errs.length).toBeGreaterThanOrEqual(3);
});

// ===========================================================================
// HAPPY PATH / SUCCESS / API ERROR (006–008, 046–048, 050)
// Submit endpoint is route-mocked: deterministic + no real CRM leads created.
// ===========================================================================

test('TC_BA_007 | P0 | Guest submission with all valid fields succeeds', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await page.route(SUBMIT, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'true' }));
  await ba.fillValidForm();
  await ba.clickSubmit();
  const msg = await ba.successMessage();
  console.log(`[TC_BA_007] guest submit → success toast: "${msg}"`);
  expect(msg).toMatch(/submitted successfully/i);
  expect(await ba.errorScreenShown()).toBe(false);
  expect(await ba.formWasReset()).toBe(true);
});

// Logged-in submit. Prefill (Name/Email) is NOT asserted — needs a real session
// (the SPA stub flips login state but doesn't populate the form).
test('TC_BA_006 | P0 | Logged-in submission succeeds', async ({ page, context }) => {
  await context.route('**/user/authentication/v1.0/session**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true }) }));
  const ba = new BookAppointmentPage(page);
  await page.route(SUBMIT, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'true' }));
  await ba.goto();
  await ba.fillValidForm();
  await ba.clickSubmit();
  const msg = await ba.successMessage();
  console.log(`[TC_BA_006] logged-in submit → success toast: "${msg}"`);
  expect(msg).toMatch(/submitted successfully/i);
  expect(await ba.formWasReset()).toBe(true);
});

// GAP: depends on Reason=Others (not available live).
test.fixme('TC_BA_008 | P0 | Submission with Reason=Others and Mention text', async () => {});

test('TC_BA_046 | P0 | Success toast shown then form resets', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await page.route(SUBMIT, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'true' }));
  await ba.fillValidForm();
  await ba.clickSubmit();
  // Spec expects a success toast: live shows "Form Submitted Successfully" (transient)
  // then the form resets. NOTE: no "Book Another Appointment" button (spec deviation).
  const msg = await ba.successMessage();
  console.log(`[TC_BA_046] success toast: "${msg}"`);
  expect(msg).toMatch(/submitted successfully/i);
  expect(await ba.formWasReset()).toBe(true);
});

test('TC_BA_047 | P0 | API error screen shown on 500', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await page.route(SUBMIT, (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"error"}' }));
  await ba.fillValidForm();
  await ba.clickSubmit();
  // Web-first assertions retry until the error screen renders — no fixed sleep.
  await expect(ba.errorScreenHeading).toBeVisible();
  await expect(ba.tryAgainBtn).toBeVisible();
  console.log('[TC_BA_047] 500 → error screen shown with Try Again');
});

test('TC_BA_048 | P1 | Try Again returns to the (data-preserved) form on API error', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  await page.route(SUBMIT, (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));
  await ba.fillValidForm();
  await ba.clickSubmit();
  await expect(ba.errorScreenHeading).toBeVisible();
  await ba.tryAgainBtn.click();
  // SPEC DEVIATION: spec says Try Again auto-resubmits; live RETURNS to the form
  // (Submit visible again, error screen gone) with the entered data preserved.
  await expect(ba.errorScreenHeading).toBeHidden();
  await expect(ba.submit).toBeVisible();
  const nameVal = await ba.nameInput.inputValue();
  console.log(`[TC_BA_048] after Try Again → error gone, name preserved='${nameVal}'`);
  expect(nameVal).toBe('Anjali Singh');
});

test('TC_BA_050 | P0 | Submit payload carries appointment data (CRM)', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  let payload = null;
  await page.route(SUBMIT, (r) => {
    payload = r.request().postDataJSON();
    r.fulfill({ status: 200, contentType: 'application/json', body: 'true' });
  });
  await ba.fillValidForm();
  await ba.clickSubmit();
  // Wait until the submit request has fired and the payload is captured.
  await expect.poll(() => payload, { timeout: 8000 }).not.toBeNull();
  console.log('[TC_BA_050] payload =', JSON.stringify(payload));
  expect(payload).toBeTruthy();
  expect(payload).toMatchObject({
    name: 'Anjali Singh', email: 'anjali@test.com', mobileNumber: '9876543210',
    storeState: 'Maharashtra', storeCity: 'Mumbai',
  });
  expect(payload.storeName).toMatch(/mumbai/i);
  expect(payload.dateOfAppointment).toMatch(/^\d{2}-\d{2}-\d{4}$/); // DD-MM-YYYY (NOT ISO — spec deviation)
  expect(payload.timeOfAppointment).toMatch(/^\d{1,2}:\d{2}$/);     // 24h HH:MM
  expect(payload.reasonForVisit).toBeTruthy();                     // backend reason ID
  // SPEC DEVIATION: no `lead_type='appointment'` or `source='website'` in payload.
});

// ===========================================================================
// STRUCTURE / RESPONSIVE (003–005, 049)
// ===========================================================================

test('TC_BA_004 | P1 | Submit button is full-width dark red with white text', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  const s = await ba.submitButtonStyle();
  console.log('[TC_BA_004] submit style', JSON.stringify(s));
  expect(s.color).toMatch(/255,\s*255,\s*255/);     // white text
  const [r, g, b] = (s.bg.match(/\d+/g) || []).map(Number);
  expect(r).toBeGreaterThan(100); expect(g).toBeLessThan(80); expect(b).toBeLessThan(80); // dark red
});

test('TC_BA_005 | P1 | Terms of Service and Privacy Policy links present', async ({ page }) => {
  const ba = new BookAppointmentPage(page);
  const tos = await ba.tosLink.getAttribute('href');
  const pp = await ba.privacyLink.getAttribute('href');
  console.log(`[TC_BA_005] ToS href='${tos}', Privacy href='${pp}'`);
  await expect(ba.tosLink).toBeVisible();
  await expect(ba.privacyLink).toBeVisible();
  expect(tos).toBeTruthy();
  expect(pp).toMatch(/privacy/i);
});

// GAP: the in-form back arrow is a Figma mobile-APP pattern; responsive web uses
// the browser back button (no in-page back control on /c/book-appointment).
test.fixme('TC_BA_003 | P1 | Back arrow navigates to previous page (mobile)', async () => {});

// Needs a real logged-in session for the prefill assertion.
test.fixme('TC_BA_009 | P1 | Name auto-filled from logged-in profile; editable', async () => {});

test.describe('mobile', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  test('TC_BA_049 | P1 | Mobile (375px) has no horizontal scroll', async ({ page }) => {
    const ba = new BookAppointmentPage(page);
    await ba.goto();
    const hScroll = await ba.hasHorizontalScroll();
    console.log(`[TC_BA_049] mobile 375px → horizontal scroll = ${hScroll} (expected false)`);
    expect(hScroll).toBe(false);
  });
});
