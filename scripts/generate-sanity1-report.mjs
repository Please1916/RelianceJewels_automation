/**
 * Generates the branded Sanity1 P0 PDF report.
 *
 * sanity1.spec.js has 213 individual test() blocks in a serial describe.
 * This script collects each spec's pass/fail/skip status from Playwright's
 * JSON results and renders them as a flat table grouped by section.
 *
 * Usage:
 *   npx playwright test sanity1      # writes report/results.json
 *   node scripts/generate-sanity1-report.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cfg from './sanity1-report.config.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const abs  = (p) => path.join(root, p);

const specPath  = abs(cfg.specPath);
const jsonPath  = abs(cfg.resultsPath);
const htmlPath  = abs(cfg.outHtml);
const pdfPath   = abs(cfg.outPdf);

if (!fs.existsSync(specPath)) { console.error('Spec not found:', specPath); process.exit(1); }
fs.mkdirSync(path.dirname(htmlPath), { recursive: true });

const escapeHtml = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ── 1. Collect all specs from the results JSON ────────────────────────────────
/** @type {{title:string, bucket:string, duration:number, errorMsg?:string, screenshotB64?:string}[]} */
let rows = [];
let hasResults = false;

if (fs.existsSync(jsonPath)) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  /** Recursively collect every spec that belongs to the sanity1 suite */
  function collectSpecs(suite, inSanity1) {
    const inside = inSanity1 || (suite.title || '').includes(cfg.suiteMatch);
    if (inside) {
      for (const spec of suite.specs || []) {
        const test    = spec.tests?.[0];
        const last    = test?.results?.[test.results.length - 1];
        const rawSt   = last?.status ?? test?.status ?? 'skipped';
        const expect  = test?.expectedStatus ?? 'passed';
        // test.fail() → expectedStatus='failed'; if it actually failed → xfail (known defect)
        const isXfail = expect === 'failed' && rawSt === 'failed';
        const bucket  = isXfail          ? 'xfail'
                      : rawSt === 'passed'  ? 'pass'
                      : rawSt === 'skipped' ? 'skip'
                      :                       'fail';

        // For failed tests, collect error message and screenshot
        let errorMsg = '';
        let screenshotB64 = '';
        if (bucket === 'fail') {
          const rawErr = last?.error?.message || '';
          // Strip ANSI escape codes for clean display
          errorMsg = rawErr.replace(/\[\d+m/g, '').replace(/\[[\d;]+m/g, '').trim();
          // Find screenshot attachment
          const ssAttach = (last?.attachments || []).find((a) => a.name === 'screenshot' && a.path);
          if (ssAttach && fs.existsSync(ssAttach.path)) {
            screenshotB64 = fs.readFileSync(ssAttach.path).toString('base64');
          }
        }

        rows.push({
          title:    spec.title,
          bucket,
          duration: last?.duration ?? 0,
          errorMsg,
          screenshotB64,
        });
      }
    }
    for (const child of suite.suites || []) collectSpecs(child, inside);
  }

  for (const s of data.suites || []) collectSpecs(s, false);
  // Exclude known-defect (xfail) tests from the displayed table.
  rows = rows.filter((r) => r.bucket !== 'xfail');
  if (rows.length) hasResults = true;
}

// ── 2. Fallback: parse test titles from the spec file ────────────────────────
if (!rows.length) {
  const specText = fs.readFileSync(specPath, 'utf8');
  const re = /test(?:\.fail)?\s*\(\s*['"`](TC_\d+[^'"`]*)['"`]/g;
  let m;
  while ((m = re.exec(specText)) !== null) {
    rows.push({ title: m[1], bucket: 'auto', duration: 0 });
  }
}

// ── 3. Tally ──────────────────────────────────────────────────────────────────
const RUN_BUCKETS = (hasResults ? cfg.buckets : [['auto', '#1c958f', 'Automated']]).filter(([b]) => b !== 'xfail');
const LABEL = Object.fromEntries(RUN_BUCKETS.map(([b, , l])  => [b, l]));
const tally = Object.fromEntries(RUN_BUCKETS.map(([b]) => [b, rows.filter((r) => r.bucket === b).length]));
const total = rows.length;
const passed = tally.pass ?? 0;
const failed = tally.fail ?? 0;
const skipped = tally.skip ?? 0;
const xfailed = 0;
const passRate = hasResults && total ? Math.round((passed / total) * 100) : 0;
const overall  = hasResults
  ? passRate >= 85 ? 'PASS' : 'FAIL'
  : 'NOT RUN';

// ── 4. Donut SVG ──────────────────────────────────────────────────────────────
const R = 60, C = 2 * Math.PI * R;
let donutOff = 0;
const donutSegs = RUN_BUCKETS.filter(([b]) => tally[b] > 0).map(([b, color]) => {
  const len = (tally[b] / total) * C;
  const seg = `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${color}" stroke-width="26"
    stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}"
    stroke-dashoffset="${(-donutOff).toFixed(2)}" transform="rotate(-90 80 80)"/>`;
  donutOff += len;
  return seg;
}).join('');

const legend = RUN_BUCKETS.map(([b, color]) =>
  `<span class="lg"><i style="background:${color}"></i>${LABEL[b]} <b>${tally[b]}</b> <span class="pct">${total ? Math.round((tally[b] / total) * 100) : 0}%</span></span>`
).join('');

// ── 5. Section grouping ───────────────────────────────────────────────────────
/** Map TC number (1-based int) from a title like "TC_031 | …" */
const tcNum = (title) => {
  const m = title.match(/TC_(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
};

const BADGE_TXT = { pass: 'Passed', fail: 'Failed', skip: 'Skipped', xfail: 'Known Defect', auto: 'Automated' };
const fmtMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : ms ? `${ms}ms` : '—');

/** Strip section code and priority tag: "TC_89 | ABF-022 | P0 | Description" → "TC_89 | Description" */
const cleanTitle = (title) => title.replace(/\s*\|\s*(?:[A-Z]+(?:-\d+)?|TC_[A-Z_]+\d+|[A-Z]+_\d+)\s*\|\s*P\d+\s*\|\s*/, ' | ');

/** Returns the section label for a given TC number */
const sectionFor = (n) => {
  if (n === null) return null;
  for (const sec of cfg.sections) {
    const s = parseInt(sec.start.replace('TC_', ''), 10);
    const e = parseInt(sec.end.replace('TC_', ''), 10);
    if (n >= s && n <= e) return sec.label;
  }
  return null;
};

let rowsHtml = '';
let lastSection = null;
let seqNum = 0;
for (const row of rows) {
  const n = tcNum(row.title);
  const sec = sectionFor(n);
  if (sec && sec !== lastSection) {
    rowsHtml += `<tr class="sec-hdr"><td colspan="4">${escapeHtml(sec)}</td></tr>`;
    lastSection = sec;
  }
  seqNum++;
  rowsHtml += `<tr${row.bucket === 'fail' ? ' style="background:#fff0f0;"' : ''}>
    <td class="c-no">${seqNum}</td>
    <td class="c-name">${escapeHtml(cleanTitle(row.title))}</td>
    <td class="c-res"><span class="badge ${row.bucket}">${BADGE_TXT[row.bucket]}</span></td>
    <td class="c-dur">${fmtMs(row.duration)}</td>
  </tr>`;
}

// ── 6. Section summary mini-table ────────────────────────────────────────────
let secSummaryHtml = '';
if (hasResults) {
  secSummaryHtml = `<table class="sec-summary">
    <thead><tr><th>Section</th><th>Tests</th><th>Passed</th><th>Failed</th><th>Skipped</th></tr></thead>
    <tbody>`;
  for (const sec of cfg.sections) {
    const s = parseInt(sec.start.replace('TC_', ''), 10);
    const e = parseInt(sec.end.replace('TC_', ''), 10);
    const secRows = rows.filter((r) => { const n = tcNum(r.title); return n !== null && n >= s && n <= e; });
    const p = secRows.filter((r) => r.bucket === 'pass').length;
    const f = secRows.filter((r) => r.bucket === 'fail').length;
    const sk = secRows.filter((r) => r.bucket === 'skip').length;
    const rowClass = f > 0 ? 'sec-fail' : sk === secRows.length ? 'sec-skip' : '';
    secSummaryHtml += `<tr class="${rowClass}">
      <td>${escapeHtml(sec.label)}</td>
      <td class="c">${secRows.length}</td>
      <td class="c g">${p}</td>
      <td class="c r">${f || '—'}</td>
      <td class="c m">${sk || '—'}</td>
    </tr>`;
  }
  secSummaryHtml += `</tbody></table>`;
}

// ── 7. Failure details cards ─────────────────────────────────────────────────
/** Parse a raw Playwright error string into structured fields */
function parseError(msg) {
  const lines = msg.split('\n');
  // Assertion type: first non-empty line after stripping "Error: "
  const typeLine = (lines[0] || '').replace(/^Error:\s*/, '').trim();
  // Expected / Received lines
  const expectedLine = lines.find((l) => /^\s*Expected/.test(l));
  const receivedLine = lines.find((l) => /^\s*Received/.test(l));
  // File location (e.g. "at tests/sanity1.spec.js:1113:54")
  const locLine = lines.find((l) => /at .+\.spec\.js:\d+/.test(l));
  const locMatch = locLine?.match(/([^/\\]+\.spec\.js):(\d+)/);
  const location = locMatch ? `${locMatch[1]} : line ${locMatch[2]}` : '';
  // Code snippet: lines with "NN |" or "> NN |" pattern
  const snippetLines = lines.filter((l) => /^\s*>?\s*\d+\s*\|/.test(l));

  return {
    typeLine,
    expected: expectedLine ? expectedLine.replace(/^\s*Expected\s*(pattern|value)?:?\s*/i, '').trim() : '',
    received: receivedLine ? receivedLine.replace(/^\s*Received\s*(string|value)?:?\s*/i, '').trim() : '',
    location,
    snippetLines,
  };
}

let failCardsHtml = '';
const failedRows = rows.filter((r) => r.bucket === 'fail');
if (failedRows.length) {
  failCardsHtml = `<div class="fail-section-wrap"><div class="fail-section-title">Failure Details &nbsp;<span style="font-size:11px;font-weight:400;letter-spacing:0">(${failedRows.length} failed test${failedRows.length > 1 ? 's' : ''})</span></div>`;
  let cardNum = 0;
  for (const row of failedRows) {
    cardNum++;
    const parsed = parseError(row.errorMsg || '');

    // Error info rows
    const infoRows = [
      parsed.typeLine  ? `<div class="fi-row"><span class="fi-lbl">Type</span><span class="fi-val">${escapeHtml(parsed.typeLine)}</span></div>` : '',
      parsed.location  ? `<div class="fi-row"><span class="fi-lbl">Location</span><span class="fi-val mono">${escapeHtml(parsed.location)}</span></div>` : '',
      parsed.expected  ? `<div class="fi-row"><span class="fi-lbl">Expected</span><span class="fi-val mono">${escapeHtml(parsed.expected)}</span></div>` : '',
      parsed.received  ? `<div class="fi-row"><span class="fi-lbl">Received</span><span class="fi-val mono">${escapeHtml(parsed.received)}</span></div>` : '',
    ].filter(Boolean).join('');

    // Code snippet with highlighted failing line
    const snippetHtml = parsed.snippetLines.length
      ? `<div class="fail-snippet">
           <div class="fi-section-lbl">Code Snippet</div>
           <pre>${parsed.snippetLines.map((l) =>
             /^\s*>/.test(l)
               ? `<span class="hl">${escapeHtml(l)}</span>`
               : escapeHtml(l)
           ).join('\n')}</pre>
         </div>`
      : '';

    // Screenshot
    const ssHtml = row.screenshotB64
      ? `<div class="fail-ss-col">
           <div class="fi-section-lbl">Screenshot at Failure</div>
           <img src="data:image/png;base64,${row.screenshotB64}" alt="failure screenshot"/>
         </div>`
      : '';

    failCardsHtml += `
    <div class="fail-card">
      <div class="fail-card-header">
        <span class="fc-num">FAIL ${cardNum}</span>
        <span class="fc-title">${escapeHtml(cleanTitle(row.title))}</span>
        <span class="fc-dur">${fmtMs(row.duration)}</span>
      </div>
      <div class="fail-card-body">
        <div class="fail-info">
          <div class="fi-section-lbl">Error Details</div>
          ${infoRows}
          ${snippetHtml}
        </div>
        ${ssHtml}
      </div>
    </div>`;
  }
  failCardsHtml += `</div>`; // close fail-section-wrap
}

// ── 8. Metadata ───────────────────────────────────────────────────────────────
const now = new Date().toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
}) + ' IST';
const totalDurationS = (rows.reduce((a, r) => a + r.duration, 0) / 1000).toFixed(1);
const headline = hasResults
  ? `Sanity ${overall} — ${passed}/${total} tests passed${failed ? ` · ${failed} failed` : ''}${skipped ? ` · ${skipped} skipped` : ''}${xfailed ? ` · ${xfailed} known defects` : ''}.`
  : `${total} P0 tests automated (no run results yet).`;

// ── 8. HTML ───────────────────────────────────────────────────────────────────
const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Reliance Jewels — ${escapeHtml(cfg.title)}</title>
<style>
  :root {
    --ink:#1a1a2e; --muted:#6b7280; --gold:#b8860b; --gold-d:#7a5c00; --gold-l:#fdf6e3;
    --line:#e5e7eb; --g:#059669; --g-l:#ecfdf5; --r:#dc2626; --r-l:#fef2f2;
    --sk:#9ca3af; --sk-l:#f9fafb; --header-bg:#1a1a2e; --header-text:#fff;
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:"Segoe UI",system-ui,-apple-system,sans-serif; color:var(--ink); background:#f8f7f4; }

  /* ── TOP BANNER ── */
  .top-banner {
    background:var(--header-bg);
    padding:18px 32px 16px;
    display:flex; align-items:center; justify-content:space-between;
    border-bottom:4px solid var(--gold);
  }
  .brand-block { display:flex; align-items:center; gap:14px; }
  .logo-pill { background:#fff; border-radius:8px; padding:5px 10px; display:flex; align-items:center; }
  .logo-pill img { height:34px; display:block; }
  .brand-text { }
  .brand-eyebrow { font-size:9px; letter-spacing:3px; text-transform:uppercase; color:#c9a84c; font-weight:700; }
  .brand-title { font-size:19px; font-weight:800; color:#fff; margin-top:2px; }
  .brand-sub { font-size:11px; color:#9ca3af; margin-top:1px; }
  .run-meta { text-align:right; font-size:11px; color:#9ca3af; line-height:1.7; }
  .run-meta b { color:#e5e7eb; }
  .run-meta .overall-badge {
    display:inline-block; padding:3px 14px; border-radius:20px; font-size:12px; font-weight:700;
    background:${overall === 'PASS' ? '#059669' : overall === 'FAIL' ? '#dc2626' : '#6b7280'};
    color:#fff; margin-bottom:6px;
  }

  /* ── STAT CARDS ── */
  .stats-row { display:flex; gap:0; background:#fff; border-bottom:1px solid var(--line); }
  .stat-card { flex:1; padding:16px 20px; border-right:1px solid var(--line); text-align:center; }
  .stat-card:last-child { border-right:none; }
  .stat-card .val { font-size:32px; font-weight:800; line-height:1; }
  .stat-card .lbl { font-size:10px; letter-spacing:1px; text-transform:uppercase; color:var(--muted); margin-top:4px; }
  .stat-card.pass .val { color:var(--g); }
  .stat-card.fail .val { color:var(--r); }
  .stat-card.skip .val { color:var(--sk); }
  .stat-card.rate .val { color:var(--gold-d); }

  /* ── CONTENT AREA ── */
  .content { padding:20px 32px 28px; }

  /* ── HERO DONUT ── */
  .hero { display:flex; gap:24px; align-items:center; background:#fff; border:1px solid var(--line); border-radius:12px; padding:18px 24px; margin-bottom:20px; box-shadow:0 1px 4px rgba(0,0,0,.06); }
  .donut { position:relative; width:140px; height:140px; flex:none; }
  .donut .ctr { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .donut .ctr .n { font-size:28px; font-weight:800; line-height:1; color:var(--ink); }
  .donut .ctr .l { font-size:8px; letter-spacing:1px; color:var(--muted); text-transform:uppercase; margin-top:3px; }
  .hx { flex:1; }
  .hx h2 { font-size:14px; font-weight:700; color:var(--ink); margin-bottom:12px; line-height:1.4; }
  .legend { display:flex; flex-wrap:wrap; gap:8px 20px; }
  .lg { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:500; }
  .lg i { display:inline-block; width:12px; height:12px; border-radius:3px; flex:none; }
  .lg b { font-weight:700; } .lg .pct { color:var(--muted); font-size:11px; }

  /* ── SECTION SUMMARY ── */
  .sec-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:var(--gold-d); margin:0 0 8px; padding-bottom:6px; border-bottom:2px solid var(--gold); }
  table.sec-summary { width:100%; border-collapse:collapse; font-size:11.5px; margin-bottom:22px; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.06); }
  table.sec-summary thead tr { background:var(--header-bg); color:#fff; }
  table.sec-summary th { padding:8px 12px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.8px; font-weight:600; color:#d1d5db; }
  table.sec-summary th.c { text-align:center; }
  table.sec-summary td { padding:7px 12px; border-bottom:1px solid #f3f4f6; }
  table.sec-summary td.c { text-align:center; font-variant-numeric:tabular-nums; font-weight:600; }
  table.sec-summary td.g { color:var(--g); }
  table.sec-summary td.r { color:var(--r); }
  table.sec-summary td.m { color:var(--sk); }
  table.sec-summary tbody tr:hover { background:#fafafa; }
  table.sec-summary tbody tr:last-child td { border-bottom:none; }
  tr.sec-fail td { background:#fff8f8; }

  /* ── MAIN TABLE ── */
  .results-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:var(--gold-d); margin:0 0 8px; padding-bottom:6px; border-bottom:2px solid var(--gold); }
  .results-title { page-break-after:avoid; break-after:avoid; }
  table.main { width:100%; border-collapse:collapse; font-size:11.5px; table-layout:fixed; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.06); }
  table.main thead { display:table-header-group; break-after:avoid; page-break-after:avoid; }
  table.main thead tr { background:var(--header-bg); break-after:avoid; page-break-after:avoid; }
  table.main th { color:#d1d5db; text-align:left; padding:9px 12px; font-size:10px; text-transform:uppercase; letter-spacing:.8px; font-weight:600; }
  table.main td { padding:7px 12px; border-bottom:1px solid #f3f4f6; vertical-align:middle; }
  table.main tbody tr:last-child td { border-bottom:none; }
  table.main tbody tr:nth-child(even) { background:#fafafa; }
  /* column widths — fixed layout */
  col.c-no  { width:44px; }
  col.c-res { width:110px; }
  col.c-dur { width:80px; }
  .c-no  { text-align:center; font-weight:700; color:var(--muted); font-variant-numeric:tabular-nums; }
  .c-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .c-res { text-align:center; }
  .c-dur { text-align:right; color:var(--muted); white-space:nowrap; font-size:11px; }
  th.c-no { text-align:center; }
  th.c-res { text-align:center; }
  th.c-dur { text-align:right; }
  tr.sec-hdr td {
    background:linear-gradient(90deg,#f5f3ee 0%,#faf9f6 100%);
    font-weight:700; font-size:10px; letter-spacing:1.5px; text-transform:uppercase;
    color:var(--gold-d); border-top:2px solid var(--line); padding:7px 12px;
    border-left:4px solid var(--gold);
  }
  /* ── FAILURE DETAILS SECTION ── */
  .fail-section-wrap {
    page-break-before:always; break-before:page;
  }
  .fail-section-title {
    font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px;
    color:var(--r); margin:0 0 12px; padding-bottom:6px; border-bottom:2px solid var(--r);
  }
  .fail-card {
    background:#fff; border-radius:10px; overflow:hidden;
    box-shadow:0 2px 8px rgba(220,38,38,.15); margin-bottom:22px;
    border:1px solid #fca5a5;
    page-break-inside:avoid; break-inside:avoid;
  }
  .fail-card-body {
    page-break-inside:avoid; break-inside:avoid;
  }
  .fail-card-header {
    background:#dc2626; padding:12px 18px;
    display:flex; align-items:center; gap:12px;
  }
  .fail-card-header .fc-num {
    background:rgba(255,255,255,.2); color:#fff; font-size:11px; font-weight:800;
    padding:3px 10px; border-radius:20px; white-space:nowrap;
  }
  .fail-card-header .fc-title {
    color:#fff; font-size:13px; font-weight:700; flex:1;
  }
  .fail-card-header .fc-dur {
    color:rgba(255,255,255,.75); font-size:11px; white-space:nowrap;
  }
  .fail-card-body {
    display:flex; gap:0; align-items:stretch;
  }
  .fail-info {
    flex:1; padding:18px 20px; border-right:1px solid #fde8e8; min-width:0;
  }
  .fi-section-lbl {
    font-size:9px; text-transform:uppercase; letter-spacing:1.5px; font-weight:700;
    color:#b91c1c; margin-bottom:10px;
  }
  .fi-row {
    display:flex; gap:10px; margin-bottom:10px; align-items:flex-start;
  }
  .fi-row .fi-lbl {
    font-size:11px; font-weight:700; color:#6b7280; white-space:nowrap;
    min-width:80px; padding-top:1px;
  }
  .fi-row .fi-val {
    font-size:12px; color:#1a1a2e; font-family:"Segoe UI",system-ui,sans-serif;
    word-break:break-word;
  }
  .fi-row .fi-val.mono {
    font-family:"Courier New",Courier,monospace; font-size:11.5px;
    background:#fff5f5; border-radius:4px; padding:2px 7px; color:#b91c1c;
  }
  .fail-snippet {
    margin-top:14px;
  }
  .fail-snippet .fi-section-lbl { margin-bottom:6px; }
  .fail-snippet pre {
    font-family:"Courier New",Courier,monospace; font-size:11.5px; line-height:1.7;
    background:#1a1a2e; color:#e2e8f0; border-radius:6px; padding:12px 14px;
    white-space:pre; overflow-x:auto; margin:0;
  }
  .fail-snippet pre .hl { color:#f87171; font-weight:700; }
  .fail-ss-col {
    flex:none; width:44%; padding:18px; display:flex; flex-direction:column;
  }
  .fail-ss-col .fi-section-lbl { margin-bottom:8px; }
  .fail-ss-col img {
    display:block; width:100%; height:auto; border-radius:6px;
    border:1.5px solid #fca5a5; box-shadow:0 3px 10px rgba(0,0,0,.12);
  }

  /* badges — no inline style override; CSS class fully controls appearance */
  .badge { display:inline-block; padding:3px 12px; border-radius:20px; font-size:10.5px; font-weight:700; white-space:nowrap; }
  .badge.pass { background:#dcfce7; color:#15803d; }
  .badge.fail { background:#fee2e2; color:#b91c1c; }
  .badge.skip { background:#f3f4f6; color:#6b7280; }

  /* ── FOOTER ── */
  footer { margin-top:20px; font-size:10px; color:var(--muted); border-top:1px solid var(--line); padding-top:10px; display:flex; justify-content:space-between; align-items:center; }
  footer .left { line-height:1.6; }
  footer .right { font-size:11px; color:var(--gold-d); font-weight:600; }
</style></head><body>

  <div class="top-banner">
    <div class="brand-block">
      <div class="logo-pill"><img src="${cfg.logo}" alt="Reliance Jewels"/></div>
      <div class="brand-text">
        <div class="brand-eyebrow">Sanity User Flow Report</div>
      </div>
    </div>
    <div class="run-meta">
      <div><span class="overall-badge">${overall}</span></div>
      <div>Generated &nbsp;<b>${now}</b></div>
      ${hasResults ? `<div>Duration &nbsp;<b>${totalDurationS}s</b></div>` : ''}
      <div>Environment &nbsp;<b>${escapeHtml(cfg.env)}</b></div>
    </div>
  </div>

  <div class="stats-row">
    <div class="stat-card pass"><div class="val">${passed}</div><div class="lbl">Passed</div></div>
    <div class="stat-card fail"><div class="val">${failed || 0}</div><div class="lbl">Failed</div></div>
    <div class="stat-card skip"><div class="val">${skipped || 0}</div><div class="lbl">Skipped</div></div>
    <div class="stat-card rate"><div class="val">${passRate}%</div><div class="lbl">Pass Rate</div></div>
  </div>

  <div class="content">

    <div class="hero">
      <div class="donut">
        <svg viewBox="0 0 160 160" width="140" height="140">${donutSegs}</svg>
        <div class="ctr">
          <div class="n">${hasResults ? passed : total}</div>
          <div class="l">${hasResults ? `of ${total}` : 'automated'}</div>
        </div>
      </div>
      <div class="hx">
        <h2>${headline}</h2>
        <div class="legend">${legend}</div>
      </div>
    </div>

    ${secSummaryHtml ? `<div class="sec-title">Section Summary</div>${secSummaryHtml}` : ''}

    <div style="page-break-inside:avoid; break-inside:avoid;">
    <div class="results-title">Test Results &nbsp;<span style="font-size:11px;color:var(--muted);font-weight:400;letter-spacing:0">(${total} tests)</span></div>
    <table class="main">
      <colgroup>
        <col class="c-no"/><col class="c-name"/><col class="c-res"/><col class="c-dur"/>
      </colgroup>
      <thead>
        <tr>
          <th class="c-no">#</th>
          <th class="c-name">Test Case</th>
          <th class="c-res">Result</th>
          <th class="c-dur">Duration</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    </div>

    ${failCardsHtml}

    <footer>
      <div class="left">
        Reliance Jewels Sanity User Flow Report &nbsp;·&nbsp; ${escapeHtml(cfg.specPath)}
        ${hasResults ? `&nbsp;·&nbsp; ${escapeHtml(cfg.resultsPath)}` : ''}
      </div>
      <div class="right">Reliance Jewels · QA</div>
    </footer>

  </div>
</body></html>`;

// ── 9. Write HTML + render PDF ────────────────────────────────────────────────
fs.writeFileSync(htmlPath, html);

const browser = await chromium.launch();
const page    = await browser.newPage();
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' },
});
await browser.close();

console.log(`Sanity report (${total} tests):`);
if (hasResults) {
  console.log(`  ${overall}  —  ${passed} passed · ${failed} failed · ${skipped} skipped · ${xfailed} known-defects`);
  console.log(`  Pass rate: ${passRate}%`);
} else {
  console.log('  No run results found — rendered as Automated.');
}
console.log('HTML:', htmlPath);
console.log('PDF: ', pdfPath);
