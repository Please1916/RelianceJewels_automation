# CLP Test Cases — Automation Status

Suite file: [`tests/clp.spec.js`](tests/clp.spec.js) · Run with `npm run test:clp`
Target: live staging storefront (`https://reliancejewels.snghostz5.de`)
Last run: 2026-06-05

## Summary

| Status | Count |
|---|---|
| ✅ Passed | 13 |
| ❌ Failed (unexpected) | 0 |
| 🟠 Known defects / findings (fail by design) | 7 |
| ⏸️ Manual verification (CMS-config) | 3 |
| **Total cases** | **23** |

> Scope: 9 of 10 P0 cases (perf case CLP-028 page-load < 3s is handled separately
> via Lighthouse) + all 14 P1 cases. Collections reuse the PLP card/filter/sort
> components, so those behaviours are inherited from `PlpPage`. **Only genuine,
> unexpected failures are reported as ❌** — there are none. The 7 🟠 cases fail by
> design to flag PRD gaps (tracked separately); the 3 ⏸️ cases need a
> CMS-configured page and are verified manually.

### Status legend
- ✅ **Passed** — behaviour verified against the live site.
- 🟠 **Known defect / finding** — intentionally non-passing; flags a product gap
  (tagged `[KNOWN DEFECT]` / `[FINDING]`, bucketed separately in the report).
- ⏸️ **Manual** — requires a CMS-configured page; `test.fixme`, verified manually.
- ❌ **Failed (unexpected)** — a real test failure; shown with error log + screenshot.

---

## P0 — Core functional (TC_01–TC_09)

| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_01 | CLP-001 | Header & nav matches HomePage | ✅ Passed |
| TC_02 | CLP-007 | Card shows image + tag (name hidden by default) | ✅ Passed |
| TC_06 | CLP-012 | Clicking a product card navigates to PDP | ✅ Passed |
| TC_07 | CLP-014 | Filters work on CLP same as PLP (no full reload) | ✅ Passed |
| TC_08 | CLP-015 | Sort Price Low → High ascending | ✅ Passed |
| TC_09 | CLP-026 | Infinite scroll / load more adds products | ✅ Passed |

## P1 — Functional (TC_10–TC_23)

### Header & Category Navigation
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_11 | CLP-003 | Nav bar & page title reappear on scroll up | ✅ Passed |
| TC_12 | CLP-004 | Total product count is displayed | ✅ Passed |
| TC_13 | CLP-005 | Product count updates when filters applied | ✅ Passed |

### Breadcrumb
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_14 | CLP-006 | Breadcrumb shown with clickable segments | ✅ Passed |

### Product Cards
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_16 | CLP-013 | Wishlist icon visible on hover | ✅ Passed |

### Filters & Sort
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_17 | CLP-016 | Filter + sort combination (ascending price) | ✅ Passed |

### UX & Performance
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_22 | CLP-025 | Scroll position restoration on return from PDP | ✅ Passed |

---

## Known defects (fail by design — flag PRD gaps)

| Bug | TC | Case | Description |
|-----|----|------|-------------|
| BUG-CLP-CARD | TC_03 | CLP-008 | Hover detail panel does not slide in (PRD collection-card design not implemented). |
| BUG-CLP-CARD | TC_04 | CLP-009 | Hover panel fields (name/price/discount/type) not implemented. |
| BUG-CLP-CARD | TC_05 | CLP-011 | "Discover More" hover CTA → PDP not implemented. |
| BUG-CLP-CARD | TC_15 | CLP-010 | Hover panel never slides in, so slide-out on hover-off cannot occur. |
| BUG-CLP-NAV | TC_10 | CLP-002 | Nav/header is persistently sticky; it does not hide on scroll-down. |
| BUG-CLP-SKEL | TC_21 | CLP-024 | No skeleton/shimmer loader shown while data loads. |
| BUG-CLP-LAZY | TC_23 | CLP-027 | Product images have no native lazy-loading (`loading="lazy"`). |

## Manual verification (CMS-configured pages)

| TC | Case | Title |
|----|------|-------|
| TC_18 | CLP-017 | Text-only header type on CLP |
| TC_19 | CLP-018 | Image banner header type on CLP |
| TC_20 | CLP-019 | Video banner header (auto-play + muted) on CLP |

## Deferred to Lighthouse

| Case | Title |
|------|-------|
| CLP-028 | CLP page load time < 3 seconds (P75) |
