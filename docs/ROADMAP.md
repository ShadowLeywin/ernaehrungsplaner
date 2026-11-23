# Roadmap: Planung, Einkauf, Märkte, Prospekte, Import, Zutaten

Stand 23.11.2026. Grundlage: Startprompt „Roadmap und Paket 1“ vom 23.11.2026. Regeln aus `CLAUDE.md` gelten weiter.
Jede Zeile „Status“ wird nach jeder Runde nachgezogen.

## Überblick

| Paket | Ziel in einem Satz | Status | Reihenfolge |
|---|---|---|---|
| P1 Planung und Einkauf | Woche oder Monat planen, je Mahlzeit, Einkaufsliste für jeden Zeitraum | gebaut, wartet auf Push/PR und Handy-Test | 1 |
| P3 Märkte und Preise | eigene Märkte wählen, grober Preis der Einkaufsliste je Markt | offen | 2 |
| P2 Plan-Import | Monatsplan aus einem Claude-Chat übernehmen | offen | 3 |
| P4 Angebote und Prospekte | Angebote je Markt wöchentlich als Datei, in der App wie ein Prospekt | offen, ohne automatischen Abruf (E4.1) | 4 |
| P5 Social-Rezeptimport | „Teilen an Elan“ aus TikTok, Instagram, YouTube, Prompt-Brücke | offen | 5 |
| P6 Zutaten-Datenbank | Suche, Kategorien, Detailansicht, Favoriten wie Yazio | offen | 6 |

**Reihenfolge:** P1, P3, P2, P4, P5, P6 (Léons Ja zu E0.1 vom 23.11.2026). Früherer Vorschlag:
P2 vor P4 ziehen. Grund: P4 hängt an einer rechtlich ungeklärten Quelle (E4.1) und kann Wochen stehen; P2 braucht nur P1 und das Importformat, das jetzt schon fertig ist (`docs/IMPORT-FORMAT.md`). → Entscheidung E0.1.

## Was die Vorbilder machen (Recherche 23.11.2026)

Muster übernehmen, nicht Texte, Logos, Farben oder Grafiken.

| Vorbild | Funktion | Befund | Kennzeichnung |
|---|---|---|---|
| Yazio | Favoriten | Lebensmittel und Rezepte über ein Symbol auf der Detailseite als Favorit markieren, nach Wahl der Portion | [belegt, Suchergebnis-Auszug aus help.yazio.com] |
| Yazio | Portionsgrößen | Öffentliche Lebensmittel haben feste Portionen; man kann eigene Portionen ergänzen, die Grundportion nicht ändern | [belegt, Auszug help.yazio.com] |
| Yazio | eigene Lebensmittel | eigene Lebensmittel ohne Barcode bleiben privat und sind änderbar | [belegt, Auszug help.yazio.com] |
| Yazio | Rezept-Import aus Links | widersprüchlich: Quellen eines Mitbewerbers sagen „nur Pro, unzuverlässig“ bzw. „gibt es nicht“; kein Import aus Social Media | [vermutet] |
| Yazio | Mahlzeitenplan mit Einkaufsliste | keine offizielle Hilfeseite gefunden | [offen] |
| fin | „Unterwegs“ (Fast-Food-Rechner) | Muster aus Léons Bildschirmfoto bereits in Elan (Runde 9/10) | [belegt durch Léons Bild] |
| fin | Planung, Einkauf | Die App ist mit „fin“ in Stores und Suchmaschinen nicht eindeutig zu finden | [offen] |
| andere Planer (Choosy, Faustformel Foodplan, fatsecret) | Einkaufsliste aus dem Plan | „mit zwei Klicks“ aus dem Wochenplan, Liste nach Warengruppen | [belegt, App-Store-Auszüge] |

Folgerung für Elan: Planen je Mahlzeit, Liste aus dem Plan mit einem Tipp, nach Kategorien; Favoriten und Portionen auf der Detailseite der Zutat (P6).

## Technik und Rechtslage (Recherche 23.11.2026)

Die Primärseiten (operations.osmfoundation.org, overpass-api.de, prices.openfoodfacts.org, marktguru.de, kaufda.de) sind aus der Arbeitsumgebung gesperrt (DNS-Fehler beim Abruf am 23.11.2026). Alles unten stammt aus Suchergebnissen; vor dem Bau von P3/P4 am Original prüfen.

| Thema | Befund | Folge für Elan | Kennzeichnung |
|---|---|---|---|
| OSM-Kacheln (tile.openstreetmap.org) | Starke Nutzung, z. B. eine verteilte App, die viele Kacheln lädt, nur mit Erlaubnis; gültiger User-Agent; fehlender Referer führt zu Sperren; Kachel-Adresse nicht fest einbauen; kein Vorabladen | Karte nur auf Knopfdruck, nur sichtbare Kacheln, Adresse als Einstellung, Hinweis „© OpenStreetMap“ mit Link. Risiko: Die App läuft im WebView mit Herkunft `https://localhost`; ob das als Referer reicht, ist offen | [vermutet] Quelle: [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) |
| OSM-Namensnennung | „© OpenStreetMap“ oder „© OpenStreetMap contributors“, als Link auf openstreetmap.org/copyright | Text unter Karte und Marktliste | [vermutet] Quelle: [Copyright](https://www.openstreetmap.org/copyright/attribution-guide/) |
| Overpass (overpass-api.de) | Richtwert unter 10.000 Abfragen und 1 GB je Tag; Zählung je Anwendung; User-Agent nötig; wer oft 429 bekommt, wird gesperrt | eine Abfrage je Tipp auf „Märkte suchen“, Radius begrenzt, Ergebnis lokal speichern, bei 429 Hinweis statt Wiederholung | [vermutet] Quelle: [OSM-Wiki Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) |
| Open Prices (Open Food Facts) | Daten unter ODbL 1.0, Belegfotos CC-BY-SA 4.0; API unter prices.openfoodfacts.org/api/docs | Preise mit Quelle „Open Prices“ und Datum anzeigen; Abdeckung in Deutschland unbekannt, deshalb nur Ergänzung | [vermutet] Quelle: [OFF-Wiki Prices](https://wiki.openfoodfacts.org/Prices), [Open Prices API](https://openfoodfacts.github.io/open-prices/guides/API/) |
| Prospekte und Angebote | marktguru: keine Nutzungsbedingungen zur Schnittstelle gefunden (schon 13.11.2026, `OFFENE-FRAGEN.md` Nr. 2). Die frühere Action las Zugangsschlüssel aus der Webseite. Lidl/Aldi: Bedingungen für Prospektinhalte nicht gefunden | **Kein Abruf, bis eine Quelle die Nutzung erlaubt.** Erlaubt ohne Rechtsfrage: Link auf die offizielle Prospektseite des Händlers, geöffnet im Browser | [offen] |
| Android „Teilen an Elan“ | Elan hat schon einen Filter `ACTION_SEND` für `text/plain` in `AndroidManifest.xml` und liest geteilten Text in `MainActivity.java` | P5 braucht kein neues Plugin und kein neues Recht. Plugins (Capawesome, @capgo/capacitor-share-target) wären nur für Dateien nötig | [belegt im Code] · Plugins: [Capawesome](https://capawesome.io/plugins/share-target/) [vermutet] |

## P1 Planung und Einkauf

**Ziel:** Léon plant eine Woche oder einen Monat, je Mahlzeit, und bekommt eine Einkaufsliste für jeden Zeitraum mit summierten Mengen nach Kategorie.

**Ist-Stand (Korrektur zum Auftrag):** Die heutige Einkaufsliste gilt je **Woche**, nicht je Tag (`einkauf.woche`, Kennung `<montag>|<zutatId>`). Die Plan-Posten selbst hängen am Datum und brauchen keine Umwandlung; umgezogen werden die Häkchen und eigenen Posten der Liste.

| Schritt | Inhalt | Abnahmekriterien | Status |
|---|---|---|---|
| P1.1 Zeitraum und Datenmodell | reine Funktionen für Zeiträume (Woche, Monat, frei), Wochen eines Monats; Schema 8: Einkauf je Zeitraum statt je Woche, Migration in DB und Backup | Tests für Zeiträume und Migration; ein Backup der Version 7 mit Häkchen wird korrekt angehoben; alle alten Tests grün | siehe Statusliste |
| P1.2 Einkaufsliste für einen Zeitraum | Seite „Einkaufsliste“ mit Wahl Woche, Monat, frei (Von–Bis); ersetzt die Wochenliste, alte Adresse leitet um | Liste summiert über den gewählten Zeitraum, gruppiert nach Kategorie; Häkchen gelten je Zeitraum; frei gewählter Zeitraum höchstens 62 Tage; 320 px ohne seitliches Rollen | |
| P1.3 Planzeitraum und Monatsansicht | Einstellung Woche oder Monat; Monatsansicht mit einzeln sichtbaren Wochen (je Woche eine Karte mit sieben Tagen) | Umschalter merkt sich die Wahl; Monat zeigt 4–6 Wochen mit Kalenderwoche; Tipp auf eine Woche öffnet sie; Blättern Monat vor/zurück | |
| P1.4 Mahlzeiten je Slot planen | Tagesplan mit sechs Mahlzeiten und Plus je Mahlzeit, kcal je Mahlzeit gegen Anteil am Ziel | Plus bei „Abendessen“ plant ins Abendessen; Summe je Mahlzeit stimmt; „Ins Tagebuch übernehmen“ geht weiter | |

**Abhängigkeiten:** keine. **Risiken:** Migration von Nutzerdaten (Häkchen); Gegenmittel: reine Funktion mit Test, alte Kennungen bleiben lesbar. **Weg zurück:** PRs einzeln zurücknehmen; Schema 8 lässt sich nicht auf 7 zurückdrehen, aber ein Backup vor dem Update genügt (Häkchen sind die einzigen geänderten Daten).

**Entscheidungen nur für Léon:**
- E1.1 Soll die Leiste „Plan“ statt „Woche“ heißen, wenn Monat eingestellt ist? Empfehlung: immer „Plan“. [A] bis zur Antwort: „Plan“.
- E1.2 Häkchen je Zeitraum (Woche und Monat haben getrennte Häkchen) oder je Zutat und Tag? Empfehlung: je Zeitraum, weil eine Liste ein Einkauf ist. [A] umgesetzt: je Zeitraum.

## P3 Märkte und Preise

**Ziel:** Léon wählt seine Märkte, sieht je Markt einen groben Preis der Einkaufsliste und vergleicht.

| Schritt | Inhalt | Abnahmekriterien |
|---|---|---|
| P3.1 Datenmodell Märkte und gemerkte Preise | Speicher `maerkte` (osmId, Name, Marke, Ort, lat/lon) und `preise` (zutatId, marktId, preis, menge, datum, quelle `hand`/`openprices`/`angebot`); reine Preislogik: Angebot vor eigenem Preis vor „unbekannt“ | Tests: Vorrang, Umrechnung auf die Listenmenge, „unbekannt“ zählt nicht mit, Summe zeigt „x von y Posten mit Preis“ |
| P3.2 Märkte suchen (Overpass) | Knopf „Märkte in der Nähe suchen“: Standort nur nach Ja oder Postleitzahl, eine Overpass-Abfrage `shop=supermarket` im Radius, Liste mit Entfernung, Auswahl speichern | genau eine Anfrage je Tipp; Test mit Beispielantwort aus `test/daten/`; Quellenhinweis „© OpenStreetMap“ sichtbar |
| P3.3 Karte (optional) | Kacheln nur nach Tipp „Karte zeigen“, ohne Bibliothek oder mit Leaflet als Datei im Repo | nur sichtbare Kacheln, Attribution, Adresse der Kacheln einstellbar |
| P3.4 Preise je Markt und Vergleich | Einkaufsliste zeigt je Zeile den Preis für den gewählten Markt; Kopf: Summe je Markt, Vergleich der Märkte | keine erfundenen Preise; fehlender Preis = „unbekannt“; Preis von Hand merken mit zwei Tipps |
| P3.5 Open Prices (optional) | auf Knopfdruck Preise per Barcode für Zutaten aus Open Food Facts | Quelle und Datum je Preis; ohne Barcode kein Abruf |

**Abhängigkeiten:** P1.2 (Liste je Zeitraum). **Risiken:** Kachel-Regeln im WebView (Referer), Standortrecht. **Entscheidungen nur für Léon:**
- E3.1 Standort per GPS (neues Android-Recht `ACCESS_COARSE_LOCATION`) oder nur Postleitzahl/Ort eintippen? Empfehlung: zuerst nur Ort eintippen, kein neues Recht.
- E3.2 Karte überhaupt nötig, oder reicht eine Liste mit Entfernung und „In Karten-App öffnen“? Empfehlung: Liste zuerst, Karte erst bei Bedarf (spart Kachel-Risiko).
- E3.3 Leaflet (BSD-2, rund 40 KB) als Datei im Repo erlaubt, obwohl „kein Framework“? Es ist eine Bibliothek ohne Build-Schritt. Empfehlung: ja, falls Karte gewünscht.

## P4 Angebote und Prospekte

**Ziel:** Angebote je Markt kommen wöchentlich als Datei, die P3 versteht; in der App blättert man sie wie einen Prospekt.

| Schritt | Inhalt | Abnahmekriterien |
|---|---|---|
| P4.1 Format `elan-angebote` Version 2 | Angebote je Markt (Kette, Filiale), Gültigkeit, Preis, Grundpreis, Bild-Link der Quelle; Leser in `js/logik/angebote.js`, Version 1 bleibt lesbar | Tests mit Beispieldatei, Doku in `docs/ANGEBOTE-FORMAT.md` |
| P4.2 Action wöchentlich | Workflow auf eigenem Branch, schreibt `data/angebote.json` nur aus einer erlaubten Quelle; bricht bei Fehler ohne Überschreiben ab | läuft mit `workflow_dispatch` grün; keine Schlüssel aus fremden Webseiten |
| P4.3 Bereich „Prospekte“ | je Markt eine Seite mit Angeboten als Kacheln, nach Kategorie; Treffer zur Einkaufsliste markiert | lädt nur die mitgelieferte Datei; kein Netz ohne Tipp |
| P4.4 Original-Prospekt | Knopf „Prospekt des Händlers öffnen“ öffnet die offizielle Seite im Browser | keine Prospektbilder oder PDFs im Repo oder in der App gespeichert |

**Abhängigkeiten:** P3.1 (Märkte). **Risiken:** Quelle (hoch), Änderungen an fremden Seiten brechen die Action.
**Widerspruch:** Die frühere Action nutzte eine inoffizielle Schnittstelle von marktguru mit Schlüsseln aus deren Webseite. Das baue ich nicht wieder auf: Nutzungsbedingungen unbekannt, und der Weg umgeht eine Zugangssperre. Bessere Varianten, in dieser Reihenfolge:
1. Anbieter mit erlaubter Schnittstelle oder Datenlizenz (marktguru, Bonial/kaufDA, Händler direkt anfragen; Léon schreibt eine kurze Mail, Vorlage liefere ich).
2. Händlerseiten, deren Nutzungsbedingungen automatisierten Abruf nicht verbieten (je Händler prüfen).
3. Übergang: Angebote von Hand oder per Datei (gibt es seit 0.9) und der Link auf den Original-Prospekt.

**Entscheidungen nur für Léon:**
- E4.1 Welche Quelle? Ohne erlaubte Quelle bleibt P4 bei P4.1, P4.3 (mit Datei) und P4.4.
- E4.2 Welche Märkte zuerst (alte Action: Netto Offingen, Edeka Offingen, Lidl Burgau, Kaufland Dillingen, dm Lauingen)?

## P2 Plan-Import

**Ziel:** Léons Monatsplan aus einem Claude-Chat in Elan übernehmen.

| Schritt | Inhalt | Abnahmekriterien |
|---|---|---|
| P2.1 Leser für `elan-import` | reine Funktion: prüfen, Zutaten zuordnen (nur ganze Wörter), Fehler je Zeile | Tests mit Beispieldateien aus `test/daten/`; ungültige Zeilen werden genannt, nicht still verworfen |
| P2.2 Prompt-Vorlage | Seite „Plan importieren“ zeigt die Vorlage mit Kopieren-Knopf, ergänzt um Zeitraum und Mahlzeiten | Vorlage erzeugt in einem Chat eine Datei, die der Leser annimmt (Léon prüft am Handy) |
| P2.3 Vorschau und Übernahme | Vorschau als Monatsansicht aus P1.3, unbekannte Zutaten markiert, „Übernehmen“ legt Plan-Posten und Rezepte an | nichts wird gespeichert vor „Übernehmen“; Rückgängig löscht genau die übernommenen Posten |

**Abhängigkeiten:** P1.3, `docs/IMPORT-FORMAT.md`. **Risiken:** Chat liefert falsches Format; Gegenmittel: verständliche Fehlerliste. **Entscheidungen:** E2.1 Bestehende Posten im Zeitraum ersetzen oder ergänzen? Empfehlung: fragen, Vorgabe „ergänzen“.

## P5 Social-Rezeptimport

**Ziel:** Rezept aus TikTok, Instagram, YouTube mit „Teilen an Elan“ übernehmen.

| Schritt | Inhalt | Abnahmekriterien |
|---|---|---|
| P5.1 Geteilten Inhalt einordnen | reine Funktion: Link, Plattform (Hostname), Bildunterschrift trennen | Tests mit Beispieltexten der drei Plattformen; es wird nichts abgerufen |
| P5.2 Rezept aus der Bildunterschrift | vorhandenen Leser (`leseRezeptText`) für Social-Texte erweitern (Emojis, Hashtags, „Zutaten 👇“) | Tests; Vorschau vor dem Speichern |
| P5.3 Prompt-Brücke | „Nur Video?“ → Elan baut einen Prompt mit Link und Bildunterschrift; Léon fragt einen Claude-Chat, fügt die Antwort im `elan-import`-Format ein | gleicher Leser wie P2; Quelle (Link) wird am Rezept gespeichert |

**Abhängigkeiten:** P2.1. **Risiken:** gering; keine Inhalte der Plattformen werden geladen. **Entscheidungen:** keine.

## P6 Zutaten-Datenbank

**Ziel:** Zutaten finden und verwalten wie in Yazio: Suche, Kategorien, Detailseite, Favoriten.

| Schritt | Inhalt | Abnahmekriterien |
|---|---|---|
| P6.1 Detailseite | Nährwerte je 100 g und je Portion, Portionen anlegen, Quelle | alle 30 Nährwerte sichtbar, fehlende als „unbekannt“ |
| P6.2 Favoriten | Stern auf der Detailseite, Favoriten oben in Suche und beim Eintragen | Einstellung `zutatFavoriten`, keine neue Schema-Version |
| P6.3 Kategorien und Übersicht | Kategorie-Chips, zuletzt genutzt, eigene Zutaten | 320 px ohne seitliches Rollen |
| P6.4 (offen) BLS 4.0 | große deutsche Datenbank | erst mit belegter Lizenz (`OFFENE-FRAGEN.md` Nr. 1) |

**Entscheidungen:** E6.1 Barcode-Scanner (Kamera-Recht) gehört nicht dazu, außer Léon will es.

## Entscheidungen, die nur Léon treffen kann

| Nr. | Frage | Empfehlung | Entscheidung (23.11.2026) |
|---|---|---|---|
| E0.1 | P2 vor P4 ziehen? | ja, P4 hängt an der Quelle | ja (Léon) |
| E1.1 | Leiste „Plan“ statt „Woche“ | ja | ja (Léon: „Joa“), umgesetzt in P1.3 |
| E3.1 | GPS-Recht oder Ort eintippen | Ort eintippen | Ort eintippen, kein neues Recht (Léon) |
| E3.2 | Karte oder nur Liste | Liste zuerst | Liste zuerst, P3.3 Karte zurückgestellt (Léon) |
| E3.3 | Leaflet als Datei erlaubt | ja, falls Karte | entfällt vorerst (keine Karte) |
| E4.1 | Quelle der Angebote | Anbieter um Erlaubnis fragen | Léon: „überlege selber“. Festgelegt: kein Abruf ohne belegte Erlaubnis. P4 baut Format v2, Prospekt-Seite aus Datei und Link zum Original-Prospekt; die Action bekommt erst eine Quelle, wenn deren Bedingungen den Abruf erlauben [A] |
| E4.2 | Märkte zuerst | die fünf aus der alten Action | festgelegt: Netto Offingen, Edeka Offingen, Lidl Burgau, Kaufland Dillingen, dm Lauingen [A] |
| E2.1 | Import ersetzt oder ergänzt | ergänzen | offen, Vorgabe „ergänzen“ [A] |

## Statusliste

| Teilschritt | Status | PR | Testergebnis |
|---|---|---|---|
| Phase 1: Roadmap, Importformat, Handy-Tests abgehakt | fertig | – (Branch `claude/new-session-clchhs`) | nur Doku |
| P1.1 Zeiträume und Schema 8 | fertig | – (Branch `claude/p1-1-zeitraum`) | 218 Unit, 146/146 Browser |
| P1.2 Einkaufsliste für einen Zeitraum | fertig | – (Branch `claude/p1-2-einkauf`) | 218 Unit, 150/150 Browser |
| P1.3 Planzeitraum und Monatsansicht | fertig | – (Branch `claude/p1-3-monat`) | 218 Unit, 153/153 Browser |
| P1.4 Mahlzeiten je Slot planen | fertig | – (Branch `claude/p1-4-slots`) | 219 Unit, 156/156 Browser |
