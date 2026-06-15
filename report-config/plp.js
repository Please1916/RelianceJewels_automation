// PDF-report metadata for the PLP page.
//
// The shared report script (scripts/generate-report-pdf.mjs) auto-loads this
// file when the run's test ids start with "PLP-" (e.g. PLP-001). To report a
// different page, copy report-config/_template.js to report-config/<page>.js
// and fill in your ids — you never edit the shared script.
export default {
  // Heading shown on the report ("… — Automated Test Report"). Defaults to the
  // id prefix uppercased if omitted.
  moduleLabel: 'PLP',

  // --- Test Portal (npm run portal) ---
  // The portal auto-lists every report-config/<page>.js, so this page shows up
  // there automatically. These fields tune how it appears / runs.
  spec: 'plp',                              // Playwright filename filter (matches plp.spec.js)
  portalLabel: 'PLP — Product Listing Page', // dropdown label (defaults to moduleLabel)
  portalAliases: ['product', 'products', 'listing'], // extra keywords the type-box accepts

  // Cases counted in scope but covered separately via Lighthouse (not executed
  // in this Playwright run). Set to 0 if your page has none.
  perfLighthouse: 3, // PLP-064 / 065 / 066

  // Which case ids are P0 (everything else is treated as P1).
  p0Ids: [
    'PLP-001', 'PLP-010', 'PLP-011', 'PLP-012', 'PLP-013', 'PLP-014',
    'PLP-018', 'PLP-019', 'PLP-020', 'PLP-021', 'PLP-022', 'PLP-025',
    'PLP-026', 'PLP-028', 'PLP-029', 'PLP-030', 'PLP-035', 'PLP-063',
  ],

  // Feature sections, in the order they should appear. [title, [case ids]].
  // Any id not listed here falls into an "Other" group at the end.
  sections: [
    ['Header & Navigation', ['PLP-001', 'PLP-002', 'PLP-003', 'PLP-004', 'PLP-005', 'PLP-006']],
    ['Breadcrumb', ['PLP-007', 'PLP-008']],
    ['Filters', ['PLP-010', 'PLP-011', 'PLP-012', 'PLP-013', 'PLP-014', 'PLP-015', 'PLP-016', 'PLP-017']],
    ['Sort', ['PLP-018', 'PLP-019', 'PLP-020', 'PLP-021', 'PLP-022', 'PLP-023', 'PLP-024']],
    ['Product Cards', ['PLP-025', 'PLP-026', 'PLP-027', 'PLP-028', 'PLP-029', 'PLP-030', 'PLP-031', 'PLP-032', 'PLP-033', 'PLP-034', 'PLP-035', 'PLP-036', 'PLP-037', 'PLP-038']],
    ['Quick View', ['PLP-039', 'PLP-040', 'PLP-041', 'PLP-044', 'PLP-045']],
    ['Page Configuration', ['PLP-049', 'PLP-050', 'PLP-051', 'PLP-052', 'PLP-053']],
    ['UX & Performance', ['PLP-061', 'PLP-062', 'PLP-063', 'PLP-067']],
  ],
};
