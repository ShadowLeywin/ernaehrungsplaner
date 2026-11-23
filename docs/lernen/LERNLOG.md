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

## Session 3, Runde 1: Tagebuch ausbauen (14.11.2026)

- **Was und warum:** Alle Nährwerte für Tag und Wochenschnitt, „Wie am Vortag“ je Mahlzeit, ganzen Tag kopieren, Anteile der Mahlzeiten einstellbar. Referenzwerte fehlen bewusst: Die Quelle (DGE) war nicht erreichbar, und Gesundheitswerte kommen nicht aus dem Gedächtnis in die App.
- **Befehle:** `git show 4926827:tools/build-lebensmittel.js | grep -n epaDha` (alte Datei aus der Historie lesen, ohne sie zurückzuholen) · `node -e "import('./js/logik/naehrwerte.js').then(m => console.log(m.NAEHRSTOFFE))"` (ein Modul kurz in Node ausprobieren).
- **Entscheidung:** Der Wochenschnitt teilt durch die Tage mit Einträgen, nicht durch sieben. Verworfen: durch sieben teilen, weil ein vergessener Tag den Schnitt sonst verfälscht.
- **Entscheidung 2:** Lücken werden mit „mind.“ gezeigt statt verschwiegen. Eine Summe mit fehlenden Werten ist eine Untergrenze.
- **Fehler 1:** Im Bild stand „EPA + DHA 11 g“ bei 0,93 g Omega-3. Ursache: Die Daten führen EPA + DHA in Milligramm, die Liste nannte Gramm. Lösung: Einheit korrigiert, neuer Test (EPA + DHA nie größer als Omega-3).
- **Fehler 2:** Der Browser-Test brach ab, weil ein Selektor plötzlich zwei Auswahlleisten traf. Lösung: Selektor über `aria-label` eindeutig machen.
- **Fachbegriffe:** Bereichsabfrage (`IDBKeyRange.bound`), Selektor, Untergrenze, Plausibilitätstest, `<details>`.
- **Zum Auftrag:** Geholfen hat, dass der Phasenplan Kriterien hatte; so war klar, was „fertig“ heißt. Gefehlt hat der Netzzugang zu `dge.de`.

## Session 4, Runde 1: Wochenplan und Einkaufsliste (14.11.2026)

- **Was und warum:** Seite „Woche“ zum Vormerken, Einkaufsliste daraus berechnet, Übernahme ins Tagebuch. Die Liste wird nie gespeichert, nur die Häkchen und eigene Posten; so kann sie nicht vom Plan abweichen.
- **Befehle:** `sed -i "s/alt/neu/" datei` (Text in einer Datei ersetzen) · `node tools/pruefe-app.cjs 2>&1 | grep -E "FEHLER|ABBRUCH|Kriterien"` (nur das Wichtige zeigen).
- **Entscheidung:** Plan-Posten haben dieselbe Form wie Tagebuch-Einträge. Dadurch funktionieren Suche, Mengen-Blatt und Summen ohne zweite Fassung. Verworfen: eigenes Format mit Verweis auf Rezept und Portionen.
- **Fehler 1:** Ein Test erwartete Schema-Version 2 und schlug bei Version 3 fehl, zum zweiten Mal dieselbe Art Fehler. Lösung an der Wurzel: Der Test liest die Nummer jetzt aus `schema.js`.
- **Fehler 2:** Der Test tippte „Spülmittel“, aber der Posten erschien nicht. Ursache: Nach jedem Häkchen wurde die ganze Liste neu gezeichnet und das Eingabefeld ersetzt. Lösung: Ein Häkchen ändert nur seine Zeile und den Zähler.
- **Fehler 3:** Der Knopf „Rückgängig“ im Hinweis war unter 40 px hoch. Gefunden, weil die Tippflächen-Prüfung jetzt auch auf den neuen Seiten läuft.
- **Fachbegriffe:** abgeleitete Daten, Wettlauf (Race Condition), Zustand an Ort und Stelle ändern, Web Share API, Zwischenablage.
- **Zum Auftrag:** Geholfen hat der Phasenplan mit je einem Ziel. Gefehlt hat nichts; die nächsten Schritte standen fest.

## Session 5, Runde 1: Meal-Prep und Mag-Liste (14.11.2026)

- **Was und warum:** Am Rezept stehen jetzt Gewicht nach dem Kochen, Haltbarkeit und „einfrierbar“; der Wochenplan warnt, wenn eine Portion zu alt wäre. Dazu die Mag-Liste (J, R, K, N, S) für Obst und Gemüse.
- **Befehle:** `python3 -I - <<'EOF' … EOF` (kleines Skript direkt aus der Shell ausführen, hier um mehrere Dateien gezielt zu ändern) · `git merge --ff-only origin/main` (wie gehabt nach jedem Merge).
- **Entscheidung:** Kochen ändert das Gewicht, nicht die Nährwerte. Die Summe des Rezepts bleibt, nur Portion und Werte je 100 g rechnen mit dem Gewicht nach dem Kochen. Die Einkaufsliste rechnet von gekochten Portionen auf Rohware zurück.
- **Entscheidung 2:** Als Kochtag gilt der erste Tag, an dem das Rezept im Plan steht. Verworfen: eigene Verwaltung gekochter Chargen; das wäre genauer, aber eine Gewohnheit mehr.
- **Entscheidung 3:** „Nein“ versteckt eine Zutat nicht, sondern stellt sie ans Ende. Wer für andere kocht, braucht sie trotzdem.
- **Fehler:** Ein Test zählte Zeilen, bevor die Seite neu gezeichnet war. Lösung: erst auf den gedrückten Filter warten, dann zählen. Das war ein Fehler im Test, nicht in der App.
- **Fachbegriffe:** Dichte (Nährwert je 100 g), Charge, stabile Sortierung, `selectOption`.
- **Offen:** Echte Essens-Vorschläge gibt es noch nicht; die Mag-Liste wirkt bisher nur in Suchlisten.

## Session 7, Runde 1: Health, tägliche Werte (14.11.2026)

- **Was und warum:** Seite „Health“ mit Gewicht, 7-Tage-Schnitt gegen ein Wochenziel, Wasser, Schlaf, Schritten, Supplements und Körpermaßen. Vorgezogen vor die Angebote, weil die an einer offenen Entscheidung hängen.
- **Befehle:** `git status -sb` (kurz zeigen, was geändert und noch nicht committet ist; damit ließ sich nach einem Neustart der Stand klären) · `BILDER=<ordner> node tools/pruefe-app.cjs` (wie gehabt).
- **Entscheidung:** Der Trend vergleicht den Schnitt der letzten 7 Tage mit dem Schnitt der 7 Tage davor und schweigt unter 3 Werten je Woche. Verworfen: Tageswert gegen Vortag, weil das Gewicht täglich um ein Kilo schwanken kann.
- **Entscheidung 2:** „Zutaten“ ist aus der unteren Leiste raus, „Health“ ist drin. Mehr als fünf Einträge passen nicht, und Zutaten erreicht man über die Suche beim Eintragen.
- **Entscheidung 3:** Getippte, noch nicht gespeicherte Werte liegen in einem Entwurf. So verliert „+250 ml“ kein halb eingetragenes Gewicht (per Test belegt).
- **Fehler:** Ein Unit-Test schlug fehl, weil er die Liste der Speicher fest eingetragen hatte: dritte Wiederholung derselben Fehlerart. Lösung: Erwartung aus `STORES` ableiten, Regel in `CLAUDE.md` ergänzt.
- **Fachbegriffe:** gleitender Durchschnitt, Entwurf (ungespeicherter Zustand), Toleranz, Sparkline (kleine Verlaufslinie), `<polyline>`.
- **Zum Auftrag:** Geholfen hat „Resume“ nach dem Neustart: kurz und eindeutig. Gefehlt hat nichts.

## Session 8, Runde 1: Laborwerte und Symptome (14.11.2026)

- **Was und warum:** Zwei Unterseiten von Health. Laborwerte tragen ihren Referenzbereich selbst, weil er je Labor verschieden ist. Symptome lassen sich Einträgen des Tagebuchs zuordnen; eine Tabelle zählt, was öfter davor gegessen wurde.
- **Befehle:** `git fetch -q origin main && git merge -q --ff-only origin/main` (wie nach jedem Merge) · `npm test 2>&1 | grep -E "^not ok|^# (pass|fail)"` (wie gehabt).
- **Entscheidung:** Die App deutet nichts medizinisch. Sie sagt „über dem Bereich 3,5 bis 5“, nicht „zu hoch“. Verworfen: eigene Bewertungen oder Ampelfarben, weil die App die Lage des Nutzers nicht kennt.
- **Entscheidung 2:** Die Übersicht nennt zu jeder Zählung auch, an wie vielen Tagen das Lebensmittel gegessen wurde. Ohne diese Zahl stünde alles, was man täglich isst, verdächtig weit oben.
- **Entscheidung 3:** Ein bekannter Name schlägt Einheit und Bereich vom letzten Mal vor. Das spart Tipparbeit und hält die Schreibweise gleich, damit der Verlauf je Name stimmt.
- **Fehler:** Keiner in dieser Runde. Tests und Durchlauf waren beim ersten Mal grün; die Lehren aus den Vorrunden (Selektoren mit `exact`, Erwartungen aus dem Schema ableiten) haben gehalten.
- **Fachbegriffe:** Referenzbereich, Korrelation (zusammen auftreten heißt nicht verursachen), `<datalist>` (Vorschläge für ein Eingabefeld), n-zu-m-Beziehung.
- **Zum Auftrag:** Geholfen hat die klare Grenze „keine Gesundheitsdaten in Tests“. Alle Beispielwerte heißen „Testwert“ oder „Testsymptom“.

## Session 9, Runde 1: Import und Coach-Export (14.11.2026)

- **Was und warum:** Rezepte aus eingefügtem Text und aus Schema.org-Daten erkennen, Android „Teilen“ als Eingang, Wochenbericht als Text. Der Import ist ein Vorschlag, der im normalen Rezeptformular landet; gespeichert wird erst nach deiner Prüfung.
- **Befehle:** `node -e "import('./js/logik/import.js').then(m => …)"` (die Zuordnung gegen die echte Zutatenliste ausgeben und mit den Augen prüfen) · `npm test`.
- **Entscheidung:** Die App ruft keine fremden Seiten ab. Eine geteilte Adresse wird erklärt statt geladen. Verworfen: Seite nachladen, weil das Scraping wäre und im Browser ohnehin an fremden Servern scheitert.
- **Fehler 1 (ernst):** „1,5 l Wasser“ wurde zu 1.500 g Wassermelone, „200 g Reis“ zu Reiswaffeln. Alle Tests waren grün; aufgefallen ist es beim Lesen der Testausgabe („6 von 7 zugeordnet“, obwohl es Wasser nicht gibt). Ursache: Die Suche akzeptiert Wortanfänge. Lösung: Der Import ordnet nur bei ganzen Wörtern zu; neuer Test mit genau diesen Fällen.
- **Fehler 2:** „2 Karotten“ fand „Karotte“ nicht. Lösung: Einzahl-Suche über typische Endungen.
- **Lehre:** Grüne Tests prüfen nur, was man gefragt hat. Ausgaben lesen und sich fragen „kann das stimmen?“ findet die Fehler, an die man nicht gedacht hat.
- **Fachbegriffe:** Parser, Heuristik, JSON-LD, Share Target, Wortgrenze, falsch-positiver Treffer.
- **Zum Auftrag:** Geholfen hat die Regel „kein Scraping“: Sie hat die Grenze des Imports von Anfang an klar gemacht.

## Session 6, Runde 1: Angebote ohne marktguru (14.11.2026)

- **Was und warum:** Angebote je Zutat und Markt, von Hand oder aus einer selbst gepflegten Datei. Das günstigste aktuelle steht in der Einkaufsliste. Vorher: Aufgabenliste für Léon angelegt, weil das Sitzungslimit für mich nicht sichtbar ist.
- **Befehle:** `sed -i 's/^function findeZutat/export function findeZutat/' js/logik/import.js` (eine Funktion für andere Dateien freigeben) · `git status -sb` (vor jeder Runde der Stand).
- **Entscheidung:** Kein automatischer Abruf bei marktguru, solange die Erlaubnis ungeklärt ist [A]. Verworfen: das alte Skript zurückholen; es hing an einer inoffiziellen Schnittstelle.
- **Entscheidung 2:** Eine eingelesene Datei ersetzt die Angebote der vorigen Datei, lässt aber von Hand eingetragene stehen. Dafür trägt jedes Angebot seine Quelle (`hand` oder `datei`).
- **Entscheidung 3:** Die Zuordnung in der Datei nutzt dieselbe strenge Suche wie der Rezept-Import (nur ganze Wörter). Eine Regel, eine Funktion.
- **Fehler:** Ein Selektor im Test traf zwei Elemente (`.klein` ist auch eine Klasse des Knopfs). Lösung: `p.klein`. Fehler im Test, nicht in der App.
- **Fachbegriffe:** Dateiformat mit Versionsfeld, Herkunftsfeld, Wiederverwendung, `export`.
- **Zum Auftrag:** Geholfen hat „bau weiter“. Gefehlt hat die Antwort auf die Frage zu den Angeboten; deshalb die Annahme [A], die nichts verbaut.

## Session 10, Runde 1: Feinschliff ohne Handy (14.11.2026)

- **Was und warum:** Verläufe für Wasser, Schlaf, Schritte und Maße; Erinnerung an das Backup auf „Heute“; Rezepte kopieren und Schritte umsortieren. Dazu die Aufgabenliste für Léon als PDF.
- **Befehle:** `node pdf.cjs docs/AUFGABEN-LEON.md ziel.pdf schrift.woff2` (ein kleines Skript baut aus der Markdown-Datei eine Seite und lässt den Browser sie als PDF drucken) · `git status -sb`.
- **Entscheidung:** Die Erinnerung erscheint erst ab fünf Einträgen und steht unten auf der Seite. Verworfen: sofort und oben; wer gerade anfängt, hat noch nichts zu verlieren und soll nicht gestört werden.
- **Entscheidung 2:** Eine Linie gibt es erst ab zwei Werten. Ein einzelner Punkt sagt nichts über einen Verlauf.
- **Entscheidung 3:** Kopie und Import nutzen denselben Weg ins Formular (ein Entwurf ohne Kennung). Eine Mechanik, zwei Funktionen.
- **Fehler:** Im PDF stand A15 vor A14, weil die Zeile nachträglich eingefügt worden war. Aufgefallen beim Ansehen der Seiten. Lösung: Reihenfolge in der Quelle korrigiert, PDF neu erzeugt.
- **Fachbegriffe:** PDF-Druck im Headless-Browser, Schwellenwert, Entwurf ohne Kennung.
- **Zum Auftrag:** Geholfen hat „gib mir die Aufgaben als PDF“: klares Ziel, klares Format. Gefehlt hat nichts.

## Session 12, Runde 1: Android-App und Referenzwerte (14.11.2026)

- **Was und warum:** Auf Léons Wunsch ein echtes APK. Capacitor packt die vorhandene Web-App; was in der App anders läuft (Backup, Teilen, Netz), steht in `js/plattform.js`. Dazu Referenzwerte der DGE mit Quelle, MIT-Lizenz, Aufgabenliste.
- **Befehle:** `sdkmanager "platforms;android-36" "build-tools;36.0.0"` (Android-Bauteile laden) · `npx cap add android` (Android-Projekt erzeugen) · `./gradlew assembleRelease` (APK bauen) · `apksigner verify --print-certs` (Signatur prüfen) · `keytool -genkeypair` (Signierschlüssel erzeugen).
- **Entscheidung:** Capacitor statt Trusted Web Activity. Verworfen: TWA, weil sie eine Bestätigungsdatei an der Wurzel der Domain braucht, die GitHub Pages für ein Projekt-Repo nicht liefert.
- **Entscheidung 2:** Android-Cloud-Sicherung aus (`allowBackup=false`). Sonst lägen Gesundheitsdaten automatisch in der Google-Cloud.
- **Sackgassen:** `dl.google.com` und `www.dge.de` waren gesperrt (Freigabe beantragt, erteilt). Maven Central drosselte mit „429“; Lösung: ein Download zur Zeit und Wiederholen mit Pausen. Das Anlegen eines GitHub-Workflows wurde blockiert; es bleibt eine Frage an Léon.
- **Fehler im Test:** `getAttribute('open')` liefert bei offenem Bereich eine leere Zeichenkette, die in JavaScript als „falsch“ gilt. Lösung: auf `=== null` prüfen. Zweimal zuvor: Testschritte in falscher Reihenfolge nach einem Umbau.
- **Fachbegriffe:** APK, Capacitor, Signierschlüssel, versionCode, Intent-Filter, Edge-to-Edge, Drosselung (Rate Limit).
- **Zum Auftrag:** Geholfen hat die klare Ansage „als APK“. Widerspruch zur alten Entscheidung „PWA statt APK“ ist damit von dir aufgehoben; beides läuft jetzt aus einem Code.

## Session 13, Runde 1: Aufbau und Design nach Vorbildern (14.11.2026)

- **Was und warum:** Recherche, wie gute Ernährungs-Apps aufgebaut sind: wenig Tipps beim Eintragen, kurze Einrichtung, Einstellungen in Gruppen. Umgesetzt: Menü „Mehr“ mit Unterseiten, „Über Elan“, „Was ist neu“, Eintragen mit einem Tipp, Wasser auf „Heute“, Ersteinrichtung, Karten-Design. Dazu der automatische APK-Bau auf GitHub (Léons Ja).
- **Befehle:** `git rev-list --count HEAD` (zählt Commits, wird zur Baunummer im versionCode) · `node tools/pruefe-app.cjs` (jetzt 115 Kriterien).
- **Entscheidung:** Version bleibt 1.0.0 (Léons Wunsch), der versionCode zählt trotzdem hoch. Verworfen: gleichen versionCode behalten; manche Android-Versionen verweigern dann das Update.
- **Entscheidung 2:** Eintragen mit einem Tipp nimmt die Menge vom letzten Mal und bietet Rückgängig statt einer Rückfrage. Eine Bestätigung kostete wieder einen Tipp.
- **Entscheidung 3:** Die Ersteinrichtung merkt sich das Gerät (localStorage), nicht das Backup; wer Daten hat, sieht sie nicht.
- **Fehler:** Der Hauptknopf der Einrichtung lag auf kleinen Handys unter dem Rand. Aufgefallen im Bild, nicht im Test. Lösung: Knöpfe unten festheften. Im Test: `seite.url()` endet ohne `#` nicht auf `#/heute`; Prüfung auf „nicht willkommen“ umgestellt.
- **Fachbegriffe:** Onboarding, Reibung (Friction), Informationsarchitektur, `position: sticky`, Baunummer.
- **Zum Auftrag:** Geholfen hat „vor allem Design und Struktur“. Gefehlt haben Beispiele, welche Apps du gut findest; ich habe mich an MacroFactor, Cronometer und den Android-Richtlinien orientiert.

## Session 13, Runde 2: Design „Glut“ im Apple-Stil (14.11.2026)

- **Was und warum:** Léon schickte Bilder einer dunklen Fitness-App und wünschte „Apple-Style“. Neues Standard-Design Glut: dunkel, iOS-Systemfarben, Schrift Inter, Ring-Kacheln, Mahlzeiten-Karte, Plus-Knopf, Leiste aus Glas. Zitrus bleibt wählbar.
- **Befehle:** `npm pack @fontsource-variable/inter` (holt das Schriftpaket ohne Installation) · `BILDER=… node tools/pruefe-app.cjs` (118 Kriterien, Bilder ansehen).
- **Entscheidung:** Inter statt SF Pro; die Apple-Schrift darf nur auf Apple-Geräten genutzt werden. Verworfen: Archivo Kursiv wie in den Bildern; passt nicht zum Apple-Stil.
- **Entscheidung 2:** Thema (`data-thema`) und Modus (`data-modus`) getrennt; Glut überschreibt nur Variablen und wenige Regeln am Ende von `css/app.css`.
- **Fehler:** Im Laborwert-Blatt schlug der Klick fehl („element is not stable“ und „form intercepts pointer events“). Ursache: Der größere Titel machte die Seite 15 px zu breit, das Handy zoomte heraus. Lösung: Seitenkopf darf umbrechen. Eingegrenzt durch Ausblenden Element für Element.
- **Fachbegriffe:** Design-Token, `backdrop-filter`, `pathLength`, weiches Trennzeichen (`\u00AD`), Layout-Viewport.
- **Zum Auftrag:** Geholfen haben die Bilder. Gefehlt hat, ob Glut auch hell sein soll; Annahme [A]: dunkel als Standard, hell wählbar.

## Session 13, Runde 3: Aus Glut wird Blatt (14.11.2026)

- **Was und warum:** Léon: „keine Glasliste, aber der schlichte Vibe“, „mehr in den Farbtönen“, „ich mag das Grüne“. Design umbenannt in Blatt: Elans Grün als Akzent, Leiste wieder schlicht, Farbton je Mahlzeit hinter dem Symbol.
- **Befehle:** `node tools/icons-erzeugen.cjs` (Startbilder auf dem neuen dunklen Grund) · `node tools/pruefe-app.cjs` (119 Kriterien).
- **Entscheidung:** Ballaststoffe in Lila statt Grün, damit Grün allein den Akzent trägt. Verworfen: Glut nur umfärben und den Namen behalten; der Name passte nicht mehr.
- **Technik:** `color-mix(in srgb, Farbe 22%, transparent)` tönt die Symbolflächen aus derselben Farbvariable.
- **Zum Auftrag:** Geholfen hat die klare Ablehnung des Glases. Unklar war „mehr in den Farbtönen“; Annahme [A]: mehr kräftige Farben je Nährwert und Mahlzeit.

## Session 13, Runde 4: Blatt überall (14.11.2026)

- **Was und warum:** Léon: „Ja, mach das alles“. Health und Woche haben jetzt den Kopf von „Heute“ und Abschnitte als Karten mit farbigem Symbol. Wochentage tragen die Farbe ihres Tagestyps. Ringe laufen über 100 % in einer zweiten Runde weiter. Das Icon hat einen dunkelgrünen Grund.
- **Befehle:** `node tools/icons-erzeugen.cjs` (Icons und Startbilder neu) · `BILDER=… node tools/pruefe-app.cjs` (119 Kriterien, Bilder geprüft).
- **Entscheidung:** Das Symbol steht in einem eigenen `span` mit `aria-hidden`. So bleibt der Name des Titels für Screenreader und Tests gleich. Verworfen: Symbol per CSS `::before`, weil Chrome erzeugten Inhalt in den Namen aufnimmt.
- **Fehler:** In der Woche rückte das Plus nicht mehr nach rechts, weil der Kopf der Mahlzeiten kein `space-between` mehr hat. Lösung: Textblock mit `slot-text` (wächst mit `flex: 1`).
- **Zum Auftrag:** Die Freigabe für alle drei Vorschläge sparte eine Runde.

## Session 13, Runde 5: Rezeptkarten, kurze Wochentage, Ring-Test (14.11.2026)

- **Was und warum:** Léon: „Ja alles machen und mehr denken“. Rezepte als Karten mit Symbol und Farbton, Nährwerte mit Farbpunkt, Wochentage kurz. Neue Prüfpunkte für Ring über 100 %, Zitrus-Wahl und Rezeptbild. Beim Durchsehen aller Seiten gefunden: Felder in Rezeptschritten waren unsichtbar (gleiche Farbe wie die Karte).
- **Befehle:** `npm test` (152 grün, neu `test/rezeptbild.test.js`) · `node tools/pruefe-app.cjs` (122 Kriterien).
- **Entscheidung:** Symbol und Farbe aus dem Namen als reine Funktion `rezeptBild` statt Fotos. Fotos bräuchten Speicherplatz im Backup und Kamera-Zugriff. Farbe zuerst nach Symbol, sonst stabil per Streuwert.
- **Fehler:** Erste Fassung färbte zufällig (Chili auf Lila). Lösung: Farbton je Stichwort.
- **Fachbegriffe:** Streuwert (Hash), `aspect-ratio`.
- **Zum Auftrag:** „Mehr denken“ hieß hier: jede Seite ansehen, nicht nur die geänderten.

## Session 13, Runde 6: Vibration und Gewichts-Karte (14.11.2026)

- **Was und warum:** Léon: „Ja mach dat“. Umgesetzt: leichte Vibration (Wasser, Häkchen, Eintragen), abschaltbar unter Darstellung; Gewichts-Karte auf Health mit großem 7-Tage-Schnitt, Pfeil und Stand zum Ziel. Das Foto je Rezept blieb weg, weil ich davon abgeraten hatte [A].
- **Befehle:** `npm install --save-exact @capacitor/haptics@8.0.2` (Plugin nur fürs APK, Version vom 27.03.2026) · `npx cap sync android` (trägt das Plugin in die Gradle-Dateien ein).
- **Entscheidung:** In der App das Plugin Haptics, im Browser `navigator.vibrate`. Fehlt beides, passiert nichts. Verworfen: nur `navigator.vibrate`; in der WebView fehlt dafür die Berechtigung.
- **Entscheidung 2:** Pfeilrichtung als reine Funktion `trendRichtung` mit Schwelle 0,05 kg, damit Rundungsrauschen keinen Pfeil erzeugt. „Über Plan“ ist gelb, nicht rot: Die App wertet nicht.
- **Prüfung:** 124 Kriterien, neu: Gewichts-Karte und Vibration in der nachgebauten App (an, beim Eintragen, aus).

## Session 13, Runde 7: Stabiler, Übergänge, Ziel-Feier, Ringe, Widget (14.11.2026)

- **Was und warum:** Léon: „alles umsetzen, stabiler machen, bessere Übergänge“. Doppeltipp-Schutz und Fehlerhinweise zentral in `el()`, Fehlerseite mit „Neu laden“. Übergänge mit Richtung (reine Funktion `richtungZwischen`), Blatt gleitet hinaus. Ziel-Feier (`neuErreicht`), Ringe abwählbar (`bereinigeRinge`, `kachelSpalten`), Android-Widget über eigenes Plugin `ElanWidget`.
- **Befehle:** `./gradlew lintVitalRelease` (strenger Lint für das Release, grün) · `node tools/pruefe-app.cjs` (129 Kriterien).
- **Gegenprobe:** Der Doppeltipp-Test lief gegen die alte `ui.js` und fand 2 Einträge statt 1. Der Fehler war echt.
- **Fehler:** Das neue Schließen mit Animation ließ ein Blatt 0,2 s modal stehen. Wechselte man sofort die Seite, war die neue Seite gesperrt. Lösung: Beim Seitenwechsel schließen offene Blätter sofort. Gefunden durch einen Test, der dreimal rot war: angehalten, einzeln nachgestellt, Ursache belegt.
- **Testfehler:** Ein Test hing an der Uhrzeit (Berlin, nach 21 Uhr landete die Portion im Abendsnack). Ein Filter mit `\b` griff nicht, weil `textContent` die Wörter ohne Leerzeichen verbindet.
- **Entscheidung:** CSS-Animation statt View Transitions API. Sie läuft überall und sperrt keine Eingaben; geprüft am 14.11.2026.
- **Fachbegriffe:** modal, inert, AppWidgetProvider, RemoteViews, SharedPreferences.

## Session 14, Runde 1: Einstellungen im iOS-Stil, Heute und Woche (15.11.2026)

- **Was und warum:** Léons Bilder zeigten: Der Plus-Knopf verdeckt die Plus-Knöpfe der Mahlzeiten, die Woche wirkt unruhig, die Einstellungen sind uneinheitlich. Neue Bausteine in `js/ui.js`: `gruppe`, `zeileFeld`, `zeileWahl`, `zeileSchalter`, `zeilenAuswahl`. Alle Einstellungen nutzen sie jetzt.
- **Befehle:** `node tools/pruefe-app.cjs` (130 Kriterien) · eigene Bild-Skripte für einen Vorher-nachher-Vergleich.
- **Entscheidung:** Native `select` und Radioknöpfe bleiben und werden nur schlicht gezeichnet. So bleiben Bedienung am Handy und Screenreader erhalten. Verworfen: eigene Aufklapp-Menüs, die mehr Code und schlechtere Zugänglichkeit bringen.
- **Fehler:** Der Parameter `gruppe` (Referenzgruppe) verdeckte den neuen Baustein `gruppe`, Folge: „gruppe is not a function“. Die neue Fehlerseite zeigte es sofort an. Lösung: Parameter umbenannt.
- **Fachbegriffe:** Schalter (`role="switch"`), Verschattung (shadowing) eines Namens.

## Session 14, Runde 2: Struktur nach Recherche, alle Körpermaße, Health Connect (15.11.2026)

- **Was und warum:** Léon wollte eigene Wasser-Knöpfe, alle Körpermaße wie in seiner Maßband-App, Health Connect und eine bessere Struktur nach Recherche. Ergebnis der Recherche (MyFitnessPal, Foodnoms): Eintragen gehört auf die Startseite, Fortschritt ist ein eigener Tab. Umgesetzt: Tageswerte, Wasser und Supplements auf „Heute“, Tab „Fortschritt“ mit Gewicht, 19 Maß-Kacheln und Verläufen; Health Connect liest Schritte, Gewicht, Schlaf.
- **Befehle:** `npm install --save-exact @capgo/capacitor-health@8.11.13` (Version älter als zwei Wochen) · `aapt2 dump permissions` (zeigt, welche Rechte im APK landen).
- **Entscheidung:** Alle Health-Berechtigungen des Plugins außer drei mit `tools:node="remove"` gestrichen. Verworfen: die Plugin-Vorgabe übernehmen (49 Rechte, auch Schreibrechte).
- **Fehler 1:** Der Filter für Rechte übersah `VO2_MAX`, weil das Muster keine Ziffern erlaubte. Gefunden erst durch die Prüfung des fertigen APK.
- **Fehler 2:** „Letzten Schluck zurücknehmen“ löschte nach dem Umbau einen zufälligen Schluck, weil die Liste nach der zufälligen Kennung sortiert war. Lösung: Feld `erstellt` an jeder Messung.
- **Fehler 3:** Der Bau scheiterte dreimal an einer fehlenden Bibliothek (Maven drosselt). Angehalten, Fehlermeldung gelesen, gezielt einzeln geladen, dann ging es. Die Kotlin-Meldungen danach stammen nur aus dem Lint.
- **Fachbegriffe:** Health Connect, Berechtigung (Permission), Manifest-Zusammenführung (manifest merger), MPL-2.0.

## Session 14, Runde 3: „Mehr“ im Stil von Léons Fitness-App (15.11.2026)

- **Was und warum:** Léon zeigte Bilder seiner Fitness-App und wollte deren saubere Einstellungen. Übernommen: Jede Zeile zeigt den aktuellen Stand statt einer festen Beschreibung, ruhige Karten ohne Symbole, Überblick oben, „Rechtliches und Hilfe“ unten, Zurück als Kasten neben dem Titel. Nicht übernommen: Name, Maskottchen, Rang, Werbung.
- **Befehle:** `npm test` (175, neu `test/zusammenfassung.test.js`) · `node tools/pruefe-app.cjs` (133 Kriterien).
- **Entscheidung:** Die Datenschutzseite wird in der App aus `privacypolicy.html` gelesen (`fetch` und `DOMParser`). Eine Quelle für Health Connect und die App. Verworfen: Text doppelt pflegen.
- **Fehler:** Der Prüfpunkt für das zweite Maß fiel zweimal aus, isoliert lief er dreimal sauber. Vermutete Ursache: ein noch hinausgleitendes Blatt. Lösung: Ein neues Blatt schließt ein gleitendes sofort, dazu eine Diagnose im Test. Danach zweimal grün; die Ursache ist nicht sicher belegt.
- **Testfalle:** `innerText` liefert Text in Großbuchstaben, wenn CSS `text-transform: uppercase` setzt.

## Session 14, Runde 4: Restliche Vorschläge (15.11.2026)

- **Was und warum:** Léon: „Setze deine anderen Vorschläge auch um.“ Umgesetzt: Health Connect liest zusätzlich Ruhepuls, Körperfett und Trainings (für den Tagestyp), Maße wählbar, Verlauf je Maß im Blatt, Unterseiten im Kartenstil, Backup und Coach als Listen. Nicht umgesetzt: „Mehr“ durch Zusammenlegen kürzen. Seit jede Zeile ihren Stand zeigt, wären zusammengelegte Seiten nur länger.
- **Befehle:** `node tools/pruefe-app.cjs` (135 Kriterien) · `aapt2 dump permissions` (6 Leserechte im APK).
- **Entscheidung:** Krafttraining = Gym, Calisthenics = Calisthenics, Laufen oder Rad setzen nichts. Lieber kein Treffer als ein falscher Tagestyp. Eigene Wahl wird als `tagestypQuelle: 'eigen'` markiert, auch wenn man „wie im Plan“ wählt.
- **Fehler:** Die Prüfung zählte erst alle Kacheln, auch die neuen Körperwerte. Lösung: nur im Abschnitt „Körpermaße“ zählen.
- **Fachbegriffe:** Herkunft eines Werts (`quelle`), Least Privilege (nur so viele Rechte wie nötig).

## Session 14, Runde 5: Rückblick und Ruhepuls-Trend, Richtung „all in all“ (15.11.2026)

- **Was und warum:** Léon: „setze das alles um, es soll eine all in all Health-App sein.“ Umgesetzt: Rückblick der letzten 7 Tage auf „Fortschritt“ und Ruhepuls mit 7-Tage-Schnitt. Die Richtung steht jetzt in `CLAUDE.md`: alles außer Training.
- **Befehle:** `npm test` (182, neu `test/rueckblick.test.js`) · `node tools/pruefe-app.cjs` (136 Kriterien).
- **Entscheidung:** Gleitende 7 Tage statt Kalenderwoche, weil am Montag eine Kalenderwoche fast leer wäre. Schnitte nur über Tage mit Werten. Trainings zählen nur aus Health Connect, nicht aus dem Plan.
- **Testfalle (zum dritten Mal):** CSS `text-transform: uppercase` verändert `innerText`. Merksatz: Text in Tests ohne Rücksicht auf Großschreibung vergleichen.

## Session 14, Runde 6: HRV, Check-in, Erinnerungen (15.11.2026)

- **Was und warum:** Léon: „setze deine oberen Vorschläge auch um.“ HRV aus Health Connect (Tagesschnitt), Check-in auf „Heute“ (Energie, Stimmung, Stress 1–5), Erinnerungen für Wasser, Supplements und Check-in als lokale Benachrichtigungen.
- **Befehle:** `npm install @capacitor/local-notifications@8.3.1 --save-exact` (Plugin, MIT) · `npm test` (187) · `node tools/pruefe-app.cjs` (138 Kriterien).
- **Entscheidung:** Erinnerungen ungenau (`isExactNotification: false`), dafür kein Recht `SCHEDULE_EXACT_ALARM` und keine Sonderfrage. Uhrzeit als Auswahl in halben Stunden statt `<input type="time">`: Das Zeitfeld folgte der Systemsprache, zeigte „AM/PM“ und schnitt die Zeit ab.
- **Entscheidung:** „Energie Ø“ im Rückblick heißt jetzt „Kalorien Ø“, damit es nicht mit der gefühlten Energie aus dem Check-in verwechselt wird.
- **Fehler:** Test las den Schalter, bevor die Seite neu gezeichnet war. Lösung: erst speichern, dann Hinweis zeigen; im Test auf den Schalter warten. Zweiter Fehler: Kachel-Zählung nahm „2 Körperwerte“ fest an; jetzt gezählt.
- **Fachbegriffe:** lokale Benachrichtigung (plant das Handy selbst, ohne Server), HRV (Schwankung der Abstände zwischen Herzschlägen, in ms).

## Session 14, Runde 7: Plus-Knopf stand über dem Inhalt (15.11.2026)

- **Was und warum:** Léon (mit Bildschirmfoto): Der Plus-Knopf „steht oft schlecht davor“. Ursache: Der Seitenübergang lief mit `animation-fill-mode: both` und ließ `transform` an der Seite stehen. Ein Vorfahr mit `transform` wird zum Bezug für `position: fixed`; der Knopf hing deshalb an der Seite statt am Bildschirm und lag am Seitenende über dem Check-in.
- **Befehle:** Messskript mit Playwright (`getBoundingClientRect` von Knopf und Leiste) · Gegenprobe mit `git stash` (alter Stand: Knopf 1.712 px unter dem Bild) · `node tools/pruefe-app.cjs` (139 Kriterien).
- **Lösung:** `backwards` statt `both`, der Knopf blendet erst nach dem Übergang ein. Dazu ein Puffer: Er verschwindet nach 12 px nach unten und kommt erst nach 48 px nach oben zurück, geprüft einmal je Bild (`requestAnimationFrame`).
- **Fachbegriffe:** Containing Block (Bezugsrahmen für die Lage eines Elements), Hysterese (Puffer, damit kleine Gegenbewegungen nichts umschalten).

## Session 14, Runde 8: Schnell eintragen, Coach mit Befinden (15.11.2026)

- **Was und warum:** Léon: „Baue weiter und nutze dein volles Potenzial.“ Gewählt, was täglich hilft und keine neuen Rechte braucht: „Schnell eintragen“ (nur kcal, Makros freiwillig), Coach-Bericht mit Ruhepuls, HRV, Check-in und Trainings, Check-in-Verlauf mit fester Skala 1–5, HRV-Kachel erst mit Wert, Erinnerungen nach Backup neu planen.
- **Befehle:** `npm test` (192, neu `test/schnell.test.js`) · `node tools/pruefe-app.cjs` (140 Kriterien).
- **Entscheidung:** Ein Schnell-Eintrag ist eine Portion mit `gramm: 100` und `je100` = Werte der Portion. So rechnen Summen, Woche und Coach ohne Sonderfall. Im Wochenplan nicht angeboten, weil ein Posten ohne Zutat nicht auf die Einkaufsliste passt.
- **Verworfen:** BLS 4.0 als große Lebensmittel-Datenbank. Lizenz nicht prüfbar, beide Quellen in der Umgebung gesperrt. Erst mit belegter Lizenz.
- **Fehler:** „Löschen“ im Schnell-Blatt griff auf eine Variable `b` zu, die in diesem Zweig nie belegt wurde (zeitliche tote Zone von `const`). Der Browsertest fand es, weil das Blatt offen blieb. Lösung: ein `let b` für beide Zweige.
- **Fachbegriffe:** Atwater-Faktoren (4 kcal je g Eiweiß und Kohlenhydrate, 9 je g Fett), zeitliche tote Zone (TDZ).

## Session 14, Runde 9: Unterwegs-Rechner (15.11.2026)

- **Was und warum:** Léon: „mach das Feature wie die fin-App mit dem Fast-Food-Rechner.“ In seinem fin-Bildschirmfoto heißt es „Unterwegs“. Gebaut: Restaurant wählen, Gerichte mit Plus und Minus zählen, Summe live, Eintragen mit Rückgängig, Gerichte anlegen und ändern, Liste aus Datei laden (`docs/UNTERWEGS-FORMAT.md`).
- **Befehle:** `npm test` (197, neu `test/unterwegs.test.js`) · `node tools/pruefe-app.cjs` (141 Kriterien).
- **Entscheidung:** Keine mitgelieferten Werte von Ketten. Belegte Quellen waren aus der Umgebung nicht erreichbar, und erfundene Nährwerte widersprechen der Regel „lieber kein Treffer als ein falscher Wert“. Gerichte liegen als Einstellung `unterwegs` (keine neue Schema-Version). Eine Bestellung wird zu Schnell-Einträgen, damit Summen ohne Sonderfall rechnen.
- **Umbau:** Das Formular von „Schnell eintragen“ liegt jetzt in `js/ansichten/schnellformular.js`, damit Eintragen und Unterwegs es teilen, ohne sich gegenseitig zu importieren. Beim Ausschneiden rutschte `mengenFormular` mit; `node --check` und `grep` zeigten es sofort.
- **Fehler:** Der gewählte Restaurant-Chip sah grau aus, weil die Chip-Regel des Themas spezifischer war. Lösung: `:root` vor die Auswahl-Regel.
- **Fachbegriffe:** Spezifität (welche CSS-Regel gewinnt), Datalist (Vorschläge für ein Textfeld).

## Session 14, Runde 10: Unterwegs als Budget-Rechner (15.11.2026)

- **Was und warum:** Léon: „wenn ich sag, ich hab 600 kcal offen, dann schlägt es Gerichte vor für die besten Nährwerte.“ Gebaut: Budget (vorbelegt mit dem, was für die Mahlzeit oder den Tag offen ist), Sortierung „Viel Eiweiß“, „Wenig Fett“, „Budget voll“, bis zu fünf Kombinationen aus 1 bis 3 Gerichten, „Übernehmen“ füllt die Bestellung.
- **Befehle:** `npm test` (199) · `node tools/pruefe-app.cjs` (141 Kriterien).
- **Entscheidung:** Alle Kombinationen durchprobieren statt schlauer Suche: bei 100 Gerichten gut 160.000 Dreier, auf dem Handy Millisekunden, und sicher das Beste. Nur Kombinationen mit 60–100 % des Budgets. Bei Gleichstand weniger Teile zuerst, sonst gewinnt „+ Cola Zero“ (1 kcal näher am Budget). Kein Vorschlag, der nur ein früherer plus ein Extra ist.
- **Offen:** Werte von McDonald's, Burger King, KFC, Subway. Deren Seiten sperrt die Umgebung (Proxy 403); Freigabe angefragt.
- **Fachbegriffe:** Brute Force (alle Möglichkeiten durchprobieren), Tie-Break (Regel für Gleichstand).

## Session 14, Runde 11: Ketten-Listen und bessere Vorschläge (15.11.2026)

- **Was und warum:** Léon: „Such dir die Liste online.“ Subway aus dem offiziellen PDF (`pdftotext -layout`, Nährwerte je Portion), McDonald's, Burger King und KFC aus den Tabellen von nutriscan.app, das die Angaben der Ketten mit Datum zitiert. McDonald's selbst blockt automatische Abrufe (Akamai „Access Denied“); das wurde nicht umgangen. 485 Gerichte, Datei nur für Léon, nicht im Repo.
- **Prüfung:** kcal gegen 4·Eiweiß + 4·KH + 9·Fett. Auffällig nur Bier (Alkohol fehlt in den Makros) und Eistee. Im Subway-PDF widersprechen sich kcal und kJ sechsmal; genommen wird der Wert, der zu den Makros passt (einmal war kJ falsch, fünfmal kcal).
- **Verbesserungen:** Vorschläge ohne Getränke und Saucen (Cappuccino füllte sonst das Budget), höchstens eine Form je Gericht, „Wenig Fett“ ersetzt durch „Mager“ (Eiweiß minus Fett; vorher gewannen Süßes und Softeis), nach kcal sortiert mit frühem Abbruch (Burger King 242 → 6 ms), Eingabe 250 ms verzögert.
- **Fehler:** `\b` in JavaScript-Regex kennt kein „é“: „Café Grande“ rutschte durch. Lösung: `(?<!\p{L})…(?!\p{L})` mit Flag `u`. „KFC Salat ohne Dressing“ galt als Sauce: Zusätze mit „ohne“/„mit“ werden vor der Prüfung abgeschnitten.
- **Fachbegriffe:** Plausibilitätsprüfung, Pruning (Suche früh abbrechen), Debounce (erst nach kurzer Tipp-Pause rechnen), Unicode-Eigenschaften in Regex (`\p{L}`).

## Session 14, Runde 12: Ketten in der App, Frühstück nur morgens (15.11.2026)

- **Was und warum:** Léon: „Mach alles selber, hast die Erlaubnis.“ Damit Ja zu Vorschlag 1 (Frühstück nur morgens) und 2 (Ketten-Liste in der App, Risiko Datenbankrecht trägt Léon). `data/unterwegs-ketten.json` wird beim Öffnen von „Unterwegs“ eingemischt, nur wenn ihr Stand neuer ist (`mischeKetten`, Einstellung `unterwegsStand`). Der Umwandler liegt jetzt als `tools/ketten-listen.py` im Repo, mit Ablauf im Kopf.
- **Befehle:** `npm test` (202; `test/projekt.test.js` meldete die fehlende Datei in `sw.js` sofort) · `node tools/pruefe-app.cjs` (141 Kriterien).
- **Entscheidung:** Frühstück am Namen erkennen (McMuffin, Pancake, Rührei, Morning, McGriddle, Breakfast, King Toasty) und an der Mahlzeit statt an der Uhrzeit: Öffnungszeiten fürs Frühstück sind nicht belegt [vermutet bis 10:30], die Mahlzeit ist eindeutig und testbar. Erster Entwurf mit „egg“ traf „Veggie“; deshalb nur eindeutige Wörter.
- **Fachbegriffe:** Daten-Stand (Versionsdatum einer mitgelieferten Liste), Einmischen (Merge mit Vorrang der neueren Liste für gleiche Schlüssel).

## Session 14, Runde 13: Mehr Ketten, Getränk-Tipp, Aktualisierung (15.11.2026)

- **Was und warum:** Léon: „Setze alles um.“ Vier weitere Ketten mit deutscher Karte (dean&david, Hans im Glück, Peter Pane, Coffee Fellows), zusammen 1.026 Gerichte. Getränk ohne Kalorien als Chip an jedem Vorschlag (`nullGetraenke`). Vierteljährliche geplante Aufgabe, die die Listen neu baut und einen PR anlegt.
- **Entscheidung:** Sieben weitere Ketten bei nutriscan nutzen nur US- oder kanadische Karten. Sie fehlen bewusst: andere Rezepturen und Portionen, lieber kein Wert als ein falscher.
- **Fehler:** Die Obergrenze von 1.000 Gerichten schnitt 26 ab (Elans Leser meldete „verworfen 26“); jetzt 3.000. Extras wie „Whey Protein“, „Collagen Matcha“, „Americano (Medium)“ landeten in Vorschlägen; Liste der Ausschlusswörter erweitert, Größen in Klammern gelten als Getränk. Geräte mit Stand „2026-11-15“ hätten die neuen Ketten nicht bekommen: `stand` darf jetzt eine Uhrzeit haben.
- **Fehler:** Knöpfe auf der Vorschlagskarte waren unsichtbar (gleiche Farbe wie die Karte), die Theme-Regel gewann bei gleicher Spezifität, weil sie später steht. Lösung: `:root[data-thema]` davor.
- **Befehle:** `python3 -I tools/ketten-listen.py <ordner> 2026-11-15T16:00` (Liste bauen) · `npm test` (203) · `node tools/pruefe-app.cjs` (141).

## Session 15, Runde 14: Meine Mahlzeiten, Favoriten, Ketten ausblenden (23.11.2026)

- **Was und warum:** Léon: „Baue die App weiter.“ Gewählt nach Alltagsnutzen und ohne neue Rechte: Mahlzeit als Vorlage merken und mit einem Tipp eintragen (`js/logik/vorlagen.js`), Stern an Unterwegs-Gerichten mit Filter „Nur aus meinen Favoriten“, Restaurants unter Mehr → Unterwegs ausblenden. Alles als Einstellungen, keine neue Schema-Version.
- **Befehle:** `npm test` (208, neu `test/vorlagen.test.js`) · `node tools/pruefe-app.cjs` (143 Kriterien, mehrfach).
- **Entscheidung:** Vorlagen mit Schnell-Einträgen gibt es nicht im Wochenplan (Einkaufsliste braucht Zutaten). Stern ändert die Reihenfolge erst beim nächsten Öffnen, damit die Zeile nicht unter dem Finger wegspringt.
- **Fehler:** Nach „Liste aus Datei laden“ kam der Hinweis vor dem Neuzeichnen; ein Test las deshalb die Restaurants zu früh. Lösung: erst `await neuZeigen()`, dann der Hinweis. Bei 320 px quetschten Stern, Minus, Anzahl und Plus den Namen auf drei Zeilen: Minus und Anzahl erscheinen jetzt erst nach der ersten Auswahl.
- **Offen:** Der Maß-Test („Unterbauch: 88 cm gespeichert“) scheitert selten (heute 2 von 7 Läufen). Ursache unbekannt; die Diagnose prüft jetzt zusätzlich, ob der Wert in IndexedDB steht.
