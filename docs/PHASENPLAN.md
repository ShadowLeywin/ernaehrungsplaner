# Phasenplan

Eine Session hat genau ein Ziel. Jede endet mit grünen Tests und einem Eintrag im Lernlog.

**Testbefehle für jede Session:** `npm test` (Logik) und `node tools/pruefe-app.cjs` (Oberfläche im Handy-Emulator). Jede Session ergänzt beide um ihre eigenen Kriterien.

## Kritische Prüfung des ursprünglichen Plans

| Frage | Ergebnis | Folge |
|---|---|---|
| Sind Session 4 und 5 zu groß? | Ja. Session 4 enthielt vier Module, Session 5 neun Health-Bereiche | geteilt in 4, 5, 6 und 7, 8 |
| Gehört ein Backup schon in Session 1? | Ja. Ohne Backup ist jeder Testtag am Handy verlierbar | in 0.1 umgesetzt |
| USDA-Schlüssel bei öffentlichem Code? | Ein Schlüssel im Client-Code ist immer öffentlich | kein Schlüssel im Repo; siehe `OFFENE-FRAGEN.md` Nr. 3 |
| Ist marktguru tragfähig? | Technisch fragil, rechtlich ungeklärt | Angebote ans Ende gerückt, erst nach Klärung; siehe Nr. 2 |
| BLS 4.0 prüfen | seit Dezember 2025 kostenfrei, Lizenztext noch nicht geprüft | Kandidat für die deutsche Grunddatenbank; siehe Nr. 1 |

## Sessions

### Session 1: Grundgerüst, Datenmodell, Zutaten, Tagebuch-Kern, Backup (erledigt, Version 0.1)

| Abnahmekriterium | Beleg |
|---|---|
| App lädt, installierbar, läuft ohne Netz | `pruefe-app.cjs`: Service Worker aktiv, 30 von 30 Dateien im Cache, Start offline |
| Zutaten suchen, anlegen, ändern, löschen | `pruefe-app.cjs`: 6 Kriterien |
| Eintragen in 6 Slots, Summen gegen Ziel je Tagestyp | `pruefe-app.cjs`: 7 Kriterien |
| Backup speichern und einspielen | `pruefe-app.cjs`: 3 Kriterien |
| Logik getestet | `npm test`: 59 Tests |

Module: 1 (Zutaten), 3 (Tagebuch), 9 (Export: Backup).

### Session 2: Rezepte (erledigt, Version 0.2)

Ziel: Ein Rezept anlegen und als Portion ins Tagebuch eintragen.

| Abnahmekriterium | Beleg |
|---|---|
| Rezept mit Zutaten, Portionenzahl und Schritten speichern; je Schritt ein Feld „Prinzip dahinter“ | `pruefe-app.cjs`: „Rezept anlegen“ |
| Nährwerte je Portion und je 100 g werden aus den Zutaten berechnet | `npm test`: `rezepte.test.js`, 8 Tests |
| Eine Portion landet mit einem Tipp im Tagebuch | `pruefe-app.cjs`: „Eine Portion landet im Tagebuch“ |
| Schema-Version 2, Migration läuft mit Daten aus Version 1; altes Backup wird angehoben | `pruefe-app.cjs`: zwei Migrations-Kriterien; `npm test`: Backup aus Version 1 |

Noch offen aus dieser Session: Schritte umsortieren, Rezept kopieren.

Module: 2.

### Session 3: Tagebuch ausbauen (erledigt, Referenzwerte seit 1.0.0)

Ziel: Mikronährstoffe für Tag und Woche sehen.

| Abnahmekriterium | Beleg |
|---|---|
| Tagesansicht zeigt alle Nährwerte; Lücken in den Daten sind mit „mind.“ gekennzeichnet | `pruefe-app.cjs`: „Alle Nährwerte des Tages“ |
| Vergleich mit Referenzwerten | erledigt in 1.0.0: `npm test`: `referenz.test.js`; `pruefe-app.cjs`: „Referenzwerte“ |
| Wochenansicht zeigt den Schnitt der Tage mit Einträgen | `npm test`: `woche.test.js`; `pruefe-app.cjs`: „Wochenschnitt“ |
| Anteile der 6 Slots sind einstellbar, Summe 100 % wird erzwungen | `npm test`; `pruefe-app.cjs`: „Anteile der Mahlzeiten“ |
| Eine Mahlzeit vom Vortag übernehmen, einen ganzen Tag kopieren | `pruefe-app.cjs`: zwei Kriterien |

Module: 3.

### Session 4: Wochenplan und Einkaufsliste (erledigt, Version 0.4)

Ziel: Aus einer geplanten Woche entsteht eine Einkaufsliste.

| Abnahmekriterium | Beleg |
|---|---|
| Rezepte und Zutaten auf Tage und Slots planen | `pruefe-app.cjs`: „Mahlzeiten einplanen“ |
| Einkaufsliste löst Rezepte auf, summiert gleiche Zutaten und lässt sich abhaken | `npm test`: `plan.test.js`, 8 Tests; `pruefe-app.cjs`: drei Kriterien |
| Geplantes mit einem Tipp ins Tagebuch übernehmen | `pruefe-app.cjs`: „Geplantes ins Tagebuch übernehmen“ |
| Schema-Version 3 mit Migration | `pruefe-app.cjs`: Migration von Version 1 auf 3; `npm test`: Backup aus Version 2 |

Module: 4 (Wochenplan, Einkauf).

### Session 5: Meal-Prep und Mag-Liste (erledigt, Version 0.5)

Ziel: Vorkochen planen; Vorschläge achten auf Vorlieben.

| Abnahmekriterium | Beleg |
|---|---|
| Gesamtgewicht nach dem Kochen ÷ Portionen ergibt Gewicht und Nährwerte je Portion | `npm test`: `mealprep.test.js`; `pruefe-app.cjs`: zwei Meal-Prep-Kriterien |
| Rezept trägt Haltbarkeit in Tagen und „einfrierbar“; der Plan warnt, wenn eine Portion zu spät verplant ist | `npm test`; `pruefe-app.cjs`: „Wochenplan warnt“ |
| Je Obst und Gemüse eine Angabe J, R, K, N oder S | `pruefe-app.cjs`: „Mag-Liste“, „Sonderfall“ |
| Vorschläge lassen N weg und beachten R und K | `npm test`: `vorschlaege()`; in der App wirkt das bisher nur in Suchlisten (Abgelehntes am Ende, Hinweis). Eigene Essens-Vorschläge gibt es noch nicht |

Module: 4 (Meal-Prep), 6.

### Session 6: Angebote (erledigt ohne marktguru, Version 0.9)

Ziel: Bei einer Zutat sehen, wo sie diese Woche im Angebot ist.

| Abnahmekriterium | Beleg |
|---|---|
| Angebotsdatei mit Schema-Version einlesen (Datei-Import) | `npm test`: `angebote.test.js`; `pruefe-app.cjs`: „Angebotsdatei einlesen“ |
| Angebote erscheinen bei der passenden Zutat und in der Einkaufsliste | `pruefe-app.cjs`: „Angebot an einer Zutat“, „Einkaufsliste zeigt das günstigste“ |
| Abgelaufene Angebote verschwinden | `npm test`; `pruefe-app.cjs`: „Abgelaufene Angebote verschwinden“ |

Angebote kommen von Hand oder aus einer selbst gepflegten Datei (`docs/ANGEBOTE-FORMAT.md`). Ein automatischer Abruf bei marktguru bleibt aus, bis `OFFENE-FRAGEN.md` Nr. 2 entschieden ist.

Module: 5.

### Session 7: Health A, tägliche Werte (erledigt, Version 0.6)

Ziel: Gewicht und Tageswerte in unter 10 Sekunden eintragen.

| Abnahmekriterium | Beleg |
|---|---|
| Gewicht eintragen; 7-Tage-Schnitt und Vergleich mit dem Wochenziel | `npm test`: `gesundheit.test.js`, 9 Tests; `pruefe-app.cjs`: „7-Tage-Schnitt gegen das Wochenziel“ |
| Körpermaße, Schlaf, Wasser, Schritte eintragen | `pruefe-app.cjs`: vier Health-Kriterien |
| Verlauf sehen | nur für das Gewicht (Linie der letzten 30 Tage); **offen** für Maße, Schlaf, Schritte |
| Supplement-Liste pflegen und täglich abhaken | `pruefe-app.cjs`: „Supplement anlegen und je Tag abhaken“ |
| Tests und Beispieldaten enthalten nur erfundene Werte | Durchsicht von `test/gesundheit.test.js` und `healthLauf` |

Vorgezogen vor Session 6, weil die Angebote an einer offenen Entscheidung hängen.

Module: 7 (erster Teil).

### Session 8: Health B, Laborwerte und Symptome (erledigt, Version 0.7)

Ziel: Auffälligkeiten festhalten und mit Mahlzeiten verbinden.

| Abnahmekriterium | Beleg |
|---|---|
| Laborwert mit Datum, Einheit und Referenzbereich; Werte außerhalb sind markiert | `npm test`: `befunde.test.js`; `pruefe-app.cjs`: drei Labor-Kriterien |
| Symptom mit Uhrzeit und Stärke; Zuordnung zu Einträgen desselben Tages | `pruefe-app.cjs`: „Symptom mit Stärke, Uhrzeit und Zuordnung“ |
| Übersicht: Welche Zutaten standen wie oft vor einem Symptom? | `npm test`: `vorSymptomen()`; `pruefe-app.cjs`: „Übersicht“ |

Die App deutet nichts medizinisch: Sie vergleicht mit dem eingetragenen Bereich und zählt.

Module: 7 (zweiter Teil).

### Session 9: Import und Coach-Export (erledigt, Version 0.8)

Ziel: Rezepte hereinholen, Wochenbericht herausgeben.

| Abnahmekriterium | Beleg |
|---|---|
| Eingefügter Rezepttext wird in Zutaten, Mengen und Schritte zerlegt; Unsicheres ist markiert | `npm test`: `import.test.js`, 13 Tests mit Beispieltexten; `pruefe-app.cjs`: „Import aus Text“ |
| Zuordnung nur bei ganzen Wörtern, sonst kein Treffer | `npm test`: „Wasser ist keine Wassermelone“ |
| Android Share Target: geteilter Text öffnet den Import | `pruefe-app.cjs`: „Share Target“ (Aufruf mit Parametern); **am Handy noch zu prüfen** |
| Schema.org-Rezeptdaten aus eingefügtem HTML lesen | `npm test`; `pruefe-app.cjs`: „Import aus Schema.org-Daten“ |
| Coach-Export: kompakter Wochenbericht als Text, den der Nutzer selbst kopiert | `npm test`: `coach.test.js`; `pruefe-app.cjs`: „Coach-Export“ |

Die App ruft beim Import keine fremden Seiten ab.

Module: 8, 9 (Coach-Export).

### Session 10: Politur und Offline-Tests (teilweise, Version 0.10)

Ziel: Die App fühlt sich am Handy fertig an.

| Abnahmekriterium | Stand |
|---|---|
| Alle Seiten bei 320 px ohne seitliches Rollen, Tippflächen ab 40 px | erledigt: je Lauf ein Kriterium in `pruefe-app.cjs` |
| Verläufe für Wasser, Schlaf, Schritte und Maße | erledigt: `pruefe-app.cjs`: „Verläufe“ |
| Erinnerung an das Backup | erledigt: `npm test`: `backupFaellig()`; `pruefe-app.cjs`: „Backup-Erinnerung“ |
| Rezept kopieren, Schritte umsortieren | erledigt: `pruefe-app.cjs`: „Rezept kopieren“ |
| Update einer installierten App zeigt „Neue Version“ und verliert keine Daten | **offen**: Test mit zwei Versionen fehlt |
| Flugmodus-Test am echten Gerät nach Checkliste | **offen**: `docs/AUFGABEN-LEON.md`, Punkt A6 |
| Barcode per Kamera | **offen**: braucht ein echtes Gerät |

Module: alle.

### Session 11: Coach-Prompt (Dokument erledigt, Probelauf offen)

Ziel: Ein Prompt, der den Coach-Export in einem KI-Chat auswertet.

| Abnahmekriterium | Beleg |
|---|---|
| Prompt-Datei unter `docs/` mit Rolle, Kontext, Aufgabe, Regeln, Format, Stopp | `docs/COACH-PROMPT.md` |
| Probelauf mit erfundenem Export liefert eine verwertbare Antwort | **offen**: Léon testet und hält das Ergebnis im Lernlog fest |

Module: 9.

### Session 12: Android-App (erledigt, Version 1.0.0)

Ziel: Elan als installierbares APK.

| Abnahmekriterium | Beleg |
|---|---|
| APK baut, ist signiert, enthält alle App-Dateien | `./gradlew assembleRelease`; `apksigner verify`; `aapt2 dump badging` |
| Backup, Teilen und Open Food Facts laufen über native Plugins | `pruefe-app.cjs`: fünf Kriterien „App: …“ mit nachgebildeter Brücke |
| Teilen aus anderen Apps öffnet den Import | Intent-Filter im Manifest; **am Gerät zu prüfen** |
| Keine Cloud-Sicherung der Gesundheitsdaten | `allowBackup=false`, `dataExtractionRules` im APK geprüft |
| Läuft auf dem Handy | **offen**: Léon testet (`docs/AUFGABEN-LEON.md`) |

## Selbsttest dieses Plans

| Modul | im Datenmodell | im Phasenplan |
|---|---|---|
| 1 Zutaten | `zutaten` | Session 1 |
| 2 Rezepte | `rezepte` | Session 2 |
| 3 Tagebuch | `eintraege`, `tage` | Sessions 1, 3 |
| 4 Wochenplan, Einkauf, Meal-Prep | `plan`, `einkauf`, Felder an `rezepte` | Sessions 4, 5 |
| 5 Angebote | `angebote` | Session 6 |
| 6 Mag-Liste | `vorlieben` | Session 5 |
| 7 Health | `messungen`, `labor`, `supplements`, `symptome` | Sessions 7, 8 |
| 8 Import | erzeugt `rezepte`, `zutaten` | Session 9 |
| 9 Export | liest alle Speicher | Sessions 1, 9, 11 |

Jede Session hat eine Tabelle mit prüfbaren Kriterien und einem Testbefehl.

## Annahmen [A]

- [A] Elf statt acht Sessions sind in Ordnung, weil jede kleiner ist.
- [A] Reihenfolge nach Nutzen im Alltag: erst essen und planen, dann Health, dann Import.

## Quellen (mit Datum)

- Testausgaben vom 13.11.2026 (Version 0.1): `npm test` 59 von 59, `node tools/pruefe-app.cjs` 33 von 33.
- Testausgaben vom 14.11.2026 (Version 0.2): `npm test` 69 von 69, `node tools/pruefe-app.cjs` 45 von 45.
- Testausgaben vom 14.11.2026 (Version 0.3): `npm test` 79 von 79, `node tools/pruefe-app.cjs` 50 von 50.
- Testausgaben vom 14.11.2026 (Version 0.4): `npm test` 88 von 88, `node tools/pruefe-app.cjs` 59 von 59.
- Testausgaben vom 14.11.2026 (Version 0.5): `npm test` 97 von 97, `node tools/pruefe-app.cjs` 68 von 68.
- Testausgaben vom 14.11.2026 (Version 0.6): `npm test` 106 von 106, `node tools/pruefe-app.cjs` 76 von 76.
- Testausgaben vom 14.11.2026 (Version 0.7): `npm test` 113 von 113, `node tools/pruefe-app.cjs` 83 von 83.
- Testausgaben vom 14.11.2026 (Version 0.8): `npm test` 130 von 130, `node tools/pruefe-app.cjs` 91 von 91.
- Testausgaben vom 14.11.2026 (Version 0.9): `npm test` 136 von 136, `node tools/pruefe-app.cjs` 98 von 98.
- Testausgaben vom 14.11.2026 (Version 0.10): `npm test` 138 von 138, `node tools/pruefe-app.cjs` 103 von 103.
- Testausgaben vom 14.11.2026 (Version 1.0.0): `npm test` 143 von 143, `node tools/pruefe-app.cjs` 110 von 110; APK gebaut und signiert.
- BLS 4.0 kostenfrei: [heise](https://heise.de/-11123877), [Agrolab](https://agrolab.com/en/news/food-news/6105-bls-datenbank-radar-01-26-en.html), abgerufen 13.11.2026.
