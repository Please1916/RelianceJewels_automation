/* Reliance Jewels — QA Test Portal client app.
 * Served by portal-server.mjs at /portal.js. Plain browser JS (no build step).
 *
 * Two surfaces:
 *   1) Run    — pick a suite, stream the live run (filterable console + live
 *               pass/fail tally + progress bar).
 *   2) Report — interactive view of report/results.json (via /api/report):
 *               summary cards, donut, and a filterable/searchable case list
 *               with inline failure logs + screenshots.
 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const SUITES = window.__SUITES__ || [];
  const STATUS = { pass: 'Passed', fail: 'Failed', gap: 'Known gap', manual: 'Manual' };
  const COLOR = { pass: '#1c958f', fail: '#c0392b', gap: '#d97706', manual: '#9a9a9a' };

  // Tiny DOM builder — text children go through textContent (XSS-safe).
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const k in (attrs || {})) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2).toLowerCase(), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return e;
  }
  const fmtMs = (ms) => (ms >= 1000 ? (ms / 1000).toFixed(1) + 's' : Math.round(ms) + 'ms');

  let toastTimer;
  function toast(msg, linkText, onClick) {
    const t = $('toast');
    t.textContent = '';
    t.append(document.createTextNode(msg));
    if (linkText) {
      const a = h('a', { href: '#', onclick: (e) => { e.preventDefault(); onClick && onClick(); } }, linkText);
      t.append(document.createTextNode('  '), a);
    }
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 5200);
  }

  /* ---------------- Tabs ---------------- */
  function showTab(which) {
    const run = which === 'run';
    $('tab-run').setAttribute('aria-selected', String(run));
    $('tab-report').setAttribute('aria-selected', String(!run));
    $('panel-run').classList.toggle('active', run);
    $('panel-report').classList.toggle('active', !run);
    if (!run && !report.loaded) loadReport();
  }
  $('tab-run').addEventListener('click', () => showTab('run'));
  $('tab-report').addEventListener('click', () => showTab('report'));

  /* ---------------- Suite picker ---------------- */
  let selectedSuite = (SUITES.find((s) => s.key !== 'all') || SUITES[0] || {}).key;
  function renderSuites() {
    const grid = $('suiteGrid');
    grid.textContent = '';
    SUITES.forEach((s) => {
      const card = h('button', {
        class: 'suite', type: 'button', 'aria-pressed': String(s.key === selectedSuite),
        onclick: () => { selectedSuite = s.key; renderSuites(); },
      },
        h('span', { class: 'tick' }),
        h('div', { class: 'k' }, s.key.toUpperCase()),
        h('div', { class: 'l' }, s.label),
      );
      grid.append(card);
    });
  }
  renderSuites();

  /* ---------------- Live console ---------------- */
  const out = $('out');
  let logLines = [];        // { text, disp, filt }
  let logFilter = 'all';
  let autoscroll = true;
  let running = false;

  function classifyLine(raw) {
    const t = raw.trim();
    if (/^▶|^\s*npx playwright|^📄|^\s*node scripts/.test(t)) return { disp: 'cmd', filt: 'info' };
    if (/[✓√]/.test(t) || /\bpassed\b/i.test(t)) return { disp: 'pass', filt: 'pass' };
    if (/[✘✕×]/.test(t) || /\b(failed|error|timed out)\b/i.test(t)) return { disp: 'fail', filt: 'fail' };
    return { disp: 'info', filt: 'info' };
  }

  function appendLine(raw) {
    const c = classifyLine(raw);
    const rec = { text: raw, disp: c.disp, filt: c.filt };
    logLines.push(rec);
    if (logFilter === 'all' || logFilter === rec.filt) {
      out.classList.remove('empty-log');
      out.append(h('span', { class: 'ln ' + rec.disp }, raw));
      if (autoscroll) out.scrollTop = out.scrollHeight;
    }
    updateTallyFromLine(raw);
  }

  function rebuildLog() {
    out.textContent = '';
    const shown = logLines.filter((r) => logFilter === 'all' || logFilter === r.filt);
    if (!shown.length) { out.classList.add('empty-log'); return; }
    out.classList.remove('empty-log');
    const frag = document.createDocumentFragment();
    shown.forEach((r) => frag.append(h('span', { class: 'ln ' + r.disp }, r.text)));
    out.append(frag);
    if (autoscroll) out.scrollTop = out.scrollHeight;
  }

  // Live tally — approximate during the run, corrected by the final summary.
  let tally = { pass: 0, fail: 0, skip: 0, total: 0 };
  function setTally() {
    $('tPass').textContent = tally.pass;
    $('tFail').textContent = tally.fail;
    $('tSkip').textContent = tally.skip;
    const done = tally.pass + tally.fail + tally.skip;
    const pct = tally.total ? Math.min(100, Math.round((done / tally.total) * 100)) : (running ? 6 : 0);
    $('progBar').style.width = pct + '%';
  }
  function updateTallyFromLine(raw) {
    const t = raw.trim();
    const mTotal = t.match(/Running\s+(\d+)\s+test/i);
    if (mTotal) { tally.total = +mTotal[1]; setTally(); return; }
    // Final summary lines (authoritative) — e.g. "38 passed (1.2m)", "8 failed".
    const sum = {};
    let m, re = /(\d+)\s+(passed|failed|skipped|flaky|did not run)/gi;
    while ((m = re.exec(t))) sum[m[2].toLowerCase()] = +m[1];
    if (Object.keys(sum).length) {
      if ('passed' in sum) tally.pass = sum.passed + (sum.flaky || 0);
      if ('failed' in sum) tally.fail = sum.failed;
      if ('skipped' in sum) tally.skip = sum.skipped;
      setTally();
      return;
    }
    // Per-test result lines from the `list` reporter.
    if (/^\s*[✓√]\s+\d/.test(t)) { tally.pass++; setTally(); }
    else if (/^\s*[✘✕×]\s+\d/.test(t)) { tally.fail++; setTally(); }
    else if (/^\s*-\s+\d/.test(t) || /\bskipped\b/i.test(t)) { /* keep summary authoritative */ }
  }

  function resetRunUI() {
    logLines = []; out.textContent = ''; out.classList.add('empty-log');
    tally = { pass: 0, fail: 0, skip: 0, total: 0 }; setTally();
  }

  // log filter chips
  $('logFilters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lf]'); if (!b) return;
    logFilter = b.dataset.lf;
    [...$('logFilters').children].forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    rebuildLog();
  });
  $('autoscroll').addEventListener('click', (e) => {
    autoscroll = !autoscroll;
    e.currentTarget.setAttribute('aria-pressed', String(autoscroll));
    if (autoscroll) out.scrollTop = out.scrollHeight;
  });
  $('clearLog').addEventListener('click', () => { logLines = []; rebuildLog(); });
  $('copyLog').addEventListener('click', () => {
    navigator.clipboard.writeText(logLines.map((l) => l.text).join('\n')).then(() => toast('Log copied to clipboard.'));
  });

  /* ---------------- Run ---------------- */
  function setStatus(text, cls) {
    const s = $('status');
    s.textContent = '';
    s.className = 'run-status' + (cls ? ' ' + cls : '');
    if (cls === 'run') s.append(h('span', { class: 'spin' }));
    s.append(document.createTextNode(text));
  }

  $('run').addEventListener('click', () => {
    if (running) return;
    const suite = selectedSuite;
    const headed = $('headed').checked, report = $('report').checked;
    if (!suite) { toast('Pick a suite first.'); return; }
    running = true;
    $('run').disabled = true;
    resetRunUI();
    setStatus('Running… this can take a few minutes', 'run');
    const qs = 'suite=' + encodeURIComponent(suite) + '&headed=' + headed + '&report=' + report;
    const es = new EventSource('/run?' + qs);
    es.onmessage = (e) => appendLine(e.data);
    es.addEventListener('done', (e) => {
      const ok = e.data === '0';
      running = false; $('run').disabled = false; $('progBar').style.width = '100%';
      setStatus(ok ? 'Finished — all selected tests passed.' : 'Finished — some cases need attention (see report).', ok ? 'ok' : 'bad');
      es.close();
      // Refresh the interactive report from the fresh results.
      const page = suite !== 'all' ? suite : '';
      loadReport(page).then(() => {
        toast(ok ? 'Run complete.' : 'Run complete — review findings.', 'View report →', () => showTab('report'));
      });
    });
    es.addEventListener('fail', (e) => {
      running = false; $('run').disabled = false;
      setStatus('Couldn’t start: ' + e.data, 'err'); es.close();
    });
  });

  /* ---------------- Interactive report ---------------- */
  const report = { loaded: false, data: null };
  const filter = { q: '', status: new Set(['pass', 'fail', 'gap', 'manual']), priority: new Set(['P0', 'P1']), section: 'all', sort: 'tc' };

  async function loadReport(page) {
    try {
      const r = await fetch('/api/report' + (page ? '?page=' + encodeURIComponent(page) : ''));
      const data = await r.json();
      report.loaded = true; report.data = data;
      if (data.ok) {
        $('reportPill').style.display = '';
        $('reportPill').textContent = data.counts.suiteTotal;
      }
      renderReport();
    } catch (e) {
      report.loaded = true;
      $('reportRoot').textContent = '';
      $('reportRoot').append(emptyState('⚠️', 'Could not load report', e.message));
    }
  }

  function emptyState(ic, title, msg) {
    return h('div', { class: 'empty' }, h('div', { class: 'ic' }, ic), h('h3', {}, title), h('div', { class: 'sub' }, msg));
  }

  function renderReport() {
    const root = $('reportRoot');
    root.textContent = '';
    const d = report.data;
    if (!d || !d.ok) {
      root.append(emptyState('📊', 'No report yet', 'Run a suite with “Build PDF report” checked, then come back here.'));
      return;
    }
    root.append(statCards(d), heroCard(d), filterBar(d), h('div', { id: 'results' }), reportFoot(d));
    renderResults();
  }

  function statCards(d) {
    const c = d.counts;
    const grid = h('div', { class: 'stat-grid' });
    const card = (cls, n, t, x) => h('div', { class: 'stat ' + cls },
      h('div', { class: 'n' }, String(n)), h('div', { class: 't' }, t), x ? h('div', { class: 'x' }, x) : null);
    grid.append(
      card('pass', c.passed, 'Passed', c.flaky ? c.flaky + ' flaky' : ''),
      card('fail', c.failed, 'Failed', c.failed ? 'need attention' : 'none'),
      card('gap', c.knownGap, 'Known gaps', 'tracked'),
      card('manual', c.manual, 'Manual', 'not automated'),
      card('rate', c.execPassRate + '%', 'Pass rate', c.passed + '/' + c.executed + ' executed'),
      card('', d.meta.durationS + 's', 'Duration', c.suiteTotal + ' cases'),
    );
    return grid;
  }

  function heroCard(d) {
    const R = 62, C = 2 * Math.PI * R; let acc = 0;
    const arcs = d.donut.map((s) => {
      const frac = s.value / d.donutTotal;
      const seg = `<circle class="seg" r="${R}" cx="84" cy="84" fill="none" stroke="${s.color}" stroke-width="24"
        stroke-linecap="butt" stroke-dasharray="0 ${C.toFixed(1)}"
        data-len="${(frac * C).toFixed(2)}" data-gap="${(C - frac * C).toFixed(2)}"
        stroke-dashoffset="${(-acc * C).toFixed(2)}" transform="rotate(-90 84 84)"/>`;
      acc += frac; return seg;
    }).join('');
    const svg = h('div', { class: 'donut', html:
      `<svg viewBox="0 0 168 168" width="168" height="168">
        <circle r="${R}" cx="84" cy="84" fill="none" stroke="#eee7d6" stroke-width="24"/>${arcs}
      </svg>
      <div class="ctr"><div class="big">${d.counts.passed}</div><div class="small">of ${d.donutTotal} cases</div></div>` });

    const legend = h('div', { class: 'legend' });
    d.donut.forEach((s) => legend.append(h('div', { class: 'lg' },
      h('span', { class: 'dot', style: 'background:' + s.color }),
      s.label, ' ', h('b', {}, String(s.value)),
      h('span', { class: 'pct' }, Math.round((s.value / d.donutTotal) * 100) + '%'))));

    const c = d.counts;
    const cov = h('div', { class: 'coverage' });
    cov.append('Scope: ', h('b', {}, String(c.scopeTotal)), ' ' + d.moduleLabel + ' cases (P0 + P1) · ',
      h('b', {}, String(c.suiteTotal)), ' automated this run · ',
      ...(c.perfLighthouse ? [h('b', {}, String(c.perfLighthouse)), ' perf cases via Lighthouse · '] : []),
      'executed pass rate ', h('b', {}, c.execPassRate + '%'), ` (${c.passed}/${c.executed}).`);

    const info = h('div', { class: 'hero-info' }, h('div', { class: 'verdict' }, d.verdict), legend, cov);
    const card = h('div', { class: 'card card-pad' }, h('div', { class: 'hero' }, svg, info));
    // animate arcs in
    requestAnimationFrame(() => setTimeout(() => {
      card.querySelectorAll('circle.seg').forEach((el) =>
        el.setAttribute('stroke-dasharray', el.dataset.len + ' ' + el.dataset.gap)); }, 60));
    return card;
  }

  function filterBar(d) {
    const search = h('div', { class: 'search' },
      h('span', { html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>' }),
      h('input', { type: 'text', placeholder: 'Search TC id or name…', value: filter.q,
        oninput: (e) => { filter.q = e.target.value.trim().toLowerCase(); renderResults(); } }));

    const statusChips = h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' });
    ['pass', 'fail', 'gap', 'manual'].forEach((k) => {
      const n = d.counts[k === 'pass' ? 'passed' : k === 'fail' ? 'failed' : k === 'gap' ? 'knownGap' : 'manual'];
      const chip = h('button', { class: 'fchip ' + k, type: 'button', 'aria-pressed': String(filter.status.has(k)),
        onclick: () => { filter.status.has(k) ? filter.status.delete(k) : filter.status.add(k); chip.setAttribute('aria-pressed', String(filter.status.has(k))); renderResults(); } },
        h('span', { class: 'c', style: 'background:' + COLOR[k] }), STATUS[k], ' ', h('b', {}, String(n)));
      statusChips.append(chip);
    });

    const priChips = h('div', { style: 'display:flex;gap:6px' });
    ['P0', 'P1'].forEach((p) => {
      const chip = h('button', { class: 'fchip ' + p.toLowerCase(), type: 'button', 'aria-pressed': String(filter.priority.has(p)),
        onclick: () => { filter.priority.has(p) ? filter.priority.delete(p) : filter.priority.add(p); chip.setAttribute('aria-pressed', String(filter.priority.has(p))); renderResults(); } }, p);
      priChips.append(chip);
    });

    const secSel = h('select', { class: 'sel', onchange: (e) => { filter.section = e.target.value; renderResults(); } },
      h('option', { value: 'all' }, 'All sections'),
      ...d.sections.map((g) => h('option', { value: g.name, selected: filter.section === g.name }, g.name + ' (' + g.total + ')')));

    const sortSel = h('select', { class: 'sel', onchange: (e) => { filter.sort = e.target.value; renderResults(); } },
      h('option', { value: 'tc' }, 'Sort: TC id'),
      h('option', { value: 'dur' }, 'Sort: slowest'),
      h('option', { value: 'status' }, 'Sort: status'));

    return h('div', { class: 'filters' }, search,
      h('div', { class: 'fdiv' }), statusChips,
      h('div', { class: 'fdiv' }), priChips,
      secSel, sortSel,
      h('span', { class: 'fcount', id: 'fcount' }));
  }

  function passesFilter(s) {
    if (!filter.status.has(s.klass)) return false;
    if (!filter.priority.has(s.priority)) return false;
    if (filter.section !== 'all' && s.section !== filter.section) return false;
    if (filter.q) {
      const hay = (s.tc + ' ' + s.id + ' ' + s.name).toLowerCase();
      if (!hay.includes(filter.q)) return false;
    }
    return true;
  }

  function sortSpecs(arr) {
    const order = { fail: 0, gap: 1, pass: 2, manual: 3 };
    const a = arr.slice();
    if (filter.sort === 'dur') a.sort((x, y) => y.duration - x.duration);
    else if (filter.sort === 'status') a.sort((x, y) => (order[x.klass] - order[y.klass]) || x.tc.localeCompare(y.tc, undefined, { numeric: true }));
    else a.sort((x, y) => x.tc.localeCompare(y.tc, undefined, { numeric: true }));
    return a;
  }

  function renderResults() {
    const d = report.data;
    const host = $('results'); if (!host) return;
    host.textContent = '';
    let shown = 0, total = 0;
    d.sections.forEach((g) => {
      total += g.total;
      const matched = sortSpecs(g.specs.filter(passesFilter));
      if (!matched.length) return;
      shown += matched.length;
      host.append(sectionGroup(g, matched));
    });
    const fc = $('fcount');
    if (fc) { fc.textContent = ''; fc.append(h('b', {}, String(shown)), ' of ' + total + ' cases'); }
    if (!shown) host.append(emptyState('🔍', 'No cases match', 'Try clearing the search or enabling more status / priority filters.'));
  }

  function sectionGroup(g, specs) {
    const pct = g.total ? Math.round((g.passed / g.total) * 100) : 0;
    const body = h('div', { class: 'sec-body' }, ...specs.map(caseRow));
    const group = h('div', { class: 'sec-group' },
      h('div', { class: 'sec-head',
        onclick: () => group.classList.toggle('collapsed') },
        h('span', { class: 'caret', html: '▼' }),
        h('span', { class: 'nm' }, g.name),
        h('span', { class: 'bar' }, h('i', { style: 'width:' + pct + '%' })),
        h('span', { class: 'cnt' }, g.passed + '/' + g.total + ' passed')),
      body);
    return group;
  }

  function caseRow(s) {
    const klass = s.klass;
    const label = klass === 'pass' ? (s.flaky ? '✓ Passed · flaky' : '✓ Passed')
      : klass === 'fail' ? '✕ Failed' : klass === 'gap' ? '◷ Known gap' : '– Manual';
    const expandable = !!(s.error || s.screenshot);
    const row = h('div', { class: 'row' + (expandable ? ' clk' : '') },
      h('span', { class: 'tc' }, s.tc),
      h('span', { class: 'pri ' + s.priority.toLowerCase() }, s.priority),
      h('span', { class: 'nm' }, s.name, s.id ? h('span', { class: 'id' }, s.id) : null),
      h('span', { class: 'badge ' + klass }, label),
      h('span', { class: 'dur' }, fmtMs(s.duration)),
      expandable ? h('span', { class: 'ex', html: '▶' }) : h('span', { class: 'dur' }, ''));

    if (!expandable) return row;
    const detail = h('div', { class: 'detail' });
    if (s.error) detail.append(h('div', { class: 'dl' }, 'Error log'), h('pre', {}, s.error));
    if (s.screenshot) detail.append(h('div', { class: 'dl' }, 'Screenshot at failure'), h('img', { src: s.screenshot, alt: 'failure screenshot' }));
    else if (s.error) detail.append(h('div', { class: 'nodata' }, '(no screenshot captured)'));
    row.addEventListener('click', () => { row.classList.toggle('open'); detail.classList.toggle('show'); });
    const wrap = document.createDocumentFragment(); wrap.append(row, detail);
    return wrap;
  }

  function reportFoot(d) {
    const meta = h('div', { class: 'meta' });
    meta.append(
      h('div', {}, 'Generated ', h('b', {}, d.meta.generatedAt)),
      h('div', {}, 'Browser ', h('b', {}, d.meta.browser), ' · ', d.moduleLabel, ' suite · Env ', h('b', {}, d.meta.env)),
    );
    const dl = h('a', { class: 'btn btn-ghost', href: '/report', target: '_blank' }, '⬇ Download PDF report');
    return h('div', { class: 'report-foot' }, meta, dl);
  }

  // Populate the report + pill on first load so the latest run is visible.
  loadReport();
})();
