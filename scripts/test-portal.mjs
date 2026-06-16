// Interactive test portal: pick a page by number, name, or keyword and run it.
// Usage:  npm run portal
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawnSync } from 'node:child_process';

const suites = [
  { key: 'plp', label: 'PLP — Product Listing Page', spec: 'plp',
    aliases: ['plp', 'product', 'products', 'listing', '/products'] },
  { key: 'clp', label: 'CLP — Collection Listing Page', spec: 'clp',
    aliases: ['clp', 'collection', 'collections', '/collection'] },
  { key: 'search', label: 'Search', spec: 'search',
    aliases: ['search', 'src', 'find', 'query', '/search'] },
  { key: 'all', label: 'All suites (PLP + CLP + Search)', spec: 'plp clp search',
    aliases: ['all', 'everything', 'full', 'a'] },
];

/** Resolve a user input (number, key, alias, or keyword) to a suite. */
function matchSuite(raw) {
  const t = (raw || '').trim().toLowerCase();
  if (!t) return null;
  const n = Number(t);
  if (Number.isInteger(n) && n >= 1 && n <= suites.length) return suites[n - 1];
  for (const s of suites) if (s.key === t || s.aliases.includes(t)) return s;          // exact
  for (const s of suites) {                                                            // fuzzy
    if (s.label.toLowerCase().includes(t) || s.aliases.some((a) => a.includes(t) || t.includes(a))) return s;
  }
  return null;
}

function run(command) {
  console.log(`\n▶  ${command}\n`);
  return spawnSync(command, { stdio: 'inherit', shell: true }).status ?? 1;
}

const rl = readline.createInterface({ input, output });
const ask = async (q) => (await rl.question(q)).trim();
const yes = (v) => /^y(es)?$/i.test(v.trim());

console.log('\n=== Reliance Jewels — Test Portal ===\n');
console.log('Which page do you want to test?\n');
suites.forEach((s, i) => console.log(`  ${i + 1}. ${s.label}   (type: ${s.key})`));
console.log('\nEnter a number, a name (plp/clp/search/all), or a keyword (e.g. "collection").\n');

let suite = null;
while (!suite) {
  const answer = await ask('Page > ');
  suite = matchSuite(answer);
  if (!suite) console.log(`  ✗ Couldn't match "${answer}". Try a number 1-${suites.length}, or plp/clp/search/all.\n`);
}

const headed = yes(await ask(`\nRun "${suite.label}" with the browser visible? (y/N) `));
const withReport = yes(await ask('Generate the PDF report afterwards? (y/N) '));
rl.close();

let code = run(`npx playwright test ${suite.spec}${headed ? ' --headed' : ''}`);

if (withReport) {
  run('node scripts/generate-report-pdf.mjs');
  console.log('\n📄 Report: report/test-report.pdf');
}

console.log(code === 0 ? '\n✅ Run finished (all selected tests passed).'
  : '\n⚠️  Run finished with some non-passing tests (see output / report).');
process.exit(0);
