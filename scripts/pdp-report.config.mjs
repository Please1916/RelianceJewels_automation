// Config for the PDP coverage/test PDF report.
// The spec file is the single source of truth for the case catalog; this config
// only controls labels, section grouping, branding and output paths.
export default {
  suite: 'PDP',
  title: 'PDP — Coverage & Test Report',
  subtitle: 'Product Detail Page',
  env: 'UAT',

  // Inputs
  specPath: 'tests/pdp.spec.js', // catalog source (active + commented + manual)
  resultsPath: 'report/results.json',  // optional Playwright JSON results (pass/skip/fail + duration)

  // Outputs
  outHtml: 'report/pdp-report.html',
  outPdf: 'report/pdp-report.pdf',

  // Reliance Jewels wordmark (same asset as the automation report).
  logo: 'https://cdn.pixelbin.io/v2/yellow-queen-0c3fa9/gly4zC/wrkr/sngz5/company/27/applications/64e83eb1653e8ab101c11f2e/application/pictures/free-logo/original/gM_1D1xVi-Reliance-Jewels.webp',

  // Section code -> display label, in report order. Codes match TC_PDP_<CODE>_NNN.
  sections: [
    ['IMG', 'Image gallery & product info'],
    ['VAR', 'Variants, price breakup & OOS'],
    ['PIN', 'Pincode & delivery'],
    ['CRT', 'Cart / wishlist / certifications'],
    ['DTL', 'Detail accordion & price breakup'],
    ['APT', 'Book appointment / store locator'],
    ['HDR', 'Header / nav / CMS / security'],
    ['MOB', 'Mobile / mWeb'],
  ],

  // Bucket -> [donut/badge colour, label]. Order drives the donut + legend.
  // Only the executed-status buckets are shown; commented-out and manual/
  // not-automatable catalog entries are excluded from this report.
  buckets: [
    ['pass', '#1c958f', 'Passed'],
    ['fail', '#c0392b', 'Failed'],
    ['skip', '#9aa0a6', 'Skipped'],
  ],
};
