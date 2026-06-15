// Config for the Contact Us coverage/test PDF report (mirrors the Book
// Appointment / Call Back report configs). The spec file is the single source of
// truth for the case catalog; this config controls labels, section grouping,
// branding and output paths. Sections defined by inclusive TC number range.
export default {
  suite: 'Contact Us',
  title: 'Contact Us — Coverage & Test Report',
  subtitle: 'Contact Us form · /c/contact-us',
  env: 'UAT',

  specPath: 'tests/contact-us.spec.js',
  resultsPath: 'report/results.json',

  outHtml: 'report/contact-us-report.html',
  outPdf: 'report/contact-us-report.pdf',

  logo: 'https://cdn.pixelbin.io/v2/yellow-queen-0c3fa9/gly4zC/wrkr/sngz5/company/27/applications/64e83eb1653e8ab101c11f2e/application/pictures/free-logo/original/gM_1D1xVi-Reliance-Jewels.webp',

  // [label, [minId, maxId]] in report order.
  sections: [
    ['Form Structure', [1, 1]],
    ['Happy Path', [2, 3]],
    ['Auto-fill', [4, 4]],
    ['Name Field', [5, 6]],
    ['Email & Mobile', [7, 8]],
    ['Reason', [9, 10]],
    ['UX — Error State', [11, 11]],
    ['Success & API Error', [12, 12]],
    ['All Empty', [13, 13]],
    ['CRM Integration', [14, 14]],
  ],
  defaultSection: 'Other',

  buckets: [
    ['pass', '#1c958f', 'Passed'],
    ['skip', '#9aa0a6', 'Skipped / blocked'],
    ['fail', '#c0392b', 'Failed'],
  ],

  note: 'Contact Us is a 4-field form (Name/Email/Mobile/Reason) — no cascade, date/time or message field. Skipped = no "Others" reason option, name length not enforced, or auto-fill needs a real session. Posts to /ext/crm/contact/contactUs.',
};
