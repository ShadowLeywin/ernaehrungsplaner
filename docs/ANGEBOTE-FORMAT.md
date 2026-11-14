# Format der Angebotsdatei

Eine selbst gepflegte JSON-Datei, die du in der App unter Woche → Angebote → „Angebotsdatei einlesen“ auswählst. Die App holt nichts aus dem Netz.

## Aufbau

```json
{
  "schemaVersion": 1,
  "angebote": [
    { "zutat": "Apfel", "markt": "Mein Markt", "preis": 1.99, "menge": "1 kg", "gueltigVon": "2026-11-16", "gueltigBis": "2026-11-21", "notiz": "nur mit Karte" }
  ]
}
```

## Felder

| Feld | Pflicht | Inhalt |
|---|---|---|
| `schemaVersion` | ja | immer `1` |
| `zutat` | ja | Name einer Zutat aus deiner Liste oder ihre Kennung (z. B. `basis:apfel`) |
| `markt` | ja | Name des Markts, höchstens 40 Zeichen |
| `preis` | ja | Preis in Euro als Zahl, größer als 0 |
| `menge` | nein | freier Text, wofür der Preis gilt, z. B. `500 g` |
| `gueltigVon`, `gueltigBis` | nein | Datum als `JJJJ-MM-TT`; ohne Angabe gilt das Angebot, bis du es löschst |
| `notiz` | nein | freier Text, höchstens 120 Zeichen |

## Regeln beim Einlesen

| Fall | Was passiert |
|---|---|
| Zutat wird gefunden | Angebot erscheint bei der Zutat und in der Einkaufsliste |
| Zutat wird nicht gefunden | Zeile wird übersprungen und in der Meldung genannt |
| Pflichtfeld fehlt oder ist ungültig | Zeile wird übersprungen und gezählt |
| Neue Datei eingelesen | ersetzt die Angebote der vorigen Datei; von Hand eingetragene bleiben |

Zugeordnet wird nur bei ganzen Wörtern: „Apfel“ trifft „Apfel“, nicht „Apfelsaft“.

## Annahmen [A]

- [A] Eine Datei je Einlesen reicht; mehrere Dateien nebeneinander sind nicht vorgesehen.

## Quellen (mit Datum)

- `js/logik/angebote.js` und `test/daten/angebote-beispiel.json`, Stand 14.11.2026.
