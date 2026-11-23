# Bauanleitung P3: Märkte und Preise

Wie eine Lego-Anleitung. Alles hier ist im Lernlog (Session 16, Runden P3.1, P3.2, P3.4) oder im Code belegt. Stand 23.11.2026.

## 1. Fertiges Modell

Unter Mehr → **Märkte** gibst du deinen Ort oder deine Postleitzahl ein. Ein Tipp auf „Suchen“ fragt OpenStreetMap nach Läden dort, und „Merken“ legt einen Laden unter „Meine Märkte“ ab. Läden, die OpenStreetMap nicht kennt, legst du von Hand an. In der **Einkaufsliste** wählst du oben „Preise bei …“. Dann steht rechts an jeder Zeile der grobe Betrag in ganzen Packungen: ein gültiges Angebot zuerst, sonst dein gemerkter Preis, sonst „€ ?“. Ein Tipp auf „€ ?“ öffnet ein Blatt für Preis und Packungsgröße. „Märkte vergleichen“ zeigt die Liste in allen deinen Märkten. Eine Karte gibt es bewusst nicht (deine Entscheidung E3.2), und einen Standort auch nicht (E3.1).

## 2. Teileliste

| Teil | Wo | Wozu |
|---|---|---|
| Preislogik | `js/logik/preise.js` | Packungsgröße lesen, Preis je Posten, Summe, Vergleich |
| OSM-Logik | `js/logik/osm.js` | Ort prüfen, Overpass-Abfrage bauen, Antwort lesen |
| Speicher | `maerkte`, `preise` (Schema 9) | gewählte Märkte, gemerkte Preise |
| Märkte-Seite | `js/ansichten/maerkte.js` | suchen, merken, von Hand anlegen |
| Einkaufsliste | `js/ansichten/einkauf.js` | „Preise bei“, Preis-Knopf, Vergleich |
| Netz | `holeJson` in `js/plattform.js` | in der App über natives HTTP, im Browser über `fetch` |
| Beispielantwort | `test/daten/overpass-maerkte.json` | erfundene Läden für Tests, kein echter Abruf |
| Tests | `test/preise.test.js`, `test/osm.test.js`, `tools/pruefe-app.cjs` | 231 Unit-Tests, 163 Kriterien |

## 3. Bauschritte

**Schritt 1: Erst die Rechnung (P3.1).** Ein Preis gilt immer für eine Packung. Darum braucht jeder Preis eine Packungsgröße:

```js
export function packungAusText(text) {
  const m = /^(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(kg|gr|gramm|g|ml|cl|liter|l)\b/i.exec(String(text ?? '').trim());
  if (!m) return null; // "1 Stück" oder "Packung": nicht rechenbar, also kein Preis
  ...
}
```

**Schritt 2: Die Vorrangregel.** `preisFuerPosten` nimmt das günstigste gültige Angebot des Markts mit Packungsgröße, sonst den gemerkten Preis (`<zutatId>|<marktId>`), sonst `unbekannt`. Ganze Packungen: `Math.ceil(gramm / packung - 0.02)`, damit 502 g bei 500-g-Packungen nur eine Packung sind.

**Schritt 3: Schema 9.** Zwei neue, leere Speicher. Nichts Bestehendes ändert sich, deshalb ist die Migration eine Zeile je Speicher. Alte Backups bekommen leere Listen.

**Schritt 4: Märkte suchen (P3.2).** Overpass findet das Gebiet selbst, ein zweiter Dienst ist nicht nötig:

```
area["ISO3166-1"="DE"][admin_level=2]->.de;
rel["boundary"="postal_code"]["postal_code"="12345"](area.de);
map_to_area->.ort;
nwr["shop"~"^(supermarket|convenience|chemist|…)$"](area.ort);
out center tags 100;
```

`out center` liefert auch für Gebäude einen Punkt. Läden ohne Namen fallen weg.

**Schritt 5: Preise in der Liste (P3.4).** Eine Auswahl „Preise bei“, ein Knopf je Zeile, eine Summe mit „x von y Posten mit Preis“ und ein Blatt zum Vergleichen.

**Schritt 6: Ansehen, nicht nur testen.** Erst das Bild zeigte, dass der Name „Apfel“ Buchstabe für Buchstabe untereinander stand.

## 4. Code erklärt

- **Warum der Vergleich nicht einfach nach Summe sortiert:** Ein Markt mit nur einem bekannten Preis wäre sonst „am billigsten“. Deshalb zählt zuerst, für wie viele Posten ein Preis bekannt ist.
- **Warum ein Angebot „Lidl“ zu jeder Lidl-Filiale passt:** `passtZuMarkt` vergleicht den Namen des Angebots mit der Kette des Markts (`marke` aus OpenStreetMap), nur als ganzes Wort. „Lidlmarkt“ passt nicht.
- **Warum Getipptes erhalten bleibt:** Wechselst du den Markt, wird die Seite neu gezeichnet. Der Text in „Noch etwas?“ liegt in einem `entwurf` außerhalb der Funktion und kommt zurück.
- **Warum geschützte Leerzeichen:** ` ` in „1 × 1 kg“ verhindert einen Umbruch mitten in der Angabe.

## 5. Fehler und Sackgassen

| Was passierte | Ursache | Lösung |
|---|---|---|
| Kriterium „Tippflächen ab 40 px“ schlug an | Quellen-Link steht im Satz | Links im Fließtext sind nach WCAG 2.5.8 ausgenommen; Kriterium angepasst |
| „Apfel“ eine Buchstabenbreite schmal | Menge und Preis-Knopf rechts nahmen den Platz | Menge in die kleine Zeile; neues Kriterium „Name mindestens 120 px“ |
| Bild-Skript hing | IndexedDB-Transaktion ohne den Speicher `einstellungen` | alle Speicher in `transaction([...])` nennen |
| Überschrift „B. Automatischer Bau“ verschwunden | beim Einfügen der P1-Aufgaben ersetzt statt ergänzt | wiederhergestellt und abgehakt |
| Echter Abruf bei Overpass nicht testbar | Host in der Arbeitsumgebung gesperrt | Test mit Beispielantwort; echter Test am Handy (P3-1, P3-2) |

## 6. Besser mit Claude arbeiten

- Deine kurzen Entscheidungen („Ort eintippen“, „Liste statt Karte“) haben P3 kleiner und sicherer gemacht: kein neues Android-Recht, keine Kartenkacheln.
- „Überlege selber“ funktioniert, wenn die Leitplanken klar sind. Hier war das: kein Abruf ohne Erlaubnis, keine erfundenen Preise.
- Bilder schauen lohnt sich: Zwei der drei Layoutfehler fand kein Test, sondern ein Bild.

## 7. Selbsttest (5 Fragen)

1. In welcher Reihenfolge sucht Elan einen Preis für einen Posten?
2. Was kostet 1,2 kg Reis, wenn das Angebot 1,49 € für 1 kg ist?
3. Warum zeigt Elan bei einem Angebot „0,50 € je Packung“ ohne Gramm keinen Preis?
4. Was schickt Elan an Overpass, wenn du „Suchen“ tippst?
5. Warum steht im Vergleich ein Markt mit 2 von 2 Preisen über einem mit 1 von 2, auch wenn der teurer ist?

<details><summary>Lösungen</summary>

1. Gültiges Angebot des Markts mit Packungsgröße, dann gemerkter Preis, dann „unbekannt“.
2. Zwei Packungen: 2,98 €.
3. Ohne Packungsgröße lässt sich keine Menge umrechnen; ein Betrag wäre erfunden.
4. Nur die Abfrage mit dem eingetippten Ort oder der PLZ, keinen Standort und nichts aus dem Tagebuch.
5. Eine Summe über weniger Posten ist nicht billiger, nur unvollständiger.

</details>

## 8. Mini-Übung (15 Minuten)

Ergänze in `js/logik/preise.js` eine Funktion `grundpreis(e)`, die für ein Ergebnis von `preisFuerPosten` den Preis je Kilogramm liefert (z. B. 1,29 € für 500 g → 2,58 €/kg), und `null`, wenn der Preis unbekannt ist. Schreib zuerst drei Fälle in `test/preise.test.js` (500 g, 1,5 kg, unbekannt), dann die Funktion. Prüfe mit `npm test`. Überlege: Wo in der Einkaufsliste würde der Grundpreis helfen, und wo wäre er nur Lärm?
