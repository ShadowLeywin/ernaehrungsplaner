# Format: Unterwegs-Liste (`elan-unterwegs`)

Mit dieser Datei lädt man Gerichte von Restaurants und Imbissen in den Unterwegs-Rechner
(Eintragen → „Unterwegs“ → „Liste aus Datei laden“). Prüfung und Einlesen: `leseUnterwegsDatei` in `js/logik/unterwegs.js`.

Elan liefert keine Werte von Ketten mit. Rezepturen ändern sich, und ein falscher Nährwert ist schlimmer als keiner.
Wer eine Liste baut, nimmt die Werte aus der offiziellen Nährwerttabelle des Restaurants und trägt Quelle und Datum ein.

## Aufbau

```json
{
  "format": "elan-unterwegs",
  "version": 1,
  "quelle": "Nährwerttabelle auf der Webseite des Restaurants",
  "stand": "2026-11-01",
  "restaurants": [
    {
      "name": "Imbiss am Bahnhof",
      "gerichte": [
        { "name": "Currywurst mit Pommes", "kcal": 0, "protein": 0, "kh": 0, "fett": 0 },
        { "name": "Cola 0,5 l", "kcal": 0 }
      ]
    }
  ]
}
```

Die Nullen sind Platzhalter: Vor dem Laden durch echte Werte ersetzen.

## Regeln

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `format` | ja | immer `elan-unterwegs` |
| `version` | ja | immer `1` |
| `quelle` | nein | woher die Werte stammen (höchstens 200 Zeichen) |
| `stand` | nein | Datum der Werte als `JJJJ-MM-TT`; Elan zeigt es nach dem Laden an |
| `restaurants[].name` | ja | Name des Restaurants, höchstens 40 Zeichen |
| `gerichte[].name` | ja | Name des Gerichts mit Größe, z. B. „Pommes M“, höchstens 80 Zeichen |
| `gerichte[].kcal` | ja | Kalorien je Stück oder Portion, 0 bis 5.000 |
| `gerichte[].protein`, `kh`, `fett` | nein | Gramm je Stück oder Portion |

- Alle Werte gelten **je Stück oder Portion**, nicht je 100 g.
- Gerichte ohne Namen oder ohne gültige Kalorien überspringt Elan und sagt, wie viele.
- Gleiches Restaurant mit gleichem Gerichtnamen (ohne Groß- und Kleinschreibung) ersetzt den alten Eintrag. So lässt sich eine Liste aktualisieren, ohne Doppelte zu erzeugen.
- Höchstens 1.000 Gerichte insgesamt.
