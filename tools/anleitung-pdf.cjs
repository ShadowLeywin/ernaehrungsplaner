// Macht aus einer Lego-Anleitung (Markdown) eine PDF-Datei daneben: node tools/anleitung-pdf.cjs docs/lernen/ANLEITUNG-P1.md
// Nutzt den Browser aus den Tests (Playwright). Kein Markdown-Paket: der kleine Umwandler unten kennt genau das,
// was die Anleitungen benutzen (Überschriften, Absätze, Listen, Tabellen, Code, fett, `code`, <details>).
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const SCHRIFT = path.resolve(__dirname, '..', 'schrift');

const schuetze = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inline(text) {
  return schuetze(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function umwandeln(md) {
  const zeilen = md.split('\n');
  const html = [];
  let i = 0;
  while (i < zeilen.length) {
    const z = zeilen[i];
    if (z.startsWith('```')) {
      const code = [];
      for (i += 1; i < zeilen.length && !zeilen[i].startsWith('```'); i += 1) code.push(zeilen[i]);
      html.push(`<pre><code>${schuetze(code.join('\n'))}</code></pre>`);
      i += 1;
    } else if (/^#{1,4} /.test(z)) {
      const stufe = z.match(/^#+/)[0].length;
      html.push(`<h${stufe}>${inline(z.slice(stufe + 1))}</h${stufe}>`);
      i += 1;
    } else if (z.startsWith('|')) {
      const tabelle = [];
      for (; i < zeilen.length && zeilen[i].startsWith('|'); i += 1) tabelle.push(zeilen[i]);
      const zellen = (r) => r.replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => inline(c.trim().replace(/\\\|/g, '|')));
      const [kopf, , ...rumpf] = tabelle;
      html.push(`<table><thead><tr>${zellen(kopf).map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rumpf.map((r) => `<tr>${zellen(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    } else if (/^(\d+\.|-) /.test(z)) {
      const geordnet = /^\d+\./.test(z);
      const punkte = [];
      for (; i < zeilen.length && /^(\d+\.|-) /.test(zeilen[i]); i += 1) punkte.push(zeilen[i].replace(/^(\d+\.|-) /, ''));
      html.push(`<${geordnet ? 'ol' : 'ul'}>${punkte.map((p) => `<li>${inline(p)}</li>`).join('')}</${geordnet ? 'ol' : 'ul'}>`);
    } else if (/^<\/?details|^<summary/.test(z.trim())) {
      // Lösungen im PDF offen zeigen: auf Papier kann man nichts aufklappen
      const s = z.trim().match(/<summary>(.*)<\/summary>/);
      if (s) html.push(`<h3>${schuetze(s[1])}</h3>`);
      i += 1;
    } else if (z.trim() === '') {
      i += 1;
    } else {
      const absatz = [];
      for (; i < zeilen.length && zeilen[i].trim() && !/^(#|\||```|\d+\. |- |<)/.test(zeilen[i]); i += 1) absatz.push(zeilen[i]);
      if (!absatz.length) { absatz.push(zeilen[i]); i += 1; }
      html.push(`<p>${inline(absatz.join(' '))}</p>`);
    }
  }
  return html.join('\n');
}

const STIL = `
@font-face { font-family: Inter; src: url('file://${SCHRIFT}/inter.woff2') format('woff2'); font-weight: 100 900; }
body { font: 10.5pt/1.5 Inter, system-ui, sans-serif; color: #14241a; margin: 0; }
h1 { font-size: 20pt; margin: 0 0 8pt; color: #1f6b3a; }
h2 { font-size: 14pt; margin: 18pt 0 6pt; border-bottom: 1.5pt solid #b8e04a; padding-bottom: 2pt; break-after: avoid; }
h3 { font-size: 11.5pt; margin: 12pt 0 4pt; }
code { font-family: 'DejaVu Sans Mono', monospace; font-size: 9pt; background: #eef3e6; padding: 0 2pt; border-radius: 2pt; }
pre { background: #eef3e6; padding: 8pt; border-radius: 4pt; white-space: pre-wrap; break-inside: avoid; }
pre code { background: none; padding: 0; }
table { border-collapse: collapse; width: 100%; margin: 6pt 0; font-size: 9.5pt; break-inside: auto; }
th, td { border: 0.75pt solid #c9d6bd; padding: 3pt 5pt; text-align: left; vertical-align: top; }
th { background: #eef3e6; }
a { color: #1f6b3a; }
`;

(async () => {
  const quelle = process.argv[2];
  if (!quelle) { console.error('Aufruf: node tools/anleitung-pdf.cjs <anleitung.md>'); process.exit(2); }
  const md = fs.readFileSync(quelle, 'utf8');
  const ziel = quelle.replace(/\.md$/, '.pdf');
  const browser = await chromium.launch();
  const seite = await browser.newPage();
  await seite.setContent(`<!doctype html><html lang="de"><meta charset="utf-8"><style>${STIL}</style><body>${umwandeln(md)}</body></html>`, { waitUntil: 'load' });
  await seite.pdf({ path: ziel, format: 'A4', margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' }, printBackground: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:8pt;width:100%;text-align:center;color:#667">Seite <span class="pageNumber"></span> von <span class="totalPages"></span></div>' });
  await browser.close();
  console.log(`geschrieben: ${ziel}`);
})();
