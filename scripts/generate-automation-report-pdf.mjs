// Renders AUTOMATION_REPORT.md into a branded, stakeholder-facing PDF.
// Usage:  npm run report:automation
//
// The markdown file is the single source of truth — edit it and re-run. This
// script only handles the markdown subset used in that document (headings,
// tables, bold/italic/code, code fences, blockquotes, lists, links, rules).
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const mdPath = path.join(root, 'AUTOMATION_REPORT.md');
const htmlPath = path.join(root, 'report', 'automation-report.html');
const pdfPath = path.join(root, 'report', 'automation-report.pdf');

if (!fs.existsSync(mdPath)) {
  console.error(`Not found: ${mdPath}`);
  process.exit(1);
}
fs.mkdirSync(path.dirname(htmlPath), { recursive: true });

const LOGO = 'https://cdn.pixelbin.io/v2/yellow-queen-0c3fa9/gly4zC/wrkr/sngz5/company/27/applications/64e83eb1653e8ab101c11f2e/application/pictures/free-logo/original/gM_1D1xVi-Reliance-Jewels.webp';

// ---- Minimal, escaping-safe inline + block markdown renderer ----
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inline(s) {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return out;
}
const isTableSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const cells = (l) => l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());

function render(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // fenced code block
    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      html.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    // table
    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const body = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) body.push(cells(lines[i++]));
      i--;
      const th = head.map((c) => `<th>${inline(c)}</th>`).join('');
      const trs = body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('');
      html.push(`<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`);
      continue;
    }
    // headings
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { const n = h[1].length; html.push(`<h${n}>${inline(h[2])}</h${n}>`); continue; }
    // horizontal rule
    if (/^---+\s*$/.test(line)) { html.push('<hr/>'); continue; }
    // blockquote
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      i--;
      html.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
      continue;
    }
    // lists (ordered / unordered)
    if (/^\s*(-|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const buf = [];
      while (i < lines.length && /^\s*(-|\d+\.)\s+/.test(lines[i])) {
        buf.push(lines[i++].replace(/^\s*(-|\d+\.)\s+/, ''));
      }
      i--;
      const items = buf.map((t) => `<li>${inline(t)}</li>`).join('');
      html.push(ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`);
      continue;
    }
    // blank line
    if (!line.trim()) continue;
    // paragraph (gather contiguous text lines)
    const buf = [line];
    while (i + 1 < lines.length && lines[i + 1].trim() && !/^(#{1,6}\s|>|\s*(-|\d+\.)\s|```|---+\s*$)/.test(lines[i + 1])
           && !(lines[i + 1].includes('|') && i + 2 < lines.length && isTableSep(lines[i + 2]))) {
      buf.push(lines[++i]);
    }
    html.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return html.join('\n');
}

const body = render(fs.readFileSync(mdPath, 'utf8'));

const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Reliance Jewels — Storefront Automation Report</title>
<style>
  :root{--ink:#26201a;--muted:#7d7676;--gold:#8a6d1a;--gold-d:#4e3f09;--line:#dcd9d4;
    --pass:#1c958f;--fail:#c0392b;--known:#d97706;}
  *{box-sizing:border-box}
  body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);margin:0;padding:26px 34px;font-size:12px;line-height:1.5}
  .brandbar{display:flex;align-items:center;gap:12px;border-bottom:3px solid var(--gold);padding-bottom:12px;margin-bottom:6px}
  .brandbar img{height:34px}
  .eyebrow{letter-spacing:2px;text-transform:uppercase;font-size:9px;color:var(--gold-d);font-weight:700}
  h1{font-size:22px;margin:14px 0 4px;border:0}
  h2{font-size:15px;margin:22px 0 6px;border-bottom:2px solid var(--gold);padding-bottom:5px;break-after:avoid}
  h3{font-size:12.5px;margin:14px 0 4px;color:var(--gold-d);text-transform:uppercase;letter-spacing:.5px;break-after:avoid}
  p{margin:7px 0}
  a{color:var(--gold-d);font-weight:600}
  code{background:#f3f1ea;border:1px solid var(--line);border-radius:4px;padding:.5px 5px;font-family:Menlo,Consolas,monospace;font-size:11px}
  pre{background:#2b2b2b;border-radius:8px;padding:12px 14px;overflow:auto;break-inside:avoid}
  pre code{background:none;border:0;color:#f3f3f3;padding:0;font-size:11px;line-height:1.5}
  blockquote{margin:10px 0;padding:8px 14px;background:#fcfbf8;border-left:4px solid var(--gold);color:#5a534c;border-radius:0 6px 6px 0}
  ul,ol{margin:7px 0;padding-left:22px}
  li{margin:3px 0}
  hr{border:0;border-top:1px dashed var(--line);margin:18px 0}
  table{width:100%;border-collapse:collapse;font-size:11px;margin:8px 0;break-inside:auto}
  th{background:var(--gold-d);color:#fff;text-align:left;padding:6px 9px;font-size:9.5px;text-transform:uppercase;letter-spacing:.4px}
  td{padding:5px 9px;border-bottom:1px solid #efede8;vertical-align:top}
  tbody tr:nth-child(even){background:#faf9f6}
  tr{break-inside:avoid}
</style></head><body>
  <div class="brandbar">
    <img src="${LOGO}" alt="Reliance Jewels"/>
    <div class="eyebrow">Reliance Jewels · QA Automation</div>
  </div>
  ${body}
</body></html>`;

fs.writeFileSync(htmlPath, html);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
await page.pdf({
  path: pdfPath, format: 'A4', printBackground: true,
  margin: { top: '12mm', bottom: '14mm', left: '12mm', right: '12mm' },
});
await browser.close();
console.log('Automation report PDF written to', pdfPath);
