# Reliance Jewels — Storefront Automation Report

**Prepared for:** Stakeholders · QA Automation
**Date:** 2026-06-04 *(point-in-time snapshot — results refresh on every run)*
**Environment:** Staging storefront — `https://reliancejewels.snghostz5.de`
**Framework:** Playwright (Chromium) · live-site end-to-end

---

## 1. Executive summary

Automated end-to-end coverage is live for **three storefront pages** — Product
Listing (PLP), Collection Listing (CLP), and Search — totalling **71 automated
test cases**, plus 3 PLP performance cases handled via Lighthouse and a 2-test
login framework. A full run was executed for this report.

| Result | Count |
|---|---|
| ✅ Passed | **53** |
| ❌ Genuine (unexpected) failures | **0** |
| ⚠️ Known defects / findings (fail by design, tracked) | 13 |
| ⏸️ Manual-verification (CMS-config, skipped) | 5 |
| **Total automated cases this run** | **71** |

**Headline:** every case that is *expected* to pass does pass — **0 unexpected
failures**. The 13 "failing" cases are deliberately flagged known defects and
product findings (they fail on purpose to surface gaps vs. the PRD and are
tracked by the dev team). 5 cases require a CMS-configured page and are verified
manually.

> **Executed pass rate:** 53 / 53 expected-pass cases = **100%** (0 unexpected
> failures). Including flagged known-defects in the denominator: 53 / 66 = 80%.

---

## 2. Scope & coverage

| Page | Suite file | Cases | Run command |
|---|---|---|---|
| **PLP** — Product Listing Page | `tests/plp.spec.js` | 51 | `npm run test:plp` |
| **CLP** — Collection Listing Page | `tests/clp-p0.spec.js` | 9 | `npm run test:clp` |
| **Search** | `tests/search-p0.spec.js` | 11 | `npm run test:search` |
| _Login / auth framework_ | `tests/login.spec.js` | 2 | (supports the above) |

Additionally: **PLP-064 / 065 / 066** (performance) are covered separately via
Lighthouse, not in the Playwright run.

### Status legend
- ✅ **Passed** — behaviour verified against the live site.
- ⚠️ **Passed (deviation)** — assertion passes, but live behaviour differs from the PRD wording (noted).
- 🐞 **Known defect** — fails by design to flag a PRD gap; tracked by the dev team.
- 🔎 **Finding** — a discovered product gap (search), flagged for the dev team.
- ⏸️ **Manual** — requires a CMS-configured page; verified manually.

---

## 3. PLP — Product Listing Page (51 cases · 38 ✅ / 8 🐞 / 5 ⏸️)

### Core functional (P0)
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_01 | PLP-001 | Header & category nav matches HomePage | ✅ |
| TC_02 | PLP-010 | Filters displayed horizontally at the top | ✅ |
| TC_03 | PLP-011 | Clicking a filter opens its dropdown/panel | ✅ |
| TC_04 | PLP-012 | Multi-select within a single filter | ✅ |
| TC_05 | PLP-013 | Combining selections across multiple filters | ✅ |
| TC_06 | PLP-014 | Product grid updates dynamically (no full reload) | ✅ |
| TC_07 | PLP-018 | Sort dropdown visible alongside filters | ✅ |
| TC_08 | PLP-019 | Sort options available in the dropdown | ⚠️ deviation (BUG-2) |
| TC_09 | PLP-020 | A default sort is pre-selected | ⚠️ deviation (BUG-1) |
| TC_10 | PLP-021 | Price Low → High sorting | ✅ |
| TC_11 | PLP-022 | Price High → Low sorting | ✅ |
| TC_12 | PLP-025 | Products displayed in grid layout | ✅ |
| TC_13 | PLP-026 | Product image displayed on each card | ✅ |
| TC_14 | PLP-028 | Product name displayed & truncated to ≤2 lines | ✅ |
| TC_15 | PLP-029 | Current price displayed on cards | ✅ |
| TC_16 | PLP-030 | PLP price matches PDP price | ✅ |
| TC_17 | PLP-035 | Clicking a product card navigates to PDP | ✅ |
| TC_18 | PLP-063 | Infinite scroll / load more adds products | ✅ |

### Functional (P1)
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_19 | PLP-002 | Nav bar hides on scroll down (>100px) | 🐞 known defect |
| TC_20 | PLP-003 | Page title hides on scroll down | ✅ |
| TC_21 | PLP-004 | Nav bar & page title reappear on scroll up | ✅ |
| TC_22 | PLP-005 | Total product count is displayed | ✅ |
| TC_23 | PLP-006 | Product count updates when filters applied | ✅ |
| TC_24 | PLP-007 | Breadcrumb displays full navigation path | ✅ |
| TC_25 | PLP-008 | Each breadcrumb segment is clickable | ✅ |
| TC_26 | PLP-015 | "Reset All" clears all active filters | ✅ |
| TC_27 | PLP-016 | Selected filter chips are displayed | ✅ |
| TC_28 | PLP-017 | Removing a single filter chip | ✅ |
| TC_29 | PLP-023 | Only one sort option active at a time | ✅ |
| TC_30 | PLP-024 | Sort works in combination with filters | ✅ |
| TC_31 | PLP-027 | Product images are lazy-loaded | 🐞 known defect |
| TC_32 | PLP-031 | Struck-out price (original MRP) shown | ✅ |
| TC_33 | PLP-032 | Discount badge is displayed | ✅ |
| TC_34 | PLP-033 | Product tags are displayed | ✅ |
| TC_35 | PLP-034 | Product type indicator shown | ⚠️ deviation (BUG-PLP-TYPE) |
| TC_36 | PLP-036 | Wishlist icon appears on hover | ✅ |
| TC_37 | PLP-037 | Add/remove wishlist toggle (logged in) | ✅ |
| TC_38 | PLP-038 | Wishlist for non-logged-in user prompts login | ✅ |
| TC_39 | PLP-039 | Quick View CTA appears on hover | 🐞 known defect |
| TC_40 | PLP-040 | Quick View modal opens on clicking CTA | 🐞 known defect |
| TC_41 | PLP-041 | Quick View modal displays required elements | 🐞 known defect |
| TC_42 | PLP-044 | Add to Cart from Quick View (with variant) | 🐞 known defect |
| TC_43 | PLP-045 | Variant selection required before Add to Cart | 🐞 known defect |
| TC_49 | PLP-061 | Scroll position restoration on return from PDP | ✅ |
| TC_50 | PLP-062 | Skeleton/shimmer loader while loading | 🐞 known defect |
| TC_51 | PLP-067 | Any product reachable within 3 clicks from homepage | ✅ |

### Manual verification (CMS-config required)
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_44 | PLP-049 | Text-only header type | ⏸️ manual |
| TC_45 | PLP-050 | Image banner header type | ⏸️ manual |
| TC_46 | PLP-051 | Video banner header type | ⏸️ manual |
| TC_47 | PLP-052 | Video banner auto-plays and is muted | ⏸️ manual |
| TC_48 | PLP-053 | Overlay text on image/video banners | ⏸️ manual |

### PLP — PRD deviations (test passes, behaviour differs from spec)
| Bug | Case | Description |
|-----|------|-------------|
| BUG-1 | PLP-020 | Default sort is "Popularity"; PRD specifies "Relevance". |
| BUG-2 | PLP-019 | Live sort options differ from PRD list (no Relevance/Ratings; "New Arrival" → "Latest Products"; extra Discount sorts). |
| BUG-PLP-TYPE | PLP-034 | Product-type label is "Online Exclusive" vs PRD "Make to Order" / "Available Online". |

---

## 4. CLP — Collection Listing Page (9 cases · 6 ✅ / 3 🐞)

| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_19 | CLP-001 | Header & nav on CLP matches HomePage | ✅ |
| TC_20 | CLP-007 | Card shows image and tag only in default state | ✅ *(annotated known-defect; passed this run)* |
| TC_21 | CLP-008 | Detail panel slides in on hover | 🐞 known defect |
| TC_22 | CLP-009 | Hover detail panel shows required fields | 🐞 known defect |
| TC_23 | CLP-011 | "Discover More" CTA on hover navigates to PDP | 🐞 known defect |
| TC_24 | CLP-012 | Clicking a product card navigates to PDP | ✅ |
| TC_25 | CLP-014 | Filters work on CLP same as PLP | ✅ |
| TC_26 | CLP-015 | Sort works on CLP same as PLP | ✅ |
| TC_27 | CLP-026 | Infinite scroll / load more on CLP | ✅ |

**Known defects:** the CLP card **hover detail panel** (slide-in panel, its
required fields, and the "Discover More" CTA → PDP) does not behave per the PRD.
Tracked by the dev team.

---

## 5. Search (11 cases · 9 ✅ / 2 🔎)

| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_28 | SRC-001 | Persistent search bar in header on all pages | ✅ |
| TC_29 | SRC-002 | Search bar accessible on PDP and Cart | ✅ |
| TC_30 | SRC-003 | Search by product name | ✅ |
| TC_31 | SRC-004 | Search by SKU (numeric id) | 🔎 finding |
| TC_32 | SRC-005 | Search by RRL code (slug code) | 🔎 finding |
| TC_33 | SRC-006 | Search by category name | ✅ |
| TC_34 | SRC-007 | Type-ahead suggestions appear after 2+ characters | ✅ |
| TC_35 | SRC-008 | Type-ahead shows BOTH products AND categories | ✅ |
| TC_36 | SRC-011 | Clicking a suggestion navigates correctly | ✅ |
| TC_37 | SRC-012 | Search results use PLP layout | ✅ |
| TC_38 | SRC-015 | No-results state for invalid search | ✅ |

**Findings:** searching by **SKU** (SRC-004) and by **RRL code** (SRC-005) does
not return the expected product. Flagged for the dev team.

---

## 6. Automation framework & capabilities built

Beyond the test cases, the following reusable infrastructure is in place:

1. **Page-aware PDF reporting** — a single shared generator
   (`scripts/generate-report-pdf.mjs`) produces a branded, manager-facing PDF
   (donut chart, coverage strip, section-grouped results, failure screenshots).
   Each page's metadata lives in its own `report-config/<page>.js`, auto-selected
   by test-id prefix. **Adding a new page = adding one config file** — no edits
   to shared code, so multiple engineers extend it without merge conflicts.
2. **Local test portal** (`npm run portal`) — a browser UI to run any suite and
   open its report, no terminal needed. It auto-discovers pages from the same
   `report-config/` files.
3. **Reusable login session** (`npm run auth:login`) — logs in once and saves the
   session, so the suite reuses it instead of repeatedly triggering OTPs.
4. **CI-friendly outputs** — Playwright HTML report, JSON results, and the PDF.

---

## 7. How to reproduce

```bash
npm run setup              # install deps + browser (one time)
npm run test               # run all P0 suites (PLP + CLP + Search)
npm run report             # branded per-page PDF for the page that ran
npm run report:automation  # branded PDF of THIS consolidated report
```

Per-page: `npm run test:plp` · `npm run test:clp` · `npm run test:search`.
Interactive: `npm run portal`.

---

## 8. Notes & next steps

- **This is a point-in-time snapshot (2026-06-04).** Re-running the suite
  refreshes all numbers; the live staging site can change between runs.
- **Known defects & findings (13)** are tracked separately and fail by design —
  they are not regressions in the automation.
- **CLP & Search report metadata** (section grouping / P0 tagging) is minimal for
  now; it will be enriched as those pages are formalised, matching PLP.
- **Upcoming pages** (e.g. PDP, Cart, Checkout) will plug into the same framework:
  add the spec + one `report-config/<page>.js`, and they appear in the report and
  the portal automatically.
```
