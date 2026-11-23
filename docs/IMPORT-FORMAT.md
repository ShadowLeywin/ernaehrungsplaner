# Importformat `elan-import` (Plan und Rezepte)

Stand 23.11.2026, Version 1. Gemeinsames Format für P2 (Plan-Import) und P5 (Rezept aus Social Media über die Prompt-Brücke).
Leser: `js/logik/planimport.js` (`lesePlanImport`, `baueUebernahme`, `promptVorlage`), seit P2.1.

## Grundsätze

- **Keine Nährwerte in der Datei.** Ein Chat schätzt Nährwerte oft falsch. Elan ordnet jede Zutat einer eigenen Zutat zu (Basisliste, eigene, Open Food Facts) und rechnet damit. Was sich nicht zuordnen lässt, zeigt die Vorschau als „unbekannt“, und Léon wählt die Zutat von Hand.
- **Mengen in Gramm**, wo möglich. Sonst Menge mit Einheit als Text; Elan rechnet wie beim Rezept-Import (`leseZutatZeile`) und markiert Schätzungen.
- **Nichts wird gespeichert, bevor Léon in der Vorschau „Übernehmen“ tippt.**
- Eine Datei ist reines JSON. Ein Chat darf es in einen Codeblock setzen; Elan entfernt die Zäune ```` ``` ```` vor dem Lesen.

## Aufbau

```json
{
  "format": "elan-import",
  "version": 1,
  "quelle": { "art": "chat", "link": "https://www.tiktok.com/@beispiel/video/123", "notiz": "Monatsplan Dezember" },
  "rezepte": [
    {
      "name": "Overnight Oats mit Beeren",
      "portionen": 2,
      "zutaten": [
        { "name": "Haferflocken", "gramm": 120 },
        { "name": "Skyr", "gramm": 300 },
        { "name": "Heidelbeeren", "menge": "1 Handvoll" }
      ],
      "schritte": ["Alles mischen.", "Über Nacht kalt stellen."]
    }
  ],
  "plan": [
    { "datum": "2026-12-01", "mahlzeit": "fruehstueck", "rezept": "Overnight Oats mit Beeren", "portionen": 1 },
    { "datum": "2026-12-01", "mahlzeit": "mittag", "zutat": "Hähnchenbrust", "gramm": 180 },
    { "datum": "2026-12-01", "mahlzeit": "mittag", "zutat": "Reis", "gramm": 80 }
  ]
}
```

## Felder

| Feld | Pflicht | Inhalt |
|---|---|---|
| `format` | ja | immer `elan-import` |
| `version` | ja | immer `1` |
| `quelle` | nein | `art`: `chat`, `teilen` oder `datei`; `link`: Adresse des Videos oder Beitrags (wird am Rezept gespeichert, nie abgerufen); `notiz`: freier Text, höchstens 200 Zeichen |
| `rezepte` | nein* | Liste von Rezepten |
| `rezepte[].name` | ja | höchstens 80 Zeichen; muss in der Datei eindeutig sein |
| `rezepte[].portionen` | ja | ganze Zahl von 1 bis 20 |
| `rezepte[].zutaten[]` | ja, mindestens eine | `name` (Pflicht, höchstens 80 Zeichen) und **entweder** `gramm` (Zahl größer 0) **oder** `menge` (Text wie „2 EL“, „1 Stück“) |
| `rezepte[].schritte[]` | nein | Texte, je höchstens 500 Zeichen |
| `plan` | nein* | Liste von Plan-Posten |
| `plan[].datum` | ja | `JJJJ-MM-TT` |
| `plan[].mahlzeit` | ja | eine von `fruehstueck`, `morgensnack`, `mittag`, `nachmittagssnack`, `abend`, `abendsnack` (wie `SLOTS` in `js/logik/ziele.js`) |
| `plan[].rezept` | eins von beiden | Name eines Rezepts aus `rezepte` dieser Datei oder eines Rezepts, das in Elan schon existiert; dazu `portionen` (Zahl größer 0, Vorgabe 1) |
| `plan[].zutat` | eins von beiden | Name einer Zutat; dazu `gramm` (Pflicht) |

\* Mindestens eins von `rezepte` und `plan` muss Einträge haben. P5 nutzt meist nur `rezepte` mit einem Rezept.

## Regeln beim Einlesen

| Fall | Was passiert |
|---|---|
| `format` oder `version` falsch | ganze Datei abgelehnt, mit Satz, was erwartet wird |
| Zutat eindeutig zugeordnet (ganzes Wort, wie bei Angeboten) | Nährwerte aus Elans Zutat |
| Zutat nicht oder mehrdeutig zugeordnet | Vorschau zeigt „unbekannt“ mit Auswahl. Ohne Wahl wird das Rezept ohne diese Zutat gespeichert und die Vorschau nennt sie unter „ausgelassen“ (geändert am 23.11.2026: eine Zutat mit 0 kcal wäre ein stiller falscher Nährwert) |
| `menge` statt `gramm` | Umrechnung wie im Rezept-Import, als Schätzung markiert |
| Rezept-Name existiert in Elan schon | Vorschau fragt: vorhandenes nutzen oder als neues anlegen |
| Plan-Posten verweist auf unbekanntes Rezept | Zeile abgelehnt und genannt |
| Datum ungültig oder mehr als 62 Tage vom ersten Datum entfernt | Zeile abgelehnt und genannt |
| Plan-Posten im Zeitraum gibt es schon | Vorgabe „ergänzen“; „ersetzen“ nur nach Rückfrage (Entscheidung E2.1) |

Ein Rezept-Posten im Plan wird wie heute gespeichert: `rezeptId` und `gramm` = Portionen × Gramm je Portion (`rezeptAlsZutat`).

## Prompt-Vorlage (Entwurf für P2.2 und P5.3)

```text
Gib mir den folgenden Ernährungsplan (oder das Rezept) als JSON im Format "elan-import" Version 1 aus.
Regeln:
- Nur JSON, keine Erklärung davor oder danach.
- Keine Nährwerte, keine Kalorien.
- Mengen in Gramm, wenn möglich; sonst "menge" als Text, z. B. "2 EL".
- Mahlzeiten nur: fruehstueck, morgensnack, mittag, nachmittagssnack, abend, abendsnack.
- Datum als JJJJ-MM-TT. Zeitraum: {von} bis {bis}.
- Zutaten mit einfachen deutschen Namen ("Haferflocken", nicht "Kernige Bio-Haferflocken").
- Wenn eine Angabe fehlt, lass das Feld weg statt zu raten.
Aufbau: {"format":"elan-import","version":1,"rezepte":[{"name","portionen","zutaten":[{"name","gramm"}],"schritte":[]}],"plan":[{"datum","mahlzeit","rezept","portionen"} oder {"datum","mahlzeit","zutat","gramm"}]}
Hier der Plan / das Rezept:
{text}
```

Für P5 ergänzt Elan `{text}` um Link und Bildunterschrift, die Android beim Teilen übergeben hat. Elan ruft den Link nie selbst ab.

## Annahmen [A]

- [A] 62 Tage als Obergrenze eines Imports (zwei Monate), wie beim frei gewählten Zeitraum der Einkaufsliste.
- [A] Ein Chat hält sich an Feldnamen besser, wenn sie deutsch und kurz sind; deshalb `mahlzeit` statt `slot`.

## Quellen

- Code dieses Repos, Stand 23.11.2026: `js/logik/import.js` (Rezept-Import aus Text), `js/logik/ziele.js` (`SLOTS`), `js/logik/angebote.js` (Zuordnung nur bei ganzen Wörtern).
