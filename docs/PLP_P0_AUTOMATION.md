# PLP / CLP / Search P0 Test Automation

Automates the **P0** cases from the test-case sheet against the live storefront
(`https://reliancejewels.snghostz5.de`). No login is required.

| Suite | Spec | Page object | Automated | Notes |
|-------|------|-------------|-----------|-------|
| PLP    | [`tests/plp-p0.spec.js`](../tests/plp-p0.spec.js) | [`PlpPage`](../pages/PlpPage.js) | 18 (TC_01–TC_18) | 3 perf cases deferred |
| CLP    | [`tests/clp-p0.spec.js`](../tests/clp-p0.spec.js) | [`ClpPage`](../pages/ClpPage.js) | 9 (TC_19–TC_27) | 1 perf case deferred |
| Search | [`tests/search-p0.spec.js`](../tests/search-p0.spec.js) | [`SearchPage`](../pages/SearchPage.js) | 11 (TC_28–TC_38) | — |

Performance cases (PLP-064/065/066, CLP-028) are **deferred** to a separate
Lighthouse task — they need true CWV / P75 tooling, not functional assertions.

## Running

```bash
npm test                       # run everything (headless)
npx playwright test plp-p0     # one suite
npx playwright test -g TC_24   # one case by ID
npm run test:report            # run all P0 + regenerate the PDF report
npm run report:pdf             # rebuild the PDF from the last run
npm run report                 # open the interactive HTML report
```

Tests run against live data, so the config uses one retry to absorb transient
network/animation blips.

## Status legend

- ✅ pass — asserts live behaviour and passes.
- 🟠 known defect / finding — intentionally non-passing; flags a product gap
  (tagged `[KNOWN DEFECT]` / `[FINDING]` and bucketed separately in the report).
- ⏳ deferred — performance, handled by the Lighthouse task.

## CLP mapping (TC_19–TC_27)

| TC | Case | Status | Notes |
|----|------|--------|-------|
| TC_19 | CLP-001 | ✅ | Header/nav matches Home |
| TC_20 | CLP-007 | ✅ | Card hides name by default (image+tag) |
| TC_21 | CLP-008 | 🟠 known defect | Hover detail panel "Discover More" not implemented |
| TC_22 | CLP-009 | 🟠 known defect | Hover panel fields/CTA not implemented |
| TC_23 | CLP-011 | 🟠 known defect | "Discover More" CTA → PDP not implemented |
| TC_24 | CLP-012 | ✅ | Card click → PDP (new tab) |
| TC_25 | CLP-014 | ✅ | Filters work like PLP (no reload) |
| TC_26 | CLP-015 | ✅ | Sort Price Low→High ascending |
| TC_27 | CLP-026 | ✅ | Infinite scroll loads more |
| — | CLP-028 | ⏳ deferred | Page load < 3s (Lighthouse) |

## Search mapping (TC_28–TC_38)

| TC | Case | Status | Notes |
|----|------|--------|-------|
| TC_28 | SRC-001 | ✅ | Search bar on Home/PLP/PDP |
| TC_29 | SRC-002 | ✅ | Search bar on PDP & Cart |
| TC_30 | SRC-003 | ✅ | Search by product name |
| TC_31 | SRC-004 | 🟠 finding | SKU (derived id) returns no results — see BUG-SRC-1 |
| TC_32 | SRC-005 | 🟠 finding | RRL (derived code) returns no results — see BUG-SRC-1 |
| TC_33 | SRC-006 | ✅ | Search by category name |
| TC_34 | SRC-007 | ✅ | Type-ahead after 2 chars |
| TC_35 | SRC-008 | ✅ | Suggestions show products + categories |
| TC_36 | SRC-011 | ✅ | Clicking a suggestion navigates |
| TC_37 | SRC-012 | ✅ | Results use PLP layout |
| TC_38 | SRC-015 | ✅ | 0 products for nonsense query (see BUG-SRC-2) |

## Defects / findings (file these as bugs)

### BUG-1 (PLP-020) — Default PLP sort is "Popularity", spec says "Relevance"
Default sort on `/products` is **Popularity**; "Relevance" isn't even an option.

### BUG-2 (PLP-019) — Sort options don't match the spec
Actual: Latest Products, Popularity, Price L→H, Price H→L, Discount L→H, Discount H→L.
Missing **Relevance** & **Ratings**; "New Arrival" appears renamed to **"Latest Products"**; extra **Discount** sorts.

### BUG-3 (PLP-030) — Intermittent PLP↔PDP price discrepancy [WATCH]
Same product: upper price matches, lower price differs and fluctuates between
loads (likely live metal-rate recomputation). G2 expects 0% discrepancy — confirm with the team.

### BUG-CLP-1 (CLP-008/009/011) — Collection hover-card design not implemented
PRD specifies a slide-in detail panel with a **"Discover More"** CTA on collection
cards. On staging, collections reuse the standard PLP card (name hidden by default
per CLP-007, but no hover panel / "Discover More" CTA). TC_21/22/23 assert the PRD
and fail to flag this.

### BUG-SRC-1 (SRC-004/005) — Search does not match SKU / RRL identifiers
Searching a product's numeric id or slug code returns **no results** — search
appears to be name/category based only. Provide a real SKU + RRL code to confirm,
or treat as a search-capability gap. TC_31/32 are tagged `[FINDING]`.

### BUG-SRC-2 (SRC-015) — No friendly "No results found" message
An invalid query (`?q=xyzabc123zzq`) returns **0 products with no detectable
"No results" message**. TC_38 passes on the 0-results assertion and logs
`[SRC-015 finding]`. Confirm an empty-state message is expected.
