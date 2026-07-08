// Config for the Sanity1 comprehensive P0 report (213 tests).
export default {
  suite: 'Sanity',
  title: 'Sanity — Comprehensive P0 Flow',
  subtitle: 'Login → Home → PLP → CLP → Search → PDP → Wishlist → Address Book → Policies → Contact Us → Book Appointment → Call Back → Logout',
  env: 'UAT',

  // The serial describe title substring used to locate the suite in results.json
  suiteMatch: 'P0 Sanity',

  specPath: 'tests/sanity1.spec.js',
  resultsPath: 'report/results.json',

  outHtml: 'report/sanity1-report.html',
  outPdf: 'report/sanity1-report.pdf',

  logo: 'https://cdn.pixelbin.io/v2/yellow-queen-0c3fa9/gly4zC/wrkr/sngz5/company/27/applications/64e83eb1653e8ab101c11f2e/application/pictures/free-logo/original/gM_1D1xVi-Reliance-Jewels.webp',

  buckets: [
    ['pass',  '#1c958f', 'Passed'],
    ['fail',  '#c0392b', 'Failed'],
    ['skip',  '#9aa0a6', 'Skipped'],
    ['xfail', '#e67e22', 'Known Defect'],
  ],

  sections: [
    { label: 'Login',                   start: 'TC_01',  end: 'TC_01'  },
    { label: 'Homepage',                start: 'TC_02',  end: 'TC_12'  },
    { label: 'PLP',                     start: 'TC_13',  end: 'TC_30'  },
    { label: 'CLP',                     start: 'TC_31',  end: 'TC_38'  },
    { label: 'Search',                  start: 'TC_39',  end: 'TC_49'  },
    { label: 'Wishlist / PLP',          start: 'TC_50',  end: 'TC_51'  },
    { label: 'PDP',                     start: 'TC_52',  end: 'TC_75'  },
    { label: 'Wishlist Page',           start: 'TC_76',  end: 'TC_79'  },
    { label: 'Wishlist P0 Mock',        start: 'TC_80',  end: 'TC_114' },
    { label: 'My Account',              start: 'TC_115', end: 'TC_119' },
    { label: 'Address Book',            start: 'TC_120', end: 'TC_147' },
    { label: 'Policies',                start: 'TC_148', end: 'TC_169' },
    { label: 'Contact Us',              start: 'TC_170', end: 'TC_175' },
    { label: 'Book Appointment',        start: 'TC_176', end: 'TC_200' },
    { label: 'Call Back',               start: 'TC_201', end: 'TC_212' },
    { label: 'Logout',                  start: 'TC_213', end: 'TC_213' },
  ],
};
