// PDF-report + portal metadata for the Search page (ids: SRC-001, …).
// Filename is "src" to match the SRC- id prefix the report auto-detects.
// Sections mirror the Search test sheet; ids not executed in a run simply
// don't appear (so listing P2 ids here is forward-compatible).
export default {
  moduleLabel: 'Search',

  // --- Test Portal ---
  spec: 'search',                     // matches tests/search.spec.js
  portalLabel: 'Search',
  portalAliases: ['search', 'find', 'query'],

  perfLighthouse: 0,

  // P0 case ids (everything else is treated as P1).
  p0Ids: [
    'SRC-001', 'SRC-002', 'SRC-003', 'SRC-004', 'SRC-005', 'SRC-006',
    'SRC-007', 'SRC-008', 'SRC-011', 'SRC-012', 'SRC-015',
  ],

  // Feature sections, in display order: [title, [case ids]].
  sections: [
    ['Search Bar', ['SRC-001', 'SRC-002', 'SRC-003', 'SRC-004', 'SRC-005', 'SRC-006']],
    ['Type-ahead Suggestions', ['SRC-007', 'SRC-008', 'SRC-009', 'SRC-010', 'SRC-011']],
    ['Search Results', ['SRC-012', 'SRC-013', 'SRC-014', 'SRC-015', 'SRC-016']],
    ['Trending & Search History', ['SRC-017', 'SRC-018', 'SRC-019', 'SRC-020', 'SRC-021']],
  ],
};
