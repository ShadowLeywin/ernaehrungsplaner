# FORGEBORN – Fuel. Train. Grow.

Ernährung und Training planen – als Progressive Web App, offline-fähig, komplett auf Deutsch.
**Alle Daten bleiben auf deinem Gerät.** Kein Konto, kein Server, keine Tracker.

👉 App öffnen: https://shadowleywin.github.io/ernaehrungsplaner/
(auf dem Handy in Chrome öffnen und „Zum Startbildschirm hinzufügen“)

## Was FORGEBORN kann

- **Lager:** Startseite mit Lagerfeuer und Brom, dem Zwergenschmied. Das Feuer wächst mit deiner Serie, der Ort mit deinem Level
- **Lager ausbauen:** Training bringt Erz, Disziplin bringt Glut – damit baust du 12 Bauwerke in 5 Stufen aus. Dazu Brom's Wochen-Aufträge, ein Monats-Boss, Glutschilde und Titel
- **Ernährung („Taverne“):** Mahlzeiten, Kalorien-Ring, Makros, Mikronährstoffe (Tag und Woche), Wasser, Koffein, Supplements
- **Schnell erfassen:** Favoriten, zuletzt gegessen, „Wie gestern“, Mahlzeiten-Vorlagen, Mengen-Memo je Mahlzeit (tippen oder diktieren), Barcode und Online-Suche (Open Food Facts), Schätzwerte für auswärts
- **Brom rät:** was heute noch fehlt (aus deinen Favoriten) und welche Mikronährstoffe diese Woche zu kurz kommen
- **Ernährungsweisen & Diäten:** vegan, vegetarisch, pescetarisch, laktose-/glutenfrei … sowie Keto, Low Carb, High Protein, Intervallfasten
- **Rezepte & Meal-Prep:** Bewertung mit Geschmack und Vorteilen, Skalierung, „Was kann ich kochen?“, Portionen eintragen, Gesamtgewicht ÷ Portionen
- **Wochenplan & Einkauf:** Mahlzeiten planen, Einkaufsliste automatisch, Angebote der Märkte, Obst-/Gemüse-Vorlieben
- **Training:** über 250 Übungen, fertige Programme, Vorlagen, Steigerungsvorschläge, Satz-Typen (Aufwärmen, Drop, Versagen), Reserve-Wdh, Aufwärmsätze, Scheiben-Rechner, Supersätze, Pause und Notiz je Übung, Rekorde, 1RM-Verlauf, Volumen je Muskel, Deload-Hinweis
- **Körper:** Muskelkarte (vorn/hinten, Mann/Frau) mit Volumen, Erholung und Rängen; Maße, Prognose, Phasen-Bericht und Fortschrittsfotos (nur lokal)
- **Heldenreise:** Level, Klasse, sechs Charakter-Werte, Ränge von Schlacke bis Legende, Erfolge bis „Legendär“ plus geheime, Brom's Geschichte in Kapiteln, Rückblick für Monat und Jahr
- **Freunde:** Rangkarte als Link teilen und vergleichen, inklusive Monats-Duell – ganz ohne Server
- **Tagebuch:** Stimmung, Energie, Schlaf und eine automatische Chronik (episch oder schlicht)
- **Gewicht:** Verlauf, Wochen- und Monatsbericht, wöchentlicher Vorschlag zur Kalorien-Anpassung
- **Backup:** Export und Import aller Daten als Datei, optional mit Passwort verschlüsselt
- Schnellaktionen am App-Symbol, Einführungs-Tour, Farbthemen, Hell/Dunkel, Stil „Episch“ oder „Schlicht“

Bilder im Manhwa-Stil (Brom, Lager-Szenen, Bauwerke, Bosse) sind optional – Prompts für KI-Bildgeneratoren stehen in [docs/bild-prompts.md](docs/bild-prompts.md).

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
