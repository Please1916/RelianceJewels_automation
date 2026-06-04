// PDF-report + portal metadata for the Search page (ids: SRC-001, …).
// Filename is "src" to match the SRC- id prefix the report auto-detects.
// Sections / P0 ids left empty for now (report groups under "Other", all P1).
export default {
  moduleLabel: 'Search',

  // --- Test Portal ---
  spec: 'search-p0',                  // matches tests/search-p0.spec.js
  portalLabel: 'Search',
  portalAliases: ['search', 'find', 'query'],

  perfLighthouse: 0,
  p0Ids: [],
  sections: [],
};
