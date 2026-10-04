# FORGEBORN – Fuel. Train. Grow.

Ernährung und Training planen – als Progressive Web App, offline-fähig, komplett auf Deutsch.
**Alle Daten bleiben auf deinem Gerät.** Kein Konto, kein Server, keine Tracker.

👉 App öffnen: https://shadowleywin.github.io/ernaehrungsplaner/
(auf dem Handy in Chrome öffnen und „Zum Startbildschirm hinzufügen“)

## Was FORGEBORN kann

- **Lager:** Startseite mit Lagerfeuer, Brom (dem Schmied) und dem Wichtigsten des Tages
- **Ernährung („Taverne“):** Mahlzeiten, Kalorien-Ring, Makros, alle wichtigen Mikronährstoffe (Tag und Woche), Wasser, Supplements
- **Mengen-Memo:** erst alles eintragen, Mengen danach gesammelt ergänzen – tippen oder diktieren („Skyr 250, 2 Äpfel“)
- **Barcode & Marken:** Barcode scannen oder online suchen (Open Food Facts), eigene Lebensmittel anlegen
- **Ernährungsweisen & Diäten:** vegan, vegetarisch, pescetarisch, laktose-/glutenfrei … sowie Keto, Low Carb, High Protein, Intervallfasten
- **Rezepte & Meal-Prep:** Bewertung mit Geschmack und Vorteilen, Portionen eintragen, Gesamtgewicht ÷ Portionen
- **Wochenplan & Einkauf:** Mahlzeiten planen, Einkaufsliste automatisch, Angebote der Märkte, Obst-/Gemüse-Vorlieben
- **Training:** über 250 Übungen, Vorlagen, Sätze mit „letztes Mal“, Pausentimer, Rekorde, 1RM-Verlauf, Volumen je Muskel
- **Körper:** Muskelkarte (vorn/hinten, Mann/Frau) mit Übungen und Beschreibungen
- **Heldenreise:** Level, Klasse, sechs Charakter-Werte, Ränge von Schlacke bis Legende, Erfolge bis „Legendär“ plus geheime
- **Freunde:** Rangkarte als Link teilen und vergleichen – ganz ohne Server
- **Tagebuch:** Stimmung, Energie, Schlaf und eine automatische Chronik (episch oder schlicht)
- **Gewicht:** Verlauf, Wochen- und Monatsbericht, wöchentlicher Vorschlag zur Kalorien-Anpassung
- **Backup:** Export und Import aller Daten als Datei
- Farbthemen, Hell/Dunkel, Stil „Episch“ oder „Schlicht“

## Datenquellen

- Nährwerte: [USDA FoodData Central](https://fdc.nal.usda.gov/) (SR Legacy, gemeinfrei) und [Open Food Facts](https://world.openfoodfacts.org/) (ODbL, nur auf Knopfdruck)
- Energieverbrauch: Herrmann et al., *2024 Adult Compendium of Physical Activities* ([pacompendium.com](https://pacompendium.com/))
- Referenzwerte: DGE (Deutsche Gesellschaft für Ernährung), Obergrenzen: EFSA

Die Angaben dienen der Orientierung und ersetzen keine medizinische Beratung.

**Datenschutz:** Ins Internet geht nur, was du ausdrücklich auslöst – ein Barcode oder Suchbegriff an Open Food Facts, der Abruf einer Angebotsdatei und (nur wenn eingeschaltet) die Spracherkennung von Chrome, die über Google-Server läuft.

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
