// Runs ONLY the critical (P0) cases of every journey module, in one Playwright
// invocation, writing report/results.json (via the config's json reporter).
//
// It builds a single --grep from sanity-flow-report.config.mjs:
//   • title module → matches "| P0 |"
//   • range module → matches its P0 TC_NN list, scoped by the module code
//                     (e.g. (TC_01|…|TC_18)…PLP-) so it can't catch TC_05 in
//                     another module during the combined run
//   • all module   → its `grep` (matches every case, e.g. HPF-)
//
// Pass --list to preview selection without running.
//
//   npm run test:sanity-flow      (then: npm run report:sanity-flow)
import { spawnSync } from 'node:child_process';
import cfg from './sanity-flow-report.config.mjs';

const pad2 = (n) => String(n).padStart(2, '0');
const rangeNums = (ranges) => {
  const out = [];
  for (const [lo, hi] of ranges) for (let n = lo; n <= hi; n++) out.push(`TC_${pad2(n)}`);
  return out;
};

const files = [];
const greps = [];
for (const { modules } of cfg.stages) {
  for (const m of modules) {
    files.push(m.file.replace(/\.spec\.js$/, ''));
    if (m.p0 === 'title') greps.push('\\| P0 \\|');
    else if (m.p0 === 'range') greps.push(`(${rangeNums(m.ranges).join('|')})\\b.*${m.code}`);
    else if (m.p0 === 'all') greps.push(m.grep || m.file.replace(/\.spec\.js$/, ''));
  }
}
const grep = greps.map((g) => `(${g})`).join('|');

const passthrough = process.argv.slice(2); // e.g. --list
const args = ['playwright', 'test', ...files, '--grep', grep, ...passthrough];
console.log(`Sanity Flow — P0-only run across ${files.length} modules.`);
console.log(`grep: ${grep}\n`);

const res = spawnSync('npx', args, { stdio: 'inherit' });
process.exit(res.status ?? 1);
