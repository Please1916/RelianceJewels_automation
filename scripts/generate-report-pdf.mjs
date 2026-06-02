// Generates a branded PDF test report from Playwright's JSON results.
// Usage:  npm run report:pdf   (run AFTER a test run that produced report/results.json)
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const jsonPath = path.join(root, 'report', 'results.json');
const htmlPath = path.join(root, 'report', 'test-report.html');
const pdfPath = path.join(root, 'report', 'test-report.pdf');

if (!fs.existsSync(jsonPath)) {
  console.error(`No results found at ${jsonPath}.\nRun the tests first, e.g.  npx playwright test plp-p0`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// ---- Flatten the nested suite tree into a flat list of specs ----
const specs = [];
function walk(suite, file) {
  const f = suite.file || file;
  for (const spec of suite.specs || []) {
    const results = spec.tests?.[0]?.results || [];
    const last = results[results.length - 1] || {};
    specs.push({
      title: spec.title,
      file: f,
      ok: spec.ok,
      status: last.status || 'unknown',
      retries: Math.max(0, results.length - 1),
      duration: results.reduce((a, r) => a + (r.duration || 0), 0),
    });
  }
  for (const child of suite.suites || []) walk(child, f);
}
(data.suites || []).forEach((s) => walk(s, s.file));
specs.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));

// ---- Categorise ----
// Tests tagged [KNOWN DEFECT] or [FINDING] are expected non-passes that flag a
// product gap, not test errors.
const isFlagged = (t) => /\[(KNOWN DEFECT|FINDING)\]/i.test(t);
let passed = 0, knownDefects = 0, unexpectedFailures = 0, flaky = 0;
const rows = specs.map((s) => {
  const [tc, ...rest] = s.title.split(' | ');
  const name = rest.join(' | ') || s.title;
  const flagged = isFlagged(s.title);
  let category, cls;
  if (s.ok && s.status === 'passed') {
    if (s.retries > 0) { category = 'Passed (flaky)'; cls = 'flaky'; flaky++; }
    else { category = 'Passed'; cls = 'pass'; }
    passed++;
  } else if (flagged) {
    category = /\[FINDING\]/i.test(s.title) ? 'Finding' : 'Known defect'; cls = 'known'; knownDefects++;
  } else {
    category = 'FAILED'; cls = 'fail'; unexpectedFailures++;
  }
  return { tc: tc.trim(), name: name.replace(/\s*\[(KNOWN DEFECT|FINDING)\]/i, '').trim(), category, cls, duration: s.duration };
});

const total = specs.length;
const totalDurationS = (specs.reduce((a, s) => a + s.duration, 0) / 1000).toFixed(1);
const now = new Date().toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
}) + ' IST';
const fmtMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);

const rowsHtml = rows.map((r) => `
  <tr>
    <td class="tc">${r.tc}</td>
    <td>${escapeHtml(r.name)}</td>
    <td><span class="badge ${r.cls}">${r.category}</span></td>
    <td class="dur">${fmtMs(r.duration)}</td>
  </tr>`).join('');

const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Reliance Jewels — PLP P0 Test Report</title>
<style>
  :root{--ink:#26201a;--muted:#7d7676;--gold:#4e3f09;--line:#d4d1d1;
    --pass:#1c958f;--fail:#c0392b;--known:#d97706;--flaky:#8e7cc3;}
  *{box-sizing:border-box}
  body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);margin:0;padding:24px 36px}
  header{border-bottom:3px solid var(--gold);padding-bottom:10px;margin-bottom:14px}
  .eyebrow{letter-spacing:2px;text-transform:uppercase;font-size:10px;color:var(--gold);font-weight:700}
  h1{margin:5px 0 3px;font-size:22px}
  .sub{color:var(--muted);font-size:12px}
  .meta{float:right;text-align:right;font-size:11px;color:var(--muted)}
  .meta b{color:var(--ink)}
  .cards{display:flex;gap:12px;margin:12px 0}
  .card{flex:1;border:1px solid var(--line);border-radius:9px;padding:10px 14px;text-align:center}
  .card .n{font-size:24px;font-weight:700;line-height:1}
  .card .l{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:5px}
  .card.pass .n{color:var(--pass)} .card.fail .n{color:var(--fail)}
  .card.known .n{color:var(--known)} .card.total .n{color:var(--ink)}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px}
  th{background:#f3f3ed;text-align:left;padding:7px 10px;border-bottom:2px solid var(--line);font-size:10px;text-transform:uppercase;letter-spacing:.5px}
  td{padding:5px 10px;border-bottom:1px solid #ececec;vertical-align:top}
  td.tc{font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums}
  td.dur{text-align:right;color:var(--muted);white-space:nowrap}
  .badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;color:#fff}
  .badge.pass{background:var(--pass)} .badge.fail{background:var(--fail)}
  .badge.known{background:var(--known)} .badge.flaky{background:var(--flaky)}
  .note{margin-top:20px;background:#faf7f0;border-left:4px solid var(--known);padding:11px 15px;font-size:12px;border-radius:4px}
  .note b{color:var(--known)}
  footer{margin-top:16px;font-size:11px;color:var(--muted);border-top:1px solid var(--line);padding-top:9px}
</style></head><body>
  <header>
    <div class="meta"><div>Generated <b>${now}</b></div><div>Suite: <b>PLP · CLP · Search P0</b></div><div>Env: <b>staging</b></div></div>
    <div class="eyebrow">Reliance Jewels · QA Automation</div>
    <h1>P0 — Automated Test Report</h1>
    <div class="sub">Playwright run against ${escapeHtml(String(data.config?.projects?.[0]?.name || 'chromium'))} · total time ${totalDurationS}s</div>
  </header>

  <div class="cards">
    <div class="card total"><div class="n">${total}</div><div class="l">Total</div></div>
    <div class="card pass"><div class="n">${passed}</div><div class="l">Passed${flaky ? ` (${flaky} flaky)` : ''}</div></div>
    <div class="card known"><div class="n">${knownDefects}</div><div class="l">Known / findings</div></div>
    <div class="card fail"><div class="n">${unexpectedFailures}</div><div class="l">Unexpected fails</div></div>
  </div>

  <table>
    <thead><tr><th>TC</th><th>Test case</th><th>Result</th><th>Duration</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <footer>Reliance Jewels QA Automation · source: report/results.json · regenerate with <code>npm run report:pdf</code></footer>
</body></html>`;

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

fs.writeFileSync(htmlPath, html);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
await page.pdf({
  path: pdfPath, format: 'A4', printBackground: true,
  margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
});
await browser.close();

console.log(`Report: ${passed} passed, ${knownDefects} known-defect, ${unexpectedFailures} unexpected fail (of ${total}).`);
console.log('PDF written to', pdfPath);
