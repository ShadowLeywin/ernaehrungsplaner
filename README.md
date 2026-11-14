# Elan

Ernährung und Health-Daten im Blick. Eine Progressive Web App: offline nutzbar, komplett deutsch, alle Daten bleiben auf deinem Gerät. Kein Konto, kein Server, keine Auswertung.

## Was Version 0.8 kann

- **Tagebuch** mit sechs Mahlzeiten, Energie, Eiweiß, Kohlenhydraten, Fett und Ballaststoffen gegen dein Tagesziel
- **Alle Nährwerte** für den Tag und als Wochenschnitt, eine Mahlzeit vom Vortag übernehmen, ganze Tage kopieren
- **Tagestypen** Gym, Calisthenics und Rest mit eigenen Zielen und einem Wochenplan
- **Wochenplan:** Mahlzeiten für sieben Tage vormerken und mit einem Tipp ins Tagebuch übernehmen
- **Einkaufsliste** aus dem Wochenplan: Rezepte werden in Zutaten aufgelöst, Gleiches zusammengezählt, nach Kategorie sortiert, abhakbar und teilbar
- **Rezepte** mit Zutaten, Portionen und Schritten; je Schritt ein „Prinzip dahinter“. Nährwerte je Portion werden berechnet, eine Portion landet mit einem Tipp im Tagebuch
- **Rezept-Import** aus eingefügtem oder geteiltem Text und aus Schema.org-Daten einer Seite; die App ruft dabei keine fremden Seiten ab
- **Coach-Export:** Wochenbericht als Text zum Kopieren, dazu ein Prompt in [docs/COACH-PROMPT.md](docs/COACH-PROMPT.md)
- **Meal-Prep:** Gewicht nach dem Kochen, Haltbarkeit und „einfrierbar“ am Rezept; der Wochenplan warnt, wenn eine vorgekochte Portion zu alt wäre
- **Mag-Liste** für Obst und Gemüse: ja, nur roh, nur gekocht, nein, Sonderfall
- **Health:** Gewicht mit 7-Tage-Schnitt gegen ein Wochenziel, Wasser, Schlaf, Schritte, Supplements zum Abhaken, Körpermaße
- **Laborwerte** mit Datum und Referenzbereich; **Symptome** mit Stärke, Uhrzeit und Zuordnung zu Mahlzeiten
- **Zutaten:** 184 mitgelieferte Lebensmittel, eigene Zutaten, Suche bei Open Food Facts auf Knopfdruck
- **Backup** als Datei speichern und wieder einspielen
- Hell und dunkel, läuft ohne Netz

Geplant: Angebote, Referenzwerte für Vitamine und Mineralstoffe, Feinschliff nach Tests am Handy. Siehe [docs/PHASENPLAN.md](docs/PHASENPLAN.md).

## Installieren

Seite in Chrome auf dem Handy öffnen, dann im Menü „Zum Startbildschirm hinzufügen“.

## Entwickeln

Kein Build-Schritt, keine Abhängigkeiten.

```bash
node tools/server.cjs        # http://127.0.0.1:8080/
npm test                     # Unit-Tests
node tools/pruefe-app.cjs    # Durchlauf im Handy-Emulator (braucht Playwright)
```

Regeln und Aufbau stehen in [CLAUDE.md](CLAUDE.md), das Datenmodell in [docs/DATENMODELL.md](docs/DATENMODELL.md).

## Daten und Quellen

- Mitgelieferte Nährwerte: USDA FoodData Central, SR Legacy (gemeinfrei)
- Online-Suche: Open Food Facts (Open Database License)
- Schrift: Bricolage Grotesque (SIL Open Font License)

Die Angaben dienen der Orientierung und ersetzen keine ärztliche Beratung.
