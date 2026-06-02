// Renders docs/login-flow-diagram.html to a PDF using Playwright's Chromium.
// Run with:  npm run diagram
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(here, 'login-flow-diagram.html');
const pdfPath = path.join(here, 'login-flow-diagram.pdf');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  landscape: true,
  printBackground: true,
  margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
});
await browser.close();
console.log('PDF written to', pdfPath);
