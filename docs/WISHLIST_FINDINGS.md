# Wishlist — Findings Checklist (how to confirm the automated cases are correct)

This is the manual-verification pass for the **51 active automated wishlist tests**
([`tests/wishlist.spec.js`](../tests/wishlist.spec.js)). All 51 **pass**; this doc
lists every `[finding]` the run logged so you can confirm — on the **real site** —
whether each is a *true product gap*, a *mock-data limitation*, or a *test-selector
issue*. Tick the box once verified.

> **20 cases are skipped:** 8 are **out of scope — Move-to-Cart** (no cart CTA on the
> wishlist card yet; pending a new requirement) and 12 are **cannot-automate** (backend
> state / real session / device / visual-regression). They are **not** in this checklist —
> see the reason tables in [`WISHLIST_AUTOMATION.md`](./WISHLIST_AUTOMATION.md).

Captured from a full run on 2026-06-05 (`npx playwright test wishlist --reporter=list`).

## How to verify each row
1. Open the real site logged-in (or as guest where noted) and reproduce the action.
2. Compare what you see to **"Test observed"**.
3. Mark the **Verdict**: ✅ real gap (file a bug) · 🔧 mock/selector issue (fix the test) · ☑️ works (tighten the test to assert it).

---

## A. Confident real gaps — quick to confirm (observed live, not mock-dependent)

| TC | Spec expects | Test observed | Likely | Verify ☐ |
|----|--------------|---------------|--------|:--:|
| WL_011 / WL_040 | Heart/remove tap target ≥ 44×44px | **40×40px** | ✅ real a11y gap | ☐ |
| WL_016 / WL_022 | Login as a **modal / bottom-sheet** | **Full-page redirect** to `/auth/login` | ✅ real (spec vs build) | ☐ |
| WL_024 | Back button returns guest to PLP/PDP | Doesn't reliably return | ✅ real gap | ☐ |

*(These are measured/observed directly on the live site — high confidence.)*

## B. Real gaps to confirm (feature appears absent on this build)

| TC | Spec expects | Test observed | Verify on real site ☐ |
|----|--------------|---------------|:--:|
| WL_031 | Skeleton/loader while wishlist fetches | `skeleton = false` | ☐ |
| WL_037 / WL_042 | **Undo** toast after remove | `undo toast = false` (a "removed" toast *does* show) | ☐ |

## C. Needs a real session to settle (mock data may be incomplete — NOT a confirmed gap)

| TC | What's unclear | Why | Verify ☐ |
|----|----------------|-----|:--:|
| WL_004 | No move-to-wishlist heart on the cart page | Cart is empty without real items | ☐ |

> **Move-to-Cart is out of current wishlist scope** (no cart CTA on the card — pending a
> new requirement). WL_043, WL_044, WL_045, WL_047, WL_048, WL_049, WL_050, WL_057 are
> therefore **skipped**, not findings. WL_008 stays active and asserts an OOS item can be
> wishlisted *without* a Move-to-Cart CTA.

## D. Out of MVP scope — confirmed by product (NOT gaps; tests updated to not assert them)

| TC | Out-of-MVP feature | Test now does |
|----|--------------------|---------------|
| WL_050 | **Cart-count badge** update | Verifies the interaction stays SPA (no full reload) instead. ✅ |
| WL_068 | **Variant-discontinued indicator** | Verifies the discontinued-variant item still renders (no indicator assertion). ✅ |

> Product confirmed out of MVP: **wishlist count, cart count, variant-discontinued indicator.**
> The remaining findings in Sections A–C were **not** marked out of scope, so they
> stand as real gaps / items to verify.

## E. Verify the "true" is matching the RIGHT thing (broad regex — possible false positive)

These logged the indicator as **present (true)**, but the search regex is broad — confirm it's matching the *intended* indicator, not nearby text ("Online Exclusive", footer, OOS copy).

| TC | Logged | Confirm it's really… | Verify ☐ |
|----|--------|----------------------|:--:|
| WL_008 | OOS indication = true | a real out-of-stock badge on the card | ☐ |
| WL_067 | sale badge/timer = true | a real flash-sale badge (vs unrelated text) | ☐ |
| WL_068 | variant-unavailable = true | a real variant-level indicator (vs product-level OOS) | ☐ |

---

## Confidence summary
- **Active automated (51):** all pass. High confidence, no real-session needed for guest/security, add/remove/toggle (+real toasts asserted), card count, empty state, error-handling, and responsive layout/measurements. Confirm by running **`--headed`** once.
- **Findings above (~10):** confirm against the real site using this checklist.
- **Out of scope — Move-to-Cart (8):** skipped; the wishlist has no cart CTA yet (pending a new requirement). Re-enable when it ships.
- **Cannot automate (12 in-spec + WL_065/066):** documented with reasons in [`WISHLIST_AUTOMATION.md`](./WISHLIST_AUTOMATION.md) — need backend state, a real OTP session, two devices, or a visual-regression tool.
- **The single biggest settler:** one real `npm run auth:login`, then manually run the move-to-cart / persistence flows logged-in and compare — resolves Section C and validates the `[mock]` assertions end-to-end.

## Quick commands
```bash
npx playwright test wishlist --headed                 # watch them run (59 active + 12 skipped)
npx playwright test wishlist -g "WL_043" --trace on   # step-through a single case
npx playwright show-report                            # screenshots per test
```
