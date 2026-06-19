// Config for the Sanity (end-to-end smoke) PDF report.
// The sanity suite is 4 @sanity tests: a chained guest journey (its test.step()
// phases become rows) + a logged-in group (purchase path, orders, CRM forms)
// that skips without a saved session. Each test's phases/status are the rows.
export default {
  suite: 'Sanity',
  title: 'Sanity — End-to-End Smoke',
  subtitle: 'Guest journey (live) + logged-in group (purchase · orders · CRM forms)',
  env: 'UAT',

  // Inputs
  specPath: 'tests/sanity.spec.js',   // catalog source (test.step phase titles)
  resultsPath: 'report/results.json', // Playwright JSON results (step status + duration)
  testMatch: '@sanity',               // locate the sanity test by title substring

  // Outputs
  outHtml: 'report/sanity-report.html',
  outPdf: 'report/sanity-report.pdf',

  // Reliance Jewels wordmark (same asset as the other reports).
  logo: 'https://cdn.pixelbin.io/v2/yellow-queen-0c3fa9/gly4zC/wrkr/sngz5/company/27/applications/64e83eb1653e8ab101c11f2e/application/pictures/free-logo/original/gM_1D1xVi-Reliance-Jewels.webp',

  // Bucket -> [donut/badge colour, label]. Order drives the donut + legend.
  buckets: [
    ['pass', '#1c958f', 'Passed'],
    ['fail', '#c0392b', 'Failed'],
    ['skip', '#9aa0a6', 'Skipped'],
  ],

  note: 'No CRM mock — the three forms are filled and asserted submit-ready but NOT submitted (no junk leads). The logged-in group skips without a saved session (npm run auth:login).',
};
