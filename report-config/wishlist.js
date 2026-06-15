// Test Portal + report metadata for the Wishlist suite.
//
// Makes "Wishlist" appear in the Test Portal (npm run portal / npm run start).
// The portal runs `npx playwright test wishlist` (51 active + 20 skipped cases in tests/wishlist.spec.js:
// 8 out-of-scope Move-to-Cart + 12 cannot-automate)
// and, when "generate report" is ticked, builds the dedicated wishlist PDF.
export default {
  moduleLabel: 'Wishlist',

  // --- Test Portal ---
  spec: 'wishlist',                                 // filename filter → wishlist.spec.js
  portalLabel: 'Wishlist — Save for Later',         // dropdown label
  portalAliases: ['wl', 'wish', 'wishlist', 'save'],
  // Dedicated wishlist report (donut + per-area), not the shared generic one.
  reportScript: 'scripts/generate-wishlist-report.mjs',

  perfLighthouse: 0,
};
