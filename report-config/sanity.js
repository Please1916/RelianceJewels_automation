// PDF-report + portal metadata for the P0 Sanity Flow suite.
//
// The sanity suite is a cross-module journey (Login → Homepage → PLP → PDP →
// My Account → Logout). All 41 cases are P0. IDs that use underscores instead
// of hyphens (TC_PDP_IMG_001 etc.) and bare words (LOGIN, LOGOUT) are not
// matched by the shared ID extractor — those specs fall to "Other" in the PDF.
// The structured view of all 41 cases lives in sanity.md.
export default {
  moduleLabel: 'Sanity Flow',

  spec: 'sanity',
  portalLabel: 'Sanity — Full User Journey',
  portalAliases: ['sanity', 'e2e', 'journey', 'smoke'],

  perfLighthouse: 0,

  // All 41 cases are P0. '' catches the TC_PDP_* / LOGIN / LOGOUT specs whose
  // IDs are not extracted by the [A-Z]+-\d+ pattern in the shared parser.
  p0Ids: [
    '',
    'HPF-006', 'HPF-007', 'HPF-008', 'HPF-010',
    'HPF-012', 'HPF-015', 'HPF-016', 'HPF-022', 'HPF-026',
    'PLP-010', 'PLP-011', 'PLP-018', 'PLP-025', 'PLP-026', 'PLP-029', 'PLP-035',
    'NAVF-001', 'NAVF-002', 'NAVF-003', 'NAVF-004', 'NAVF-005',
  ],

  // Sections for which IDs are extractable (HPF, PLP, NAVF).
  // TC_01 (LOGIN), TC_18–TC_35 (TC_PDP_*), TC_41 (LOGOUT) appear under "Other".
  sections: [
    ['Homepage',             ['HPF-007', 'HPF-008', 'HPF-006', 'HPF-012',
                              'HPF-015', 'HPF-010', 'HPF-016', 'HPF-022', 'HPF-026']],
    ['PLP — Product Listing',['PLP-010', 'PLP-018', 'PLP-025', 'PLP-026',
                              'PLP-029', 'PLP-011', 'PLP-035']],
    ['My Account Navigation',['NAVF-001', 'NAVF-002', 'NAVF-003', 'NAVF-004', 'NAVF-005']],
  ],
};
