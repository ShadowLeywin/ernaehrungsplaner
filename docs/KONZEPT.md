# Konzept

Elan ist eine Ernährungs- und Health-App als PWA: offline, deutsch, alle Daten auf dem Gerät. Kein Trainingslog.

## Die neun Module

| Nr. | Modul | Kern | Stand |
|---|---|---|---|
| 1 | Zutaten | lokale Datenbank, eigene Zutaten, Suche bei Open Food Facts | 0.1: vorhanden. Offen: USDA-Suche, BLS 4.0, Barcode per Kamera |
| 2 | Rezepte | anlegen und ändern, Portionen, Nährwerte automatisch, je Schritt ein Feld „Prinzip dahinter“ | 0.2: vorhanden. Offen: Schritte umsortieren, Rezept kopieren |
| 3 | Tagebuch | 6 Slots, Makros, Ballaststoffe, Ziele je Tagestyp | 0.3: vorhanden, mit allen Nährwerten für Tag und Wochenschnitt, Kopieren, einstellbaren Anteilen. Offen: Referenzwerte |
| 4 | Wochenplan, Einkauf, Meal-Prep | Woche planen, Einkaufsliste automatisch, Portionen, Haltbarkeit, Einfrieren | 0.5: vorhanden. Offen: gekochte Chargen mit Restportionen verfolgen |
| 5 | Angebote | Angebote bei den Zutaten zeigen | geplant, Session 6; Datenquelle ungeklärt |
| 6 | Mag-Liste | je Obst und Gemüse: J (roh und gekocht), R (nur roh), K (nur gekocht), N (nein), S (Sonderfall); steuert Vorschläge | 0.5: vorhanden, wirkt in Suchlisten. Offen: eigene Essens-Vorschläge |
| 7 | Health | Gewicht mit 7-Tage-Schnitt gegen Wochenziel, Maße, Laborwerte, Schlaf, Wasser, Supplements, Symptome mit Bezug zu Mahlzeiten, Schritte | 0.7: vollständig bis auf Verläufe für Maße, Schlaf und Schritte |
| 8 | Import | Rezept aus eingefügtem Text, Android Share Target, später Schema.org | geplant, Session 9 |
| 9 | Export | Backup als JSON, Coach-Export als Wochenbericht | Backup in 0.1 vorhanden; Coach-Export Session 9 |

## Bedienung

- Fünf Seiten seit 0.6: Heute, Woche, Rezepte, Health, Mehr. Zutaten und Mag-Liste sind über „Rezepte“ und „Mehr“ erreichbar; man braucht sie selten direkt, weil die Suche beim Eintragen alles findet.
- Signatur der App ist die **Tagesscheibe**: sechs Segmente wie eine aufgeschnittene Zitrusfrucht, eines je Mahlzeit. Breite = Anteil am Tagesziel, Füllung = gegessen.
- Fruchtfarben je Makro: Eiweiß Grapefruit, Kohlenhydrate Zitrone, Fett Avocado, Ballaststoffe Heidelbeere.
- Über dem Ziel liegen ist kein Fehler: kein Rot, nur ein dunkleres Grün.

## Technik-Empfehlung

| Frage | Empfehlung | Begründung | Alternative |
|---|---|---|---|
| Framework | keines, Vanilla JS mit ES-Modulen | kein Build, jede Datei lesbar, nichts veraltet | Preact oder Svelte, wenn die Ansichten stark wachsen; kostet einen Build-Schritt |
| Speicher | IndexedDB mit eigener dünner Schicht | reicht für Mengen dieser App, keine Abhängigkeit | Bibliothek Dexie: bequemer, aber eine Abhängigkeit mehr |
| Tests | `node --test` für Logik, Playwright-Skript für die Oberfläche | Logik in Millisekunden prüfbar, Oberfläche wie am Handy | Vitest und Playwright Test: mehr Komfort, braucht `node_modules` |
| Hosting | GitHub Pages | kostenlos, HTTPS, aus dem Repo | Cloudflare Pages oder Netlify: gleiche Leistung, zusätzliches Konto |
| Offline | Service Worker, Cache zuerst, Dateiliste von Hand | alle Dateien einer Version passen zusammen | Workbox: erzeugt die Liste automatisch, braucht Build |
| Schrift | Bricolage Grotesque, selbst gehostet (OFL) | kein Abruf bei Dritten, offline da | Systemschrift: 41 KB weniger, weniger Charakter |

## Datenschutz

- Kein Konto, kein Server, keine Auswertung der Nutzung.
- Netzabrufe nur auf Knopfdruck. Gesendet wird ein Suchbegriff oder Barcode, nie etwas aus Tagebuch oder Health.
- Backups sind Dateien beim Nutzer. `.gitignore` sperrt sie für das Repo.

## Annahmen [A]

- [A] Name „Elan“ gilt, bis Léon einen anderen wählt.
- [A] Fünf Hauptseiten sind die Obergrenze für die untere Leiste.

## Quellen (mit Datum)

- Startauftrag „Session 0“ von Léon, 13.11.2026.
- Lizenz der Schrift: `schrift/LIZENZ-OFL.txt` (SIL Open Font License 1.1), Paket `@fontsource-variable/bricolage-grotesque` 5.3.0, abgerufen 13.11.2026.
