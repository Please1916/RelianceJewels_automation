// PDF-report + portal metadata for the Address Book – Functional module.
// Auto-loaded when run test ids start with "ABF-" (e.g. ABF-001).
export default {
  moduleLabel: 'Address Book',

  // --- Test Portal ---
  spec: 'address-book',
  portalLabel: 'Address Book – My Account',
  portalAliases: ['address', 'addressbook', 'ab', 'address-book'],

  perfLighthouse: 0,

  // P0 case ids.
  p0Ids: [
    'ABF-001', 'ABF-002', 'ABF-003', 'ABF-004', 'ABF-005', 'ABF-006',
    'ABF-007', 'ABF-008', 'ABF-009', 'ABF-010', 'ABF-011', 'ABF-012',
    'ABF-013', 'ABF-014', 'ABF-015', 'ABF-016', 'ABF-017', 'ABF-018',
    'ABF-019', 'ABF-020', 'ABF-021', 'ABF-022', 'ABF-023', 'ABF-024',
    'ABF-025', 'ABF-026', 'ABF-027', 'ABF-028', 'ABF-029', 'ABF-030',
    'ABF-031', 'ABF-032', 'ABF-033', 'ABF-034',
  ],

  sections: [
    ['Empty State',        ['ABF-001']],
    ['Add – Autocomplete', ['ABF-002', 'ABF-003', 'ABF-004']],
    ['Add – Tags',         ['ABF-005', 'ABF-006', 'ABF-007', 'ABF-008']],
    ['Default Address',    ['ABF-009', 'ABF-010', 'ABF-044']],
    ['Edit Address',       ['ABF-011', 'ABF-012', 'ABF-048']],
    ['Delete Address',     ['ABF-013', 'ABF-014', 'ABF-015', 'ABF-032']],
    ['Country & Checkout', ['ABF-016', 'ABF-017']],
    ['Validation',         ['ABF-018', 'ABF-019', 'ABF-020', 'ABF-021', 'ABF-022',
                            'ABF-023', 'ABF-024', 'ABF-025', 'ABF-026', 'ABF-027',
                            'ABF-028', 'ABF-029', 'ABF-030', 'ABF-031']],
    ['Security',           ['ABF-033', 'ABF-034']],
    ['Display & Limits',   ['ABF-035', 'ABF-036', 'ABF-037', 'ABF-038']],
    ['Edge Cases',         ['ABF-039', 'ABF-040', 'ABF-041', 'ABF-042', 'ABF-043',
                            'ABF-045', 'ABF-046', 'ABF-047', 'ABF-049']],
  ],
};
