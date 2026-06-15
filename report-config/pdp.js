// PDF-report + Test Portal metadata for the PDP (Product Detail Page).
//
// Having this file makes "PDP — Product Detail Page" appear automatically in the
// Test Portal (npm run portal / npm run start). The portal runs:
//     npx playwright test <spec>
// so `spec: 'pdp'` runs every case in tests/pdp-P0,P1.spec.js (92 tests).
//
// NOTE: the portal's "generate report" checkbox runs the shared
// scripts/generate-report-pdf.mjs. The PDP suite has its own richer report —
// build it with `npm run report:pdp` (donut + per-section, all 92 cases).
export default {
  moduleLabel: 'PDP',

  // --- Test Portal ---
  spec: 'pdp',                                  // Playwright filename filter → pdp-P0,P1.spec.js
  portalLabel: 'PDP — Product Detail Page',     // dropdown label
  portalAliases: ['detail', 'product', 'pdp'],  // type-box keywords
  // Use the dedicated PDP report (donut + per-section, all 92 cases) instead of
  // the shared generic one when "generate report" is ticked in the portal.
  reportScript: 'scripts/generate-pdp-report.mjs',

  // Performance cases verified outside this run (none for PDP today).
  perfLighthouse: 0,

  // P0 case ids (everything else treated as P1). Used by the shared report.
  p0Ids: [
    'TC_PDP_IMG_001', 'TC_PDP_IMG_007', 'TC_PDP_IMG_011', 'TC_PDP_IMG_013', 'TC_PDP_IMG_015', 'TC_PDP_IMG_024',
    'TC_PDP_VAR_001', 'TC_PDP_VAR_002', 'TC_PDP_VAR_007', 'TC_PDP_VAR_013', 'TC_PDP_VAR_014', 'TC_PDP_VAR_018',
    'TC_PDP_VAR_020', 'TC_PDP_VAR_021', 'TC_PDP_VAR_026', 'TC_PDP_VAR_030', 'TC_PDP_VAR_032',
    'TC_PDP_PIN_001', 'TC_PDP_PIN_002', 'TC_PDP_PIN_003', 'TC_PDP_PIN_004', 'TC_PDP_PIN_007',
    'TC_PDP_CRT_001', 'TC_PDP_CRT_002', 'TC_PDP_CRT_004', 'TC_PDP_CRT_008', 'TC_PDP_CRT_009', 'TC_PDP_CRT_014',
    'TC_PDP_DTL_001', 'TC_PDP_DTL_002', 'TC_PDP_DTL_003', 'TC_PDP_DTL_015',
    'TC_PDP_APT_001',
    'TC_PDP_HDR_001', 'TC_PDP_HDR_002', 'TC_PDP_HDR_003', 'TC_PDP_HDR_006', 'TC_PDP_HDR_014',
    'TC_PDP_MOB_001', 'TC_PDP_MOB_004', 'TC_PDP_MOB_005', 'TC_PDP_MOB_006', 'TC_PDP_MOB_009', 'TC_PDP_MOB_012',
  ],

  // Feature sections in display order: [title, [case id prefixes/ids]].
  sections: [
    ['Image gallery & product info', ['TC_PDP_IMG']],
    ['Variants, price breakup & OOS', ['TC_PDP_VAR']],
    ['Pincode & delivery', ['TC_PDP_PIN']],
    ['Cart / wishlist / certifications', ['TC_PDP_CRT']],
    ['Detail accordion & price breakup', ['TC_PDP_DTL']],
    ['Book appointment / store locator', ['TC_PDP_APT']],
    ['Header / nav / CMS / security', ['TC_PDP_HDR']],
    ['Mobile / mWeb', ['TC_PDP_MOB']],
  ],
};
