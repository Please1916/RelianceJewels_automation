# Docs — Login Flow Diagram

This folder holds the stakeholder-facing diagram of how the Playwright tests log
into the Reliance Jewels storefront by stubbing the OTP flow.

## Files

| File | What it is |
|---|---|
| `login-flow-diagram.html` | **Editable source.** Plain HTML/CSS/SVG, no dependencies. Edit this. |
| `login-flow-diagram.pdf`  | **Generated output.** The PDF you share/present. Do not edit by hand — it's overwritten on each build. |
| `render-diagram.js`       | Build script: renders the HTML to PDF using Playwright's Chromium. |

## How to update the diagram

1. Edit `login-flow-diagram.html` (change steps, labels, lanes, the caveat note, etc.).
2. Bump the version + date in the top-right of the HTML (look for `v1.0` and `Updated 2026-06-01`).
3. Regenerate the PDF from the project root:

   ```bash
   npm run diagram
   ```

4. Open `login-flow-diagram.pdf` to check it, then share.

## How to read the diagram

It's a sequence diagram across 4 lanes — **Playwright Test → Browser (SPA) → Stub
Layer → Real Backend** — color-coded:

- **Blue** — the test driving the UI (clicks, typing).
- **Green** — real calls that still hit the backend (e.g. requesting the OTP).
- **Amber** — calls intercepted and faked via `page.route()` (the OTP verify + the
  session check). Dashed amber/green lines are responses coming back.

The key idea: the `/session` check returns **401 (not logged in)** before OTP
verification — so the "Log In" UI appears — and **200 (logged in)** afterwards, so
the app shows "My Account" instead of bouncing back to login.

## Important caveat

This is a **frontend-only login**. The real OTP `5401` is rejected by the backend
(returns 400), and authentication is enforced server-side via a session cookie. The
stubs make the app *believe* it is logged in — great for UI test flows — but any
action the backend independently re-validates (orders, real account data) will still
return 401. A fully real session requires a valid OTP.

## Related

- Test + stubbing logic: [`../tests/login.spec.js`](../tests/login.spec.js)
- Reusable auth fixtures: [`../tests/fixtures.js`](../tests/fixtures.js)
