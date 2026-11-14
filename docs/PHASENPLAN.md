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

### Session 2: Rezepte

Ziel: Ein Rezept anlegen und als Portion ins Tagebuch eintragen.

| Abnahmekriterium | Testbefehl |
|---|---|
| Rezept mit Zutaten, Portionenzahl und Schritten speichern; je Schritt ein Feld „Prinzip dahinter“ | `pruefe-app.cjs` |
| Nährwerte je Portion und je 100 g werden aus den Zutaten berechnet | `npm test` (`rezepte.test.js`) |
| Eine Portion landet mit einem Tipp im Tagebuch | `pruefe-app.cjs` |
| Schema-Version 2, Migration läuft mit Daten aus Version 1; altes Backup wird angehoben | `npm test`, `pruefe-app.cjs` mit Backup aus 0.1 |

Module: 2.

### Session 3: Tagebuch ausbauen

Ziel: Mikronährstoffe für Tag und Woche sehen.

| Abnahmekriterium | Testbefehl |
|---|---|
| Tagesansicht zeigt Mikronährstoffe gegen Referenzwerte; Lücken in den Daten sind gekennzeichnet | `npm test`, `pruefe-app.cjs` |
| Wochenansicht zeigt den Schnitt der Tage mit Einträgen | `npm test` |
| Anteile der 6 Slots sind einstellbar, Summe 100 % wird erzwungen | `npm test`, `pruefe-app.cjs` |
| Einen Tag oder eine Mahlzeit auf einen anderen Tag kopieren | `pruefe-app.cjs` |

Module: 3. Vorher klären: Quelle der Referenzwerte (`OFFENE-FRAGEN.md` Nr. 5).

### Session 4: Wochenplan und Einkaufsliste

Ziel: Aus einer geplanten Woche entsteht eine Einkaufsliste.

| Abnahmekriterium | Testbefehl |
|---|---|
| Rezepte und Zutaten auf Tage und Slots planen | `pruefe-app.cjs` |
| Einkaufsliste summiert gleiche Zutaten und lässt sich abhaken | `npm test`, `pruefe-app.cjs` |
| Geplantes mit einem Tipp ins Tagebuch übernehmen | `pruefe-app.cjs` |

Module: 4 (Wochenplan, Einkauf).

### Session 5: Meal-Prep und Mag-Liste

Ziel: Vorkochen planen; Vorschläge achten auf Vorlieben.

| Abnahmekriterium | Testbefehl |
|---|---|
| Gesamtgewicht nach dem Kochen ÷ Portionen ergibt Gewicht und Nährwerte je Portion | `npm test` |
| Rezept trägt Haltbarkeit in Tagen und „einfrierbar“; der Plan warnt, wenn eine Portion zu spät verplant ist | `npm test`, `pruefe-app.cjs` |
| Je Obst und Gemüse eine Angabe J, R, K, N oder S | `pruefe-app.cjs` |
| Vorschläge lassen N weg und beachten R und K | `npm test` |

Module: 4 (Meal-Prep), 6.

### Session 6: Angebote

Ziel: Bei einer Zutat sehen, wo sie diese Woche im Angebot ist.

| Abnahmekriterium | Testbefehl |
|---|---|
| Angebotsdatei mit Schema-Version einlesen (Datei-Import oder mitgelieferte Datei) | `npm test` |
| Angebote erscheinen bei der passenden Zutat und in der Einkaufsliste | `pruefe-app.cjs` |
| Abgelaufene Angebote verschwinden | `npm test` |

Module: 5. Start erst, wenn `OFFENE-FRAGEN.md` Nr. 2 entschieden ist.

### Session 7: Health A (tägliche Werte)

Ziel: Gewicht und Tageswerte in unter 10 Sekunden eintragen.

| Abnahmekriterium | Testbefehl |
|---|---|
| Gewicht eintragen; 7-Tage-Schnitt und Vergleich mit dem Wochenziel | `npm test`, `pruefe-app.cjs` |
| Körpermaße, Schlaf, Wasser, Schritte eintragen und als Verlauf sehen | `pruefe-app.cjs` |
| Supplement-Liste pflegen und täglich abhaken | `pruefe-app.cjs` |
| Tests und Beispieldaten enthalten nur erfundene Werte | Durchsicht von `test/` |

Module: 7 (erster Teil).

### Session 8: Health B (Laborwerte und Symptome)

Ziel: Auffälligkeiten festhalten und mit Mahlzeiten verbinden.

| Abnahmekriterium | Testbefehl |
|---|---|
| Laborwert mit Datum, Einheit und Referenzbereich; Werte außerhalb sind markiert | `npm test`, `pruefe-app.cjs` |
| Symptom mit Uhrzeit und Stärke; Zuordnung zu Einträgen desselben Tages | `pruefe-app.cjs` |
| Übersicht: Welche Zutaten standen wie oft vor einem Symptom? | `npm test` |

Module: 7 (zweiter Teil).

### Session 9: Import und Coach-Export

Ziel: Rezepte hereinholen, Wochenbericht herausgeben.

| Abnahmekriterium | Testbefehl |
|---|---|
| Eingefügter Rezepttext wird in Zutaten, Mengen und Schritte zerlegt; Unsicheres ist markiert | `npm test` mit Beispieltexten |
| Android Share Target: geteilter Text öffnet den Import | `pruefe-app.cjs` (Manifest), am Handy manuell |
| Schema.org-Rezeptdaten aus eingefügtem HTML lesen | `npm test` |
| Coach-Export: kompakter Wochenbericht als Text, den der Nutzer selbst kopiert | `npm test`, `pruefe-app.cjs` |

Module: 8, 9 (Coach-Export).

### Session 10: Politur und Offline-Tests

Ziel: Die App fühlt sich am Handy fertig an.

| Abnahmekriterium | Testbefehl |
|---|---|
| Alle Seiten bei 320 px ohne seitliches Rollen, Tippflächen ab 40 px | `pruefe-app.cjs` |
| Update einer installierten App zeigt „Neue Version“ und verliert keine Daten | `pruefe-app.cjs` mit zwei Versionen |
| Flugmodus-Test am echten Gerät nach Checkliste | manuell, Protokoll im Lernlog |
| Barcode per Kamera, falls der Browser es unterstützt | am Handy manuell |

Module: alle.

### Session 11: Coach-Prompt

Ziel: Ein Prompt, der den Coach-Export in einem KI-Chat auswertet.

| Abnahmekriterium | Testbefehl |
|---|---|
| Prompt-Datei unter `docs/` mit Rolle, Kontext, Aufgabe, Regeln, Format, Stopp | Durchsicht |
| Probelauf mit erfundenem Export liefert eine verwertbare Antwort | manuell, Ergebnis im Lernlog |

Module: 9.

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

- Testausgaben vom 13.11.2026: `npm test` (59 von 59), `node tools/pruefe-app.cjs` (33 von 33).
- BLS 4.0 kostenfrei: [heise](https://heise.de/-11123877), [Agrolab](https://agrolab.com/en/news/food-news/6105-bls-datenbank-radar-01-26-en.html), abgerufen 13.11.2026.
