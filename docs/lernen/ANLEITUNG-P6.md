# Bauanleitung P6: Zutaten-Datenbank

Wie eine Lego-Anleitung. Alles hier ist im Lernlog (Session 16, Runden P6.1 bis P6.3) oder im Code belegt. Stand 23.11.2026.

## 1. Fertiges Modell

Unter Rezepte → Zutaten siehst du oben **„Zuletzt verwendet“**, dann alle Zutaten. Dazu kommen die Filter „Alle“, „★“ und „Eigene“ sowie Kategorien zum Wischen. In der Detailseite einer Zutat:
- Ein **Stern** macht sie zum Favoriten. Beim Eintragen steht sie dann oben unter „Favoriten“.
- Die Chips „100 g“, „1 Stück (170 g)“ usw. schalten die Nährwerttabelle um.
- Alle 30 Nährwerte stehen da; was fehlt, heißt „unbekannt“.
- Unter „Eigene Portion anlegen“ legst du z. B. „Becher, 150 g“ an, auch für mitgelieferte Zutaten. Beim Eintragen ist sie ein Knopf.

## 2. Teileliste

| Teil | Wo | Wozu |
|---|---|---|
| Logik | `js/logik/zutatenbank.js` | `schalteFavorit`, `zutatenAuswahl`, `pruefePortion`, `mitExtraPortionen`, `ergaenzePortion`, `naehrwertZeilen` |
| Einstellungen | `zutatFavoriten`, `portionenExtra` | keine neue Schema-Version |
| Laden | `alleZutaten`, `holeZutat` in `js/speicher.js` | mischen eigene Portionen in die mitgelieferten Zutaten |
| Liste und Detail | `js/ansichten/zutaten.js` | Filter, Chips, Stern, Mengen-Umschalter |
| Eintragen | `suchListe` in `js/ansichten/eintrag.js` | Abschnitt „Favoriten“ |
| Tests | `test/zutatenbank.test.js`, `zutatenLauf` | 250 Unit-Tests, 181 Kriterien |

## 3. Bauschritte

**Schritt 1: Was gibt es schon?** Suche, Detailseite, eigene Zutaten, Portionen und „Zuletzt eingetragen“ beim Eintragen waren da. P6 ergänzt, statt neu zu bauen.

**Schritt 2: Favoriten als Liste von Kennungen.** Neue Favoriten kommen nach vorn; ein zweiter Tipp nimmt den Stern wieder weg:

```js
export function schalteFavorit(favoriten, id) {
  const liste = bereinigeFavoriten(favoriten);
  return liste.includes(id) ? liste.filter((x) => x !== id) : [id, ...liste].slice(0, MAX_FAVORITEN);
}
```

**Schritt 3: Portionen für Zutaten, die nur gelesen werden.** Die mitgelieferten Zutaten liegen in einer Datei. Eigene Portionen dazu landen in einer Einstellung und werden beim Laden eingemischt (`mitExtraPortionen`). So sehen alle Seiten sie, ohne etwas zu ändern.

**Schritt 4: Umschalten ohne Neuzeichnen.** Der Mengen-Chip ersetzt nur den Inhalt der beiden Tabellenkörper. Die Seite springt nicht.

**Schritt 5: Ehrlich bei Lücken.** `naehrwertZeilen` gibt `null` zurück, wenn ein Wert fehlt; die Tabelle schreibt „unbekannt“.

## 4. Code erklärt

- **Warum Favoriten oben und nicht als eigene Seite:** Beim Eintragen zählt jeder Tipp. Ein Abschnitt „Favoriten“ über „Alles“ spart das Suchen.
- **Warum die Mikro-Tabelle eine eigene Klasse hat:** Ein älterer Test erwartet genau eine `table.naehrwerte`. Nach den Regeln passt sich die neue Funktion an, nicht der Test.
- **Warum höchstens 10 eigene Portionen je Zutat:** Die Knöpfe beim Eintragen sollen in eine Reihe passen.

## 5. Fehler und Sackgassen

| Was passierte | Ursache | Lösung |
|---|---|---|
| `zutaten.js` war plötzlich leer | Python öffnete die Datei zum Schreiben, bevor es sie las | aus Git wiederhergestellt; nie lesen und schreiben in einem Ausdruck |
| Alter Test „strict mode violation“ | zwei Tabellen mit gleicher Klasse | eigene Klasse `naehrwerte-mikro` |
| Neuer Test sah die ungefilterte Liste | Liste gelesen, bevor neu gezeichnet war | auf den gewählten Knopf warten |
| Gewählte Kategorie nicht sichtbar | Chip-Reihe zu breit | gewählten Chip ins Bild scrollen |

## 6. Besser mit Claude arbeiten

- Ein Vorbild wie Yazio hilft, wenn du sagst, welches Bedienmuster du meinst („Stern auf der Detailseite“), nicht nur „wie Yazio“.
- Die große deutsche Datenbank (BLS 4.0) scheitert nicht am Code, sondern an der ungeprüften Lizenz. Wenn du den Lizenztext findest, schick ihn.

## 7. Selbsttest (5 Fragen)

1. Wo speichert Elan, welche Zutaten Favoriten sind?
2. Warum kann man an einer mitgelieferten Zutat eine Portion anlegen, obwohl die Datei nur gelesen wird?
3. Was zeigt die Tabelle, wenn ein Nährwert fehlt?
4. Was passiert beim zweiten Tipp auf eine gewählte Kategorie?
5. Welche Zutaten stehen beim Eintragen ganz oben, wenn du nichts suchst?

<details><summary>Lösungen</summary>

1. In der Einstellung `zutatFavoriten` (Liste von Kennungen).
2. Die Portion liegt in der Einstellung `portionenExtra` und wird beim Laden eingemischt.
3. „unbekannt“.
4. Der Filter wird aufgehoben.
5. Deine gemerkten Mahlzeiten, dann die Favoriten, dann „Zuletzt eingetragen“.

</details>

## 8. Mini-Übung (15 Minuten)

Füge in `js/logik/zutatenbank.js` einen Filter `'vollstaendig'` hinzu, der nur Zutaten ohne `unvollstaendig` zeigt. Schreib zuerst den Test in `test/zutatenbank.test.js`, dann die eine Zeile in `zutatenAuswahl`. Überleg danach, ob ein Knopf dafür in der Liste hilft oder nur Platz kostet.
