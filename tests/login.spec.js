import { test, expect, loginViaOtp } from './fixtures.js';

/**
 * Login via the real OTP UI, with the verify + session responses stubbed
 * (see fixtures.js). Enters OTP 5401 and ends in a logged-in state.
 */
test('login by stubbing the OTP + session responses', async ({ stubbedAuth: page }) => {
  await loginViaOtp(page);

  // Assert we are logged in (no "invalid OTP", no bounce, account shows).
  await expect(page.getByText(/invalid/i)).toHaveCount(0);
  await expect(page.getByText('My Account')).toBeVisible({ timeout: 15000 });
});

/**
 * Example: a test that starts ALREADY logged in via the `loggedInPage`
 * fixture — no need to repeat the OTP steps.
 */
test('logged-in user lands logged in on the home page', async ({ loggedInPage: page }) => {
  await page.goto('/');
  await expect(page.getByText('My Account')).toBeVisible({ timeout: 15000 });
});
