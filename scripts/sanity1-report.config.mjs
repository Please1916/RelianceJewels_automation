// Config for the Sanity1 comprehensive P0 report (179 tests).
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
    { label: 'Login',             start: 'TC_01',  end: 'TC_01'  },
    { label: 'Homepage',          start: 'TC_02',  end: 'TC_12'  },
    { label: 'PLP',               start: 'TC_13',  end: 'TC_30'  },
    { label: 'CLP',               start: 'TC_31',  end: 'TC_39'  },
    { label: 'Search',            start: 'TC_40',  end: 'TC_50'  },
    { label: 'Wishlist / PLP',    start: 'TC_51',  end: 'TC_52'  },
    { label: 'PDP',               start: 'TC_53',  end: 'TC_76'  },
    { label: 'Wishlist Page',     start: 'TC_77',  end: 'TC_80'  },
    { label: 'My Account',        start: 'TC_81',  end: 'TC_85'  },
    { label: 'Address Book',      start: 'TC_86',  end: 'TC_113' },
    { label: 'Policies',          start: 'TC_114', end: 'TC_135' },
    { label: 'Contact Us',        start: 'TC_136', end: 'TC_141' },
    { label: 'Book Appointment',  start: 'TC_142', end: 'TC_166' },
    { label: 'Call Back',         start: 'TC_167', end: 'TC_178' },
    { label: 'Logout',            start: 'TC_179', end: 'TC_179' },
  ],
};
