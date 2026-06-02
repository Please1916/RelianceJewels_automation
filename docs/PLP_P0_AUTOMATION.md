# PLP P0 Test Automation

Automates the **21 PLP P0** cases from the test-case sheet against the live
storefront (`https://reliancejewels.snghostz5.de/products`).

- **18 functional cases** are automated in [`tests/plp-p0.spec.js`](../tests/plp-p0.spec.js)
  using the [`PlpPage`](../pages/PlpPage.js) page object.
- **3 performance cases** (PLP-064 desktop load, PLP-065 mobile load,
  PLP-066 Core Web Vitals) are **deferred** to a separate Lighthouse-based task —
  they need true CWV / P75 tooling, not functional Playwright assertions.

## Running

```bash
npm test -- plp-p0                 # run the PLP P0 suite (headless)
npm run test:headed -- plp-p0      # watch it run
npx playwright show-report         # open the HTML report
```

No login is required for any PLP P0 case. The suite runs against live data
(catalog of ~23 products), so it includes one retry to absorb transient
network/animation blips.

## Case → test mapping

| TC | Status | Notes |
|----|--------|-------|
| PLP-001 | ✅ pass | Header/nav items equal Home; logo + search present |
| PLP-010 | ✅ pass | 7 filter tabs visible & on one row |
| PLP-011 | ✅ pass | Clicking Category reveals value links |
| PLP-012 | ✅ pass | Multi-select → `?category=rings&category=studs` |
| PLP-013 | ✅ pass | Combine Category + Metal Purity (dynamic value) |
| PLP-014 | ✅ pass | Sentinel proves client-side update (no reload) |
| PLP-018 | ✅ pass | Sort widget visible |
| **PLP-019** | ❌ **FAIL (defect)** | Spec sort options don't match live — see BUG-2 |
| **PLP-020** | ❌ **FAIL (defect)** | Default sort is "Popularity", not "Relevance" — see BUG-1 |
| PLP-021 | ✅ pass | Price Low→High ascending |
| PLP-022 | ✅ pass | Price High→Low descending |
| PLP-025 | ✅ pass | Multi-column grid layout |
| PLP-026 | ✅ pass | Card image present with src |
| PLP-028 | ✅ pass | Name shown, truncated ≤ 2 lines |
| PLP-029 | ✅ pass | ₹ price present & parseable |
| PLP-030 | ✅ pass | Same product + overlapping price band — see BUG-3 (watch) |
| PLP-035 | ✅ pass | Card opens PDP (in a new tab) |
| PLP-063 | ✅ pass | Scrolling loads more (12 → more, of 23) |
| PLP-064/065/066 | ⏳ deferred | Performance — Lighthouse task |

The two failing tests are **intentional**: they assert the documented spec and
fail because the live site diverges, surfacing the defects below.

## Defects found (file these as bugs)

### BUG-1 (PLP-020) — Default PLP sort is "Popularity", spec says "Relevance"
- **Steps:** Open `/products` → read the "Sort By:" value.
- **Expected:** Default sort = **Relevance**.
- **Actual:** Default sort = **Popularity**. ("Relevance" is not an option at all.)
- **Severity:** Medium (P0 spec deviation; affects default result ordering).

### BUG-2 (PLP-019) — Sort options don't match the spec
- **Steps:** Open `/products` → open the Sort dropdown.
- **Expected options:** Relevance, New Arrival, Popularity, Ratings, Price Low to High, Price High to Low.
- **Actual options:** Latest Products, Popularity, Price Low to High, Price High to Low, Discount Low to High, Discount High to Low.
- **Diff:** Missing **Relevance**, **Ratings**; "New Arrival" appears to be renamed **"Latest Products"**; extra **Discount Low→High / High→Low**.
- **Severity:** Medium (P0 spec deviation; confirm with PM whether spec or build is the source of truth).

### BUG-3 (PLP-030) — Intermittent PLP↔PDP price discrepancy [WATCH]
- **Steps:** On `/products`, note card 0's price → open its PDP → compare the marked price.
- **Observed:** Same product, **upper bound matches** (e.g. ₹2,37,642.44) but the **lower bound differs** between PLP and PDP (e.g. PLP ₹58,958 vs PDP ₹1,00,000), and it fluctuates between page loads.
- **Likely cause:** Variant prices recomputed from live metal rates per page load.
- **Goal G2 says 0% discrepancy**, so confirm with the team whether this drift is acceptable. The automated test logs the exact mismatch (`[PLP-030 finding]`) when texts differ.
- **Severity:** Needs triage (could be expected dynamic pricing, or a real consistency bug).
