# Datenmodell

Stand: Schema-Version 3 (App 0.4.0). Maßgeblich im Code: `js/logik/schema.js` und `js/db.js`.

## Grundsätze

- Alle Nutzerdaten liegen in der IndexedDB des Browsers, Datenbank `elan`.
- Ein Speicher (Object Store) je Entität, jeder Satz hat ein Schlüsselfeld.
- Mitgelieferte Zutaten sind eine Datei (`data/zutaten-basis.json`), nicht Teil der Datenbank. App-Updates können sie verbessern, ohne Nutzerdaten anzufassen.
- Nährwerte gelten immer je 100 g.
- Darstellung (hell/dunkel) liegt je Gerät im `localStorage` und gehört nicht ins Backup.

## Entitäten heute (Version 3)

| Speicher | Schlüssel | Felder | Index |
|---|---|---|---|
| `zutaten` | `id` | `name`, `marke`, `kategorie`, `quelle` (`eigen`, `off`), `quelleId`, `je100` (Nährwerte), `portionen` [{`name`, `gramm`}], `unvollstaendig`, `geaendert` | – |
| `eintraege` | `id` | `datum` (JJJJ-MM-TT), `slot`, `zutatId`, `name`, `marke`, `gramm`, `je100` (Kopie), `erstellt`; bei Rezepten zusätzlich `rezeptId` | `datum` |
| `tage` | `datum` | `tagestyp` (nur bei Abweichung vom Wochenplan) | – |
| `einstellungen` | `schluessel` | `wert`; Schlüssel: `ziele`, `woche`, `slotAnteile` (Prozent je Slot, Summe 100), `letztesBackup` | – |
| `plan` (ab 3) | `id` | wie `eintraege` (`datum`, `slot`, `zutatId`, `name`, `gramm`, `je100`, `rezeptId`), dazu `uebernommen` | `datum` |
| `einkauf` (ab 3) | `id` | `woche` (Datum des Montags); Häkchen: `schluessel`, `erledigt`, Kennung `<woche>\|<zutatId>`; eigener Posten: `eigen`, `name`, `erledigt` | `woche` |
| `rezepte` (ab 2) | `id` | `name`, `portionen`, `zutaten` [{`zutatId`, `name`, `marke`, `gramm`, `je100` (Kopie)}], `schritte` [{`text`, `prinzip`}], `erstellt`, `geaendert` | – |

Kennungen: Basis-Zutaten `basis:<name>`, eigene `eigen:<uuid>`, Open Food Facts `off:<barcode>`. Ein Rezept erscheint im Tagebuch als `rezept:<id>`.

## Beziehungen

```
Zutat (Datei oder Speicher) 1 ── n Eintrag n ── 1 Tag (über datum)
Zutat n ── m Rezept (über rezepte.zutaten), Rezept 1 ── n Eintrag (über rezeptId)
Plan-Posten ── wird zu ── Eintrag (Kopie beim Übernehmen, Posten bekommt uebernommen = true)
Einkaufsliste = berechnet aus Plan-Posten der Woche; gespeichert sind nur Häkchen und eigene Posten
Tagestyp (gym | calisthenics | rest) ── Ziel (in einstellungen.ziele)
Wochentag ── Tagestyp (in einstellungen.woche), Tag kann abweichen
```

**Wie rechnet ein Rezept?** `rezeptWerte()` in `js/logik/rezepte.js` summiert die Zutaten und teilt durch die Portionen. Für das Tagebuch wird das Rezept wie eine Zutat verpackt (`rezeptAlsZutat()`): Werte je 100 g plus eine Portion in Gramm.

**Warum speichert ein Eintrag eine Kopie der Nährwerte?** Wer eine Zutat später ändert oder löscht, verändert sonst rückwirkend alte Tage. Mit der Kopie bleibt die Vergangenheit stabil. Preis: etwas mehr Speicher je Eintrag.

## Feste Listen im Code

| Liste | Ort | Inhalt |
|---|---|---|
| Nährstoffe | `js/logik/naehrwerte.js` | 8 Makro-Felder, 22 Mikronährstoffe mit Einheit (Achtung: Omega-3 in g, EPA + DHA in mg) |
| Slots | `js/logik/ziele.js` | 6 Mahlzeiten mit Anteil am Tagesziel |
| Tagestypen | `js/logik/ziele.js` | Gym, Calisthenics, Rest |
| Kategorien | `js/logik/zutat.js` | 11 Zutaten-Kategorien |

## Schema-Version und Migration

- `SCHEMA_VERSION` ist eine ganze Zahl. Sie ist zugleich die Versionsnummer der IndexedDB.
- `MIGRATIONEN` in `js/db.js` enthält eine Funktion je Version. Beim Öffnen laufen nur die fehlenden Schritte (`oldVersion` bis `SCHEMA_VERSION`).
- Bestehende Migrationen werden nie geändert, nur neue angehängt.
- Jedes Backup trägt `schemaVersion`. Ältere Backups hebt `BACKUP_MIGRATIONEN` in `js/logik/backup.js` Schritt für Schritt an. Neuere Backups lehnt die App ab.
- Ein Test prüft, dass es genau eine Migration je Version gibt.

**Ablauf einer Schemaänderung:** `SCHEMA_VERSION` erhöhen → Migration anhängen → Backup-Migration ergänzen → diese Datei nachziehen → Test mit einem Backup der alten Version.

## Backup-Format

```json
{ "app": "elan", "schemaVersion": 3, "erstelltAm": "2026-11-13T10:00:00.000Z",
  "daten": { "zutaten": [], "eintraege": [], "tage": [], "einstellungen": [], "rezepte": [], "plan": [], "einkauf": [] } }
```

Einspielen ersetzt alle Speicher in einer einzigen Transaktion. Bricht sie ab, bleibt der alte Stand vollständig.

## Geplante Entitäten

| Modul | Speicher (geplant) | Kernfelder | Ab Version |
|---|---|---|---|
| 1 Zutaten | `zutaten` (vorhanden) | zusätzlich Quelle `usda`, `bls` | – |
| 2 Rezepte | `rezepte` (vorhanden seit 2) | siehe Meal-Prep | – |
| 3 Tagebuch | `eintraege`, `tage` (vorhanden) | offen: Datei `data/referenzwerte.json` (keine Nutzerdaten) | – |
| 4 Wochenplan, Einkaufsliste | `plan`, `einkauf` (vorhanden seit 3) | – | – |
| 4 Meal-Prep | Felder an `rezepte` | `haltbarTage`, `einfrierbar`, `gewichtGekocht` | 4 |
| 5 Angebote | `angebote` | `markt`, `produkt`, `preis`, `gueltigVon`, `gueltigBis`, `zutatId` | offen |
| 6 Mag-Liste | `vorlieben` | `zutatId`, `mag` (J, R, K, N, S), `notiz` | 4 |
| 7 Health | `messungen` | `datum`, `art` (gewicht, mass, schlaf, wasser, schritte), `wert`, `einheit` | 5 |
| 7 Laborwerte | `labor` | `datum`, `name`, `wert`, `einheit`, `refMin`, `refMax` | 5 |
| 7 Supplements | `supplements`, Feld an `tage` | `name`, `dosis`; je Tag `genommen` [] | 5 |
| 7 Symptome | `symptome` | `datum`, `zeit`, `art`, `staerke`, `eintragIds` [] | 6 |
| 8 Import | kein eigener Speicher | erzeugt `rezepte` und `zutaten` | – |
| 9 Export | kein eigener Speicher | liest alle Speicher | – |

Health-Speicher brauchen keine Sonderbehandlung im Backup: neue Speicher kommen in `STORES` und sind damit automatisch enthalten.

## Annahmen [A]

- [A] Mag-Liste als eigener Speicher statt als Feld an der Zutat, weil Basis-Zutaten nicht in der Datenbank liegen.
- [A] Eine gemeinsame Tabelle `messungen` für Gewicht, Maße, Schlaf, Wasser und Schritte reicht; Laborwerte brauchen wegen des Referenzbereichs einen eigenen Speicher.
- [A] Die Versionsnummern in der Spalte „Ab Version“ sind Planwerte und können sich verschieben.

## Quellen (mit Datum)

- Code dieses Repos, Stand 13.11.2026: `js/logik/schema.js`, `js/db.js`, `js/logik/backup.js`.
