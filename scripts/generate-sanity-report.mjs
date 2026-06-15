// Generates a branded Sanity (end-to-end smoke) PDF.
//
// The sanity flow is ONE chained test; its phases are the test.step() blocks.
// This report lists each phase with pass/fail + duration, pulled from
// Playwright's JSON results (report/results.json). Without a run, the phases
// are parsed from the spec and shown as "Automated".
//
// Usage:
//   npx playwright test sanity   # writes report/results.json
//   npm run report:sanity
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cfg from './sanity-report.config.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const abs = (p) => path.join(root, p);
const specPath = abs(cfg.specPath);
const jsonPath = abs(cfg.resultsPath);
const htmlPath = abs(cfg.outHtml);
const pdfPath = abs(cfg.outPdf);

if (!fs.existsSync(specPath)) { console.error(`Spec not found: ${specPath}`); process.exit(1); }
fs.mkdirSync(path.dirname(htmlPath), { recursive: true });

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- 1) Rows + status from Playwright JSON results ----
// The suite is several @sanity tests. A test that ran is expanded into one row
// per top-level test.step() phase; a skipped (or step-less) test contributes a
// single status row. Buckets: pass / fail / skip.
let hasResults = false;
let testStatus = 'unknown';
const phases = []; // { title, bucket, duration }
if (fs.existsSync(jsonPath)) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const sanitySpecs = [];
  const collect = (suite) => {
    for (const spec of suite.specs || []) if (spec.title.includes(cfg.testMatch)) sanitySpecs.push(spec);
    for (const c of suite.suites || []) collect(c);
  };
  (data.suites || []).forEach(collect);

  const isHook = (t) => /^(before|after)\s+hooks|worker cleanup|^fixture:/i.test(t || '');
  const statusBucket = (st) => (st === 'passed' ? 'pass' : st === 'skipped' ? 'skip' : 'fail');
  let anyFail = false, anyRan = false;

  for (const spec of sanitySpecs) {
    const results = spec.tests?.[0]?.results || [];
    const last = results[results.length - 1];
    const st = last?.status || 'skipped';
    if (st !== 'skipped') anyRan = true;
    if (statusBucket(st) === 'fail') anyFail = true;

    const steps = (last?.steps || []).filter((s) => !isHook(s.title));
    if (st !== 'skipped' && steps.length) {
      for (const s of steps) phases.push({ title: s.title, bucket: s.error ? 'fail' : 'pass', duration: s.duration || 0 });
    } else {
      phases.push({ title: spec.title, bucket: statusBucket(st), duration: last?.duration || 0 });
    }
    globalThis.__browserName = data.config?.projects?.[0]?.name;
  }

  if (sanitySpecs.length) {
    hasResults = true;
    testStatus = anyFail ? 'failed' : anyRan ? 'passed' : 'skipped';
  }
}

// ---- 2) Fallback: parse the spec for test.step phase titles ----
if (!phases.length) {
  const specText = fs.readFileSync(specPath, 'utf8');
  const re = /test\.step\(\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(specText)) !== null) phases.push({ title: m[1], bucket: 'auto', duration: 0 });
}

// ---- Tally ----
const RUN_BUCKETS = hasResults ? cfg.buckets : [['auto', '#1c958f', 'Automated']];
const tally = Object.fromEntries(RUN_BUCKETS.map(([b]) => [b, phases.filter((p) => p.bucket === b).length]));
const total = phases.length;
const passRate = hasResults && total ? Math.round((tally.pass / total) * 100) : 0;
const centerNum = hasResults ? tally.pass : total;
const COLOR = Object.fromEntries(RUN_BUCKETS.map(([b, c]) => [b, c]));
const LABEL = Object.fromEntries(RUN_BUCKETS.map(([b, , l]) => [b, l]));

// ---- Donut (SVG) ----
const R = 60, C = 2 * Math.PI * R;
let off = 0;
const donutSegs = RUN_BUCKETS.filter(([b]) => tally[b] > 0).map(([b, color]) => {
  const len = (tally[b] / total) * C;
  const seg = `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${color}" stroke-width="26"
    stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 80 80)"/>`;
  off += len;
  return seg;
}).join('');
const legend = RUN_BUCKETS.map(([b, color]) =>
  `<span class="lg"><i style="background:${color}"></i>${LABEL[b]} <b>${tally[b]}</b> <span class="pct">${total ? Math.round((tally[b] / total) * 100) : 0}%</span></span>`
).join('');

// ---- Phase table ----
const BADGE_TXT = { pass: '✓ Passed', fail: '✗ Failed', skip: '⊘ Skipped', auto: 'Automated' };
const fmtMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : ms ? `${ms}ms` : '—');
const rowsHtml = phases.map((p, i) => `<tr>
    <td class="c-no">${i + 1}</td>
    <td class="c-name">${escapeHtml(p.title)}</td>
    <td class="c-res"><span class="badge ${p.bucket}" style="background:${COLOR[p.bucket] || '#9aa0a6'}">${BADGE_TXT[p.bucket]}</span></td>
    <td class="c-dur">${fmtMs(p.duration)}</td>
  </tr>`).join('');

const now = new Date().toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
}) + ' IST';
const browserName = String(globalThis.__browserName || 'chromium');
const totalDurationS = (phases.reduce((a, p) => a + p.duration, 0) / 1000).toFixed(1);
const overall = hasResults ? (testStatus === 'passed' ? 'PASS' : testStatus === 'failed' ? 'FAIL' : 'NOT RUN') : 'NOT RUN';
const headline = hasResults
  ? `Sanity ${overall} — ${tally.pass}/${total} phases passed${tally.fail ? ` · ${tally.fail} failed` : ''}${tally.skip ? ` · ${tally.skip} skipped` : ''}.`
  : `${total} sanity phases automated (no run results yet).`;

const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Reliance Jewels — ${escapeHtml(cfg.title)}</title>
<style>
  :root{--ink:#26201a;--muted:#7d7676;--gold:#8a6d1a;--gold-d:#4e3f09;--line:#dcd9d4;}
  *{box-sizing:border-box}
  body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);margin:0;padding:22px 30px}
  header{border-bottom:3px solid var(--gold);padding-bottom:10px;margin-bottom:12px}
  .brand{display:flex;align-items:center;gap:12px}
  .brand img{height:30px}
  .eyebrow{letter-spacing:2px;text-transform:uppercase;font-size:9px;color:var(--gold-d);font-weight:700}
  h1{margin:8px 0 2px;font-size:21px}
  .sub{color:var(--muted);font-size:12px}
  .meta{float:right;text-align:right;font-size:11px;color:var(--muted)}
  .meta b{color:var(--ink)}
  .hero{display:flex;gap:22px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:14px 18px;margin:12px 0}
  .donut{position:relative;width:150px;height:150px;flex:none}
  .donut .ctr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .donut .ctr .n{font-size:30px;font-weight:800;line-height:1}
  .donut .ctr .l{font-size:8.5px;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-top:3px}
  .hx{flex:1}
  .hx h2{margin:0 0 8px;font-size:14.5px}
  .legend{display:flex;flex-wrap:wrap;gap:6px 16px;margin-bottom:10px}
  .lg{font-size:12px} .lg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:middle}
  .lg b{font-weight:700} .lg .pct{color:var(--muted)}
  .scope{font-size:11.5px;color:var(--muted);border-top:1px dashed var(--line);padding-top:8px}
  .scope b{color:var(--ink)}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px;table-layout:fixed}
  th{background:#f3f1ea;text-align:left;padding:7px 10px;border-bottom:2px solid var(--line);font-size:10px;text-transform:uppercase;letter-spacing:.5px}
  td{padding:6px 10px;border-bottom:1px solid #efede8;vertical-align:middle}
  .c-no{width:42px;text-align:center;font-weight:700;color:var(--muted);font-variant-numeric:tabular-nums}
  .c-name{width:auto;overflow:hidden;text-overflow:ellipsis}
  .c-res{width:104px;text-align:center}
  .c-dur{width:90px;text-align:right;color:var(--muted);white-space:nowrap}
  th.c-no,th.c-res{text-align:center}th.c-dur{text-align:right}
  .badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;color:#fff;white-space:nowrap}
  footer{margin-top:16px;font-size:11px;color:var(--muted);border-top:1px solid var(--line);padding-top:9px}
</style></head><body>
  <header>
    <div class="meta"><div>Generated <b>${now}</b></div><div>Browser <b>${escapeHtml(browserName)}</b>${hasResults ? ` · ${totalDurationS}s` : ''}</div><div>Env <b>${escapeHtml(cfg.env)}</b></div></div>
    <div class="brand"><img src="${cfg.logo}" alt="Reliance Jewels"/><span class="eyebrow">Reliance Jewels · QA Automation</span></div>
    <h1>${escapeHtml(cfg.title)}</h1>
    <div class="sub">${escapeHtml(cfg.subtitle)} · ${total} phases</div>
  </header>

  <div class="hero">
    <div class="donut">
      <svg viewBox="0 0 160 160" width="150" height="150">${donutSegs}</svg>
      <div class="ctr"><div class="n">${centerNum}</div><div class="l">of ${total} phases</div></div>
    </div>
    <div class="hx">
      <h2>${headline}</h2>
      <div class="legend">${legend}</div>
      <div class="scope">Scope: guest journey (Home · PDP + variants · Search · Wishlist gating) + logged-in group (PDP→Cart→Checkout · Orders · Book Appointment · Call Back · Contact Us)${hasResults ? ` · pass rate <b>${passRate}%</b>` : ''}. ${escapeHtml(cfg.note || '')}</div>
    </div>
  </div>

  <table>
    <thead><tr><th class="c-no">#</th><th class="c-name">Flow phase</th><th class="c-res">Result</th><th class="c-dur">Duration</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <footer>Reliance Jewels QA Automation · catalog source: ${escapeHtml(cfg.specPath)}${hasResults ? ` + ${escapeHtml(cfg.resultsPath)}` : ' (no run results — phases shown as Automated)'} · regenerate with <code>npm run report:sanity</code></footer>
</body></html>`;

fs.writeFileSync(htmlPath, html);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
await browser.close();

console.log(`Sanity report (${total} phases): ${hasResults ? `${overall} — ${tally.pass} passed · ${tally.fail} failed` : 'no run results'}.`);
console.log('PDF written to', pdfPath);
