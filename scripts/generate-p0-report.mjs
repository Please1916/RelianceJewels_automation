// Generates a branded P0 Regression coverage PDF (mirrors the per-suite reports,
// but the catalog spans every suite and is grouped by SUITE).
//
// The catalog comes ENTIRELY from the P0 run's Playwright JSON results — there
// is no single spec file, since P0 cases live across suites. Run the P0 layer
// first so report/results.json holds them:
//
//   npm run test:p0     # playwright test --grep " P0 "  → writes report/results.json
//   npm run report:p0
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cfg from './p0-report.config.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const abs = (p) => path.join(root, p);
const jsonPath = abs(cfg.resultsPath);
const htmlPath = abs(cfg.outHtml);
const pdfPath = abs(cfg.outPdf);

if (!fs.existsSync(jsonPath)) {
  console.error(`No results at ${cfg.resultsPath}. Run \`npm run test:p0\` first.`);
  process.exit(1);
}
fs.mkdirSync(path.dirname(htmlPath), { recursive: true });

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Parse "…ID… | P0 | name" -> { id, pri, name }. Handles single (WL_016 | P0 | …)
// and double (TC_01 | TC_PDP_IMG_001 | P0 | …) id prefixes by taking the token
// just before the Px part as the id.
function parseTitle(title) {
  const parts = title.split('|').map((s) => s.trim()).filter(Boolean);
  const priIdx = parts.findIndex((p) => /^P\d$/.test(p));
  if (priIdx < 0) return null;
  const pri = parts[priIdx];
  const id = priIdx > 0 ? parts[priIdx - 1] : '(unknown)';
  const name = parts.slice(priIdx + 1).join(' — ') || parts[parts.length - 1];
  return { id, pri, name };
}

const sectionFor = (file) => {
  const base = path.basename(file || '');
  return cfg.suiteLabels[base] || base.replace(/\.spec\.js$/, '') || 'Other';
};

// ---- Collect P0 cases (+ status/duration) from the JSON results ----
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const rows = []; // { id, pri, name, section, bucket, duration }

const collect = (suite, file) => {
  const f = suite.file || file;
  for (const spec of suite.specs || []) {
    const p = parseTitle(spec.title);
    if (!p || p.pri !== 'P0') continue; // P0 only
    const t0 = spec.tests?.[0];
    const duration = (t0?.results || []).reduce((a, r) => a + (r.duration || 0), 0);
    // Bucket on the TEST OUTCOME, not the per-attempt result: a passing test can
    // record a "failed" attempt (soft-assert / expected-fail / retried). Outcome
    // is 'skipped' | 'expected' | 'unexpected' | 'flaky' (expected+flaky = pass).
    const outcome = t0?.status;
    const bucket = outcome === 'skipped' ? 'skip'
      : outcome === 'unexpected' ? 'fail'
      : (outcome === 'expected' || outcome === 'flaky' || spec.ok) ? 'pass'
      : 'fail';
    rows.push({ ...p, section: sectionFor(spec.file || f), bucket, duration });
  }
  for (const c of suite.suites || []) collect(c, f);
};
(data.suites || []).forEach((s) => collect(s, s.file));
globalThis.__browserName = data.config?.projects?.[0]?.name;

if (!rows.length) {
  console.error('No P0 cases found in results. Did you run `npm run test:p0`?');
  process.exit(1);
}

// ---- Tally ----
const RUN_BUCKETS = cfg.buckets;
const tally = Object.fromEntries(RUN_BUCKETS.map(([b]) => [b, rows.filter((r) => r.bucket === b).length]));
const total = rows.length;
const passRate = (tally.pass + tally.fail) ? Math.round((tally.pass / (tally.pass + tally.fail)) * 100) : 0;
const centerNum = tally.pass;
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

// ---- Per-suite tables ----
const BADGE_TXT = { pass: '✓ Passed', skip: '⏭ Skipped', fail: '✗ Failed' };
const fmtMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : ms ? `${ms}ms` : '—');

const sectionLabels = [...cfg.sectionOrder];
for (const r of rows) if (!sectionLabels.includes(r.section)) sectionLabels.push(r.section);

let sectionsHtml = '';
for (const label of sectionLabels) {
  const secRows = rows.filter((r) => r.section === label).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  if (!secRows.length) continue;
  const secPass = secRows.filter((r) => r.bucket === 'pass').length;
  const stat = `${secPass}/${secRows.length} passed`;
  const rowsHtml = secRows.map((r) => `<tr>
      <td class="c-tc">${escapeHtml(r.id)}</td>
      <td class="c-pri"><span class="pri ${r.pri.toLowerCase()}">${r.pri}</span></td>
      <td class="c-name">${escapeHtml(r.name)}</td>
      <td class="c-res"><span class="badge ${r.bucket}" style="background:${COLOR[r.bucket] || '#9aa0a6'}">${BADGE_TXT[r.bucket]}</span></td>
      <td class="c-dur">${fmtMs(r.duration)}</td>
    </tr>`).join('');
  sectionsHtml += `<tr class="sec"><td colspan="5"><div class="secbar"><span>${escapeHtml(label)}</span><span class="secstat">${stat}</span></div></td></tr>${rowsHtml}`;
}

const now = new Date().toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
}) + ' IST';
const browserName = String(globalThis.__browserName || 'chromium');
const totalDurationS = (rows.reduce((a, r) => a + r.duration, 0) / 1000).toFixed(1);
const headline = `${tally.pass}/${total} P0 checks pass${tally.fail ? ` · ${tally.fail} failed` : ''}${tally.skip ? ` · ${tally.skip} skipped/blocked` : ''}.`;

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
  td{padding:5px 10px;border-bottom:1px solid #efede8;vertical-align:middle}
  .c-tc{width:140px;font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis}
  .c-pri{width:46px;text-align:center}
  .c-name{width:auto;overflow:hidden;text-overflow:ellipsis}
  .c-res{width:104px;text-align:center}
  .c-dur{width:78px;text-align:right;color:var(--muted);white-space:nowrap}
  th.c-pri,th.c-res{text-align:center}th.c-dur{text-align:right}
  tr.sec td{background:var(--gold-d);color:#fff;font-weight:700;font-size:12px;padding:6px 10px;border:none}
  tr.sec .secbar{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
  tr.sec .secstat{font-weight:500;opacity:.9;white-space:nowrap}
  tr{break-inside:avoid}
  .pri{display:inline-block;padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700;color:#fff}
  .pri.p0{background:#c0392b} .pri.p1{background:#3b6db5}
  .badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;color:#fff;white-space:nowrap}
  footer{margin-top:16px;font-size:11px;color:var(--muted);border-top:1px solid var(--line);padding-top:9px}
</style></head><body>
  <header>
    <div class="meta"><div>Generated <b>${now}</b></div><div>Browser <b>${escapeHtml(browserName)}</b> · ${totalDurationS}s</div><div>Env <b>${escapeHtml(cfg.env)}</b></div></div>
    <div class="brand"><img src="${cfg.logo}" alt="Reliance Jewels"/><span class="eyebrow">Reliance Jewels · QA Automation</span></div>
    <h1>${escapeHtml(cfg.title)}</h1>
    <div class="sub">${escapeHtml(cfg.subtitle)} · ${total} cases</div>
  </header>

  <div class="hero">
    <div class="donut">
      <svg viewBox="0 0 160 160" width="150" height="150">${donutSegs}</svg>
      <div class="ctr"><div class="n">${centerNum}</div><div class="l">of ${total} P0</div></div>
    </div>
    <div class="hx">
      <h2>${headline}</h2>
      <div class="legend">${legend}</div>
      <div class="scope">Scope: <b>${total}</b> P0 cases across ${sectionLabels.filter((l) => rows.some((r) => r.section === l)).length} suites · executed pass rate <b>${passRate}%</b> (${tally.pass}/${tally.pass + tally.fail}). ${escapeHtml(cfg.note || '')}</div>
    </div>
  </div>

  <table>
    <thead><tr><th class="c-tc">TC</th><th class="c-pri">Pri</th><th class="c-name">Test case</th><th class="c-res">Result</th><th class="c-dur">Duration</th></tr></thead>
    <tbody>${sectionsHtml}</tbody>
  </table>

  <footer>Reliance Jewels QA Automation · catalog source: ${escapeHtml(cfg.resultsPath)} (P0 run) · regenerate with <code>npm run report:p0</code></footer>
</body></html>`;

fs.writeFileSync(htmlPath, html);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
await browser.close();

const summary = RUN_BUCKETS.map(([b]) => `${tally[b]} ${LABEL[b].toLowerCase()}`).join(' · ');
console.log(`P0 report (${total} cases): ${summary}.`);
console.log('PDF written to', pdfPath);
