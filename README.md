# Elan

Ernährung und Health-Daten im Blick. Als Android-App und als Web-App: offline nutzbar, komplett deutsch, alle Daten bleiben auf deinem Gerät. Kein Konto, kein Server, keine Auswertung.

## Was Version 1.0 kann

- **Tagebuch** mit sechs Mahlzeiten, Energie, Eiweiß, Kohlenhydraten, Fett und Ballaststoffen gegen dein Tagesziel
- **Vergleich mit den Referenzwerten der DGE** für Vitamine und Mineralstoffe
- **Alle Nährwerte** für den Tag und als Wochenschnitt, eine Mahlzeit vom Vortag übernehmen, ganze Tage kopieren
- **Tagestypen** Gym, Calisthenics und Rest mit eigenen Zielen und einem Wochenplan
- **Wochenplan:** Mahlzeiten für sieben Tage vormerken und mit einem Tipp ins Tagebuch übernehmen
- **Einkaufsliste** aus dem Wochenplan: Rezepte werden in Zutaten aufgelöst, Gleiches zusammengezählt, nach Kategorie sortiert, abhakbar und teilbar
- **Rezepte** mit Zutaten, Portionen und Schritten; je Schritt ein „Prinzip dahinter“. Nährwerte je Portion werden berechnet, eine Portion landet mit einem Tipp im Tagebuch
- **Angebote** je Zutat und Markt, von Hand oder aus einer eigenen Datei ([Format](docs/ANGEBOTE-FORMAT.md)); das günstigste steht in der Einkaufsliste
- **Rezept-Import** aus eingefügtem oder geteiltem Text und aus Schema.org-Daten einer Seite; die App ruft dabei keine fremden Seiten ab
- **Coach-Export:** Wochenbericht als Text zum Kopieren, dazu ein Prompt in [docs/COACH-PROMPT.md](docs/COACH-PROMPT.md)
- **Meal-Prep:** Gewicht nach dem Kochen, Haltbarkeit und „einfrierbar“ am Rezept; der Wochenplan warnt, wenn eine vorgekochte Portion zu alt wäre
- **Mag-Liste** für Obst und Gemüse: ja, nur roh, nur gekocht, nein, Sonderfall
- **Health:** Gewicht mit 7-Tage-Schnitt gegen ein Wochenziel, Wasser, Schlaf, Schritte, Supplements zum Abhaken, Körpermaße
- **Laborwerte** mit Datum und Referenzbereich; **Symptome** mit Stärke, Uhrzeit und Zuordnung zu Mahlzeiten
- **Zutaten:** 184 mitgelieferte Lebensmittel, eigene Zutaten, Suche bei Open Food Facts auf Knopfdruck
- **Backup** als Datei speichern und wieder einspielen; die App erinnert daran, wenn das letzte zu alt ist
- Hell und dunkel, läuft ohne Netz

Geplant: Feinschliff nach Tests am Handy. Siehe [docs/PHASENPLAN.md](docs/PHASENPLAN.md).

## Installieren

**Android-App:** APK aufs Handy laden, öffnen, die Installation aus dieser Quelle einmal erlauben. Bauen: [docs/ANDROID.md](docs/ANDROID.md).

**Web-App:** https://shadowleywin.github.io/ernaehrungsplaner/ in Chrome öffnen, dann im Menü „Zum Startbildschirm hinzufügen“.

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
- Referenzwerte: Deutsche Gesellschaft für Ernährung (DGE), Stand Mai 2026
- Schrift: Bricolage Grotesque (SIL Open Font License)

## Lizenz

[MIT](LICENSE)

Die Angaben dienen der Orientierung und ersetzen keine ärztliche Beratung.
