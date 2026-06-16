// Generates a branded PDF test report from Playwright's JSON results.
// Usage:  npm run report           (auto-detects the page from the test ids)
//         npm run report -- pdp    (force a specific report-config/<page>.js)
//
// All parsing + per-page metadata resolution lives in scripts/report-data.mjs
// (shared with the web portal). This script is purely the PDF presentation
// layer. To report a new page, add report-config/<page>.js (copy _template.js);
// never edit this file.
//
// - Manager-facing: donut chart, coverage strip, section-grouped results.
// - The results table lists only executed automated tests (passed + genuine
//   failures). Skipped (manual) and known-defect tests are summarised in the
//   chart / coverage strip, not the table.
// - Any genuine, unexpected failure is shown with its error log + screenshot.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReport, escapeHtml, imgDataUri } from './report-data.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const jsonPath = path.join(root, 'report', 'results.json');
const htmlPath = path.join(root, 'report', 'test-report.html');
const pdfPath = path.join(root, 'report', 'test-report.pdf');

if (!fs.existsSync(jsonPath)) {
  console.error(`No results found at ${jsonPath}.\nRun the tests first, e.g.  npx playwright test plp`);
  process.exit(1);
}

// Brand asset — shared across all pages.
const LOGO = 'https://cdn.pixelbin.io/v2/yellow-queen-0c3fa9/gly4zC/wrkr/sngz5/company/27/applications/64e83eb1653e8ab101c11f2e/application/pictures/free-logo/original/gM_1D1xVi-Reliance-Jewels.webp';

const r = await buildReport({
  root,
  resultsPath: jsonPath,
  pageKey: process.argv[2] || process.env.REPORT_PAGE || undefined,
});
if (!r.cfgFound) {
  console.warn(`! No report-config/${r.pageKey}.js — using generic defaults `
    + `(all cases P1, single section). Add one (copy report-config/_template.js).`);
}

const { moduleLabel, reportSpecs, sectionOrder, meta } = r;
const { passed, failed: realFail, knownGap, manual, suiteTotal, scopeTotal, perfLighthouse } = r.counts;
const fmtMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);
const imgDataUri = (p) => { try { return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`; } catch { return null; } };

// ---- Donut chart — pass / fail only (manual + known-gap excluded) ----
const donutSegs = [
  { label: 'Passed', value: passed, color: '#1c958f' },
  { label: 'Failed', value: realFail, color: '#c0392b' },
].filter((s) => s.value > 0);
const donutTotal = donutSegs.reduce((a, s) => a + s.value, 0) || 1;
const R = 65, C = 2 * Math.PI * R; let acc = 0;
const donutArcs = donutSegs.map((s) => {
  const frac = s.value / donutTotal;
  const arc = `<circle r="${R}" cx="100" cy="100" fill="none" stroke="${s.color}" stroke-width="28"
    stroke-dasharray="${(frac * C).toFixed(2)} ${(C - frac * C).toFixed(2)}"
    stroke-dashoffset="${(-acc * C).toFixed(2)}" transform="rotate(-90 100 100)"/>`;
  acc += frac;
  return arc;
}).join('');
const legend = donutSegs.map((s) =>
  `<div class="lg"><span class="dot" style="background:${s.color}"></span>${s.label}
     <b>${s.value}</b><span class="pct">${Math.round((s.value / donutTotal) * 100)}%</span></div>`).join('');

// Verdict: only mention pass / fail
const verdict = realFail
  ? `${realFail} unexpected failure${realFail > 1 ? 's' : ''} need attention · ${passed}/${donutTotal} automated checks pass.`
  : `All ${passed} automated checks pass.`;

// ---- Results table, grouped by section ----
let zebra = 0;
const groupsHtml = sectionOrder.map((sec) => {
  const inSec = reportSpecs.filter((s) => s.section === sec);
  if (!inSec.length) return '';
  const sp = inSec.filter((s) => s.klass === 'pass').length;
  const rows = inSec.map((s) => {
    const cls = s.klass === 'pass' ? 'pass' : 'fail';
    const label = s.klass === 'pass' ? (s.flaky ? '✓ Passed (flaky)' : '✓ Passed') : '✕ Failed';
    const tr = `<tr class="${zebra % 2 ? 'odd' : ''}">
      <td class="tc">${s.tc}</td>
      <td><span class="pri ${s.priority.toLowerCase()}">${s.priority}</span></td>
      <td>${escapeHtml(s.name)}</td>
      <td><span class="badge ${cls}">${label}</span></td>
      <td class="dur">${fmtMs(s.duration)}</td></tr>`;
    zebra++;
    return tr;
  }).join('');
  return `<tr class="sec"><td colspan="5">${escapeHtml(sec)}<span class="secsub">${sp}/${inSec.length} passed</span></td></tr>${rows}`;
}).join('');

// ---- Failure details (genuine failures only) ----
const failures = reportSpecs.filter((s) => s.klass === 'fail');
const failuresHtml = failures.length ? `
  <h2 class="section-h">Failure details (${failures.length})</h2>
  ${failures.map((s) => {
    const uri = s.screenshot ? imgDataUri(s.screenshot) : null;
    return `<div class="failure">
      <div class="fh"><span class="badge fail">✕ Failed</span> <span class="ftc">${s.tc} · ${s.id}</span> — ${escapeHtml(s.name)}</div>
      <div class="loglabel">Error log</div>
      <pre class="log">${escapeHtml(s.error || '(no error message captured)')}</pre>
      ${uri ? `<div class="loglabel">Screenshot at failure</div><img class="shot" src="${uri}"/>` : '<div class="nodata">(no screenshot captured)</div>'}
    </div>`;
  }).join('')}` : '';

const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Reliance Jewels — ${escapeHtml(moduleLabel)} Test Report</title>
<style>
  :root{--ink:#26201a;--muted:#7d7676;--gold:#8a6d1a;--gold-d:#4e3f09;--line:#dcd9d4;
    --pass:#1c958f;--fail:#c0392b;--known:#d97706;--p0:#b4451f;--p1:#3a6ea5;}
  *{box-sizing:border-box}
  body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);margin:0;padding:26px 34px;font-size:12px}
  header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid var(--gold);padding-bottom:12px}
  .brand{display:flex;align-items:center;gap:12px}
  .brand img{height:34px}
  .eyebrow{letter-spacing:2px;text-transform:uppercase;font-size:9px;color:var(--gold-d);font-weight:700}
  h1{margin:3px 0 0;font-size:21px}
  .meta{text-align:right;font-size:10.5px;color:var(--muted);line-height:1.7}
  .meta b{color:var(--ink)}
  /* hero */
  .hero{display:flex;gap:26px;align-items:center;margin:18px 0 8px;padding:16px 20px;border:1px solid var(--line);border-radius:12px;background:#fcfbf8}
  .donut{flex:0 0 auto;position:relative;width:200px;height:200px}
  .donut .ctr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .donut .ctr .big{font-size:40px;font-weight:800;line-height:1;color:var(--ink)}
  .donut .ctr .small{font-size:11px;color:var(--muted);margin-top:3px;text-transform:uppercase;letter-spacing:1px}
  .hero-info{flex:1}
  .verdict{font-size:15px;font-weight:600;margin-bottom:12px}
  .legend{display:flex;flex-wrap:wrap;gap:8px 22px;margin-bottom:14px}
  .lg{font-size:12.5px;color:var(--ink)}
  .lg b{margin-left:5px}
  .lg .dot{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:7px;vertical-align:middle}
  .lg .pct{color:var(--muted);margin-left:5px;font-size:11px}
  .coverage{font-size:11.5px;color:var(--muted);border-top:1px dashed var(--line);padding-top:10px}
  .coverage b{color:var(--ink)}
  /* table */
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}
  th{background:#f3f1ea;text-align:left;padding:7px 10px;border-bottom:2px solid var(--line);font-size:9.5px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)}
  td{padding:6px 10px;border-bottom:1px solid #efede8;vertical-align:middle}
  tr.odd td{background:#faf9f6}
  td.tc{font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums}
  td.dur{text-align:right;color:var(--muted);white-space:nowrap}
  tr.sec td{background:var(--gold-d);color:#fff;font-weight:700;font-size:11px;letter-spacing:.4px;padding:6px 10px}
  tr.sec .secsub{float:right;font-weight:500;opacity:.85;font-size:10.5px}
  .badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;color:#fff;white-space:nowrap}
  .badge.pass{background:var(--pass)} .badge.fail{background:var(--fail)}
  .pri{display:inline-block;padding:1px 7px;border-radius:5px;font-size:10px;font-weight:700;color:#fff}
  .pri.p0{background:var(--p0)} .pri.p1{background:var(--p1)}
  /* gaps + failures */
  .section-h{margin:24px 0 6px;font-size:14px;border-bottom:2px solid var(--gold);padding-bottom:6px}
  .muted-p{font-size:11px;color:var(--muted);margin:0 0 8px}
  table.gaps td{font-size:11.5px}
  .failure{border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin-bottom:14px;break-inside:avoid;page-break-inside:avoid}
  .fh{font-size:13px;margin-bottom:6px}
  .fh .ftc{font-weight:700;font-variant-numeric:tabular-nums}
  .loglabel{font-size:9.5px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin:9px 0 4px}
  pre.log{background:#2b2b2b;color:#f3f3f3;padding:10px 12px;border-radius:6px;font-size:10.5px;line-height:1.45;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;margin:0;font-family:Menlo,Consolas,monospace}
  img.shot{max-width:100%;border:1px solid var(--line);border-radius:6px;margin-top:2px}
  .nodata{font-size:11px;color:var(--muted);font-style:italic}
  footer{margin-top:18px;font-size:10px;color:var(--muted);border-top:1px solid var(--line);padding-top:9px}
</style></head><body>
  <header>
    <div class="brand">
      <img src="${LOGO}" alt="Reliance Jewels"/>
      <div><div class="eyebrow">Reliance Jewels · QA Automation</div>
      <h1>${escapeHtml(moduleLabel)} — Automated Test Report</h1></div>
    </div>
    <div class="meta">
      <div>Generated <b>${meta.generatedAt}</b></div>
      <div>Browser <b>${escapeHtml(meta.browser)}</b> · ${meta.durationS}s</div>
      <div>Env <b>${escapeHtml(meta.env)}</b></div>
    </div>
  </header>

  <div class="hero">
    <div class="donut">
      <svg viewBox="0 0 200 200" width="200" height="200">
        <circle r="${R}" cx="100" cy="100" fill="none" stroke="#eee" stroke-width="28"/>
        ${donutArcs}
      </svg>
      <div class="ctr"><div class="big">${passed}</div><div class="small">of ${donutTotal} checks</div></div>
    </div>
    <div class="hero-info">
      <div class="verdict">${escapeHtml(verdict)}</div>
      <div class="legend">${legend}</div>
      <div class="coverage">Scope: <b>${scopeTotal}</b> ${escapeHtml(moduleLabel)} cases (P0 + P1)${perfLighthouse ? ` · <b>${perfLighthouse}</b> performance cases via Lighthouse` : ''} ·
        <b>${passed + realFail}</b> automated checks · <b>${passed}</b> passed${realFail ? ` · <b>${realFail}</b> failed` : ''}.</div>
    </div>
  </div>

  <table>
    <thead><tr><th>TC</th><th>Pri</th><th>Test case</th><th>Result</th><th>Duration</th></tr></thead>
    <tbody>${groupsHtml}</tbody>
  </table>

  ${failuresHtml}
</body></html>`;

fs.writeFileSync(htmlPath, html);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
await page.pdf({
  path: pdfPath, format: 'A4', printBackground: true,
  margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
});
await browser.close();

console.log(`Report: ${passed} passed, ${realFail} failed, ${knownGap} known-gap, ${manual} manual (suite ${suiteTotal}; scope ${scopeTotal}).`);
console.log('PDF written to', pdfPath);
