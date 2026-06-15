// One-time interactive login that mints a REUSABLE session.
//
// Run ONCE (and again only when the session expires):
//   npm run auth:login
//
// It opens a real browser, drives the real OTP login UI, pauses for YOU to
// type the OTP you receive on SMS, then saves the authenticated browser state
// (cookies + localStorage) to playwright/.auth/user.json. After that, every
// test that uses the `authedPage` fixture reuses this session with NO further
// OTPs — until the saved cookie expires, at which point you re-run this.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { BASE_URL, MOBILE_NUMBER } from '../tests/fixtures.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const AUTH_FILE = path.join(root, 'playwright', '.auth', 'user.json');

const ask = (q) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (a) => { rl.close(); resolve(a.trim()); });
  });

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();

try {
  console.log(`\nOpening ${BASE_URL} — logging in as ${MOBILE_NUMBER} ...`);
  await page.goto(BASE_URL);
  await page.getByText('Log In').click();
  await page.getByPlaceholder('Mobile Number').click();
  await page.getByPlaceholder('Mobile Number').fill(MOBILE_NUMBER);
  await page.getByRole('button', { name: 'Get OTP' }).click();
  console.log('OTP requested. Check the SMS for', MOBILE_NUMBER);

  const otp = await ask('\n>>> Enter the OTP you received: ');
  await page.getByPlaceholder('Enter OTP').click();
  await page.getByPlaceholder('Enter OTP').fill(otp);
  await page.getByRole('button', { name: 'Verify OTP' }).click();

  // Confirm we actually landed logged in before saving the state.
  await page.waitForURL((url) => !/\/auth\/login/.test(url.toString()), { timeout: 20000 });
  await page.getByText('My Account').waitFor({ state: 'visible', timeout: 20000 });

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await context.storageState({ path: AUTH_FILE });
  console.log(`\n✅ Session saved to ${path.relative(root, AUTH_FILE)}`);
  console.log('   Tests using the `authedPage` fixture will now reuse it — no more OTPs.');
  console.log('   Re-run `npm run auth:login` only when the session expires.\n');
} catch (err) {
  console.error('\n❌ Login did not complete — session NOT saved.');
  console.error('   ', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
