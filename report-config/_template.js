// TEMPLATE — copy this to report-config/<page>.js for a new page.
//
// The shared report script (scripts/generate-report-pdf.mjs) auto-loads the
// config whose filename matches your test-id prefix, lowercased. So if your
// cases are PDP-001, PDP-002, … name this file report-config/pdp.js.
// Run `npm run report` after your test run — no edits to the shared script.
export default {
  // Heading on the report. Optional — defaults to the id prefix uppercased.
  moduleLabel: 'PDP',

  // --- Test Portal (npm run portal) ---
  // Just having this file makes the page appear in the portal automatically.
  spec: 'pdp',                              // Playwright filename filter (matches pdp.spec.js)
  portalLabel: 'PDP — Product Detail Page', // dropdown label (defaults to moduleLabel)
  portalAliases: ['detail', 'product'],     // extra keywords the type-box accepts

  // Cases counted in scope but verified separately (e.g. via Lighthouse),
  // not executed in this Playwright run. Use 0 if you have none.
  perfLighthouse: 0,

  // Which case ids are P0. Everything else is treated as P1.
  p0Ids: [
    // 'PDP-001', 'PDP-002',
  ],

  // Feature sections in display order: [title, [case ids]].
  // Any id not listed falls into an "Other" group at the end.
  sections: [
    // ['Gallery', ['PDP-001', 'PDP-002']],
    // ['Buy Box', ['PDP-010', 'PDP-011']],
  ],
};
