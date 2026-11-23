# Elan – Stand für den Planungschat (23.11.2026)

Zum Einfügen in den Planungschat. Enthält nur, was im Repo belegt ist (Code, Tests, `docs/`).

## 1. Was Elan ist

- Private Gesundheits-App von Léon: Android-APK (Capacitor) und PWA aus demselben Code, komplett deutsch, offline-first.
- Umfang: alles außer Training. Dazu gehören Ernährung, Körperwerte, Schlaf, Wasser, Supplements, Labor, Symptome und Fortschritt. Training bleibt in Léons Fitness-App; Elan liest Trainings nur über Health Connect, um den Tagestyp zu setzen.
- Feste Regeln:
  - Daten nur lokal (IndexedDB), kein Konto, kein Server.
  - Die App deutet nichts medizinisch.
  - Netz nur auf Knopfdruck.
  - Vanilla JavaScript ohne Framework.
  - Version bleibt 1.0.0, bis Léon zufrieden ist.
- Arbeitsweise: Runden mit Plan, Tests, Lernlog, nummerierten Vorschlägen; Léon gibt mit „ja/nein“ frei. Regeln: `CLAUDE.md`.

## 2. Was die App heute kann

| Bereich | Funktionen |
|---|---|
| Heute | 6 Mahlzeiten mit Tagesscheibe; Ringe für Eiweiß, KH, Fett, Ballaststoffe, Wasser; Tagestyp (Gym, Calisthenics, Rest); Tageswerte (Gewicht, Schlaf, Schritte); Wasser mit 3 eigenen Knöpfen; Supplements abhaken; Check-in (Energie, Stimmung, Stress 1–5); alle Nährwerte mit DGE-Referenz |
| Eintragen | Suche in 184 Basis-Zutaten und eigenen Zutaten; „Zuletzt eingetragen“ mit einem Tipp; „Wie am Vortag“; Schnell eintragen (nur kcal, Makros freiwillig); **Meine Mahlzeiten** (Vorlagen, neu); Open Food Facts auf Knopfdruck |
| Unterwegs | 8 Ketten mit deutscher Karte (McDonald's, Burger King, KFC, Subway, dean&david, Hans im Glück, Peter Pane, Coffee Fellows), 1.026 Gerichte. **Budget-Rechner:** „Ich habe X kcal offen“, Sortierung Viel Eiweiß / Mager / Budget voll, ohne Getränke und Saucen, Frühstück nur morgens. Dazu ein Getränk ohne Kalorien als Tipp, Favoriten mit Stern (neu), Ketten ausblendbar (neu) |
| Woche | Wochenplan, Mahlzeiten einplanen und übernehmen, Einkaufsliste mit Angeboten |
| Rezepte | Zutaten, Portionen, Schritte mit „Prinzip dahinter“, Meal-Prep, Import aus Text |
| Fortschritt | Rückblick 7 Tage gegen Vorwoche; Gewicht mit 7-Tage-Schnitt gegen Wochenziel; Ruhepuls, Körperfett, HRV; 19 Körpermaße als Kacheln (wählbar); Verläufe; Labor; Symptome |
| Android | Health Connect (nur lesen: Schritte, Gewicht, Schlaf, Ruhepuls, Körperfett, HRV, Trainings); Widget (kcal übrig, Wasser); lokale Erinnerungen (Wasser, Supplements, Check-in); Vibration |
| Mehr | Ziele je Tagestyp, Körper und Wasser, Wochenplan, Mahlzeit-Anteile, Referenzgruppe, Health Connect, Erinnerungen, Unterwegs, Backup, Coach-Export (Wochenbericht als Text, inkl. Körper und Befinden), Darstellung (Blatt/Zitrus, hell/dunkel), Datenschutz |

## 3. Technik in Zahlen

- 15 Ansichten, 28 Logik-Module, rund 7.300 Zeilen JavaScript.
- Tests: 208 Unit-Tests (`npm test`) und 143 Kriterien im Browsertest auf einem Handy-Emulator (`node tools/pruefe-app.cjs`).
- Schema-Version 7. Neue Daten seit 15.11. liegen als Einstellungen; deshalb war keine Migration nötig.
- GitHub: jede Runde als PR, die Action `apk` baut bei jedem PR. Letzter PR: #31.
- Android-Rechte: 7 Health-Connect-Leserechte, Benachrichtigungen. Keine exakten Wecker, keine Kamera.

## 4. Seit 15.11.2026 gebaut (Runden 6–14)

1. HRV aus Health Connect, täglicher Check-in, Erinnerungen als lokale Benachrichtigungen.
2. Plus-Knopf repariert: Ein übriggebliebenes `transform` des Seitenübergangs ließ ihn mit der Seite mitrollen.
3. Schnell eintragen; Coach-Bericht mit Ruhepuls, HRV, Check-in, Trainings.
4. Unterwegs-Rechner, dann der Budget-Rechner wie „Unterwegs“ in der fin-App, dann die Ketten-Listen.
5. Getränk-Tipp, vierteljährliche Aktualisierung der Listen als geplante Aufgabe (nächste am 1.2.2027).
6. Meine Mahlzeiten, Unterwegs-Favoriten, Ketten ausblenden.

## 5. Entscheidungen (mit Datum)

| Datum | Entscheidung |
|---|---|
| 15.11. | „All in all Health-App“ ohne Training |
| 15.11. | Health Connect zusätzlich: HRV und Trainings (nur Tagestyp) |
| 15.11. | Benachrichtigungen nur lokal, ohne exakte Wecker |
| 15.11. | Ketten-Listen werden mitgeliefert. Das mögliche Datenbankrecht der Ketten ist Léons Risiko (`OFFENE-FRAGEN.md` Nr. 11) |
| 15.11. | Nur Ketten mit deutscher Karte. Starbucks, Five Guys, Pizza Hut und weitere bewusst nicht: es gibt nur US-Werte |
| 15.11. | Keine erfundenen Nährwerte. McDonald's-Seite blockt Bots, das wird nicht umgangen; Werte über nutriscan.app, das die Ketten zitiert |

## 6. Offen und bekannte Probleme

- **Nicht am Handy getestet:** Rückmeldung zu den Aufgaben A1–A22 in `docs/AUFGABEN-LEON.md` steht aus. Vor allem fehlen Health Connect bei installierten APKs außerhalb des Play Stores, Erinnerungen, Widget und Bedienung mit Tastatur.
- **Wackliger Test:** Der Maß-Test („Unterbauch: 88 cm gespeichert“) scheitert selten (am 23.11. in 2 von 7 Läufen). Die Ursache ist unbekannt; die Diagnose prüft jetzt, ob der Wert gespeichert wurde.
- **Daten:** McDonald's, Burger King, KFC und die übrigen Ketten kommen aus zweiter Hand (nutriscan.app, Stand Okt. 2026), nicht direkt bei den Ketten abgeglichen. Nur Subway stammt aus dem offiziellen PDF.
- **Offene Fragen** (`docs/OFFENE-FRAGEN.md`):
  - BLS 4.0 als deutsche Grunddatenbank (Lizenz nicht geprüft, Seiten gesperrt)
  - Angebote automatisch abrufen (rechtlich ungeklärt)
  - USDA-Schlüssel
  - Open-Food-Facts-Limits nicht belegt
  - automatischer Release-Bau mit Signierschlüssel auf GitHub (`AUFGABEN-LEON.md` B)

## 7. Ideen für die nächsten Runden

| Idee | Nutzen | Aufwand | Risiko |
|---|---|---|---|
| Rückmeldung vom Gerät abarbeiten (A1–A22) | Fehler, die nur am echten Handy auftreten | S–M | gering |
| Barcode-Scanner (Kamera) + Open Food Facts | Packungen in Sekunden erfassen | M | Kamera-Recht nötig, Léons Ja |
| BLS 4.0 einbinden | etwa 40× mehr deutsche Lebensmittel, offline | L | Lizenz und Dateigröße |
| Weitere Ketten mit deutscher Karte (Nordsee, Vapiano, L'Osteria, Domino's) | Unterwegs vollständiger | M | Quellenlage |
| Mahlzeit-Vorlagen auch aus Rezepten und der Woche anlegen | weniger Tippen | S | gering |
| Wochenbericht als Bild oder PDF teilen | für Coach oder Arzt | M | gering |
| Ursache des wackligen Maß-Tests finden | verlässliche Tests | S–M | gering |

## 8. Wo was steht

`CLAUDE.md` (Regeln), `docs/AUFGABEN-LEON.md` (Tests am Handy), `docs/OFFENE-FRAGEN.md`, `docs/DATENMODELL.md`, `docs/ANDROID.md`, `docs/UNTERWEGS-FORMAT.md`, `docs/lernen/LERNLOG.md` (jede Runde), `js/daten/neuigkeiten.js` (Was ist neu).
