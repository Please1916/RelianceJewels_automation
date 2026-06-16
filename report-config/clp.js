// PDF-report + portal metadata for the CLP page (ids: CLP-001, …).
// Auto-loaded by the shared report script when the run's test ids start with
// "CLP-". Sections mirror the CLP test sheet; ids not executed in a run simply
// don't appear (so listing P2 ids here is forward-compatible).
export default {
  moduleLabel: 'CLP',

  // --- Test Portal ---
  spec: 'clp',                                  // matches tests/clp.spec.js
  portalLabel: 'CLP — Collection Listing Page',
  portalAliases: ['collection', 'collections'],

  // CLP-028 (page load < 3s) is counted in scope but verified via Lighthouse,
  // not executed in this Playwright run.
  perfLighthouse: 1,

  // P0 case ids (everything else is treated as P1).
  p0Ids: [
    'CLP-001', 'CLP-007', 'CLP-008', 'CLP-009', 'CLP-011',
    'CLP-012', 'CLP-014', 'CLP-015', 'CLP-026', 'CLP-028',
  ],

  // Feature sections, in display order: [title, [case ids]].
  sections: [
    ['Header & Navigation', ['CLP-001', 'CLP-002', 'CLP-003', 'CLP-004', 'CLP-005']],
    ['Breadcrumb', ['CLP-006']],
    ['Product Cards', ['CLP-007', 'CLP-008', 'CLP-009', 'CLP-010', 'CLP-011', 'CLP-012', 'CLP-013']],
    ['Filters & Sort', ['CLP-014', 'CLP-015', 'CLP-016']],
    ['Page Configuration', ['CLP-017', 'CLP-018', 'CLP-019', 'CLP-020']],
    ['Ad Banners', ['CLP-021', 'CLP-022', 'CLP-023']],
    ['UX & Performance', ['CLP-024', 'CLP-025', 'CLP-026', 'CLP-027', 'CLP-028']],
  ],
};
