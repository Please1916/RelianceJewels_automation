// Config for the P0 Regression PDF report (mirrors the per-suite reports, but
// the catalog spans every suite and is grouped by SUITE rather than TC-range).
// Source of truth is the P0 run's Playwright JSON results (report/results.json),
// produced by `npm run test:p0` (which greps titles for " P0 ").
export default {
  suite: 'P0 Regression',
  title: 'P0 Regression — Coverage & Test Report',
  subtitle: 'All P0-tagged cases across suites · run via npm run test:p0',
  env: 'UAT',

  // Input (the P0 run results).
  resultsPath: 'report/results.json',

  // Outputs
  outHtml: 'report/p0-report.html',
  outPdf: 'report/p0-report.pdf',

  // Reliance Jewels wordmark (same asset as the other reports).
  logo: 'https://cdn.pixelbin.io/v2/yellow-queen-0c3fa9/gly4zC/wrkr/sngz5/company/27/applications/64e83eb1653e8ab101c11f2e/application/pictures/free-logo/original/gM_1D1xVi-Reliance-Jewels.webp',

  // spec filename -> section label, in report order. Anything else falls back
  // to the filename with ".spec.js" stripped.
  suiteLabels: {
    'pdp.spec.js': 'PDP',
    'wishlist.spec.js': 'Wishlist',
    'book-appointment.spec.js': 'Book Appointment',
    'call-back.spec.js': 'Call Back',
    'contact-us.spec.js': 'Contact Us',
    'sanity.spec.js': 'Sanity',
  },
  sectionOrder: ['PDP', 'Wishlist', 'Book Appointment', 'Call Back', 'Contact Us', 'Sanity'],

  // Bucket -> [donut/badge colour, label]. Order drives the donut + legend.
  buckets: [
    ['pass', '#1c958f', 'Passed'],
    ['skip', '#9aa0a6', 'Skipped / blocked'],
    ['fail', '#c0392b', 'Failed'],
  ],

  note: 'P0 layer run via `npm run test:p0` (Playwright --grep " P0 "). Skipped = blocked by an env/session need or a confirmed spec-vs-live gap, per each suite’s own guards. Suites without a P0 tag (homepage, nav, plp, clp, search, address-book, policies) are not yet included.',
};
