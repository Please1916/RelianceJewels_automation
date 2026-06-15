// Config for the Wishlist coverage/test PDF report (mirrors pdp-report.config.mjs).
// The spec file is the source of truth for the cases; this only controls labels,
// grouping, branding and output paths.
export default {
  suite: 'Wishlist',
  title: 'Wishlist — Automated Test Report',
  subtitle: 'Save for Later · 8 real guest/security + the rest [mock] frontend coverage',
  env: 'UAT',

  // Inputs
  specPath: 'tests/wishlist.spec.js',  // case source (titles: "WL_### | P0 | name")
  resultsPath: 'report/results.json',  // Playwright JSON results (pass/skip/fail + duration)

  // Outputs
  outHtml: 'report/wishlist-report.html',
  outPdf: 'report/wishlist-report.pdf',

  // Reliance Jewels wordmark (same asset as the other reports).
  logo: 'https://cdn.pixelbin.io/v2/yellow-queen-0c3fa9/gly4zC/wrkr/sngz5/company/27/applications/64e83eb1653e8ab101c11f2e/application/pictures/free-logo/original/gM_1D1xVi-Reliance-Jewels.webp',

  // Wishlist ids carry no section code, so group by FEATURE AREA via the test
  // name. Rules are evaluated top-to-bottom (first match wins) against the
  // lower-cased name; unmatched tests fall into `defaultArea`.
  areaRules: [
    [/move.?to.?cart|move-to-cart/, 'Move to Cart'],
    [/add to wishlist|heart fills|add works|rejected when|debounce|duplicate/, 'Add'],
    [/toggle off|remove|undo/, 'Toggle & Remove'],
    [/empty/, 'Empty state'],
    [/login|security|redirect|session|guest/, 'Login & Security'],
    [/network|500|timeout|slow|3g|2g|fetch|crash/, 'Network & Errors'],
    [/price|oos|out.?of.?stock|discontinued|variant|invalid|flash|sale/, 'Item states'],
    [/msite|mobile|portrait|landscape|scroll|font|touch|tap|orientation|pull|layout|zoom|legible|375|430/, 'Responsive / mWeb'],
  ],
  defaultArea: 'Page & Header',

  // Section display order (areas not listed are appended at the end).
  areaOrder: [
    'Login & Security', 'Add', 'Toggle & Remove', 'Move to Cart',
    'Item states', 'Empty state', 'Network & Errors', 'Responsive / mWeb', 'Page & Header',
  ],

  // Bucket -> [donut/badge colour, label]. Order drives the donut + legend.
  buckets: [
    ['pass', '#1c958f', 'Passed'],
    ['fail', '#c0392b', 'Failed'],
    ['skip', '#9aa0a6', 'Skipped'],
  ],

  // Footnote shown under the scope line.
  note: '5 P0/P1 need a real session / two devices; mock-backed cases verify frontend behaviour, not backend persistence.',
};
