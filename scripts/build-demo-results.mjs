/**
 * Builds a synthetic report/results.json for the demo report.
 * - Parses all test titles from sanity1.spec.js
 * - Tests with test.fail(true, ...) → xfail
 * - TC_89 → real fail (not xfail) with actual screenshot & error
 * - Everything else → pass with realistic durations
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const specPath  = path.join(root, 'tests/sanity1.spec.js');
const outPath   = path.join(root, 'report/results.json');

const TC179_SCREENSHOT = path.join(root,
  'test-results/sanity1-P0-Sanity-Login-→--61cb6-the-user-outside-My-Account-chromium/test-failed-1.png');
const TC179_ERROR = `After logout, user must be redirected to /auth/login — got a different page\n\nError: expect(received).toContain(expected)\n\nExpected substring: "/auth/login"\nReceived string:    "https://reliancejewels.snghostz5.de/profile/details"\n\n  1980 |     await page.waitForTimeout(2_000);\n  1981 |     // Verify logout redirects specifically to the login page\n> 1982 |     expect(page.url(), 'After logout, user must be redirected to /auth/login — got a different page').toContain('/auth/login');\n       |                                                                                                       ^\n  1983 |   });\n\n    at tests/sanity1.spec.js:1982:103`;


// Parse spec: extract (title, isXfail, isSkip) pairs in order
const specText = fs.readFileSync(specPath, 'utf8');
const lines = specText.split('\n');

const tests = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const titleMatch = line.match(/test(?:\.fail)?\s*\(\s*['"`](TC_\d+[^'"`]*)['"`]/);
  if (!titleMatch) continue;
  const title = titleMatch[1];
  let xfail = false;
  let skip = false;
  for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
    if (/test\.fail\s*\(\s*true/.test(lines[j])) { xfail = true; break; }
    if (/test\.skip\s*\(\s*true/.test(lines[j])) { skip = true; break; }
  }
  tests.push({ title, xfail, skip });
}

console.log(`Parsed ${tests.length} tests from spec`);

// Build realistic durations (2–15s for most, 5–30s for address/appointment tests)
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1) + min) * 1000;

const specObjects = tests.map((t, idx) => {
  const tcNum = parseInt((t.title.match(/TC_(\d+)/) || ['', '0'])[1], 10);
  const isTC179 = tcNum === 179;
  const isXfail = t.xfail;
  const isSkip  = t.skip;

  let status, expectedStatus, duration, error, attachments;

  if (isTC179) {
    expectedStatus = 'passed';
    status = 'failed';
    duration = 8200;
    error = { message: TC179_ERROR, location: { file: 'tests/sanity1.spec.js', column: 103, line: 1982 } };
    attachments = fs.existsSync(TC179_SCREENSHOT)
      ? [{ name: 'screenshot', contentType: 'image/png', path: TC179_SCREENSHOT }]
      : [];
  } else if (isSkip) {
    expectedStatus = 'passed';
    status = 'skipped';
    duration = 0;
    error = null;
    attachments = [];
  } else if (isXfail) {
    expectedStatus = 'failed';
    status = 'failed';
    duration = rand(1, 4);
    error = null;
    attachments = [];
  } else {
    // Normal pass
    expectedStatus = 'passed';
    status = 'passed';
    // Address book tests are slower
    duration = tcNum >= 86 && tcNum <= 113 ? rand(5, 18)
             : tcNum >= 142 ? rand(4, 12)
             : rand(2, 10);
    error = null;
    attachments = [];
  }

  return {
    title: t.title,
    ok: status === 'passed' || (expectedStatus === 'failed' && status === 'failed'),
    tags: [],
    tests: [{
      timeout: 60000,
      annotations: [],
      expectedStatus,
      projectId: 'chromium',
      projectName: 'chromium',
      results: [{
        workerIndex: 0,
        parallelIndex: 0,
        status,
        duration,
        error: error || undefined,
        errors: error ? [error] : [],
        stdout: [],
        stderr: [],
        retry: 0,
        startTime: new Date(Date.now() - (tests.length - idx) * 8000).toISOString(),
        annotations: [],
        attachments
      }],
      status: status === 'passed' ? 'expected'
             : (expectedStatus === 'failed' && status === 'failed') ? 'expected'
             : 'unexpected'
    }],
    id: `demo-${idx.toString().padStart(4, '0')}`,
    file: 'sanity1.spec.js',
    line: 100 + idx * 6,
    column: 5
  };
});

// Wrap in Playwright JSON reporter structure
const results = {
  config: {
    projects: [{ id: 'chromium', name: 'chromium' }]
  },
  suites: [{
    title: '',
    file: 'tests/sanity1.spec.js',
    column: 0,
    line: 0,
    specs: [],
    suites: [{
      title: 'P0 Sanity: Login → Homepage → PLP → CLP → Search → PDP → Wishlist → My Account → Address Book → Policies → Contact Us → Book Appointment → Call Back → Logout',
      file: 'tests/sanity1.spec.js',
      column: 0,
      line: 1,
      specs: specObjects,
      suites: []
    }]
  }],
  errors: []
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

const passCount  = specObjects.filter(s => s.tests[0].results[0].status === 'passed').length;
const failCount  = specObjects.filter(s => s.tests[0].results[0].status === 'failed' && s.tests[0].expectedStatus === 'passed').length;
const xfailCount = specObjects.filter(s => s.tests[0].expectedStatus === 'failed').length;
console.log(`Written: ${specObjects.length} tests  |  ${passCount} pass  |  ${failCount} fail  |  ${xfailCount} xfail`);
console.log('Output:', outPath);
