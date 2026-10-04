# FORGEBORN – Ernährung & Training (PWA)

App-Name: **FORGEBORN**, Slogan „Fuel. Train. Grow.“, Logo: Schatten eines Zwergenschmieds schlägt mit dem Hammer auf eine Flamme auf dem Amboss, in der Flamme leuchtet der Ziel-Körper (`tools/icons_erzeugen.py`). Lizenz: GPL-3.0, Open Source mit Spenden. Standard-Thema „Glut“ (orange → rot). Das Repo heißt weiterhin `ernaehrungsplaner` (die URL bleibt gleich).

## Ziel
Progressive Web App für ein Samsung-Handy: offline-fähig, komplett deutsch, alle Daten lokal auf dem Gerät. Später sollen Freunde die App nutzen können, jeder mit eigenen lokalen Daten (kein gemeinsames Backend).

## Arbeitsweise (bitte immer einhalten)
- Erst Plan und Architekturvorschlag, dann Code. Kein Code ohne meine Freigabe des Plans.
- Kleine Schritte, nach jedem Schritt lauffähig und getestet. Häufig committen.
- Wenn etwas unklar ist oder meinen Angaben widerspricht: nachfragen, nicht raten.
- Sag mir ehrlich, wenn eine Idee von mir technisch oder inhaltlich nicht sinnvoll ist.
- Antworten auf Deutsch, kurz und praxisnah. Code-Kommentare und UI-Texte auf Deutsch.

## Nutzer (Standardprofil, muss in der App einstellbar sein)
- Ziel: Lean-Bulk, ca. 0,25–0,3 kg Zunahme pro Woche. Tracking läuft separat in Yazio, die App ersetzt Yazio nicht.
- Tagestypen mit Kalorienziel:
  - Trainingstag (Gym plus E-Bike-Pendeln): 2.900 kcal
  - Calisthenics-Tag: 2.600 kcal
  - Rest Day: 2.400 kcal
- Makros Trainingstag (Vorschlag, bereinigt): 175 g Protein, 375 g KH, 75 g Fett. Die anderen Tage proportional skalieren. Die Skalierung bitte als Vorschlag anzeigen und von mir bestätigen lassen.
- Standard-Wochenzuordnung (änderbar): Mo–Fr Gym (Mittwoch Beine), Sa Calisthenics, So Rest Day.
- Morning Stack, täglich nüchtern: ca. 170–185 kcal, ca. 30 g KH, ca. 5 g Fett, 0 g Protein. Als eigener Eintrag, der jeden Tag vorbelegt ist.
- Basis-Supplements täglich: Creatin 5 g, Omega-3, Multivitamin, Flohsamenschalen (als Checkliste, nicht als Nährwerte).
- Sechs Mahlzeiten pro Tag: Frühstück, Morgensnack, Mittagessen, Nachmittagssnack, Abendessen, Abendsnack. Die Verteilung der Kalorien und Makros auf die Mahlzeiten ist noch offen und soll einstellbar sein.
- Tagesziele: ca. 500 g Gemüse, ca. 300 g Obst (an Rest- und Calisthenics-Tagen ca. 200 g), Ballaststoffe 35–40 g inklusive Flohsamen, Wasser bis zur Mittagspause ca. 2,5 l.

## Funktionen
1. Tagesansicht mit Mikronährstoff-Counter (Tag und Woche)
2. Wochenplaner
3. Rezepte
4. Automatische Einkaufsliste aus dem Wochenplan
5. Makro-Ziele je Tagestyp
6. Meal-Prep-Modus: Gesamtgewicht nach dem Kochen eingeben, durch Portionszahl (Standard 7) teilen, Portionsgewicht und Nährwerte pro Portion anzeigen. Beispiele: Chili con/sin Carne (ca. 500–550 g pro Portion), Skyr-Fladen (45 g Mehl, 45 g Skyr, 2,1 g Nährhefeflocken, 190 kcal pro Fladen).
7. Angebote der Märkte: Vorschläge für die Woche, alle guten Angebote, Angebote direkt beim ausgewählten Obst und Gemüse.

## Märkte (für Angebote und Einkaufsliste)
Alle folgenden Märkte sind relevant:
- Netto Offingen, Edeka Offingen, Lidl Burgau (Stammmärkte)
- Kaufland Dillingen
- dm Günzburg (Reindlstraße 4), dm Lauingen
- denn's Biomarkt Günzburg (Geschwister-Scholl-Straße 1 C)
- Rossmann Burgau
- Sonnenladen Gundelfingen (Alternative Bio)
- dm und Rossmann haben samstags zu.
- Die Märkte sollen in der App ein- und ausschaltbar sein.

## Datenquellen
- USDA FoodData Central und Open Food Facts.
- Die App muss offline funktionieren. Deshalb: benötigte Nährwerte lokal speichern (zwischenspeichern oder als vorbereitete Datenbank-Datei). Keine Live-Abfrage als Voraussetzung für den Alltagsbetrieb.
- API-Keys dürfen nie im Repository oder im ausgelieferten Client-Code stehen. Vorschlag zur Lösung bitte im Plan machen.

## Datenaustausch (JSON)
- `wochenpraeferenzen.json`: welches Gemüse und Obst ich in der Woche mag.
- `angebote.json`: wöchentlich von einem separaten Cowork-Agenten erzeugt (Prospekte der Märkte).
- Bitte vor dem Programmieren Schemas für beide Dateien vorschlagen (mit Versionsfeld) und mit mir abstimmen.
- Offen: Wie kommt `angebote.json` vom PC aufs Handy? Optionen im Plan vergleichen (Datei-Import, gehostete Datei o. Ä.).

## Technische Vorgaben (Vorschläge, im Plan begründen oder ändern)
- Ziel ist ein Samsung-Handy mit Chrome bzw. Samsung Internet.
- Service Worker für Offline-Betrieb, Web-App-Manifest für die Installation. Funktioniert nur über HTTPS oder localhost.
- Lokale Speicherung im Browser (z. B. IndexedDB), pro Gerät, keine Cloud.
- Export und Import aller Nutzerdaten als JSON-Datei (Backup), weil Browser-Speicher gelöscht werden kann.
- Möglichst einfacher Aufbau ohne schweren Build-Prozess. Ich bin Fachinformatiker, ich lese Code, aber ich will keine Überarchitektur.
- Mehrere Nutzer später: kein Hardcoding meiner Werte, alles über ein Profil einstellbar.

## Datenschutz
- Keine Gesundheitsdaten an externe Server senden.
- Keine Tracker, keine Analytics.
- Persönliche Daten (Profil, Gewicht, Einträge) nicht ins Git-Repository einchecken.

## Entscheidungen (abgestimmt am 03.10.2026)
- Architektur: Vanilla JS mit ES-Modulen, kein Build-Schritt, kein Framework. Hash-Router, IndexedDB, Service Worker. Rechenlogik als reine Funktionen in `js/logic/`, getestet mit `node --test`.
- Hosting: GitHub Pages (öffentliches Repo, keine persönlichen Daten darin). Alle Pfade relativ (`./`).
- Nährwerte: vorbereitete `data/lebensmittel.json`, erzeugt durch ein lokales Build-Skript; API-Key nur in `.env` (gitignored). Zusätzlich Barcode-Scan mit Live-Abfrage bei Open Food Facts, Treffer werden lokal gespeichert.
- Angebote: Der Nutzer stößt den Cowork-Agenten wöchentlich selbst an. Die App unterstützt Datei-Import und Abruf einer gehosteten Datei. Das bestehende Format von `angebote.json` (`schema_version`, Märkte mit verschachtelten Angeboten) ist maßgeblich.
- Kalorienziele: Trainingstag 2.875 kcal (175 g P, 375 g KH, 75 g F), Calisthenics 2.600 kcal, Rest Day 2.400 kcal.
- Skalierung: Protein bleibt fest, KH und Fett werden im Verhältnis des Trainingstags angepasst (Calisthenics ca. 328 g KH / 65 g F, Rest ca. 293 g KH / 59 g F). Als Vorschlag anzeigen, Nutzer bestätigt.
- Morning Stack und Supplements zählen in die Tagesziele. Supplements bleiben eine Checkliste, haben aber optionale Nährwerte pro Einnahme (inkl. Mikros aus dem Multivitamin).
- Mahlzeitenverteilung: Startwert 20/10/25/10/25/10 % (Frühstück bis Abendsnack), einstellbar.
- Mikronährstoffe: alle gesundheitlich relevanten (Vitamine A, C, D, E, K, B1, B2, B3, B6, B9, B12; Calcium, Eisen, Magnesium, Zink, Kalium, Natrium, Jod, Selen, Phosphor; Ballaststoffe, Omega-3, Zucker, gesättigte Fettsäuren). Unvollständige Daten (z. B. aus Open Food Facts) kennzeichnen.
- Zähler: Morning Stack zählt, wenn „getrunken“ (vorbelegt), Supplements, wenn abgehakt. Ziele pro Mahlzeit ziehen beide immer vorher ab. Wochenansicht = Durchschnitt über Tage mit Einträgen. Referenzwerte DGE (Altersgruppe im Profil), Obergrenzen EFSA, in `js/logic/referenzwerte.js`. Kartoffeln zählen nicht zum Gemüseziel.
- Wasser: Presets 250/500/800 ml + freie Eingabe; „bis Mittag“ zählt Einträge vor der eingestellten Uhrzeit.
- Profil: Der Code enthält nur ein neutrales Standardprofil. Neue Nutzer durchlaufen beim ersten Start die Ersteinrichtung (Körperdaten, Sport mit eigenem kcal-Verbrauch, Wochenplan, Ziel) oder stellen ein Backup wieder her. Persönliche Profile liegen nur lokal (`nutzerdaten/`, gitignored) und im Backup.
- Kalorienbedarf: Mifflin-St Jeor × Alltags-PAL (ohne Sport) + Sport-kcal des Tagestyps + Zielzuschlag (kg/Woche × 7.700 / 7), auf 25 kcal gerundet. Makros: Protein g/kg (alle Tage gleich), Fett-Anteil, Rest KH. Berechnung immer als Vorschlag, Nutzer bestätigt.
- Backup-Import ersetzt nur die Bereiche, die in der Datei stehen (reine Profil-Datei lässt Tage unverändert).
- Gewicht: täglich morgens manuell eintragen (Health Connect ist für Web-Apps nicht zugänglich). Wochendurchschnitt; wöchentlicher Anpassungsvorschlag ab 2 Wochen Daten, max. ±150 kcal/Tag pro Woche, nur mit Bestätigung.
- Training: Übungsdatenbank in `js/daten/uebungen.js` (Gym, Calisthenics, Cardio, Sport, Mobility, Alltag; MET nach 2024 Adult Compendium). kcal netto = (MET − 1) × kg × h; Kraft-Einheiten über Dauer × Intensität. Hybrid-Regel: geplantes Training steckt im Tagestyp, Training mit `zusatz: true` erhöht das Tagesziel (Protein fest, KH/Fett im Verhältnis). Navigation: Heute · Training · Rezepte · Woche · Mehr.
- Bedienung: Zahnrad immer oben rechts; öffnet Seiten-Einstellungen (`ansicht.einstellungen`) plus Darstellung. Stil-Schalter „Episch / Schlicht“ (pro Gerät, `data-stil`, Texte über `episch()`), Startseite „Lager“ (Hub mit Lagerfeuer). Navigation: Lager · Ernährung · Training · Woche · Mehr.
- RPG-Ebene (geplant, P2–P9): Erfolge mit Stufen Bronze → Silber → Gold → Platin → Obsidian → Legendär plus geheime Erfolge; Charakter-Werte (Stärke, Ausdauer, Tempo, Beweglichkeit, Willenskraft, Disziplin), Level, Klasse nach Stärken; Ränge Schlacke → Legende (Bestleistung der letzten 12 Wochen, körpergewichtsbezogen); Freunde per geteilter Rangkarte (kein Server); Tagebuch episch/schlicht; Ernährungsweisen (vegan, vegetarisch, pescetarisch …) und Diäten (keto, low carb …) als getrennte Listen. Maskottchen „Brom“: Mischung aus Schmied und Zwerg, gedrungen und sehr muskulös, Vollbart, normale Alltagskleidung, respektvoll und knapp, nie Push-Nachrichten, abschaltbar.
- Später: Capacitor-App (Android, evtl. iOS), zunächst nur für den Nutzer; Open Source mit Spenden geplant, Repo bleibt vorerst öffentlich.
- Bewertung: Obst/Gemüse 0–10 (0 = nie). Rezepte: Gesamtnote 1–10, Teilnoten Geschmack, Sättigung, Aufwand, Preis, dazu Tags, Geschmacksbeschreibung, Vorteile, Notiz, „wieder essen“. Geschmack und Vorteile werden immer beschrieben.

## Schrittplan
1. PWA-Gerüst (offline, installierbar)
2. Profil und Ziele
3. Lebensmitteldatenbank, Morning Stack, Supplements
4. Tagesansicht
5. Backup-Export/-Import
6. Ersteinrichtung, Körperdaten, Sport, Gewichtsziel
7. Gewicht-Tracking mit Wochendurchschnitt und Kalorien-Anpassung
8. Trainings-Tracker: A Workouts loggen ✓ · B Vorlagen und Wochenplan · C Fortschritt (1RM, Rekorde, Volumen je Muskel)
9. Rezepte mit Bewertung
10. Meal-Prep-Modus
11. Wochenplaner und Einkaufsliste
12. Barcode-Scan mit Open Food Facts
13. Angebote

## Entwicklung
- Lokaler Server: `python -m http.server 8080` (Konfiguration in `.claude/launch.json`).
- Tests: `npm test` (Node 24, keine Abhängigkeiten). Tests liegen in `test/*.test.js`.
- Bei Änderungen an App-Dateien `VERSION` in `sw.js` erhöhen und neue Dateien in `DATEIEN` eintragen.
- Icons neu erzeugen: `python tools/icons_erzeugen.py`.
- Lebensmitteldatenbank: Liste in `tools/lebensmittel-liste.js` pflegen, dann `node tools/build-lebensmittel.js` → `data/lebensmittel.json`.
  - Benötigt die USDA-Rohdaten (ohne API-Key) entpackt unter `rohdaten/sr_legacy/` (gitignored): https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
  - Kohlenhydrate werden auf EU-Kennzeichnung umgerechnet (USDA-KH minus Ballaststoffe).
  - Jod fehlt in USDA SR Legacy fast immer; Hauptquelle in Deutschland ist Jodsalz.
