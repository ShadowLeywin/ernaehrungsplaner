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

## Version 2: Prospekt (`elan-angebote`, seit 23.11.2026)

Angebote je Markt wie im Prospekt, auch ohne passende Zutat. Lesen: `leseProspektDatei` in `js/logik/prospekt.js`. Version 1 (oben) bleibt lesbar.

```json
{
  "format": "elan-angebote",
  "version": 2,
  "quelle": "Woher die Angebote stammen, z. B. „von Hand aus dem Prospekt abgetippt“",
  "stand": "2026-11-23",
  "links": [{ "kette": "Mein Markt", "url": "https://…", "art": "prospekt" }],
  "angebote": [
    { "markt": "Mein Markt", "artikel": "Bio Haferflocken zart", "zutat": "Haferflocken", "preis": 0.79, "menge": "500 g",
      "grundpreis": "1,58 €/kg", "kategorie": "getreide", "gueltigVon": "2026-11-23", "gueltigBis": "2026-11-28" }
  ]
}
```

| Feld | Pflicht | Inhalt |
|---|---|---|
| `format`, `version` | ja | `elan-angebote`, `2` |
| `quelle`, `stand` | nein | Herkunft (höchstens 200 Zeichen), Datum |
| `links[]` | nein | `kette`, `url` (nur `https://`), `art`: `prospekt` oder `startseite`. Geht vor `data/prospekt-links.json` |
| `angebote[].markt` | ja | Kette oder Filiale, höchstens 40 Zeichen |
| `angebote[].artikel` | ja | Name wie im Prospekt, höchstens 80 Zeichen |
| `angebote[].preis` | ja | Euro, größer 0 |
| `angebote[].zutat` | nein | Name oder Kennung einer Zutat; nur dann erscheint das Angebot in der Einkaufsliste (ganze Wörter) |
| `angebote[].menge` | nein | Packungsgröße als Text („500 g“); ohne sie kann die Einkaufsliste keinen Preis für eine Menge rechnen |
| `angebote[].grundpreis` | nein | Text, z. B. „1,58 €/kg“ |
| `angebote[].kategorie` | nein | eine der Zutaten-Kategorien (`obst`, `gemuese`, `getreide`, …), sonst `sonstiges` |
| `gueltigVon`, `gueltigBis` | nein | wie in Version 1 |

**Woher die Datei kommt:** Elan ruft keine Prospekte ab (Entscheidung E4.1). Eine GitHub Action, die diese Datei wöchentlich schreibt, kommt erst, wenn es eine Quelle gibt, deren Bedingungen das erlauben (`docs/ROADMAP.md`, P4). Bis dahin: von Hand pflegen oder von einem Chat aus einem selbst abfotografierten Prospekt abtippen lassen. Prospektbilder kommen nie ins Repo.
