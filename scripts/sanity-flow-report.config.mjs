// Config for the SANITY FLOW Test Report.
//
// "Sanity Flow" = the critical (P0) cases of EVERY automated module, presented
// in the user journey order: Login → Home → PLP → PDP → Cart/Wishlist →
// My Account → Forms.
//
// Modules mark their critical cases two ways (both handled here):
//   • title  — the test title contains "| P0 |"   (pdp, wishlist, the 3 forms)
//   • range  — the spec header splits the suite by TC number; critical = TC_NN
//              within `ranges`   (plp, clp, search, nav, address-book, policies)
//   • all    — no priority split in the spec; include every case (login, home)
//
// `ranges` are inclusive [min,max] pairs over the leading TC_NN in each title.
export default {
  title: 'Sanity Flow — Test Report',
  subtitle: 'Critical coverage across all modules, in journey order',
  env: 'UAT',

  resultsPath: 'report/results.json',
  outHtml: 'report/sanity-flow-report.html',
  outPdf: 'report/sanity-flow-report.pdf',
  logo: 'https://cdn.pixelbin.io/v2/yellow-queen-0c3fa9/gly4zC/wrkr/sngz5/company/27/applications/64e83eb1653e8ab101c11f2e/application/pictures/free-logo/original/gM_1D1xVi-Reliance-Jewels.webp',

  // Journey stages, in order. Each module declares how to select its critical
  // cases (p0), and — for the P0-only RUN — how to grep them:
  //   • title : title contains "| P0 |"            (run grep: \| P0 \|)
  //   • range : leading TC_NN within `ranges`, scoped by `code` in the run grep
  //   • all   : every case; `grep` matches all of them in the run
  stages: [
    { stage: 'Login', modules: [{ file: 'login.spec.js', p0: 'all', grep: 'login|logged' }] },
    { stage: 'Home',  modules: [{ file: 'homepage.spec.js', p0: 'all', grep: 'HPF-' }] },
    { stage: 'PLP',   modules: [
        { file: 'plp.spec.js',    p0: 'range', code: 'PLP-', ranges: [[1, 18]] },
        { file: 'clp.spec.js',    p0: 'range', code: 'CLP-', ranges: [[1, 9]] },
        { file: 'search.spec.js', p0: 'range', code: 'SRC-', ranges: [[1, 11]] },
    ] },
    { stage: 'PDP',   modules: [{ file: 'pdp.spec.js', p0: 'title' }] },
    { stage: 'Cart / Wishlist', modules: [{ file: 'wishlist.spec.js', p0: 'title' }] },
    { stage: 'My Account', modules: [
        { file: 'nav.spec.js',          p0: 'range', code: 'NAVF-', ranges: [[1, 13], [16, 16]] },
        { file: 'address-book.spec.js', p0: 'range', code: 'ABF-', ranges: [[1, 34]] },
        { file: 'policies.spec.js',     p0: 'range', code: 'POLF-', ranges: [[1, 21], [24, 24]] },
    ] },
    { stage: 'Forms', modules: [
        { file: 'book-appointment.spec.js', p0: 'title' },
        { file: 'call-back.spec.js',        p0: 'title' },
        { file: 'contact-us.spec.js',       p0: 'title' },
    ] },
  ],

  buckets: [
    ['pass', '#1c958f', 'Passed'],
    ['skip', '#9aa0a6', 'Skipped / blocked'],
    ['fail', '#c0392b', 'Failed'],
  ],

  note: 'Critical coverage of every automated module, ordered by the user journey. Login & Home have no priority split in their specs, so all their cases are shown. Forms are submit-ready (not submitted); checkout/payment & account need a real session (npm run auth:login).',
};
