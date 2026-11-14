# Elan

Ernährung und Health-Daten im Blick. Eine Progressive Web App: offline nutzbar, komplett deutsch, alle Daten bleiben auf deinem Gerät. Kein Konto, kein Server, keine Auswertung.

## Was Version 0.1 kann

- **Tagebuch** mit sechs Mahlzeiten, Energie, Eiweiß, Kohlenhydraten, Fett und Ballaststoffen gegen dein Tagesziel
- **Tagestypen** Gym, Calisthenics und Rest mit eigenen Zielen und einem Wochenplan
- **Zutaten:** 184 mitgelieferte Lebensmittel, eigene Zutaten, Suche bei Open Food Facts auf Knopfdruck
- **Backup** als Datei speichern und wieder einspielen
- Hell und dunkel, läuft ohne Netz

Geplant: Rezepte, Wochenplan, Einkaufsliste, Meal-Prep, Health-Tracking, Import und Export. Siehe [docs/PHASENPLAN.md](docs/PHASENPLAN.md).

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
