# Glossar

Wächst über alle Sessions. Ergänzen statt neu schreiben.

| Begriff | In einem Satz | Fundstelle im Projekt |
|---|---|---|
| PWA (Progressive Web App) | Eine Webseite, die sich wie eine App installieren lässt und ohne Netz läuft. | `manifest.webmanifest`, `sw.js` |
| Manifest | Eine JSON-Datei, die dem Browser Name, Icons und Startadresse der App nennt. | `manifest.webmanifest` |
| Service Worker | Ein Skript, das zwischen App und Netz sitzt und Dateien aus einem Cache liefern kann. | `sw.js` |
| App-Hülle (App Shell) | Die festen Dateien der App (HTML, CSS, JS), die vorab im Cache liegen. | `DATEIEN` in `sw.js` |
| Cache zuerst | Der Service Worker antwortet aus dem Cache und geht nur ins Netz, wenn dort nichts liegt. | `fetch`-Teil in `sw.js` |
| IndexedDB | Die Datenbank im Browser, in der die App alle Nutzerdaten ablegt. | `js/db.js` |
| Object Store | Ein „Tisch“ in der IndexedDB für eine Art von Datensätzen. | `STORES` in `js/logik/schema.js` |
| Transaktion | Mehrere Schreibvorgänge, die ganz oder gar nicht gelten. | `tx()` und `allesErsetzen()` in `js/db.js` |
| Schema-Version | Eine Zahl, die sagt, welchen Aufbau die Datenbank hat. | `SCHEMA_VERSION` in `js/logik/schema.js` |
| Migration | Ein Schritt, der eine Datenbank von einer Schema-Version auf die nächste hebt. | `MIGRATIONEN` in `js/db.js` |
| Reine Funktion | Eine Funktion, die nur aus ihren Eingaben rechnet und nichts außerhalb verändert. | alle Dateien in `js/logik/` |
| ES-Modul | Eine JavaScript-Datei, die mit `import` und `export` mit anderen verbunden ist. | `js/main.js` |
| Hash-Router | Die Seite wird über den Teil der Adresse hinter `#` gewählt, ohne den Server zu fragen. | `js/router.js` |
| Momentaufnahme (Snapshot) | Eine Kopie von Werten zum Zeitpunkt des Speicherns. | Feld `je100` in `speichereEintrag()` in `js/speicher.js` |
| Unit-Test | Ein kleiner Test für eine einzelne Funktion. | `test/*.test.js` |
| End-to-End-Test | Ein Test, der die App wie ein Mensch bedient. | `tools/pruefe-app.cjs` |
| Headless-Browser | Ein Browser ohne Fenster, den ein Skript steuert. | `chromium.launch()` in `tools/pruefe-app.cjs` |
| Mock | Eine nachgebildete Antwort anstelle eines echten Dienstes. | `seite.route(...)` in `tools/pruefe-app.cjs`, `test/daten/off-suche.json` |
| Regressionstest | Ein Test, der sicherstellt, dass ein behobener Fehler nicht wiederkommt. | Kriterium „Kein null …“ in `tools/pruefe-app.cjs` |
| Maskierbares Icon | Ein Icon mit Rand, das das System rund oder eckig zuschneiden darf. | `icons/icon-maskable-512.png` |
| GitHub Pages | Ein Dienst, der die Dateien eines Repos als Webseite ausliefert. | `README.md`, `.nojekyll` |
| Pull Request | Ein Vorschlag, die Änderungen eines Branches in einen anderen zu übernehmen. | Lernlog, Runde 3 |
