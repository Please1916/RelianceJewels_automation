// Branded PDF report for the Wishlist suite, from Playwright's JSON results.
// Usage:  npx playwright test wishlist   (writes report/results.json)
//         npm run report:wishlist
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cfg from './wishlist-report.config.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const abs = (p) => path.join(root, p);
const jsonPath = abs(cfg.resultsPath);
const htmlPath = abs(cfg.outHtml);
const pdfPath = abs(cfg.outPdf);
const LOGO = cfg.logo;

if (!fs.existsSync(jsonPath)) { console.error(`No results at ${jsonPath}. Run:  npx playwright test wishlist`); process.exit(1); }

// Feature area from the test name (config-driven rules; first match wins).
function area(name) {
  const t = name.toLowerCase();
  for (const [re, a] of cfg.areaRules) if (re.test(t)) return a;
  return cfg.defaultArea;
}
// Areas in config order, with any extras appended.
const AREA_ORDER = [...cfg.areaOrder, ...[...new Set([cfg.defaultArea])].filter((a) => !cfg.areaOrder.includes(a))];

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const rows = [];
(function walk(s) {
  for (const sp of s.specs || []) {
    const m = sp.title.match(/WL_\d+/);
    if (!m) continue;
    const parts = sp.title.split('|').map((x) => x.trim());
    const pri = (parts.find((p) => /^P\d$/.test(p)) || '').toUpperCase();
    const pi = parts.findIndex((p) => /^P\d$/.test(p));
    const name = pi >= 0 ? parts.slice(pi + 1).join(' — ') : parts[parts.length - 1];
    const res = sp.tests?.[0]?.results || [];
    const last = res[res.length - 1] || {};
    const status = last.status || 'unknown';
    const bucket = sp.ok && status === 'passed' ? 'pass' : status === 'skipped' ? 'skip' : 'fail';
    rows.push({ id: m[0], pri, name, bucket, area: area(name), duration: res.reduce((a, r) => a + (r.duration || 0), 0) });
  }
  for (const c of s.suites || []) walk(c);
})({ suites: data.suites });
rows.sort((a, b) => parseInt(a.id.slice(3)) - parseInt(b.id.slice(3)));

const tally = { pass: rows.filter((r) => r.bucket === 'pass').length, fail: rows.filter((r) => r.bucket === 'fail').length, skip: rows.filter((r) => r.bucket === 'skip').length };
const total = rows.length;
const passRate = total ? Math.round((tally.pass / total) * 100) : 0;
const BUCKETS = cfg.buckets;

const R = 60, C = 2 * Math.PI * R; let off = 0;
const donutSegs = BUCKETS.filter(([b]) => tally[b] > 0).map(([b, color]) => {
  const len = (tally[b] / total) * C;
  const s = `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${color}" stroke-width="26" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 80 80)"/>`;
  off += len; return s;
}).join('');
const legend = BUCKETS.map(([b, color, label]) => `<span class="lg"><i style="background:${color}"></i>${label} <b>${tally[b]}</b> <span class="pct">${total ? Math.round((tally[b] / total) * 100) : 0}%</span></span>`).join('');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : ms ? `${ms}ms` : '—');
const ICON = { pass: '✓', fail: '✗', skip: '⏭' };
const COLOR = Object.fromEntries(cfg.buckets.map(([b, c]) => [b, c]));
const BADGE = Object.fromEntries(cfg.buckets.map(([b, , l]) => [b, `${ICON[b] || ''} ${l}`.trim()]));

let sections = '';
for (const a of AREA_ORDER) {
  const rs = rows.filter((r) => r.area === a);
  if (!rs.length) continue;
  const pass = rs.filter((r) => r.bucket === 'pass').length;
  sections += `<tr class="sec"><td colspan="5"><div class="secbar"><span>${esc(a)}</span><span class="secstat">${pass}/${rs.length} passed</span></div></td></tr>`;
  sections += rs.map((r) => `<tr><td class="c-tc">${r.id}</td><td class="c-pri"><span class="pri ${r.pri.toLowerCase()}">${r.pri || '—'}</span></td><td class="c-name">${esc(r.name)}</td><td class="c-res"><span class="badge" style="background:${COLOR[r.bucket]}">${BADGE[r.bucket]}</span></td><td class="c-dur">${fmtMs(r.duration)}</td></tr>`).join('');
}

const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST';
const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Reliance Jewels — ${esc(cfg.title)}</title><style>
  :root{--ink:#26201a;--muted:#7d7676;--gold:#8a6d1a;--gold-d:#4e3f09;--line:#dcd9d4;}
  *{box-sizing:border-box} body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);margin:0;padding:22px 30px}
  header{border-bottom:3px solid var(--gold);padding-bottom:10px;margin-bottom:12px}
  .brand{display:flex;align-items:center;gap:12px}.brand img{height:30px}
  .eyebrow{letter-spacing:2px;text-transform:uppercase;font-size:9px;color:var(--gold-d);font-weight:700}
  h1{margin:8px 0 2px;font-size:21px}.sub{color:var(--muted);font-size:12px}
  .meta{float:right;text-align:right;font-size:11px;color:var(--muted)}.meta b{color:var(--ink)}
  .hero{display:flex;gap:22px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:14px 18px;margin:12px 0}
  .donut{position:relative;width:150px;height:150px;flex:none}.donut .ctr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .donut .ctr .n{font-size:30px;font-weight:800;line-height:1}.donut .ctr .l{font-size:8.5px;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-top:3px}
  .hx{flex:1}.hx h2{margin:0 0 8px;font-size:14.5px}
  .legend{display:flex;flex-wrap:wrap;gap:6px 16px;margin-bottom:10px}.lg{font-size:12px}.lg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:middle}.lg b{font-weight:700}.lg .pct{color:var(--muted)}
  .scope{font-size:11.5px;color:var(--muted);border-top:1px dashed var(--line);padding-top:8px}.scope b{color:var(--ink)}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px;table-layout:fixed}
  th{background:#f3f1ea;text-align:left;padding:7px 10px;border-bottom:2px solid var(--line);font-size:10px;text-transform:uppercase;letter-spacing:.5px}
  td{padding:5px 10px;border-bottom:1px solid #efede8;vertical-align:middle}
  .c-tc{width:74px;font-weight:700;white-space:nowrap}.c-pri{width:46px;text-align:center}.c-name{width:auto}.c-res{width:104px;text-align:center}.c-dur{width:74px;text-align:right;color:var(--muted);white-space:nowrap}
  th.c-pri,th.c-res{text-align:center}th.c-dur{text-align:right}
  tr.sec td{background:var(--gold-d);color:#fff;font-weight:700;font-size:12px;padding:6px 10px;border:none}
  tr.sec .secbar{display:flex;justify-content:space-between;align-items:baseline}.tr.sec .secstat{font-weight:500;opacity:.9}
  tr{break-inside:avoid}.pri{display:inline-block;padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700;color:#fff}.pri.p0{background:#c0392b}.pri.p1{background:#3b6db5}
  .badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;color:#fff;white-space:nowrap}
  footer{margin-top:16px;font-size:11px;color:var(--muted);border-top:1px solid var(--line);padding-top:9px}
</style></head><body>
  <header>
    <div class="meta"><div>Generated <b>${now}</b></div><div>Browser <b>${esc(String(data.config?.projects?.[0]?.name || 'chromium'))}</b></div><div>Env <b>${esc(cfg.env)}</b></div></div>
    <div class="brand"><img src="${LOGO}" alt="Reliance Jewels"/><span class="eyebrow">Reliance Jewels · QA Automation</span></div>
    <h1>${esc(cfg.title)}</h1>
    <div class="sub">${total} automated cases · ${esc(cfg.subtitle)}</div>
  </header>
  <div class="hero">
    <div class="donut"><svg viewBox="0 0 160 160" width="150" height="150">${donutSegs}</svg><div class="ctr"><div class="n">${tally.pass}</div><div class="l">of ${total}</div></div></div>
    <div class="hx">
      <h2>${tally.pass}/${total} wishlist checks pass${tally.fail ? ` · ${tally.fail} failed` : ''}${tally.skip ? ` · ${tally.skip} skipped` : ''}.</h2>
      <div class="legend">${legend}</div>
      <div class="scope">Scope: <b>${total}</b> automated wishlist cases (P0+P1) · pass rate <b>${passRate}%</b> (${tally.pass}/${total}). ${esc(cfg.note || '')}</div>
    </div>
  </div>
  <table><thead><tr><th class="c-tc">TC</th><th class="c-pri">Pri</th><th class="c-name">Test case</th><th class="c-res">Result</th><th class="c-dur">Duration</th></tr></thead><tbody>${sections}</tbody></table>
  <footer>Reliance Jewels QA Automation · source: report/results.json · regenerate with <code>npm run report:wishlist</code></footer>
</body></html>`;

fs.writeFileSync(htmlPath, html);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
await browser.close();
console.log(`Wishlist report (${total} cases): ${tally.pass} pass · ${tally.fail} fail · ${tally.skip} skip.`);
console.log('PDF written to', pdfPath);
