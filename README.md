# FORGEBORN – Fuel. Train. Grow.

Ernährung und Training planen – als Progressive Web App, offline-fähig, komplett auf Deutsch.
**Alle Daten bleiben auf deinem Gerät.** Kein Konto, kein Server, keine Tracker.

👉 App öffnen: https://shadowleywin.github.io/ernaehrungsplaner/
(auf dem Handy in Chrome öffnen und „Zum Startbildschirm hinzufügen“)

## Was FORGEBORN kann

- **Lager:** Startseite mit Lagerfeuer und dem Wichtigsten des Tages
- **Ernährung:** Mahlzeiten, Kalorien-Ring, Makros, alle wichtigen Mikronährstoffe (Tag und Woche), Wasser, Supplements
- **Training:** über 250 Übungen und Aktivitäten (Gym, Calisthenics, Cardio, Sport, Mobility), Vorlagen für deinen Wochenplan, Sätze mit „letztes Mal“, Pausentimer
- **Gewicht:** Verlauf, Wochen- und Monatsbericht, wöchentlicher Vorschlag zur Kalorien-Anpassung
- **Backup:** Export und Import aller Daten als Datei
- Farbthemen, Hell/Dunkel, Stil „Episch“ oder „Schlicht“

## Datenquellen

- Nährwerte: [USDA FoodData Central](https://fdc.nal.usda.gov/) (SR Legacy, gemeinfrei)
- Energieverbrauch: Herrmann et al., *2024 Adult Compendium of Physical Activities* ([pacompendium.com](https://pacompendium.com/))
- Referenzwerte: DGE (Deutsche Gesellschaft für Ernährung), Obergrenzen: EFSA

Die Angaben dienen der Orientierung und ersetzen keine medizinische Beratung.

## Entwicklung

Vanilla JavaScript mit ES-Modulen, kein Build-Schritt. Lokal starten:

```bash
python -m http.server 8080
```

Tests: `npm test` (Node 24, keine Abhängigkeiten).

## Unterstützen

FORGEBORN ist kostenlos und Open Source. Ein Spenden-Link folgt.

## Lizenz

[GNU General Public License v3.0](LICENSE) – du darfst den Code nutzen, ändern und weitergeben;
abgeleitete Versionen müssen ebenfalls unter der GPL-3.0 offen bleiben.
