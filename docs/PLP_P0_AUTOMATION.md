# PLP / CLP / Search Test Automation

Automates the **P0 + P1** cases from the test-case sheet against the live
storefront (`https://reliancejewels.snghostz5.de`). No login is required.

| Suite | Spec | Page object | Automated | Notes |
|-------|------|-------------|-----------|-------|
| PLP    | [`tests/plp.spec.js`](../tests/plp.spec.js) | [`PlpPage`](../pages/PlpPage.js) | 51 (TC_01–TC_51) | 3 perf via Lighthouse; 5 CMS fixmes |
| CLP    | [`tests/clp.spec.js`](../tests/clp.spec.js) | [`ClpPage`](../pages/ClpPage.js) | 23 (TC_01–TC_23) | 1 perf (CLP-028) via Lighthouse; 3 CMS fixmes |
| Search | [`tests/search.spec.js`](../tests/search.spec.js) | [`SearchPage`](../pages/SearchPage.js) | 17 (TC_01–TC_17) | — |

Performance cases (PLP-064/065/066, CLP-028) are **deferred** to a separate
Lighthouse task — they need true CWV / P75 tooling, not functional assertions.

## Running

```bash
npm test                       # run everything (PLP + CLP + Search, headless)
npx playwright test clp        # one suite (plp | clp | search)
npx playwright test -g TC_05   # one case by its TC label
npm run report                 # regenerate the branded PDF from the last run
npm run portal                 # browser UI: run any suite + view the interactive report
```

Tests run against live data, so the config uses one retry to absorb transient
network/animation blips.

## Status legend

- ✅ pass — asserts live behaviour and passes.
- 🟠 known defect / finding — intentionally non-passing; flags a product gap
  (tagged `[KNOWN DEFECT]` / `[FINDING]` and bucketed separately in the report).
- ⏳ deferred — performance, handled by the Lighthouse task.

## Per-page status mappings

The full **P0 + P1** TC mappings (with per-case statuses) live in the per-page
status reports, regenerated on every run — they are the single source of truth:

- PLP — [`plp.md`](../plp.md) (51 cases)
- CLP — [`clp.md`](../clp.md) (23 cases: 13 ✅ · 7 known-defect · 3 manual)
- Search — [`search.md`](../search.md) (17 cases: 14 ✅ · 3 known-defect/finding)

Each page also produces a branded PDF via `npm run report`
(`report/clp-test-report.pdf`, `report/search-test-report.pdf`), and the aggregate
stakeholder view is [`AUTOMATION_REPORT.md`](../AUTOMATION_REPORT.md).

## Defects / findings (file these as bugs)

### BUG-1 (PLP-020) — Default PLP sort is "Popularity", spec says "Relevance"
Default sort on `/products` is **Popularity**; "Relevance" isn't even an option.

### BUG-2 (PLP-019) — Sort options don't match the spec
Actual: Latest Products, Popularity, Price L→H, Price H→L, Discount L→H, Discount H→L.
Missing **Relevance** & **Ratings**; "New Arrival" appears renamed to **"Latest Products"**; extra **Discount** sorts.

### BUG-3 (PLP-030) — Intermittent PLP↔PDP price discrepancy [WATCH]
Same product: upper price matches, lower price differs and fluctuates between
loads (likely live metal-rate recomputation). G2 expects 0% discrepancy — confirm with the team.

### BUG-CLP-CARD (CLP-008/009/010/011) — Collection hover-card design not implemented
PRD specifies a slide-in detail panel with a **"Discover More"** CTA on collection
cards. On staging, collections reuse the standard PLP card (name hidden by default
per CLP-007, but no hover panel / "Discover More" CTA, so no slide-in/out). CLP
TC_03/04/05/15 assert the PRD and fail to flag this.

### BUG-CLP-NAV (CLP-002) — Nav/header does not hide on scroll-down
Same as BUG-PLP-NAV: the header is persistently sticky and does not slide up on
scroll-down. CLP TC_10 asserts the PRD and fails by design.

### BUG-CLP-SKEL (CLP-024) — No skeleton/shimmer loader while loading
No skeleton/shimmer placeholder is rendered while the collection grid loads. CLP
TC_21 asserts the PRD and fails by design.

### BUG-CLP-LAZY (CLP-027) — Product images not lazy-loaded
Collection card images carry no `loading="lazy"` (nor a deferred `data-src`). CLP
TC_23 asserts the PRD and fails by design.

### BUG-SRC-1 (SRC-004/005) — Search does not match SKU / RRL identifiers
Searching a product's numeric id or slug code returns **no results** — search
appears to be name/category based only. Provide a real SKU + RRL code to confirm,
or treat as a search-capability gap. TC_04/05 are tagged `[FINDING]`.

### BUG-SRC-2 (SRC-015) — No friendly "No results found" message
An invalid query (`?q=xyzabc123zzq`) returns **0 products with no detectable
"No results" message**. TC_11 passes on the 0-results assertion and logs
`[SRC-015 finding]`. Confirm an empty-state message is expected.

### BUG-SRC-TREND (SRC-017) — No trending/recommended keywords on focus
Focusing the search bar (without typing) shows **no trending/recommended search
keywords**, which the PRD requires. Search TC_17 asserts the PRD and fails by design.
