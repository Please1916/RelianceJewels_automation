// Web test portal: a clickable page to run page tests from the browser.
// Usage:  npm run portal   → opens http://localhost:4321 automatically.
//
// The page list is auto-discovered from report-config/*.js — add a config for
// a new page and it shows up here automatically (no edits to this file).
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = 4321;

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
      spec: cfg.spec || key,
      aliases: [key, ...(cfg.portalAliases || [])],
    });
  }

  // A combined "run everything" option, only when there's more than one page.
  if (pages.length > 1) {
    pages.push({
      key: 'all',
      label: `All suites (${pages.map((p) => p.key.toUpperCase()).join(' + ')})`,
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
<title>Reliance Jewels — Test Portal</title>
<style>
  :root{--gold:#4e3f09;--ink:#26201a;--line:#d4d1d1;--pass:#1c958f;--bg:#f3f3ed}
  *{box-sizing:border-box}
  body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);margin:0;background:var(--bg)}
  .wrap{max-width:860px;margin:0 auto;padding:28px 22px}
  header{border-bottom:3px solid var(--gold);padding-bottom:12px;margin-bottom:18px}
  .eyebrow{letter-spacing:2px;text-transform:uppercase;font-size:11px;color:var(--gold);font-weight:700}
  h1{margin:6px 0 2px;font-size:24px}
  .sub{color:#7d7676;font-size:13px}
  .card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px;margin-bottom:16px}
  label{display:block;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#7d7676;margin:10px 0 5px}
  select,input[type=text]{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:15px}
  .row{display:flex;gap:18px;align-items:center;margin-top:12px}
  .row label{margin:0;text-transform:none;font-weight:500;font-size:14px;color:var(--ink);display:flex;align-items:center;gap:7px}
  button{margin-top:16px;background:var(--gold);color:#fff;border:0;border-radius:8px;padding:12px 22px;font-size:15px;font-weight:600;cursor:pointer}
  button:disabled{opacity:.5;cursor:default}
  #status{margin:14px 0 0;font-weight:600}
  pre{background:#1e1b16;color:#e8e4da;border-radius:10px;padding:14px;max-height:50vh;overflow:auto;font-size:12.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word}
  a.report{display:inline-block;margin-top:10px;color:var(--gold);font-weight:600}
  .hint{font-size:12px;color:#7d7676;margin-top:4px}
</style></head><body><div class="wrap">
  <header>
    <div class="eyebrow">Reliance Jewels · QA Automation</div>
    <h1>Test Portal</h1>
    <div class="sub">Pick a page (or type its name) and run the tests — no terminal needed.</div>
  </header>

  <div class="card">
    <label for="suite">Choose a page</label>
    <select id="suite">
      ${suites.map((s) => `<option value="${s.key}">${s.label}</option>`).join('')}
    </select>

    <label for="typed">…or type a page name / keyword (optional)</label>
    <input type="text" id="typed" placeholder="e.g. plp, collection, search, all"/>
    <div class="hint">If you type something here, it overrides the dropdown.</div>

    <div class="row">
      <label><input type="checkbox" id="headed"/> Show browser while testing</label>
      <label><input type="checkbox" id="report" checked/> Build PDF report after</label>
    </div>

    <button id="run">▶ Run tests</button>
    <div id="status"></div>
    <a class="report" id="reportLink" href="/report" target="_blank" style="display:none">📄 Open PDF report</a>
  </div>

  <pre id="out" style="display:none"></pre>
</div>
<script>
  const $ = (id) => document.getElementById(id);
  $('run').addEventListener('click', () => {
    const suite = $('typed').value.trim() || $('suite').value;
    const headed = $('headed').checked, report = $('report').checked;
    const out = $('out'); out.style.display = 'block'; out.textContent = '';
    $('reportLink').style.display = 'none';
    $('run').disabled = true;
    $('status').textContent = '⏳ Running… (this can take a few minutes)';
    const es = new EventSource('/run?suite=' + encodeURIComponent(suite) + '&headed=' + headed + '&report=' + report);
    es.onmessage = (e) => { out.textContent += e.data + '\\n'; out.scrollTop = out.scrollHeight; };
    es.addEventListener('done', (e) => {
      const ok = e.data === '0';
      $('status').textContent = ok ? '✅ Finished — all selected tests passed.'
                                   : '⚠️ Finished — some non-passing tests (see output / report).';
      if (report) $('reportLink').style.display = 'inline-block';
      $('run').disabled = false; es.close();
    });
    es.addEventListener('fail', (e) => {
      $('status').textContent = '✗ ' + e.data; $('run').disabled = false; es.close();
    });
  });
</script></body></html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(PAGE);
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
