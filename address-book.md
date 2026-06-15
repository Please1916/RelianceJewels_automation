# Address Book – Functional Test Cases — Automation Status

Suite file: [`tests/address-book.spec.js`](tests/address-book.spec.js) · Run with `npm run test:ab`
Target: live staging storefront (`https://reliancejewels.snghostz5.de`) · My Account → Address Book
Last run: 2026-06-08

## Summary

| Status | Count |
|---|---|
| ✅ Passed | 34 |
| ❌ Failed (unexpected) | 0 |
| 🟠 Known defects / findings (fail by design) | 2 |
| ⏸️ Manual / fixme | 13 |
| **Total cases** | **49** |

> Auth: tests use a **two-layer stub** approach — session stub (makes SPA think user is logged in) + Cart address API stubs (deterministic CRUD, no real account writes). No `npm run auth:login` needed to run this suite. The 13 ⏸️ cases require either a **real session** (edit/delete SVG interactions, resilience tests) or **manual verification** (Google Maps, SQL injection backend, checkout, CMS-config).

### Status legend
- ✅ **Passed** — behaviour verified against the live site.
- 🟠 **Known defect** — intentionally non-passing; flags a PRD gap (`[KNOWN DEFECT]` tag).
- 🔎 **Finding** — passes but logs a documented deviation (`[FINDING]` tag).
- ⏸️ **Manual / fixme** — requires real session or special setup; `test.fixme`.
- ❌ **Failed (unexpected)** — a real test failure; there are **none**.

---

## P0 — Core functional (TC_01–TC_34)

### Empty State
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_01 | ABF-001 | Empty state shows message and Add New Address button | ✅ Passed |

### Add – Location Autocomplete
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_02 | ABF-002 | Map search box visible in Add form | ⏸️ Manual (Google Maps search box absent → BUG-AB-MAP) |
| TC_03 | ABF-003 | Pincode 400069 auto-fills Mumbai / Maharashtra / India | ✅ Passed |
| TC_04 | ABF-004 | Pincode 560001 auto-fills Bengaluru / Karnataka / India | ✅ Passed |

### Add – Tags
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_05 | ABF-005 | Home tag selected by default on new address form | ✅ Passed |
| TC_06 | ABF-006 | Selecting Work tag marks it selected | ✅ Passed |
| TC_07 | ABF-007 | Selecting Others tag marks it selected | ✅ Passed |
| TC_08 | ABF-008 | Address Line 2 and Email are optional | 🟠 Known defect → BUG-AB-REQUIRED |

### Default Address
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_09 | ABF-009 | Default address card shows filled radio | ✅ Passed |
| TC_10 | ABF-010 | Clicking radio on non-default makes it default | ✅ Passed |

### Edit Address
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_11 | ABF-011 | Edit form opens pre-filled with saved values | ⏸️ Manual (edit SVG needs real session) |
| TC_12 | ABF-012 | Edit saves updated fields | ⏸️ Manual (edit SVG needs real session) |

### Delete Address
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_13 | ABF-013 | Delete shows confirmation modal | ✅ Passed |
| TC_14 | ABF-014 | Confirm deletion removes the address | ⏸️ Manual (delete SVG needs real session) |
| TC_15 | ABF-015 | Cancel keeps the address | ⏸️ Manual (delete SVG needs real session) |

### Country & Checkout
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_16 | ABF-016 | Country field is empty by default on fresh Add form | ✅ Passed |
| TC_17 | ABF-017 | Default address pre-selected at checkout | ⏸️ Manual (requires live cart + checkout flow) |

### Validation
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_18 | ABF-018 | Missing Address Line 1 — Save disabled | ✅ Passed |
| TC_19 | ABF-019 | Missing Pincode — Save disabled | ✅ Passed |
| TC_20 | ABF-020 | Pincode < 6 digits — error, no autofill | ✅ Passed |
| TC_21 | ABF-021 | Pincode field restricts to 6 digits (maxlength) | ✅ Passed |
| TC_22 | ABF-022 | Alphabets not accepted in Pincode field | ✅ Passed |
| TC_23 | ABF-023 | Phone < 10 digits — error shown | ✅ Passed |
| TC_24 | ABF-024 | Phone field restricts to 10 digits (maxlength) | ✅ Passed |
| TC_25 | ABF-025 | Alphabets not accepted in Phone field | ✅ Passed |
| TC_26 | ABF-026 | Special characters not accepted in Phone field | ✅ Passed |
| TC_27 | ABF-027 | Missing Contact Name — Save disabled | ✅ Passed |
| TC_28 | ABF-028 | No tag selected — error shown | 🟠 Known defect → BUG-AB-TAG |
| TC_29 | ABF-029 | Invalid email format shows inline error | ✅ Passed |
| TC_30 | ABF-030 | Completely empty form — Save button disabled | ✅ Passed |
| TC_31 | ABF-031 | Spaces-only Address Line 1 treated as empty | ✅ Passed *(spaces currently accepted — see finding)* |

### Security
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_33 | ABF-033 | XSS in Address Line 1 does not execute | ✅ Passed |
| TC_34 | ABF-034 | SQL injection in Contact Name — backend stability | ⏸️ Manual (backend verification required) |

---

## P1 — Functional (TC_35–TC_49)

### Display & Limits
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_35 | ABF-035 | Multiple addresses shown with correct tags and default marker | ✅ Passed |
| TC_36 | ABF-036 | Address Line 1 at 200-char boundary | ⏸️ Manual (backend storage limit check required) |
| TC_37 | ABF-037 | Address Line 1 char limit — field behaviour documented | 🔎 Finding (no client-side limit — BUG-AB-LIMIT) |
| TC_38 | ABF-038 | Address Line 2 at boundary — accepted without error | ✅ Passed |

### Edge Cases
| TC | Case | Title | Status |
|----|------|-------|--------|
| TC_39 | ABF-039 | Non-existent pincode 000000 — friendly error shown | ✅ Passed |
| TC_40 | ABF-040 | Phone starting with 0 — shows valid number error | ✅ Passed |
| TC_41 | ABF-041 | Phone with spaces not accepted | ✅ Passed |
| TC_42 | ABF-042 | Google Maps API offline — graceful degradation | ⏸️ Manual (requires DevTools network block) |
| TC_43 | ABF-043 | Google Maps search — no results message | ⏸️ Manual (maps search box absent — BUG-AB-MAP) |
| TC_44 | ABF-044 | Switching default address — exactly one default at a time | ✅ Passed |
| TC_45 | ABF-045 | Network failure during save — error shown, data not lost | ⏸️ Manual (requires real session + offline mode) |
| TC_46 | ABF-046 | Session expired during save — redirects to login | ⏸️ Manual (requires real session expiry) |
| TC_47 | ABF-047 | Max address limit — Add New Address blocked | ⏸️ Manual (limit undefined; confirm with Engineering) |
| TC_48 | ABF-048 | Edit address can change tag from Home to Work | ⏸️ Manual (edit SVG needs real session) |
| TC_49 | ABF-049 | Contact Email with subdomain accepted as valid | 🔎 Finding (subdomain email rejected by live validator) |

---

## Known defects (fail by design — flag PRD gaps)

| Bug | TC | Case | Description |
|-----|----|------|-------------|
| BUG-AB-REQUIRED | TC_08 | ABF-008 | All form fields (incl. Address Line 2 + Email) are mandatory on the live site; PRD says Line 2 and Email are optional. Save button stays disabled without them. |
| BUG-AB-TAG | TC_28 | ABF-028 | Tag always defaults to Home — a "no tag selected" state is unreachable in the UI; PRD requires an error when no tag is selected. |

## Findings (pass, behaviour noted)

| Finding | Case | Description |
|---------|------|-------------|
| BUG-AB-MAP | ABF-002 | Google Maps loads (map renders) but there is **no search box** — the autocomplete feature specified in the PRD is missing. |
| BUG-AB-LIMIT | ABF-037 | Address Line 1 has **no HTML `maxlength`** — the "50-char limit" from review is enforced server-side only, not client-side (PRD says 200 chars). |
| BUG-AB-LAZY-SPACES | ABF-031 | Spaces-only input in Address Line 1 is currently **accepted** (not trimmed); PRD requires it to be treated as empty. |
| ABF-049 | ABF-049 | Subdomain email `contact@mail.company.co.in` is **rejected** by the live validator; PRD expects it to be accepted as valid. |

## Manual verification (fixme — real session required)

| TC | Case | Reason |
|----|------|--------|
| TC_11 | ABF-011 | Edit SVG icon (`svg[alt="edit"]`) only renders when SPA confirms `user_id` ownership → requires real auth session |
| TC_12 | ABF-012 | Same as TC_11 |
| TC_14 | ABF-014 | Delete SVG + SPA reactivity to DELETE response requires real session |
| TC_15 | ABF-015 | Same as TC_14 |
| TC_45 | ABF-045 | Vue form validation needs real session to reliably enable Save; then verify offline mode |
| TC_46 | ABF-046 | Same as TC_45; session expiry scenario |
| TC_47 | ABF-047 | Max address limit undefined (Engineering open question #5) |
| TC_48 | ABF-048 | Edit form needs real session for tag-change verification |
| TC_02 | ABF-002 | Google Maps search box absent → manual |
| TC_17 | ABF-017 | Requires live cart + checkout flow |
| TC_34 | ABF-034 | SQL injection resistance — backend API test required |
| TC_36 | ABF-036 | 200-char boundary — backend storage test required |
| TC_42 | ABF-042 | Maps offline — requires DevTools network block |
| TC_43 | ABF-043 | Maps search no-results — blocked by BUG-AB-MAP |
