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
| Fixture | Eine feste Beispieldatei, mit der ein Test immer dieselben Daten bekommt. | `test/daten/backup-v1.json` |
| Adapter | Eine kleine Funktion, die ein Ding so verpackt, dass anderer Code es wie etwas Bekanntes behandeln kann. | `rezeptAlsZutat()` in `js/logik/rezepte.js` |
| `onupgradeneeded` | Das Ereignis, in dem die IndexedDB ihren Aufbau ändern darf; nur dort laufen Migrationen. | `oeffne()` in `js/db.js` |
| Entität | Eine Art von Ding, das die App speichert, mit eigenem Speicher und Schlüssel. | Tabelle in `docs/DATENMODELL.md` |
| Abgeleitete Daten | Werte, die sich jederzeit aus anderen berechnen lassen und deshalb nicht gespeichert werden. | `einkaufsliste()` in `js/logik/plan.js` |
| Wettlauf (Race Condition) | Zwei Abläufe kommen sich in die Quere, weil ihre Reihenfolge nicht festliegt. | Kommentar bei `hake` in `js/ansichten/einkauf.js` |
| Web Share API | Die Schnittstelle, mit der eine Webseite das „Teilen“-Menü des Handys öffnet. | `teilen` in `js/ansichten/einkauf.js` |
| Bereichsabfrage | Alle Sätze holen, deren Indexwert zwischen zwei Grenzen liegt. | `imBereich()` in `js/db.js` |
| Stabile Sortierung | Beim Umsortieren behalten gleichrangige Einträge ihre bisherige Reihenfolge. | `sortiereNachVorliebe()` in `js/logik/vorlieben.js` |
| Charge | Eine auf einmal gekochte Menge eines Rezepts. | Annahme [A] in `docs/DATENMODELL.md` |
| Gleitender Durchschnitt | Der Mittelwert der letzten Tage, der mit jedem neuen Tag ein Stück weiterwandert. | `gleitenderSchnitt()` in `js/logik/gesundheit.js` |
| Entwurf | Getippte, noch nicht gespeicherte Eingaben, die ein Neuzeichnen überleben sollen. | `entwurf` in `js/ansichten/health.js` |
| Sparkline | Eine kleine Verlaufslinie ohne Achsen, die nur die Richtung zeigt. | `verlaufslinie()` in `js/ansichten/health.js` |
| Referenzbereich | Die Spanne, in der ein Laborwert laut Labor üblicherweise liegt. | `laborStatus()` in `js/logik/befunde.js` |
| Korrelation | Zwei Dinge treten zusammen auf; das beweist nicht, dass eines das andere verursacht. | Hinweistext in `zeigeSymptome()` in `js/ansichten/befunde.js` |
| `<datalist>` | Eine Liste von Vorschlägen, die der Browser unter einem Eingabefeld anbietet. | `oeffneLaborFormular()` in `js/ansichten/befunde.js` |
