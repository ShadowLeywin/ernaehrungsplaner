// Kleiner lokaler Webserver zum Entwickeln und Testen: node tools/server.cjs [port]
// Liefert die Dateien des Repos aus. Service Worker und IndexedDB brauchen http://localhost, file:// reicht nicht.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.resolve(__dirname, '..');
const TYPEN = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

function starte(port = 8080) {
  const server = http.createServer((anfrage, antwort) => {
    let pfad = decodeURIComponent(new URL(anfrage.url, 'http://x').pathname);
    if (pfad.endsWith('/')) pfad += 'index.html';
    const datei = path.join(WURZEL, pfad);
    if (!datei.startsWith(WURZEL + path.sep)) { antwort.writeHead(403).end(); return; }
    fs.readFile(datei, (fehler, inhalt) => {
      if (fehler) { antwort.writeHead(404, { 'Content-Type': 'text/plain' }).end('Nicht gefunden'); return; }
      antwort.writeHead(200, { 'Content-Type': TYPEN[path.extname(datei)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(inhalt);
    });
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)));
}

module.exports = { starte };

if (require.main === module) {
  const port = Number(process.argv[2]) || 8080;
  starte(port).then(() => console.log(`Elan läuft auf http://127.0.0.1:${port}/  (Strg+C beendet)`));
}
