# Reliance Jewels — Playwright Test Suite

Automated UI tests for the Reliance Jewels storefront (PLP, CLP, Search — P0
cases), with a click-to-run **Test Portal** and a branded **PDF report**.

## Quick start (2 steps)

```bash
npm run setup     # one time: installs dependencies + the browser
npm run portal    # opens the Test Portal in your browser
```

That's it — no test knowledge needed. In the portal:

1. **Pick a page** from the dropdown (or type a keyword like `plp`, `collection`, `search`, `all`).
2. (Optional) tick **Show browser** to watch, and **Build PDF report**.
3. Click **▶ Run tests** — output streams live, and a link to the PDF appears when done.

> Requires [Node.js](https://nodejs.org) 18+ installed.

## Prefer the command line?

| Command | What it does |
|---|---|
| `npm test` | Run all P0 tests (PLP + CLP + Search) |
| `npm run test:plp` / `test:clp` / `test:search` | Run one suite |
| `npm run test:headed` | Run with the browser visible |
| `npm run test:ui` | Playwright interactive UI mode |
| `npm run report` | Build the PDF report from the last run → `report/test-report.pdf` |
| `npm run report:html` | Open Playwright's interactive HTML report |
| `npm run test:report` | Run all tests **and** build the PDF report |
| `npm run portal` | Launch the web Test Portal |
| `npm run portal:cli` | Terminal version of the portal |

## What gets tested

- **PLP** (`/products`) — filters, sort, product cards, price, navigation, pagination
- **CLP** (`/collection/...`) — header/nav, cards, filters, sort, pagination
- **Search** — search bar, type-ahead, results layout, no-results

Full case-by-case mapping and the bugs found are in
[`docs/PLP_P0_AUTOMATION.md`](docs/PLP_P0_AUTOMATION.md).

## Project layout

```
tests/        # *.spec.js — the test cases (named by TC ID)
pages/        # Page Objects (PlpPage, ClpPage, SearchPage)
scripts/      # portal server + PDF report generator
docs/         # documentation + diagrams
report/       # generated results + PDF (not committed)
```
