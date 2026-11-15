# Konzept

Elan ist eine Ernährungs- und Health-App als Android-App und PWA aus demselben Code: offline, deutsch, alle Daten auf dem Gerät. Kein Trainingslog.

## Die neun Module

| Nr. | Modul | Kern | Stand |
|---|---|---|---|
| 1 | Zutaten | lokale Datenbank, eigene Zutaten, Suche bei Open Food Facts | 0.1: vorhanden. Offen: USDA-Suche, BLS 4.0, Barcode per Kamera |
| 2 | Rezepte | anlegen und ändern, Portionen, Nährwerte automatisch, je Schritt ein Feld „Prinzip dahinter“ | 0.10: vorhanden, mit Kopieren und Umsortieren der Schritte |
| 3 | Tagebuch | 6 Slots, Makros, Ballaststoffe, Ziele je Tagestyp | 1.0: vollständig, mit Vergleich zu den Referenzwerten der DGE |
| 4 | Wochenplan, Einkauf, Meal-Prep | Woche planen, Einkaufsliste automatisch, Portionen, Haltbarkeit, Einfrieren | 0.5: vorhanden. Offen: gekochte Chargen mit Restportionen verfolgen |
| 5 | Angebote | Angebote bei den Zutaten zeigen | 0.9: von Hand und per eigener Datei vorhanden. Automatischer Abruf bleibt aus, bis die Quelle geklärt ist |
| 6 | Mag-Liste | je Obst und Gemüse: J (roh und gekocht), R (nur roh), K (nur gekocht), N (nein), S (Sonderfall); steuert Vorschläge | 0.5: vorhanden, wirkt in Suchlisten. Offen: eigene Essens-Vorschläge |
| 7 | Health | Gewicht mit 7-Tage-Schnitt gegen Wochenziel, Maße, Laborwerte, Schlaf, Wasser, Supplements, Symptome mit Bezug zu Mahlzeiten, Schritte | 0.10: vollständig, mit Verläufen |
| 8 | Import | Rezept aus eingefügtem Text, Android Share Target, später Schema.org | 0.8: Text, Schema.org und Share Target vorhanden. Share Target am Handy noch zu prüfen |
| 9 | Export | Backup als JSON, Coach-Export als Wochenbericht | 0.8: Backup und Coach-Export vorhanden; Prompt dazu in `docs/COACH-PROMPT.md` |

## Bedienung

- „Mehr“ ist ein gruppiertes Menü mit Unterseiten (Ziele und Tagebuch, Lebensmittel, Daten, App), darin „Über Elan“ und „Was ist neu“.
- Beim ersten Start führt eine kurze Einrichtung in drei Schritten zum ersten Eintrag.
- Eintragen braucht möglichst wenige Tipps: Zuletzt Gegessenes mit einem Tipp und der Menge vom letzten Mal; Wasser direkt auf „Heute“.
- Fünf Seiten: Heute, Woche, Rezepte, Fortschritt, Mehr (seit 15.11.2026 „Fortschritt“ statt „Health“). Zutaten und Mag-Liste sind über „Rezepte“ und „Mehr“ erreichbar; man braucht sie selten direkt, weil die Suche beim Eintragen alles findet.
- Zwei Designs: **Blatt** (Standard, schlicht im Stil von iOS, in Elans Grün: große Titel, gruppierte Listen mit farbigen Symbolen, ruhige Leiste ohne Glas, Ringe je Nährwert, Farbton je Mahlzeit) und **Zitrus** (das erste, helle Design). Beide in hell und dunkel.
- „Heute“: Kalorien-Karte mit Tagesscheibe, sechs Kacheln (Eiweiß, Kohlenhydrate, Fett, Ballaststoffe, Wasser zum Antippen, alle Nährwerte), eine Karte mit allen Mahlzeiten, Plus-Knopf für die Mahlzeit zur Uhrzeit.
- Bewegung: Seiten gleiten in Richtung der Leiste, Blätter gleiten hinein und hinaus, Ringe füllen sich vom letzten Stand. Alles unter 0,3 Sekunden; bei „Bewegung reduzieren“ des Systems fällt sie weg.
- Signatur der App ist die **Tagesscheibe**: sechs Segmente wie eine aufgeschnittene Zitrusfrucht, eines je Mahlzeit. Breite = Anteil am Tagesziel, Füllung = gegessen.
- Farben je Makro: in Zitrus Fruchtfarben (Eiweiß Grapefruit, Kohlenhydrate Zitrone, Fett Avocado, Ballaststoffe Heidelbeere), in Blatt kräftige Töne nach iOS (Eiweiß Pink, Kohlenhydrate Gelb, Fett Blau, Ballaststoffe Lila, Wasser Cyan); Grün bleibt dem Akzent vorbehalten.
- Über dem Ziel liegen ist kein Fehler: kein Rot, nur ein dunkleres Grün.

## Technik-Empfehlung

| Frage | Empfehlung | Begründung | Alternative |
|---|---|---|---|
| Framework | keines, Vanilla JS mit ES-Modulen | kein Build, jede Datei lesbar, nichts veraltet | Preact oder Svelte, wenn die Ansichten stark wachsen; kostet einen Build-Schritt |
| Speicher | IndexedDB mit eigener dünner Schicht | reicht für Mengen dieser App, keine Abhängigkeit | Bibliothek Dexie: bequemer, aber eine Abhängigkeit mehr |
| Tests | `node --test` für Logik, Playwright-Skript für die Oberfläche | Logik in Millisekunden prüfbar, Oberfläche wie am Handy | Vitest und Playwright Test: mehr Komfort, braucht `node_modules` |
| Hosting | GitHub Pages | kostenlos, HTTPS, aus dem Repo | Cloudflare Pages oder Netlify: gleiche Leistung, zusätzliches Konto |
| Android-App | Capacitor 8 | packt die vorhandene Web-App, keine zweite Codebasis, native Plugins für Teilen und Dateien | Trusted Web Activity: kleiner, braucht aber eine Datei auf der Domain-Wurzel, die GitHub Pages für dieses Repo nicht liefert |
| Offline | Service Worker, Cache zuerst, Dateiliste von Hand | alle Dateien einer Version passen zusammen | Workbox: erzeugt die Liste automatisch, braucht Build |
| Schrift | Inter (Blatt) und Bricolage Grotesque (Zitrus), selbst gehostet (OFL) | kein Abruf bei Dritten, offline da; Inter kommt der Apple-Schrift am nächsten | SF Pro: darf nur für Apple-Plattformen genutzt werden; Systemschrift: auf Android Roboto, kein einheitlicher Look |

## Datenschutz

- Kein Konto, kein Server, keine Auswertung der Nutzung.
- Netzabrufe nur auf Knopfdruck. Gesendet wird ein Suchbegriff oder Barcode, nie etwas aus Tagebuch oder Health.
- Backups sind Dateien beim Nutzer. `.gitignore` sperrt sie für das Repo.

## Vorbilder für Aufbau und Bedienung

| Muster | Woher | Umsetzung in Elan |
|---|---|---|
| Reibung beim Eintragen ist der Hauptgrund aufzuhören; man misst Tipps je Mahlzeit | Vergleiche von MacroFactor und Cronometer, Ratgeber zu Ernährungs-Apps | Eintragen mit einem Tipp aus „Zuletzt“, Rückgängig statt Rückfrage |
| Kurze Einrichtung, schnell zum ersten Eintrag | Ratgeber zu Onboarding von Ernährungs-Apps | drei Schritte, überspringbar, Backup einspielen gleich am Anfang |
| Viele Einstellungen in Gruppen und Unterseiten, Wichtiges zuerst | Android-Designrichtlinien zu Einstellungen | Menü „Mehr“ mit vier Gruppen |
| Navigationsleiste mit drei bis fünf Zielen | Android-Richtlinien zu Navigation | fünf Ziele: Heute, Woche, Rezepte, Fortschritt, Mehr |
| Einstellungen: jede Zeile zeigt den aktuellen Stand, ruhige Karten, Überblick oben, „Rechtliches und Hilfe“ unten | Bildschirmfotos von Léons Fitness-App (15.11.2026) | Menü „Mehr“: Aufbau übernommen, Inhalte, Texte und Farben eigen |
| Eintragen ist die Startseite, Fortschritt ein eigener Bereich | MyFitnessPal (Tagebuch als Startseite, eigener Tab „Progress“), Foodnoms (Eintragen im Mittelpunkt, eigenes Insights-Dashboard) | Tageswerte, Wasser, Supplements auf „Heute“; Gewicht, Maße, Verläufe unter „Fortschritt“ |
| Dunkles Design mit Ring-Kacheln, Mahlzeiten-Karte, rundem Plus-Knopf | Bildschirmfotos einer Fitness-App von Léon (14.11.2026) | Blatt: Aufbau übernommen, Farben, Schrift und Symbole eigen |
| Apple-Stil: große Titel, gruppierte Listen, farbige Symbole, Ringe | Léons Wunsch „allgemein der Apple-Style“, dann „schlicht, ohne Glas, das Grüne“ | Blatt, mit Inter statt SF Pro |

## Annahmen [A]

- [A] Name „Elan“ gilt, bis Léon einen anderen wählt.
- [A] Fünf Hauptseiten sind die Obergrenze für die untere Leiste.

## Quellen (mit Datum)

- [MyFitnessPal: Progress Overview](https://support.myfitnesspal.com/hc/en-us/articles/45246617814669), [Foodnoms für iOS 26](https://foodnoms.com/news/ios-26-liquid-glass), [Gestaltung von Kalorien-Apps](https://screensdesign.com/articles/calorie-tracker-app-design/), [Health-Connect-Datentypen](https://developer.android.com/health-and-fitness/health-connect/data-types), [Plugin @capgo/capacitor-health](https://capgo.app/de/docs/plugins/health/getting-started/), abgerufen 15.11.2026.
- [MacroFactor vs Cronometer](https://macrofactor.com/macrofactor-vs-cronometer/) (Herstellerangabe), [Fitia: was einen Kalorienzähler einfach macht](https://fitia.app/learn/article/what-makes-calorie-counter-simple-easy-app-2026/), [Android: Einstellungen](https://developer.android.com/design/ui/mobile/guides/patterns/settings), [Android: Layout- und Navigationsmuster](https://developer.android.google.cn/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns?hl=en), abgerufen 14.11.2026.

- Startauftrag „Session 0“ von Léon, 13.11.2026.
- Lizenz der Schrift Inter: `schrift/LIZENZ-OFL-INTER.txt` (SIL Open Font License 1.1), Paket `@fontsource-variable/inter` 5.3.0, abgerufen 14.11.2026. Lizenz von SF Pro nur für Apple-Plattformen: [Apple Developer Forums](https://developer.apple.com/forums/thread/733267), abgerufen 14.11.2026.
- Lizenz der Schrift: `schrift/LIZENZ-OFL.txt` (SIL Open Font License 1.1), Paket `@fontsource-variable/bricolage-grotesque` 5.3.0, abgerufen 13.11.2026.
