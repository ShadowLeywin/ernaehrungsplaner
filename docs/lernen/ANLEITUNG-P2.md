# Bauanleitung P2: Plan-Import

Wie eine Lego-Anleitung. Alles hier ist im Lernlog (Session 16, Runden P2.1 und P2.2) oder im Code belegt. Stand 23.11.2026.

## 1. Fertiges Modell

Unter Plan → ganz unten **„Plan importieren“** wählst du einen Zeitraum und tippst auf „Vorlage kopieren“. Die Vorlage gibst du zusammen mit deinem Monatsplan in einen Chat. Dessen Antwort fügst du in Elan ein und tippst auf „Prüfen“. Die Vorschau zeigt:
- jeden Tag mit seinen Mahlzeiten und kcal,
- welche Zeilen nicht passen und warum,
- welche Zutaten Elan nicht kennt. Die ordnest du mit Tippen zu.

Erst „Übernehmen“ speichert. Danach siehst du den Monat, und „Rückgängig“ nimmt den ganzen Import zurück. Nährwerte kommen nie aus dem Chat, sondern immer aus Elans Zutaten.

## 2. Teileliste

| Teil | Wo | Wozu |
|---|---|---|
| Format | `docs/IMPORT-FORMAT.md` | Abmachung zwischen Chat und Elan (`elan-import`, Version 1) |
| Leser | `js/logik/planimport.js` | `entferneZaeune`, `lesePlanImport`, `offeneZutaten`, `baueUebernahme`, `promptVorlage` |
| Zuordnung | `findeZutat`, `ordneZu` aus `js/logik/import.js` | nur ganze Wörter, Stück über die Portion „Stück“ |
| Seite | `js/ansichten/planimport.js` | `#/woche/import` mit drei Schritten |
| Beispiel | `test/daten/import-plan.json` | erfundener Plan mit absichtlichen Fehlern |
| Tests | `test/planimport.test.js`, `planImportLauf` in `tools/pruefe-app.cjs` | 238 Unit-Tests, 168 Kriterien |

## 3. Bauschritte

**Schritt 1: Das Format zuerst (Phase 1).** Bevor es Code gab, stand fest: Es gibt keine Nährwerte in der Datei, die Mengen sind in Gramm, die Mahlzeiten haben feste Namen, und höchstens 62 Tage gehen auf einmal.

**Schritt 2: Chat-Antworten säubern.** Chats schreiben Text und einen Codeblock:

```js
export function entferneZaeune(roh) {
  const block = /```(?:json)?\s*([\s\S]*?)```/i.exec(String(roh ?? '').trim());
  if (block) return block[1].trim();
  ... // sonst vom ersten { bis zur letzten }
}
```

**Schritt 3: Prüfen statt raten.** `lesePlanImport` lehnt einzelne Zeilen mit Grund ab (z. B. „Unbekannte Mahlzeit ‚brunch‘“), nicht gleich die ganze Datei. Zutaten werden nur bei ganzen Wörtern zugeordnet.

**Schritt 4: Übernahme als reine Funktion.** `baueUebernahme` baut Rezepte und Plan-Posten. Ein Rezept im Plan bekommt `portionen × Portionsgewicht` Gramm. Was keine Zutat hat, landet in `ausgelassen`.

**Schritt 5: Die Seite.** Die drei Schritte stehen untereinander. Der Entwurf (Text, Vorschau, Zuordnungen) liegt außerhalb der Funktion, damit Neuzeichnen nichts löscht.

**Schritt 6: Vorschau = Übernahme.** Die Vorschau ruft dieselbe Funktion auf wie „Übernehmen“, nur mit einer Platzhalter-Kennung.

## 4. Code erklärt

- **Warum keine Nährwerte aus dem Chat:** Ein Chat schätzt. Elan hat für jede Zutat Werte mit Quelle. Ein geschätzter Wert sähe genauso echt aus wie ein belegter.
- **Warum Auslassen statt 0 kcal:** Eine Zutat mit 0 kcal wäre ein stiller falscher Nährwert. Die Vorschau sagt stattdessen ehrlich: „Ausgelassen: Zauberpulver“.
- **Warum vorhandene Rezepte genutzt werden:** Steht „Overnight Oats“ schon in Elan, legt der Import kein zweites an und ändert das erste nicht.
- **Warum die Rücknahme genau ist:** „Rückgängig“ merkt sich die Kennungen der angelegten Sätze und löscht nur diese.

## 5. Fehler und Sackgassen

| Was passierte | Ursache | Lösung |
|---|---|---|
| Vorhandene Rezepte im Plan nicht gefunden | Suche in einem Feld, das es nicht gab (`ergebnis.vorhandeneNach`) | `vorhandene` als Parameter von `baueUebernahme`, mit Test |
| Auswahlfeld auf der Karte unsichtbar | Regel des Blatt-Designs spezifischer als `.wahl-zeile input` | `:root[data-thema] .wahl-zeile input` mit `--flaeche-2` |
| „1 neue Rezept“ | Einzahl vergessen | „1 neues Rezept“, Test angepasst |
| Format sagte „Zutat zählt mit 0“ | im Entwurf übersehen | `docs/IMPORT-FORMAT.md` geändert: auslassen und nennen |

## 6. Besser mit Claude arbeiten

- Das Format vor dem Code festzulegen hat viel Hin und Her gespart: Die Tests konnten direkt gegen die Abmachung geschrieben werden.
- Schick bei einem Fehler im Import die betroffene Zeile aus der Chat-Antwort. Dann lässt sich sagen, ob der Chat oder Elan schuld ist.
- „Mach alles“ klappt, wenn jedes Paket kleine Teilschritte mit eigenen Tests hat. So bleibt jeder PR überschaubar.

## 7. Selbsttest (5 Fragen)

1. Was passiert mit einer Zeile `"mahlzeit": "brunch"`?
2. Warum wird „Reis“ nicht „Reiswaffeln“ zugeordnet?
3. Wie viele Gramm plant Elan für 1 Portion eines Rezepts mit 120 g Hafer und 170 g Apfel bei 2 Portionen?
4. Was speichert Elan, bevor du „Übernehmen“ tippst?
5. Was macht „Rückgängig“ nach dem Import?

<details><summary>Lösungen</summary>

1. Sie wird abgelehnt und in der Vorschau mit Grund genannt; der Rest der Datei wird trotzdem gelesen.
2. Zugeordnet wird nur bei ganzen Wörtern.
3. 145 g: (120 + 170) / 2.
4. Nichts.
5. Es löscht genau die angelegten Plan-Posten und Rezepte.

</details>

## 8. Mini-Übung (15 Minuten)

Schreib selbst eine kleine Datei im Format `elan-import` mit einem Rezept und drei Plan-Einträgen für morgen. Baue einen Fehler absichtlich ein, z. B. ein Datum wie `2026-02-30`. Füge sie in Elan unter „Plan importieren“ ein und tippe auf „Prüfen“. Lies die Meldung und überleg: Würdest du sie ohne diese Anleitung verstehen? Wenn nicht, schreib Claude einen besseren Satz dafür.
