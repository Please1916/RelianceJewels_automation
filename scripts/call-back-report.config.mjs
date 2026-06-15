// Config for the Call Back coverage/test PDF report (mirrors
// book-appointment-report.config.mjs). The spec file is the single source of
// truth for the case catalog; this config controls labels, section grouping,
// branding and output paths.
//
// Call Back ids are TC_CB_NNN with NO embedded section code, so sections are
// defined here by inclusive TC number range (matching the sheet's Section
// column). Ranges are evaluated in order; first match wins.
export default {
  suite: 'Call Back',
  title: 'Call Back — Coverage & Test Report',
  subtitle: 'Call Back form · /c/callback',
  env: 'UAT',

  specPath: 'tests/call-back.spec.js',
  resultsPath: 'report/results.json',

  outHtml: 'report/call-back-report.html',
  outPdf: 'report/call-back-report.pdf',

  logo: 'https://cdn.pixelbin.io/v2/yellow-queen-0c3fa9/gly4zC/wrkr/sngz5/company/27/applications/64e83eb1653e8ab101c11f2e/application/pictures/free-logo/original/gM_1D1xVi-Reliance-Jewels.webp',

  // [label, [minId, maxId]] in report order — matches the sheet's Section column.
  sections: [
    ['Form Structure', [1, 1]],
    ['Happy Path', [2, 3]],
    ['Auto-fill', [4, 4]],
    ['Name Field', [5, 6]],
    ['Email & Mobile', [7, 8]],
    ['Cascading Dropdowns', [9, 10]],
    ['Date & Time', [11, 12]],
    ['Reason', [13, 13]],
    ['UX — Error State', [14, 14]],
    ['Success & API Error', [15, 15]],
    ['All Empty', [16, 16]],
    ['CRM Integration', [17, 17]],
  ],
  defaultSection: 'Other',

  buckets: [
    ['pass', '#1c958f', 'Passed'],
    ['skip', '#9aa0a6', 'Skipped / blocked'],
    ['fail', '#c0392b', 'Failed'],
  ],

  note: 'Skipped = blocked by a confirmed spec-vs-live gap or env need (no "Others" reason option, name length not enforced, auto-fill needs a real session). Call Back posts to /ext/crm/contact/callBack.',
};
