// Shared report data layer.
//
// Single source of truth for turning Playwright's report/results.json into the
// structured shape both consumers need:
//   - scripts/generate-report-pdf.mjs   (branded PDF)
//   - scripts/portal-server.mjs         (interactive in-browser report)
//
// Per-page metadata (sections, P0 ids, Lighthouse count, labels) still lives in
// report-config/<page>.js — this module just loads the right one and applies it.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const stripAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, '');
export const escapeHtml = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const isFlagged = (t) => /\[(KNOWN DEFECT|FINDING)\]/i.test(t);

// Read an on-disk screenshot as an inline data URI (used by both PDF + web).
export const imgDataUri = (p) => {
  try { return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`; }
  catch { return null; }
};

// Status colours — kept here so PDF + web share one palette.
export const KLASS_COLOR = { pass: '#1c958f', fail: '#c0392b', gap: '#d97706', manual: '#9a9a9a' };

// Flatten the Playwright suite tree into a flat list of normalised specs.
function flattenSpecs(data) {
  const specs = [];
  const walk = (suite, file) => {
    const f = suite.file || file;
    for (const spec of suite.specs || []) {
      const results = spec.tests?.[0]?.results || [];
      const last = results[results.length - 1] || {};
      const [tc, ...rest] = spec.title.split(' | ');
      const rawName = rest.join(' | ') || spec.title;
      const id = (rawName.match(/^([A-Z]{2,}-\d+)/) || [])[1] || '';
      const stripped = rawName
        .replace(/^[A-Z]+-\d+\s*/i, '')
        .replace(/\s*\[(KNOWN DEFECT|FINDING)\]/i, '')
        .trim();
      const status = last.status || 'unknown';
      let klass; // pass | fail | gap | manual
      if (status === 'skipped') klass = 'manual';
      else if (spec.ok && status === 'passed') klass = 'pass';
      else if (isFlagged(spec.title)) klass = 'gap';
      else klass = 'fail';
      const shot = (last.attachments || []).find(
        (a) => a.name === 'screenshot' && a.path && fs.existsSync(a.path),
      );
      specs.push({
        tc: tc.trim(),
        id,
        file: f,
        name: stripped.charAt(0).toUpperCase() + stripped.slice(1),
        klass,
        flaky: klass === 'pass' && results.length > 1,
        duration: results.reduce((a, r) => a + (r.duration || 0), 0),
        error: stripAnsi(last.errors?.[0]?.message || last.error?.message || '').trim(),
        screenshot: shot ? shot.path : null,
      });
    }
    for (const child of suite.suites || []) walk(child, f);
  };
  (data.suites || []).forEach((s) => walk(s, s.file));
  specs.sort((a, b) => a.tc.localeCompare(b.tc, undefined, { numeric: true }));
  return specs;
}

// Pick the page config: explicit pageKey, else the most common test-id prefix
// (PLP-001 -> "plp"). Returns { pageKey, cfg, cfgFound }.
async function resolveConfig(root, specs, pageKeyArg) {
  const prefixCounts = {};
  for (const s of specs) {
    const m = (s.id || '').match(/^([A-Za-z]+)-/);
    if (m) { const k = m[1].toLowerCase(); prefixCounts[k] = (prefixCounts[k] || 0) + 1; }
  }
  const detected = Object.entries(prefixCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const pageKey = (pageKeyArg || detected || 'report').toLowerCase();

  const configPath = path.join(root, 'report-config', `${pageKey}.js`);
  if (fs.existsSync(configPath)) {
    const cfg = (await import(pathToFileURL(configPath).href)).default || {};
    return { pageKey, cfg, cfgFound: true };
  }
  return { pageKey, cfg: {}, cfgFound: false };
}

/**
 * Build the full, normalised report model from a results.json file.
 *
 * @returns null if no results file exists, else an object with:
 *   pageKey, moduleLabel, cfgFound,
 *   specs           — every case (pass | fail | gap | manual), sorted by TC,
 *                     each tagged with { section, priority } and (for failures)
 *                     a `screenshotUri` data URI when withScreenshots is set.
 *   reportSpecs     — pass + fail only (what the PDF results table lists).
 *   sectionOrder    — section names in display order, with 'Other' appended.
 *   sections        — [{ name, specs, passed, total }] grouped for the web UI.
 *   counts          — { passed, failed, knownGap, manual, flaky, executed,
 *                       execPassRate, suiteTotal, scopeTotal, perfLighthouse }
 *   donut           — [{ label, value, color }] non-zero segments.
 *   donutTotal      — sum of donut values (>=1).
 *   verdict         — one-line human summary.
 *   meta            — { generatedAt, browser, durationS, env, startTime }
 */
export async function buildReport({ root, resultsPath, pageKey: pageKeyArg, withScreenshots = false } = {}) {
  root = root || process.cwd();
  resultsPath = resultsPath || path.join(root, 'report', 'results.json');
  if (!fs.existsSync(resultsPath)) return null;

  const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const specs = flattenSpecs(data);
  const { pageKey, cfg, cfgFound } = await resolveConfig(root, specs, pageKeyArg);

  const perfLighthouse = cfg.perfLighthouse || 0;
  const p0Ids = new Set(cfg.p0Ids || []);
  const sectionDefs = (cfg.sections || []).map(([name, ids]) => [name, new Set(ids)]);
  const sectionOf = (id) => (sectionDefs.find(([, set]) => set.has(id)) || ['Other'])[0];
  const priorityOf = (id) => (p0Ids.has(id) ? 'P0' : 'P1');
  for (const s of specs) {
    s.section = sectionOf(s.id);
    s.priority = priorityOf(s.id);
    if (withScreenshots && s.screenshot) s.screenshotUri = imgDataUri(s.screenshot);
  }

  const count = (k) => specs.filter((s) => s.klass === k).length;
  const passed = count('pass'), failed = count('fail'), knownGap = count('gap'), manual = count('manual');
  const flaky = specs.filter((s) => s.flaky).length;
  const suiteTotal = specs.length;
  const scopeTotal = suiteTotal + perfLighthouse;
  const executed = passed + failed + knownGap;
  const execPassRate = executed ? Math.round((passed / executed) * 100) : 0;

  const reportSpecs = specs.filter((s) => s.klass === 'pass' || s.klass === 'fail');
  const moduleLabel = String(cfg.moduleLabel || pageKey).toUpperCase();

  const donut = [
    { label: 'Passed', value: passed, color: KLASS_COLOR.pass },
    { label: 'Failed', value: failed, color: KLASS_COLOR.fail },
    { label: 'Known gaps', value: knownGap, color: KLASS_COLOR.gap },
    { label: 'Manual', value: manual, color: KLASS_COLOR.manual },
  ].filter((s) => s.value > 0);
  const donutTotal = donut.reduce((a, s) => a + s.value, 0) || 1;

  const verdict = failed
    ? `${failed} unexpected failure${failed > 1 ? 's' : ''} need attention · ${passed}/${executed} automated checks pass.`
    : `All ${passed} automated functional checks pass${knownGap ? ` · ${knownGap} known product gap${knownGap > 1 ? 's' : ''} open (tracked separately)` : ''}.`;

  // Section grouping for the web UI (pass + fail tracked per section).
  const sectionOrder = sectionDefs.map(([n]) => n).concat('Other');
  const sections = sectionOrder
    .map((name) => {
      const inSec = specs.filter((s) => s.section === name);
      return {
        name,
        specs: inSec,
        passed: inSec.filter((s) => s.klass === 'pass').length,
        total: inSec.length,
      };
    })
    .filter((g) => g.total);

  const meta = {
    generatedAt: new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }) + ' IST',
    browser: String(data.config?.projects?.[0]?.name || 'chromium'),
    durationS: (specs.reduce((a, s) => a + s.duration, 0) / 1000).toFixed(1),
    env: 'UAT',
    startTime: data.stats?.startTime || null,
  };

  return {
    raw: data, pageKey, moduleLabel, cfgFound,
    specs, reportSpecs, sectionOrder, sections,
    counts: { passed, failed, knownGap, manual, flaky, executed, execPassRate, suiteTotal, scopeTotal, perfLighthouse },
    donut, donutTotal, verdict, meta,
  };
}
