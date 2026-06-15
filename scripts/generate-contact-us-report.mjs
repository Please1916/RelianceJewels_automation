// Generates a branded Contact Us coverage PDF, spec-driven (mirrors
// generate-book-appointment-report.mjs).
//
// Catalog comes from the spec file:
//   - active tests : test('TC_CU_NNN | Px | name', ...)
//   - blocked tests: test.fixme('TC_CU_NNN | Px | name', ...)   -> "skip"
// Pass/skip/fail + duration are layered in from Playwright's JSON results
// (report/results.json) when present; without it, active tests show as
// "Automated".
//
// Usage:
//   npx playwright test contact-us   # writes report/results.json
//   npm run report:contactus
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cfg from './contact-us-report.config.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const abs = (p) => path.join(root, p);
const specPath = abs(cfg.specPath);
const jsonPath = abs(cfg.resultsPath);
const htmlPath = abs(cfg.outHtml);
const pdfPath = abs(cfg.outPdf);

if (!fs.existsSync(specPath)) { console.error(`Spec not found: ${specPath}`); process.exit(1); }
fs.mkdirSync(path.dirname(htmlPath), { recursive: true });

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const numOf = (id) => parseInt(id.replace(/\D/g, ''), 10);

// Section label for a TC_CU number, by config range (first match wins).
function sectionFor(num) {
  for (const [label, [lo, hi]] of cfg.sections) if (num >= lo && num <= hi) return label;
  return cfg.defaultSection;
}

// Parse "…TC_CU_NNN… | Px | name" -> {id,num,pri,name,section}.
function parseTitle(title) {
  const idm = title.match(/TC_CU_(\d+)/);
  if (!idm) return null;
  const id = `TC_CU_${idm[1]}`;
  const num = parseInt(idm[1], 10);
  const parts = title.split('|').map((s) => s.trim());
  const priIdx = parts.findIndex((p) => /^P\d$/.test(p));
  const pri = priIdx >= 0 ? parts[priIdx] : '';
  const name = priIdx >= 0 ? parts.slice(priIdx + 1).join(' — ') : parts[parts.length - 1];
  return { id, num, pri, name, section: sectionFor(num) };
}

const byId = new Map();
const put = (rec) => { if (!byId.has(rec.id)) byId.set(rec.id, rec); };

// ---- 1) Status + duration from Playwright JSON results ----
let hasResults = false;
if (fs.existsSync(jsonPath)) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const specs = [];
  const collect = (suite) => {
    for (const spec of suite.specs || []) if (parseTitle(spec.title)) specs.push(spec);
    for (const c of suite.suites || []) collect(c);
  };
  (data.suites || []).forEach(collect);
  hasResults = specs.some((s) => (s.tests?.[0]?.results?.length || 0) > 0);
  if (hasResults) {
    for (const spec of specs) {
      const p = parseTitle(spec.title);
      const results = spec.tests?.[0]?.results || [];
      const last = results[results.length - 1] || {};
      const status = last.status || 'unknown';
      const duration = results.reduce((a, r) => a + (r.duration || 0), 0);
      const bucket = spec.ok && status === 'passed' ? 'pass' : status === 'skipped' ? 'skip' : 'fail';
      put({ ...p, bucket, duration });
    }
    globalThis.__browserName = data.config?.projects?.[0]?.name;
  }
}

// ---- 2) Parse spec for the full catalog (active + fixme) ----
const specText = fs.readFileSync(specPath, 'utf8');
for (const raw of specText.split('\n')) {
  // active test (only if results.json didn't already supply it)
  let m = raw.match(/^\s*test\(\s*['"`](TC_CU_\d+[^'"`]*)['"`]/);
  if (m) { const p = parseTitle(m[1]); if (p) put({ ...p, bucket: hasResults ? 'pass' : 'auto', duration: 0 }); continue; }
  // blocked test.fixme(...) -> skip
  m = raw.match(/^\s*test\.fixme\(\s*['"`](TC_CU_\d+[^'"`]*)['"`]/);
  if (m) { const p = parseTitle(m[1]); if (p) put({ ...p, bucket: 'skip', duration: 0 }); continue; }
}

// ---- Tally ----
const RUN_BUCKETS = hasResults ? cfg.buckets : [['auto', '#1c958f', 'Automated'], ['skip', '#9aa0a6', 'Skipped / blocked']];
const all = [...byId.values()];
const tally = Object.fromEntries(RUN_BUCKETS.map(([b]) => [b, all.filter((r) => r.bucket === b).length]));
const total = all.length;
const active = hasResults ? (tally.pass + tally.skip + tally.fail) : (tally.auto + tally.skip);
const passRate = hasResults && (tally.pass + tally.fail) ? Math.round((tally.pass / (tally.pass + tally.fail)) * 100) : 0;
const centerNum = hasResults ? tally.pass : tally.auto;
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

// ---- Per-section tables ----
const BADGE_TXT = { pass: '✓ Passed', skip: '⏭ Skipped', fail: '✗ Failed', auto: 'Automated' };
const fmtMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : ms ? `${ms}ms` : '—');

let sectionsHtml = '';
for (const [label] of cfg.sections.concat([[cfg.defaultSection]])) {
  const rows = all.filter((r) => r.section === label).sort((a, b) => a.num - b.num);
  if (!rows.length) continue;
  const secActive = rows.filter((r) => ['pass', 'skip', 'fail', 'auto'].includes(r.bucket));
  const secPass = secActive.filter((r) => r.bucket === 'pass').length;
  const stat = hasResults ? `${secPass}/${secActive.length} passed · ${rows.length} cases` : `${rows.length} cases`;
  const rowsHtml = rows.map((r) => `<tr>
      <td class="c-tc">${r.id}</td>
      <td class="c-pri"><span class="pri ${r.pri.toLowerCase()}">${r.pri || '—'}</span></td>
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
const totalDurationS = (all.reduce((a, r) => a + r.duration, 0) / 1000).toFixed(1);
const headline = hasResults
  ? `${tally.pass}/${active} automated checks pass${tally.fail ? ` · ${tally.fail} failed` : ''}${tally.skip ? ` · ${tally.skip} skipped/blocked` : ''}.`
  : `${tally.auto} cases automated${tally.skip ? ` · ${tally.skip} skipped/blocked` : ''}.`;

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
  .c-tc{width:88px;font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums}
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
    <div class="meta"><div>Generated <b>${now}</b></div><div>Browser <b>${escapeHtml(browserName)}</b>${hasResults ? ` · ${totalDurationS}s` : ''}</div><div>Env <b>${escapeHtml(cfg.env)}</b></div></div>
    <div class="brand"><img src="${cfg.logo}" alt="Reliance Jewels"/><span class="eyebrow">Reliance Jewels · QA Automation</span></div>
    <h1>${escapeHtml(cfg.title)}</h1>
    <div class="sub">${escapeHtml(cfg.subtitle)} · ${total} cases</div>
  </header>

  <div class="hero">
    <div class="donut">
      <svg viewBox="0 0 160 160" width="150" height="150">${donutSegs}</svg>
      <div class="ctr"><div class="n">${centerNum}</div><div class="l">of ${total} cases</div></div>
    </div>
    <div class="hx">
      <h2>${headline}</h2>
      <div class="legend">${legend}</div>
      <div class="scope">Scope: <b>${total}</b> Contact Us cases (P0+P1)${hasResults ? ` · executed pass rate <b>${passRate}%</b> (${tally.pass}/${tally.pass + tally.fail})` : ''}. ${escapeHtml(cfg.note || '')}</div>
    </div>
  </div>

  <table>
    <thead><tr><th class="c-tc">TC</th><th class="c-pri">Pri</th><th class="c-name">Test case</th><th class="c-res">Result</th><th class="c-dur">Duration</th></tr></thead>
    <tbody>${sectionsHtml}</tbody>
  </table>

  <footer>Reliance Jewels QA Automation · catalog source: ${escapeHtml(cfg.specPath)}${hasResults ? ` + ${escapeHtml(cfg.resultsPath)}` : ' (no run results — status shown as Automated)'} · regenerate with <code>npm run report:contactus</code></footer>
</body></html>`;

fs.writeFileSync(htmlPath, html);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
await browser.close();

const summary = RUN_BUCKETS.map(([b]) => `${tally[b]} ${LABEL[b].toLowerCase()}`).join(' · ');
console.log(`Contact Us report (${total} cases): ${summary}${hasResults ? '' : ' (no run results)'}.`);
console.log('PDF written to', pdfPath);
