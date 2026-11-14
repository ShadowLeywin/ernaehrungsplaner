# Lernlog

Ein Eintrag pro Runde, höchstens 8 Zeilen. Keine persönlichen Gesundheitsdaten.

## Session 0, Runde 1: Bestand (13.11.2026)

- **Was und warum:** Repo inventarisiert und die App selbst gestartet, bevor irgendetwas gelöscht wird. Grund: Der Auftrag nannte den Stand „frühe PWA“, tatsächlich liegen rund 14.900 Zeilen Code, 171 Tests und eine laufende Angebots-Pipeline im Repo.
- **Befehle:** `git ls-files | wc -l` (zählt versionierte Dateien) · `npm test` (startet `node --test`, 171 von 171 grün) · `python3 -m http.server 8080 --bind 127.0.0.1` (liefert die App lokal aus) · `node pruef.cjs` (Playwright öffnet die App im Handy-Emulator, liest Konsole, Manifest, Service Worker, schaltet das Netz ab).
- **Entscheidung:** Erst messen, dann leeren. Verworfen: sofort alles löschen, weil dabei auch die Angebots-Action und getestete Rechenlogik verschwinden würden.
- **Sackgasse:** Das Prüfskript blieb in der Ersteinrichtung hängen („Weiter“ gesperrt). Ursache: Pflichtfeld „Geschlecht“ ist ein `select`, das Skript füllte nur `input`-Felder. Lösung: Auswahlfelder mit `selectOption` setzen.
- **Einschränkung:** Auf `localhost` arbeitet der Service Worker „Netz zuerst“, live „Cache zuerst“. Der Offline-Test hier prüft also nur den Rückfall auf den Cache, nicht das Live-Verhalten.
- **Fachbegriffe:** App-Hülle (App Shell), Vorab-Cache (Precache), Cache-first / Network-first, Hash-Router, `workflow_dispatch`, `permissions: contents: write`, Headless-Browser.
- **Zum Auftrag:** Geholfen haben die klare Arbeitsschleife und die Erlaubnisliste. Gefehlt hat der echte Stand des Repos; die Zusatzanweisung „leeren“ widersprach der Regel „Löschen nur mit Ja nach der Bewertung“ und der Frage „erweitern oder neu bauen“.

## Session 0, Runde 2: Repo leeren (13.11.2026)

- **Was und warum:** Alten Stand (FORGEBORN, 189 Dateien) entfernt, weil Léon eine komplett neue, saubere Version will und auf dem Handy keine Daten zu retten sind. Übrig: Lernlog, Kurz-README, `.gitignore`, `.gitattributes`.
- **Befehle:** `git rm -r -q -- . ':!docs/lernen'` (löscht alles Versionierte außer dem Lernordner) · `git ls-files` (zeigt, was noch versioniert ist) · `git cat-file -e 4926827:sw.js` (prüft, ob eine alte Datei in der Historie noch existiert) · `git checkout 4926827 -- <pfad>` (holt einzelne alte Dateien zurück).
- **Entscheidung:** Auch Angebots-Action, Skript und Lizenz entfernt. Verworfen: Pipeline behalten; sie hängt an einer inoffiziellen marktguru-Schnittstelle, deren Zulässigkeit erst noch geprüft wird, und ist mit einem Befehl zurückholbar.
- **Entscheidung 2:** Historie nicht umgeschrieben. Verworfen: Repo mit neuer Historie starten; damit wäre der Weg zurück weg.
- **Offen:** `main` zeigt noch den alten Stand, die Action läuft dort weiter, bis `main` ebenfalls geleert ist.
- **Fachbegriffe:** Pathspec mit Ausschluss (`:!pfad`), Commit-Hash als Rückweg, Default-Branch.
- **Zum Auftrag:** Geholfen haben die drei kurzen Antworten. Gefehlt hat die Zuordnung: „1. Nein“ konnte Vorschlag 1 oder Frage 1 meinen. Besser: „Frage 1: nein“ und „Vorschlag 2: nein“.

## Session 0, Runde 3: Fundament (13.11.2026)

- **Was und warum:** `main` geleert (Pull Request 1), dann Rechenlogik, Datenbank-Schicht und Basis-Zutaten gebaut. Logik liegt als reine Funktionen in `js/logik/`, damit sie ohne Browser testbar ist.
- **Befehle:** `git merge --ff-only origin/main` (Branch ohne Umweg auf den Stand von main heben) · `npm pack @fontsource-variable/bricolage-grotesque` (Paket nur herunterladen, um die Schriftdatei zu entnehmen) · `npm test` (startet `node --test`).
- **Entscheidung:** Basis-Zutaten als Datei, eigene Zutaten in der IndexedDB; Einträge speichern eine Kopie der Nährwerte. Verworfen: alles in die Datenbank kopieren (App-Updates könnten die Basis dann nicht mehr verbessern).
- **Entscheidung 2:** Nährwerte aus dem alten Stand als Daten übernommen (USDA, gemeinfrei). Verworfen: Werte neu erfinden oder mit leerer Liste starten.
- **Sackgasse:** Dokumentation von Open Food Facts und USDA war aus der Arbeitsumgebung nicht erreichbar. Lösung: Annahmen als [vermutet] markiert, Beispieldaten für Tests nachgebildet.
- **Fachbegriffe:** reine Funktion, Object Store, Migration, Schema-Version, Transaktion, Momentaufnahme (Snapshot), Fast-Forward-Merge.
- **Zum Auftrag:** Geholfen hat die klare Freigabe „alles umsetzen“. Gefehlt hat der Name; ohne ihn musste eine Annahme her.

## Session 0, Runde 4: Ansichten und Design (13.11.2026)

- **Was und warum:** Drei Seiten (Heute, Zutaten, Mehr), Service Worker, Manifest, Icons. Leitidee Zitrusfrucht: Tagesscheibe mit sechs Segmenten, eines je Mahlzeit.
- **Befehle:** `node tools/icons-erzeugen.cjs` (zeichnet das Icon aus derselben Geometrie wie die Tagesscheibe und speichert PNGs) · `node tools/server.cjs` (lokaler Server; Service Worker und IndexedDB brauchen http://localhost).
- **Entscheidung:** Service Worker „Cache zuerst“ mit fester Dateiliste, lokal abgeschaltet und nur mit `?sw=1` aktiv. Verworfen: lokal „Netz zuerst“ wie im alten Stand, weil der Test dann nicht das echte Verhalten prüft.
- **Entscheidung 2:** Schrift selbst gehostet. Verworfen: Google Fonts, weil das bei jedem Start einen fremden Server anfragen würde.
- **Entscheidung 3:** Über dem Ziel liegen wird nicht rot markiert, nur dunkler grün. Mehr essen als geplant ist kein Fehler.
- **Fachbegriffe:** App-Hülle, Vorab-Cache, `skipWaiting`, `clients.claim`, Hash-Router, `<dialog>`, Viewport-Angabe `interactive-widget`, maskierbares Icon, variable Schrift.
- **Zum Auftrag:** Geholfen hat die Stimmung „gesund, Energie“ als Richtung. Gefehlt haben Beispiele für Apps, deren Aussehen Léon mag oder nicht mag.

## Session 0, Runde 5: Testen und Fehler finden (13.11.2026)

- **Was und warum:** `tools/pruefe-app.cjs` spielt die App im Handy-Emulator durch (33 Kriterien), dazu 59 Unit-Tests. Danach die Bilder angesehen, weil Tests kein schiefes Layout sehen.
- **Befehle:** `BILDER=<ordner> node tools/pruefe-app.cjs` (Durchlauf mit Bildschirmfotos) · `npm test 2>&1 | grep -E "^not ok|^# (pass|fail)"` (nur Fehlschläge und Summen zeigen).
- **Fehler 1:** Unter den Makros stand das Wort „null“. Ursache: `element.append(null)` schreibt Text statt nichts. Lösung: Helfer `haenge()` überspringt leere Werte; neuer Test sucht auf allen Seiten nach „null“, „undefined“, „NaN“.
- **Fehler 2:** Seite „Mehr“ war 2 px zu breit. Ursache: Auswahlleiste mit `white-space: nowrap`. Lösung: Knöpfe dürfen schrumpfen; Breitentest läuft jetzt auf allen Seiten statt nur auf „Heute“.
- **Fehler 3:** Ein Test schlug fehl, obwohl der Code stimmte (doppelter Schrägstrich im Pfad). Lösung: Pfade mit `path.relative` bauen statt Text zu verketten.
- **Lehre:** Beide echten Fehler fand das Bild, nicht der Test. Danach bekam jeder Fehler einen Test, damit er nicht wiederkommt.
- **Fachbegriffe:** End-to-End-Test, Headless-Browser, Geräte-Emulation, abgefangene Netzanfrage (Mock), Regressionstest.
- **Zum Auftrag:** Geholfen hat „teste so oft, bis es steht“. Gefehlt hat, was „erste Version“ mindestens können muss; ich habe Tagebuch, Zutaten, Ziele und Backup gewählt.

## Session 2, Runde 1: Rezepte (14.11.2026)

- **Was und warum:** Version 0.1 nach `main` gebracht (Pull Request 2), dann Rezepte gebaut: Zutaten mit Mengen, Portionen, Schritte mit „Prinzip dahinter“. Ein Rezept wird fürs Tagebuch wie eine Zutat verpackt, damit keine zweite Rechenlogik nötig ist.
- **Befehle:** `git fetch origin main && git merge --ff-only origin/main` (Arbeitsbranch nach dem Merge wieder auf den Stand von main heben) · `node tools/pruefe-app.cjs 2>&1 | grep -E "FEHLER|Kriterien"` (nur Fehlschläge und Summe zeigen).
- **Entscheidung:** Schema-Version 2 mit eigener Migration, die nur den Speicher `rezepte` anlegt. Verworfen: Rezepte in `einstellungen` ablegen (ginge ohne Migration, wäre aber wieder ein großer Block statt einer Entität).
- **Entscheidung 2:** Rezept-Zutaten speichern eine Kopie der Nährwerte, Tagebuch-Einträge eine Kopie der Rezeptwerte. Ein geändertes Rezept ändert alte Tage nicht (per Test belegt: 449 kcal bleiben, obwohl das Rezept jetzt 898 hat).
- **Fehler:** Der Test „Backup speichern“ schlug fehl, weil er Schema-Version 1 erwartete. Das war richtig so: Der Test hat die Änderung bemerkt. Lösung: Erwartung anheben, dazu ein Test mit einem echten Backup aus Version 1.
- **Wie die Migration getestet wird:** Das Prüfskript legt auf einer Seite ohne App-Code eine Datenbank im alten Aufbau an und öffnet erst dann die App.
- **Fachbegriffe:** `onupgradeneeded`, `oldVersion`, Fixture (Beispieldatei für Tests), Entität, Adapter (ein Ding so verpacken, dass es wie ein anderes benutzt werden kann).
- **Zum Auftrag:** Geholfen hat „mach von allein weiter“ mit klarer Berechtigung. Gefehlt hat ein Ziel für die Nacht; ich arbeite den Phasenplan in Reihenfolge ab.
