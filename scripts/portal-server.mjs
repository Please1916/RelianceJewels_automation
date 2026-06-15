// Web test portal: a polished, clickable dashboard to run page tests and read
// an interactive report — no terminal needed.
//   npm run portal   → opens http://localhost:4321 automatically.
//
// The page list is auto-discovered from report-config/*.js — add a config for
// a new page and it shows up here automatically (no edits to this file).
//
// Routes:
//   GET /              dashboard shell (HTML + CSS, suites injected)
//   GET /portal.js     client app (served from scripts/portal-client.js)
//   GET /run           Server-Sent-Events stream of a live test run
//   GET /api/report    structured JSON of the latest results (for the report tab)
//   GET /report        the generated PDF (download)
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildReport } from './report-data.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = 4321;
const LOGO = 'https://cdn.pixelbin.io/v2/yellow-queen-0c3fa9/gly4zC/wrkr/sngz5/company/27/applications/64e83eb1653e8ab101c11f2e/application/pictures/free-logo/original/gM_1D1xVi-Reliance-Jewels.webp';

// Build the suite list from every report-config/<page>.js (skipping _template).
async function loadSuites() {
  const dir = path.join(ROOT, 'report-config');
  let files = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.js') && !f.startsWith('_'));
  } catch { /* no report-config dir yet */ }

  const pages = [];
  for (const f of files.sort()) {
    const key = f.replace(/\.js$/, '');
    let cfg = {};
    try {
      cfg = (await import(pathToFileURL(path.join(dir, f)).href)).default || {};
    } catch (e) {
      console.warn(`! Skipped report-config/${f}: ${e.message}`);
      continue;
    }
    pages.push({
      key,
      label: cfg.portalLabel || cfg.moduleLabel || key.toUpperCase(),
      module: String(cfg.moduleLabel || key).toUpperCase(),
      spec: cfg.spec || key,
      aliases: [key, ...(cfg.portalAliases || [])],
    });
  }

  // A combined "run everything" option, only when there's more than one page.
  if (pages.length > 1) {
    pages.push({
      key: 'all',
      label: 'All suites',
      module: pages.map((p) => p.key.toUpperCase()).join(' + '),
      spec: pages.map((p) => p.spec).join(' '),
      aliases: ['all', 'everything', 'full'],
    });
  }
  return pages;
}

const suites = await loadSuites();
if (!suites.length) {
  console.warn('! No report-config/*.js pages found — the portal has nothing to run.');
}

function matchSuite(raw) {
  const t = (raw || '').trim().toLowerCase();
  if (!t) return null;
  for (const s of suites) if (s.key === t || s.aliases.includes(t)) return s;
  for (const s of suites) {
    if (s.label.toLowerCase().includes(t) || s.aliases.some((a) => a.includes(t) || t.includes(a))) return s;
  }
  return null;
}

const stripAnsi = (s) => s.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');

const PAGE = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Reliance Jewels — QA Test Portal</title>
<style>
  :root{
    --ink:#241d15;--muted:#857c72;--faint:#a9a097;
    --gold:#8a6d1a;--gold-d:#4e3f09;--gold-l:#b8932f;--gold-bg:#f6f1e3;
    --bg:#f4f2ec;--card:#ffffff;--line:#e6e2d9;--line-2:#efece4;
    --pass:#1c958f;--fail:#c0392b;--gap:#d97706;--manual:#9a9a9a;--p0:#b4451f;--p1:#3a6ea5;
    --shadow:0 1px 2px rgba(40,30,12,.05),0 6px 22px rgba(40,30,12,.06);
    --radius:14px;
  }
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);margin:0;
    background:linear-gradient(180deg,#efe9da 0%,var(--bg) 220px);min-height:100vh;font-size:14px;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1080px;margin:0 auto;padding:22px 22px 64px}
  a{color:var(--gold)}
  /* header */
  header.top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:6px 2px 18px}
  .brand{display:flex;align-items:center;gap:13px}
  .brand img{height:40px;width:auto;filter:drop-shadow(0 1px 1px rgba(0,0,0,.08))}
  .brand .eyebrow{letter-spacing:2.5px;text-transform:uppercase;font-size:10px;color:var(--gold-d);font-weight:800}
  .brand h1{margin:1px 0 0;font-size:21px;letter-spacing:-.3px}
  .env-chip{display:inline-flex;align-items:center;gap:7px;background:var(--gold-bg);border:1px solid #e7dcbf;color:var(--gold-d);
    font-weight:700;font-size:11.5px;padding:7px 13px;border-radius:999px;letter-spacing:.3px}
  .env-chip .dot{width:7px;height:7px;border-radius:50%;background:var(--pass);box-shadow:0 0 0 3px rgba(28,149,143,.18)}
  /* tabs */
  .tabs{display:inline-flex;background:#eae5d8;border:1px solid var(--line);border-radius:999px;padding:4px;gap:3px;margin-bottom:20px}
  .tabs button{border:0;background:transparent;color:var(--muted);font-weight:700;font-size:13.5px;padding:9px 20px;border-radius:999px;cursor:pointer;transition:.18s;display:flex;align-items:center;gap:8px}
  .tabs button .pill{background:var(--gold-bg);color:var(--gold-d);font-size:11px;padding:1px 8px;border-radius:999px;font-weight:800}
  .tabs button[aria-selected="true"]{background:var(--card);color:var(--ink);box-shadow:var(--shadow)}
  .panel{display:none;animation:fade .25s ease}
  .panel.active{display:block}
  @keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
  /* cards */
  .card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}
  .card-pad{padding:20px 22px}
  .card + .card{margin-top:16px}
  .card-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
  .card-h h2{font-size:14px;margin:0;letter-spacing:-.2px}
  .card-h .sub,.sub{font-size:12.5px;color:var(--muted)}
  .label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin:18px 0 9px}
  .label:first-child{margin-top:6px}
  /* suite cards */
  .suite-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:11px}
  .suite{position:relative;text-align:left;background:#fbfaf6;border:1.5px solid var(--line);border-radius:12px;padding:13px 14px;cursor:pointer;transition:.16s}
  .suite:hover{border-color:var(--gold-l);transform:translateY(-1px);box-shadow:0 4px 14px rgba(40,30,12,.08)}
  .suite[aria-pressed="true"]{border-color:var(--gold);background:var(--gold-bg);box-shadow:0 0 0 1px var(--gold) inset}
  .suite .k{font-size:11px;font-weight:800;letter-spacing:1px;color:var(--gold-d);text-transform:uppercase}
  .suite .l{font-size:13.5px;font-weight:600;margin-top:3px;line-height:1.3}
  .suite .tick{position:absolute;top:11px;right:11px;width:18px;height:18px;border-radius:50%;border:1.5px solid var(--line);display:grid;place-items:center;color:#fff;font-size:11px;transition:.16s}
  .suite[aria-pressed="true"] .tick{background:var(--gold);border-color:var(--gold)}
  .suite[aria-pressed="true"] .tick::after{content:"✓"}
  /* toggles + run row */
  .opts{display:flex;flex-wrap:wrap;gap:10px 26px;margin-top:18px}
  .switch{display:inline-flex;align-items:center;gap:10px;cursor:pointer;font-size:13.5px;font-weight:500;-webkit-user-select:none;user-select:none}
  .switch input{position:absolute;opacity:0;pointer-events:none}
  .track{width:40px;height:23px;background:#d8d3c7;border-radius:999px;position:relative;transition:.18s;flex:0 0 auto}
  .track::after{content:"";position:absolute;top:2.5px;left:2.5px;width:18px;height:18px;background:#fff;border-radius:50%;transition:.18s;box-shadow:0 1px 3px rgba(0,0,0,.25)}
  .switch input:checked + .track{background:var(--gold)}
  .switch input:checked + .track::after{transform:translateX(17px)}
  .switch .hint{color:var(--faint);font-weight:400;font-size:12px}
  .run-row{display:flex;align-items:center;gap:16px;margin-top:22px;flex-wrap:wrap}
  .btn{border:0;border-radius:11px;font-size:14.5px;font-weight:700;cursor:pointer;transition:.16s;display:inline-flex;align-items:center;gap:9px}
  .btn-run{background:linear-gradient(135deg,var(--gold-l),var(--gold-d));color:#fff;padding:13px 26px;box-shadow:0 6px 16px rgba(78,63,9,.28)}
  .btn-run:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 9px 22px rgba(78,63,9,.34)}
  .btn-run:disabled{opacity:.55;cursor:default;box-shadow:none}
  .btn-ghost{background:#fff;border:1.5px solid var(--line);color:var(--ink);padding:10px 16px;font-size:13px}
  .btn-ghost:hover{border-color:var(--gold-l)}
  .run-status{font-weight:600;font-size:13.5px;color:var(--muted)}
  .run-status.ok{color:var(--pass)} .run-status.bad{color:var(--gap)} .run-status.err{color:var(--fail)}
  .spin{width:15px;height:15px;border:2.5px solid #e6e2d9;border-top-color:var(--gold);border-radius:50%;display:inline-block;animation:sp .7s linear infinite;vertical-align:-2px;margin-right:7px}
  @keyframes sp{to{transform:rotate(360deg)}}
  /* console */
  .console-card{margin-top:16px;overflow:hidden}
  .console-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px;background:#221d16;border-bottom:1px solid #3a3128}
  .tally{display:flex;gap:7px;align-items:center}
  .tcount{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#d7d0c4;background:#322a20;padding:4px 10px;border-radius:999px;font-variant-numeric:tabular-nums}
  .tcount b{font-size:13px}
  .tcount.pass b{color:#4fd1c9} .tcount.fail b{color:#ef8a7d} .tcount.skip b{color:#c9c1b4}
  .logfilters{display:flex;gap:5px;margin-left:auto}
  .chip{border:1px solid #3f352a;background:#2a241c;color:#b3aa9b;font-size:11.5px;font-weight:700;padding:5px 12px;border-radius:999px;cursor:pointer;transition:.14s;white-space:nowrap}
  .chip:hover{border-color:#5a4d3c;color:#e7e0d3}
  .chip[aria-pressed="true"]{background:var(--gold);border-color:var(--gold);color:#fff}
  .console-tools{display:flex;gap:5px}
  .console-tools .chip{background:transparent;border-color:#3f352a}
  .progress{height:3px;background:#322a20;overflow:hidden}
  .progress .bar{height:100%;width:0;background:linear-gradient(90deg,var(--gold-l),var(--pass));transition:width .3s}
  pre.console{background:#1b1712;color:#e8e2d6;margin:0;padding:16px 18px;max-height:48vh;overflow:auto;
    font-size:12.5px;line-height:1.65;white-space:pre-wrap;word-break:break-word;font-family:Menlo,Consolas,"SF Mono",monospace}
  pre.console .ln{display:block}
  pre.console .ln.pass{color:#73e0d6} pre.console .ln.fail{color:#ff9d90}
  pre.console .ln.cmd{color:var(--gold-l);font-weight:700} pre.console .ln.info{color:#b6ad9e}
  pre.console:empty::before,.empty-log::before{content:"Console output appears here when a run starts.";color:#6f665a;font-style:italic}
  /* report */
  .stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px}
  .stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:15px 16px;box-shadow:var(--shadow);position:relative;overflow:hidden}
  .stat::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--gold)}
  .stat.pass::before{background:var(--pass)} .stat.fail::before{background:var(--fail)}
  .stat.gap::before{background:var(--gap)} .stat.manual::before{background:var(--manual)} .stat.rate::before{background:var(--gold)}
  .stat .n{font-size:30px;font-weight:800;line-height:1;letter-spacing:-1px;font-variant-numeric:tabular-nums}
  .stat .t{font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-top:7px}
  .stat .x{font-size:11px;color:var(--faint);margin-top:2px}
  .hero{display:flex;gap:26px;align-items:center;flex-wrap:wrap}
  .donut{flex:0 0 auto;position:relative;width:172px;height:172px}
  .donut .ctr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .donut .ctr .big{font-size:36px;font-weight:800;line-height:1}
  .donut .ctr .small{font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:3px}
  .donut circle.seg{transition:stroke-dasharray .9s cubic-bezier(.4,0,.2,1)}
  .hero-info{flex:1;min-width:260px}
  .verdict{font-size:16px;font-weight:700;margin-bottom:13px;line-height:1.4}
  .legend{display:flex;flex-wrap:wrap;gap:9px 20px;margin-bottom:14px}
  .lg{font-size:13px;display:flex;align-items:center;gap:8px}
  .lg .dot{width:11px;height:11px;border-radius:3px}
  .lg b{font-variant-numeric:tabular-nums} .lg .pct{color:var(--muted);font-size:11.5px}
  .coverage{font-size:12.5px;color:var(--muted);border-top:1px dashed var(--line);padding-top:12px;line-height:1.6}
  .coverage b{color:var(--ink)}
  /* filter toolbar */
  .filters{position:sticky;top:0;z-index:5;display:flex;gap:12px;align-items:center;flex-wrap:wrap;
    background:rgba(255,255,255,.86);backdrop-filter:blur(8px);border:1px solid var(--line);border-radius:12px;padding:11px 14px;margin:16px 0 14px;box-shadow:var(--shadow)}
  .search{flex:1;min-width:190px;position:relative}
  .search input{width:100%;border:1px solid var(--line);border-radius:9px;padding:9px 12px 9px 34px;font-size:13.5px;background:#fbfaf6}
  .search input:focus{outline:none;border-color:var(--gold-l);background:#fff}
  .search svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--faint)}
  .fchip{border:1.5px solid var(--line);background:#fbfaf6;color:var(--muted);font-size:12px;font-weight:700;padding:7px 13px;border-radius:999px;cursor:pointer;transition:.14s;display:inline-flex;align-items:center;gap:7px}
  .fchip:hover{border-color:var(--gold-l)}
  .fchip .c{width:9px;height:9px;border-radius:3px}
  .fchip[aria-pressed="true"]{color:#fff;border-color:transparent}
  .fchip.pass[aria-pressed="true"]{background:var(--pass)} .fchip.fail[aria-pressed="true"]{background:var(--fail)}
  .fchip.gap[aria-pressed="true"]{background:var(--gap)} .fchip.manual[aria-pressed="true"]{background:var(--manual)}
  .fchip.p0[aria-pressed="true"]{background:var(--p0)} .fchip.p1[aria-pressed="true"]{background:var(--p1)}
  .fdiv{width:1px;align-self:stretch;background:var(--line);margin:0 2px}
  select.sel{border:1.5px solid var(--line);background:#fbfaf6;border-radius:9px;padding:8px 11px;font-size:12.5px;font-weight:600;color:var(--ink);cursor:pointer}
  .fcount{font-size:12.5px;color:var(--muted);margin-left:auto;white-space:nowrap}
  .fcount b{color:var(--ink)}
  /* results list */
  .sec-group{margin-bottom:10px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--card);box-shadow:var(--shadow)}
  .sec-head{display:flex;align-items:center;gap:11px;padding:12px 15px;cursor:pointer;background:#fbfaf6;-webkit-user-select:none;user-select:none}
  .sec-head:hover{background:#f5f1e8}
  .sec-head .caret{transition:.2s;color:var(--faint);font-size:11px}
  .sec-group.collapsed .caret{transform:rotate(-90deg)}
  .sec-head .nm{font-weight:700;font-size:13.5px}
  .sec-head .bar{flex:1;height:6px;background:var(--line-2);border-radius:999px;overflow:hidden;max-width:160px;margin:0 4px}
  .sec-head .bar i{display:block;height:100%;background:var(--pass);border-radius:999px}
  .sec-head .cnt{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
  .sec-body{display:block}
  .sec-group.collapsed .sec-body{display:none}
  .row{display:flex;align-items:center;gap:12px;padding:11px 15px;border-top:1px solid var(--line-2);font-size:13.5px}
  .row.clk{cursor:pointer} .row.clk:hover{background:#fcfaf4}
  .row .tc{font-weight:800;font-variant-numeric:tabular-nums;min-width:52px;color:var(--ink)}
  .row .nm{flex:1;line-height:1.35}
  .row .id{color:var(--faint);font-size:11.5px;font-weight:600;margin-left:7px}
  .pri{font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;color:#fff;letter-spacing:.3px}
  .pri.p0{background:var(--p0)} .pri.p1{background:var(--p1)}
  .badge{display:inline-flex;align-items:center;gap:5px;padding:3px 11px;border-radius:999px;font-size:11.5px;font-weight:700;color:#fff;white-space:nowrap}
  .badge.pass{background:var(--pass)} .badge.fail{background:var(--fail)} .badge.gap{background:var(--gap)} .badge.manual{background:var(--manual)}
  .row .dur{color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums;min-width:46px;text-align:right}
  .row .ex{color:var(--faint);font-size:12px;transition:.2s}
  .row.open .ex{transform:rotate(90deg)}
  .detail{border-top:1px solid var(--line-2);background:#fbf9f4;padding:14px 16px;display:none}
  .detail.show{display:block;animation:fade .2s ease}
  .detail .dl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin:0 0 5px;font-weight:700}
  .detail pre{background:#221d16;color:#f0ece2;padding:11px 13px;border-radius:8px;font-size:11.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;margin:0 0 12px;font-family:Menlo,Consolas,monospace;max-height:280px;overflow:auto}
  .detail img{max-width:100%;border:1px solid var(--line);border-radius:8px;display:block}
  .detail .nodata{font-size:12px;color:var(--faint);font-style:italic}
  .empty{text-align:center;padding:46px 20px;color:var(--muted)}
  .empty .ic{font-size:34px;margin-bottom:10px}
  .empty h3{margin:0 0 5px;font-size:16px;color:var(--ink)}
  .report-foot{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}
  .report-foot .meta{font-size:12px;color:var(--muted);line-height:1.7}
  .report-foot .meta b{color:var(--ink)}
  /* toast */
  #toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(120%);background:#241d15;color:#fff;
    padding:13px 22px;border-radius:12px;font-size:13.5px;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.3);transition:transform .35s cubic-bezier(.2,1.3,.4,1);z-index:50;display:flex;align-items:center;gap:10px}
  #toast.show{transform:translateX(-50%) translateY(0)}
  #toast a{color:var(--gold-l);font-weight:700}
  @media(max-width:560px){.wrap{padding:16px 14px 50px}.brand h1{font-size:18px}.stat .n{font-size:25px}}
</style></head><body>
<div class="wrap">
  <header class="top">
    <div class="brand">
      <img src="${LOGO}" alt="Reliance Jewels"/>
      <div>
        <div class="eyebrow">Reliance Jewels · QA Automation</div>
        <h1>Test Portal</h1>
      </div>
    </div>
    <div class="env-chip"><span class="dot"></span> UAT · live storefront</div>
  </header>

  <div class="tabs" role="tablist">
    <button id="tab-run" role="tab" aria-selected="true">▶ Run tests</button>
    <button id="tab-report" role="tab" aria-selected="false">📊 Report <span class="pill" id="reportPill" style="display:none">0</span></button>
  </div>

  <!-- RUN PANEL -->
  <section id="panel-run" class="panel active" role="tabpanel">
    <div class="card card-pad">
      <div class="card-h">
        <h2>Choose what to test</h2>
        <span class="sub">Pick a suite, then run — no terminal needed.</span>
      </div>
      <div class="suite-grid" id="suiteGrid"></div>

      <span class="label">Options</span>
      <div class="opts">
        <label class="switch"><input type="checkbox" id="headed"/><span class="track"></span>
          <span>Show browser <span class="hint">watch it run</span></span></label>
        <label class="switch"><input type="checkbox" id="report" checked/><span class="track"></span>
          <span>Build PDF report <span class="hint">after the run</span></span></label>
      </div>

      <div class="run-row">
        <button class="btn btn-run" id="run">▶ Run tests</button>
        <span class="run-status" id="status"></span>
      </div>
    </div>

    <div class="card console-card" id="consoleCard">
      <div class="console-bar">
        <div class="tally">
          <span class="tcount pass">✓ <b id="tPass">0</b></span>
          <span class="tcount fail">✕ <b id="tFail">0</b></span>
          <span class="tcount skip">– <b id="tSkip">0</b></span>
        </div>
        <div class="logfilters" id="logFilters">
          <button class="chip" data-lf="all" aria-pressed="true">All</button>
          <button class="chip" data-lf="pass">Passed</button>
          <button class="chip" data-lf="fail">Failed</button>
          <button class="chip" data-lf="info">Info</button>
        </div>
        <div class="console-tools">
          <button class="chip" id="autoscroll" aria-pressed="true" title="Auto-scroll">⤓ Auto</button>
          <button class="chip" id="copyLog" title="Copy log">⧉ Copy</button>
          <button class="chip" id="clearLog" title="Clear">✕ Clear</button>
        </div>
      </div>
      <div class="progress"><div class="bar" id="progBar"></div></div>
      <pre class="console empty-log" id="out"></pre>
    </div>
  </section>

  <!-- REPORT PANEL -->
  <section id="panel-report" class="panel" role="tabpanel">
    <div id="reportRoot"></div>
  </section>
</div>

<div id="toast"></div>

<script>window.__SUITES__ = ${JSON.stringify(suites)};</script>
<script src="/portal.js"></script>
</body></html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(PAGE);
  }

  if (url.pathname === '/portal.js') {
    try {
      const js = await readFile(path.join(ROOT, 'scripts', 'portal-client.js'));
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(js);
    } catch {
      res.writeHead(404); return res.end('// portal-client.js not found');
    }
  }

  // Structured JSON of the latest results — drives the interactive report tab.
  if (url.pathname === '/api/report') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    try {
      const r = await buildReport({
        root: ROOT,
        pageKey: url.searchParams.get('page') || undefined,
        withScreenshots: true,
      });
      if (!r) return res.end(JSON.stringify({ ok: false, empty: true }));
      const payload = {
        ok: true,
        pageKey: r.pageKey, moduleLabel: r.moduleLabel, cfgFound: r.cfgFound,
        counts: r.counts, donut: r.donut, donutTotal: r.donutTotal,
        verdict: r.verdict, meta: r.meta, sectionOrder: r.sectionOrder,
        sections: r.sections.map((g) => ({
          name: g.name, passed: g.passed, total: g.total,
          specs: g.specs.map((s) => ({
            tc: s.tc, id: s.id, name: s.name, klass: s.klass, priority: s.priority,
            flaky: s.flaky, duration: s.duration, error: s.error, screenshot: s.screenshotUri || null,
          })),
        })),
      };
      return res.end(JSON.stringify(payload));
    } catch (e) {
      return res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  if (url.pathname === '/report') {
    try {
      const pdf = await readFile(path.join(ROOT, 'report', 'test-report.pdf'));
      res.writeHead(200, { 'Content-Type': 'application/pdf' });
      return res.end(pdf);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('No report yet — run with "Build PDF report" checked.');
    }
  }

  if (url.pathname === '/run') {
    const suite = matchSuite(url.searchParams.get('suite'));
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    if (!suite) {
      res.write(`event: fail\ndata: Couldn't match "${url.searchParams.get('suite')}"\n\n`);
      return res.end();
    }
    const headed = url.searchParams.get('headed') === 'true';
    const report = url.searchParams.get('report') === 'true';
    const send = (line) => res.write(`data: ${stripAnsi(line)}\n\n`);

    send(`▶ Testing: ${suite.label}`);
    const cmd = `npx playwright test ${suite.spec}${headed ? ' --headed' : ''}`;
    send(`  ${cmd}\n`);
    const child = spawn(cmd, { cwd: ROOT, shell: true });

    const pipe = (stream) => stream.on('data', (d) => d.toString().split(/\r?\n/).forEach((l) => l && send(l)));
    pipe(child.stdout); pipe(child.stderr);

    child.on('close', (code) => {
      if (!report) { res.write(`event: done\ndata: ${code ?? 1}\n\n`); return res.end(); }
      send('\n📄 Generating PDF report…');
      const gen = spawn('node scripts/generate-report-pdf.mjs', { cwd: ROOT, shell: true });
      pipe(gen.stdout); pipe(gen.stderr);
      gen.on('close', () => { res.write(`event: done\ndata: ${code ?? 1}\n\n`); res.end(); });
    });
    req.on('close', () => child.kill());
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n🧪 Test portal running at  ${url}\n   (Press Ctrl+C to stop)\n`);
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(opener, [url], { shell: true, stdio: 'ignore' }).on('error', () => {});
});
