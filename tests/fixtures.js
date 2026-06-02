import { test as base, expect } from '@playwright/test';

/**
 * Custom Playwright fixtures for the Reliance Jewels (Fynd/FDK) storefront.
 *
 * Auth here is server-side (httpOnly session cookie) and the SPA re-checks
 * `/session` on every page. There is no real cookie to reuse, so we keep the
 * stubs live for the whole test via fixtures:
 *
 *   - `stubbedAuth`  : installs the OTP-verify + session route stubs on a page.
 *   - `loginViaOtp(page)` : drives the real login UI and enters the OTP.
 *   - `loggedInPage` : a page that is already "logged in" (stubs + login done).
 *
 * Real endpoints (captured from the live site):
 *   - send OTP : POST .../authentication/v1.0/login/otp        (left REAL → request_id)
 *   - verify   : POST .../authentication/v1.0/otp/mobile/verify (STUBBED → fake success)
 *   - session  : GET  .../authentication/v1.0/session           (STUBBED → authed after verify)
 */

export const BASE_URL = 'https://reliancejewels.snghostz5.de';
export const MOBILE_NUMBER = '8151008630';
export const OTP = '5401';

// A minimal Fynd user object the SPA can render as "logged in".
export const FAKE_USER = {
  id: '000000000000000000000000',
  user_id: '000000000000000000000000',
  first_name: 'Test',
  last_name: 'User',
  account_type: 'user',
  active: true,
  profile_pic_url: '',
  gender: 'male',
  phone_numbers: [
    { active: true, primary: true, verified: true, country_code: 91, phone: MOBILE_NUMBER },
  ],
  emails: [],
};

/**
 * Install the auth stubs on a page. Returns a state object whose `loggedIn`
 * flag flips to true once the OTP is verified, so the login UI still appears
 * on first load and the flow runs for real.
 */
async function installAuthStubs(page) {
  const state = { loggedIn: false };

  // Verify OTP -> success (and mark us logged in).
  await page.route('**/user/authentication/v1.0/otp/mobile/verify**', async (route) => {
    state.loggedIn = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: FAKE_USER,
        user_exists: true,
        verify_mobile_otp: true,
        register_token: null,
      }),
    });
  });

  // Session check -> not authed before verify, authed after.
  await page.route('**/user/authentication/v1.0/session**', async (route) => {
    await route.fulfill({
      status: state.loggedIn ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify(
        state.loggedIn ? { authenticated: true, user: FAKE_USER } : { authenticated: false }
      ),
    });
  });

  return state;
}

/**
 * Drive the real login UI: open login, enter mobile, request OTP, enter OTP.
 * Assumes auth stubs are already installed on the page.
 */
async function loginViaOtp(page) {
  await page.goto(BASE_URL);
  await page.getByText('Log In').click();
  await page.getByPlaceholder('Mobile Number').click();
  await page.getByPlaceholder('Mobile Number').fill(MOBILE_NUMBER);
  await page.getByRole('button', { name: 'Get OTP' }).click();

  await page.getByPlaceholder('Enter OTP').click();
  await page.getByPlaceholder('Enter OTP').fill(OTP);
  await page.getByRole('button', { name: 'Verify OTP' }).click();

  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 15000 });
}

export const test = base.extend({
  // Always ignore the staging cert.
  ignoreHTTPSErrors: [true, { option: true }],

  // A page with auth stubs installed but NOT yet logged in (login UI shows).
  stubbedAuth: async ({ page }, use) => {
    await installAuthStubs(page);
    await use(page);
  },

  // A page that has already gone through the stubbed OTP login.
  loggedInPage: async ({ page }, use) => {
    await installAuthStubs(page);
    await loginViaOtp(page);
    await use(page);
  },
});

export { expect, loginViaOtp };
