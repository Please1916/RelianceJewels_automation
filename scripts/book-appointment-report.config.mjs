// Config for the Book Appointment coverage/test PDF report (mirrors
// pdp-report.config.mjs). The spec file is the single source of truth for the
// case catalog; this config only controls labels, section grouping, branding
// and output paths.
//
// Book Appointment ids are TC_BA_NNN with NO embedded section code, so sections
// are defined here by inclusive TC number range (matching the sheet's Section
// column). Ranges are evaluated in order; a case falls into the first range it
// fits. Anything outside every range lands in `defaultSection`.
export default {
  suite: 'Book Appointment',
  title: 'Book Appointment — Coverage & Test Report',
  subtitle: 'Book Appointment form · /c/book-appointment',
  env: 'UAT',

  // Inputs
  specPath: 'tests/book-appointment.spec.js', // catalog source (active + fixme)
  resultsPath: 'report/results.json',         // optional Playwright JSON results (pass/skip/fail + duration)

  // Outputs
  outHtml: 'report/book-appointment-report.html',
  outPdf: 'report/book-appointment-report.pdf',

  // Reliance Jewels wordmark (same asset as the other reports).
  logo: 'https://cdn.pixelbin.io/v2/yellow-queen-0c3fa9/gly4zC/wrkr/sngz5/company/27/applications/64e83eb1653e8ab101c11f2e/application/pictures/free-logo/original/gM_1D1xVi-Reliance-Jewels.webp',

  // [label, [minId, maxId]] in report order. Matches the sheet's Section column.
  sections: [
    ['Form Structure', [1, 5]],
    ['Happy Path', [6, 8]],
    ['Name Field', [9, 15]],
    ['Email Field', [16, 19]],
    ['Mobile Field', [20, 24]],
    ['Cascading Dropdowns', [25, 29]],
    ['Reason for Visit', [30, 35]],
    ['Date & Time', [36, 41]],
    ['UX — Error & Success', [42, 46]],
    ['API Error', [47, 48]],
    ['Responsive', [49, 49]],
    ['CRM Integration', [50, 50]],
  ],
  defaultSection: 'Other',

  // Bucket -> [donut/badge colour, label]. Order drives the donut + legend.
  buckets: [
    ['pass', '#1c958f', 'Passed'],
    ['skip', '#9aa0a6', 'Skipped / blocked'],
    ['fail', '#c0392b', 'Failed'],
  ],

  // Footnote shown under the scope line.
  note: 'Skipped = blocked by a confirmed spec-vs-live gap or env need (no "Others" reason option, name length not enforced, autofill needs a real session, CRM/back-arrow). See per-test notes in the spec.',
};
