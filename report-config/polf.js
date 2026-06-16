// PDF-report + portal metadata for the Policies – Functional module.
export default {
  moduleLabel: 'Policies',

  spec: 'policies',
  portalLabel: 'Policies – My Account',
  portalAliases: ['policies', 'policy', 'pol'],

  perfLighthouse: 0,

  p0Ids: [
    'POLF-001', 'POLF-002', 'POLF-003', 'POLF-004',
    'POLF-005', 'POLF-007', 'POLF-008', 'POLF-010',
    'POLF-011', 'POLF-023', 'POLF-024', 'POLF-026',
    'POLF-027', 'POLF-029', 'POLF-030', 'POLF-032',
    'POLF-033', 'POLF-035',
    'POLF-040', 'POLF-041', 'POLF-047',
  ],

  sections: [
    ['Policies List',        ['POLF-001', 'POLF-002', 'POLF-003', 'POLF-004']],
    ['Return & Refund',      ['POLF-005', 'POLF-007']],
    ['Shipping',             ['POLF-008', 'POLF-010']],
    ['Privacy',              ['POLF-011', 'POLF-023']],
    ['Fee & Payment',        ['POLF-024', 'POLF-026']],
    ['Terms & Conditions',   ['POLF-027', 'POLF-029']],
    ['RelianceOne TnC',      ['POLF-030', 'POLF-032']],
    ['Disclaimer',           ['POLF-033', 'POLF-035']],
    ['Links & Content',      ['POLF-037']],
    ['Access & Security',    ['POLF-040', 'POLF-041', 'POLF-045', 'POLF-046', 'POLF-047']],
  ],
};
