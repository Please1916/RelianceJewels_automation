import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Custom Playwright fixtures for the Reliance Jewels (Fynd/FDK) storefront.
 *
 * REUSABLE REAL SESSION (preferred — no repeated OTPs)
 *   Auth is a server-side httpOnly session cookie. Instead of logging in per
 *   test (which fires a real OTP each time), log in ONCE via `npm run auth:login`
 *   — that saves the real cookies/localStorage to playwright/.auth/user.json.
 *   Tests then reuse it through the `authedPage` fixture with NO further OTPs,
 *   until the saved session expires (re-run `npm run auth:login` to re-mint).
 *
 *   - `authedPage` : a page restored from the saved real session (storageState).
 *
 * STUBBED AUTH (for the dedicated login test cases only)
 *   Used where the login flow itself is under test. Fakes the verify + session
 *   responses so no real account state is needed:
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

// Saved real session minted by `npm run auth:login`.
export const AUTH_FILE = path.join(
  path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  'playwright', '.auth', 'user.json'
);
export const hasSavedSession = () => fs.existsSync(AUTH_FILE);

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
 * Context-level variant of installAuthStubs — routes are installed on the whole
 * browser context so they also apply to popup tabs (the PDP opens in a new tab
 * via target=_blank, which page-level routes would miss).
 */
async function installAuthStubsContext(context) {
  const state = { loggedIn: false };

  await context.route('**/user/authentication/v1.0/otp/mobile/verify**', async (route) => {
    state.loggedIn = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: FAKE_USER, user_exists: true, verify_mobile_otp: true, register_token: null }),
    });
  });

  await context.route('**/user/authentication/v1.0/session**', async (route) => {
    await route.fulfill({
      status: state.loggedIn ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify(state.loggedIn ? { authenticated: true, user: FAKE_USER } : { authenticated: false }),
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

  // A page restored from the saved REAL session — no OTP, reused across tests.
  // Requires a one-time `npm run auth:login`; re-run when the session expires.
  authedPage: async ({ browser }, use) => {
    if (!hasSavedSession()) {
      throw new Error(
        `No saved session at ${AUTH_FILE}.\n` +
        `Run it once (enters ONE real OTP):  npm run auth:login`
      );
    }
    const context = await browser.newContext({
      storageState: AUTH_FILE,
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect, loginViaOtp, installAuthStubsContext };
