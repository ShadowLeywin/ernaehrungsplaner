# Bauanleitung P1: Planung und Einkauf

Wie eine Lego-Anleitung: erst das fertige Modell, dann die Teile, dann Schritt für Schritt. Alles hier ist im Lernlog (Session 16, Runden P1.1 bis P1.4) oder im Code belegt. Stand 23.11.2026.

## 1. Fertiges Modell

Unter „Plan“ (früher „Woche“) wählst du oben **Woche** oder **Monat**. Der Monat zeigt jede Kalenderwoche als eigene Karte mit sieben Tageskacheln; ein Punkt je Mahlzeit zeigt, was schon geplant ist. Ein Tipp auf einen Tag öffnet den **Tagesplan** mit sechs Mahlzeiten und je einem Plus. Die **Einkaufsliste** gilt für eine Woche, einen Monat oder einen frei gewählten Zeitraum (bis 62 Tage) und zählt alle geplanten Zutaten zusammen, nach Kategorie. Häkchen und eigene Posten gehören zu genau diesem Zeitraum. Alte Häkchen der Wochenliste sind beim Update mit umgezogen (Schema 8).

## 2. Teileliste

| Teil | Wo | Wozu |
|---|---|---|
| Zeiträume | `js/logik/zeitraum.js` | Woche, Monat, frei, Kalenderwoche, Wochen eines Monats, Umzug alter Häkchen |
| Plan je Mahlzeit | `js/logik/plan.js` → `planJeSlot` | Posten, kcal und Ziel je Mahlzeit |
| Schema | `js/logik/schema.js` | `SCHEMA_VERSION = 8` |
| Migration | `js/db.js` (`MIGRATIONEN[7]`), `js/logik/backup.js` (`BACKUP_MIGRATIONEN[7]`) | Datenbank und alte Backups heben |
| Einkaufsliste | `js/ansichten/einkauf.js` | Seite `#/einkauf/<von>/<bis>` |
| Monat | `js/ansichten/monat.js` | Seite `#/woche/monat/<JJJJ-MM>`, Umschalter Woche/Monat |
| Tagesplan | `js/ansichten/tagplan.js` | Seite `#/woche/tag/<datum>` |
| Tests | `test/zeitraum.test.js`, `test/plan.test.js`, `tools/pruefe-app.cjs` | 219 Unit-Tests, 156 Kriterien im Handy-Emulator |

**Befehle:** `npm test` (Unit-Tests) · `node tools/pruefe-app.cjs` (Browsertest) · `BILDER=<ordner> node tools/pruefe-app.cjs` (mit Bildern) · `git checkout -b <branch>` (Branch je Teilschritt).

## 3. Bauschritte

**Schritt 1: Erst nachsehen, was es schon gibt.** Der Auftrag sprach von einer „Einkaufsliste pro Tag“. Im Code galt sie je Woche (`einkauf.woche`). Gespeichert sind nur Häkchen und eigene Posten; die Liste selbst wird bei jedem Öffnen aus dem Plan berechnet. Also muss nur der Speicher `einkauf` umziehen.

**Schritt 2: Rechnen ohne Bildschirm (P1.1).** Zuerst reine Funktionen mit Tests, dann erst Seiten:

```js
export function monatUm(datum) {
  const von = `${monatVon(datum)}-01`;
  return { art: 'monat', von, bis: verschiebe(`${verschiebeMonat(monatVon(datum), 1)}-01`, -1) };
}
```

Der letzte Tag eines Monats ist „Tag vor dem Ersten des Folgemonats“. So stimmt der Februar im Schaltjahr ohne Sonderfall.

**Schritt 3: Datenmodell heben.** Neue Kennung `<von>..<bis>|<zutatId>`; eine Funktion für Datenbank und Backup:

```js
export function migriereEinkaufSatz(satz) {
  if (!satz || satz.zeitraum || !istGueltig(satz.woche)) return satz;
  const { woche, ...rest } = satz;
  const zeitraum = zeitraumSchluessel({ von: woche, bis: verschiebe(woche, 6) });
  return { ...rest, zeitraum, id: rest.schluessel ? `${zeitraum}|${rest.schluessel}` : rest.id };
}
```

In `js/db.js` läuft sie in der Upgrade-Transaktion: Index `zeitraum` anlegen, Index `woche` löschen, jeden Satz umschreiben. Bricht etwas ab, bleibt Version 7 vollständig.

**Schritt 4: Einkaufsliste für jeden Zeitraum (P1.2).** Neue Adresse `#/einkauf/<von>/<bis>`. Die alte Adresse leitet um, ohne einen Eintrag im Verlauf anzulegen:

```js
if (teile[1] === 'einkauf') {
  history.replaceState(null, '', `#/einkauf/${tage[0]}/${tage[6]}`);
  return zeigeEinkauf(wurzel, [tage[0], tage[6]]);
}
```

**Schritt 5: Monat mit einzelnen Wochen (P1.3).** `monatsWochen('2026-11')` liefert sechs Wochen von Montag bis Sonntag, mit `imMonat` je Tag. Jede Woche wird eine Karte; die sieben Tage ein Raster `repeat(7, minmax(0, 1fr))`. Die gewählte Ansicht liegt als Einstellung `planAnsicht`; ein Tipp auf „Plan“ in der Leiste öffnet sie wieder.

**Schritt 6: Je Mahlzeit planen (P1.4).** `planJeSlot(posten, slots, zielKcal)` sortiert die Posten in die sechs Mahlzeiten und rechnet das Ziel jeder Mahlzeit als Anteil am Tagesziel. Der Tagesplan gibt jeder Mahlzeit ein eigenes Plus, das genau diese Mahlzeit vorbelegt.

**Schritt 7: Prüfen und ansehen.** Nach jeder Runde `npm test` und der Browsertest; zum Schluss Bilder der drei neuen Seiten in Blatt/Zitrus × hell/dunkel mit erfundenen Daten.

## 4. Code erklärt

- **Warum ein Zeitraum ein Text ist (`2026-11-23..2026-11-29`):** IndexedDB sucht über einen Index nach einem Wert. Ein Text als Schlüssel macht „alle Häkchen dieses Zeitraums“ zu einer einzigen Abfrage (`nachIndex('einkauf', 'zeitraum', schluessel)`).
- **Warum der Browsertest die echten Migrationen nutzt:** Er öffnet eine Seite ohne App-Code, holt `MIGRATIONEN` per `import('/js/db.js')` und baut damit Version 7. Dann öffnet die App und hebt auf 8, genau wie beim Update am Handy.
- **Warum `minmax(0, 1fr)`:** Ohne die 0 darf eine Spalte so breit werden wie ihr längster Inhalt; bei 320 px rutscht die Seite dann seitlich.
- **Warum zwei Wege zum Planen:** Das Plus am Tag in der Woche ist schnell (nächste freie Mahlzeit), der Tagesplan ist genau (jede Mahlzeit ihr Plus). 42 Plus-Knöpfe in der Woche wären unübersichtlich.

## 5. Fehler und Sackgassen

| Was passierte | Ursache | Lösung |
|---|---|---|
| Test „Service Worker: jede App-Datei steht in der Liste“ schlug fehl | neue Datei nicht in `sw.js` | eingetragen, `VERSION` erhöht |
| Erwartung 540 g Apfel, App zeigte 440 g | Rechenfehler im Test: eine Portion ist ein Viertel von 400 g | Erwartung korrigiert, Rechnung als Kommentar |
| Titel „23. bis 23. November (1 Tage)“ | Sonderfall ein Tag | bei `von === bis` nur das Datum |
| Farbe in Monatskacheln fehlte still | `var(--leise)` gibt es nicht | `--tinte-leise` |
| „Einkauf dieser Woche“ war zu flach | `min-height` wirkt nicht an einem Inline-Link | `display: inline-flex` |
| Monat bei 320 px 4 px zu breit | Innenabstand und Lücken zu groß | Abstände verkleinert, mit Messskript geprüft |
| Ein Browserlauf brach ab („Unterbauch: 88 cm“) | bekannter, seltener Test-Wackler aus Runde 14 | zwei weitere Läufe 156/156; Ursache weiter offen |
| Push abgelehnt | `CLAUDE.md`: Push nur mit Léons Ja | lokal committet, Branches bereit |

## 6. Besser mit Claude arbeiten

- Der Auftrag „Einkaufsliste pro Tag“ passte nicht zum Code. Gut war, dass Claude erst nachsah und den Widerspruch in die Roadmap schrieb, statt etwas Falsches zu migrieren.
- Ein Startprompt, der „Pull Requests eigenständig“ erlaubt, und eine `CLAUDE.md`, die Push nur mit Ja erlaubt, widersprechen sich. Nächstes Mal im Prompt ausdrücklich schreiben: „Push auf eigene Branches ist erlaubt.“
- Entscheidungen, die nur du treffen kannst, stehen nummeriert in `docs/ROADMAP.md` (E1.1 …). Antworte mit „E1.1 ja“.

## 7. Selbsttest (5 Fragen)

1. Warum musste nur der Speicher `einkauf` migriert werden, nicht `plan`?
2. Wie heißt die Kennung eines Häkchens für Äpfel in der Woche vom 23. bis 29. November 2026?
3. Warum ist der letzte Tag eines Monats „Erster des Folgemonats minus ein Tag“?
4. Was passiert, wenn du einen freien Zeitraum von 90 Tagen wählst?
5. Welche Adresse zeigt den Tagesplan für den 24. November 2026?

<details><summary>Lösungen</summary>

1. Plan-Posten hängen am Datum, das bleibt gleich. Nur Häkchen und eigene Posten hingen an der Woche.
2. `2026-11-23..2026-11-29|basis:apfel`.
3. So stimmt jede Monatslänge, auch der Februar im Schaltjahr, ohne Tabelle.
4. Elan zeigt „Höchstens 62 Tage auf einmal (gewählt: 90).“ und bleibt beim alten Zeitraum.
5. `#/woche/tag/2026-11-24`.

</details>

## 8. Mini-Übung (15 Minuten)

Ergänze in `js/logik/zeitraum.js` eine Funktion `quartalUm(datum)`, die `{ art: 'quartal', von, bis }` liefert (z. B. 1. Oktober bis 31. Dezember für den 23.11.2026). Schreib zuerst den Test in `test/zeitraum.test.js` mit drei Fällen (Januar, November, 31. März), dann die Funktion. Tipp: `verschiebeMonat` und `monatUm` helfen. Prüfe mit `npm test`. Überlege danach: Warum wäre ein Quartal als Einkaufsliste trotzdem keine gute Idee? (Hinweis: `MAX_TAGE`.)
