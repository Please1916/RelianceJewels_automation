// PDF-report + portal metadata for the Sidebar Navigation – Functional module.
export default {
  moduleLabel: 'My Account Nav',

  spec: 'nav',
  portalLabel: 'Sidebar Navigation – My Account',
  portalAliases: ['nav', 'navigation', 'sidebar', 'navf'],

  perfLighthouse: 0,

  p0Ids: [
    'NAVF-001', 'NAVF-002', 'NAVF-003', 'NAVF-004', 'NAVF-005',
    'NAVF-006', 'NAVF-007', 'NAVF-009', 'NAVF-011', 'NAVF-012',
    'NAVF-013', 'NAVF-016', 'NAVF-LOGOUT',
  ],

  sections: [
    ['Sidebar Structure',   ['NAVF-001', 'NAVF-002', 'NAVF-011', 'NAVF-016']],
    ['Section Navigation',  ['NAVF-003', 'NAVF-004', 'NAVF-005', 'NAVF-006', 'NAVF-007', 'NAVF-008']],
    ['Active State',        ['NAVF-009']],
    ['Cross-section Nav',   ['NAVF-012', 'NAVF-013']],
    ['Rapid & Direct URL',  ['NAVF-014', 'NAVF-015']],
    ['Logout',              ['NAVF-LOGOUT']],
  ],
};
