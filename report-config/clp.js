// PDF-report + portal metadata for the CLP page (ids: CLP-001, …).
// Sections / P0 ids are left empty for now (report groups everything under
// "Other", all P1) — fill them in when you formalise the CLP report.
export default {
  moduleLabel: 'CLP',

  // --- Test Portal ---
  spec: 'clp-p0',                               // matches tests/clp-p0.spec.js
  portalLabel: 'CLP — Collection Listing Page',
  portalAliases: ['collection', 'collections'],

  perfLighthouse: 0,
  p0Ids: [],
  sections: [],
};
