# Bauanleitung P4: Angebote und Prospekte

Wie eine Lego-Anleitung. Alles hier ist im Lernlog (Session 16, Runden P4.1 und P4.3) oder im Code belegt. Stand 23.11.2026.

## 1. Fertiges Modell

Unter Mehr → **Prospekte** lädst du eine Angebotsdatei. Danach blätterst du die Angebote je Markt wie in einem Prospekt: Kacheln mit Preis, Artikel, Menge und „bis“, sortiert nach Kategorie. Was diese Woche auf deiner Einkaufsliste steht, trägt „auf deiner Liste“. Artikel mit verknüpfter Zutat zählen auch als Angebot in der Einkaufsliste und bei den Preisen je Markt (P3).

Oben stehen Knöpfe zu den **Original-Prospekten** deiner gemerkten Märkte. Bei Lidl führt der Knopf direkt zu den Prospekten, bei den anderen Ketten zur Startseite. Elan öffnet sie im Browser und lädt selbst nichts.

**Was es bewusst nicht gibt:** einen automatischen wöchentlichen Abruf. Es gibt noch keine Quelle, deren Bedingungen das erlauben (Entscheidung E4.1).

## 2. Teileliste

| Teil | Wo | Wozu |
|---|---|---|
| Format | `docs/ANGEBOTE-FORMAT.md` (Version 2) | Artikel je Markt, `zutat` freiwillig |
| Leser | `js/logik/prospekt.js` | `leseProspektDatei`, `leseAngebotsDateiBeliebig`, `linkFuer`, `prospektSeiten` |
| Links | `data/prospekt-links.json` | Ketten mit Adresse und Art (`prospekt` oder `startseite`) |
| Öffnen | `oeffneExtern` in `js/plattform.js` | nur `https`, nur nach Tipp |
| Seite | `js/ansichten/prospekte.js` | `#/prospekte` |
| Tests | `test/prospekt.test.js`, `prospektLauf` in `tools/pruefe-app.cjs` | 242 Unit-Tests, 172 Kriterien |

## 3. Bauschritte

**Schritt 1: Erst die Rechtslage, dann der Code.** Die alte Action nutzte eine inoffizielle Schnittstelle von marktguru und holte dafür Zugangsschlüssel aus deren Webseite. Die Nutzungsbedingungen dazu waren nicht zu finden. Deshalb gibt es keinen Abruf, und die Datei ist die Schnittstelle.

**Schritt 2: Format Version 2.** Ein Prospekt hat Artikel („Bio Haferflocken zart“), nicht Zutaten. Deshalb ist `artikel` Pflicht und `zutat` freiwillig:

```js
const zutat = nachId.get(zutatName) ?? findeZutat(zutatName, zutaten); // nur ganze Wörter
if (zutat) angebote.push({ ...pruefung.angebot, zutatId: zutat.id, quelle: 'datei', notiz: name });
```

**Schritt 3: Links nur, wenn belegt.** Für Lidl lieferte die Websuche die Prospekt-Seite, für die anderen Ketten nichts Belegtes. Darum steht dort „Website von … öffnen“.

**Schritt 4: Die Seite.** Chips je Markt, Kacheln in zwei Spalten, Treffer zur Liste zuerst. Die Daten liegen als Einstellung `prospekt`, deshalb brauchte es keine neue Schema-Version.

**Schritt 5: Testen ohne Netz.** Im Browsertest wird `window.open` abgefangen und es wird gezählt, ob irgendein fremder Host angefragt wurde: null.

## 4. Code erklärt

- **Warum `https` Pflicht ist:** Ein Link `javascript:…` aus einer fremden Datei könnte Code in Elan ausführen. Der Leser verwirft alles, was nicht mit `https://` beginnt, und ein Test prüft genau das.
- **Warum zwei Wege für Angebote:** Die Prospekt-Seite braucht alle Artikel, Einkaufsliste und Preise brauchen nur die mit Zutat. Deshalb landen die verknüpften Artikel zusätzlich im Speicher `angebote`.
- **Warum Version 1 weiter geht:** Alte Dateien (`schemaVersion: 1`) liest `leseAngebotsDateiBeliebig` wie bisher; sie haben nur keinen Prospekt.

## 5. Fehler und Sackgassen

| Was passierte | Ursache | Lösung |
|---|---|---|
| Konflikte in `sw.js`, Roadmap und Lernlog | P4.1 von `main` abgezweigt, während P2.2 noch offen war | P2.2 in den Branch gemergt, Konflikte von Hand gelöst; danach gestapelt weitergebaut |
| Maß-Test fiel zweimal | Diagnose: Wert gespeichert, Name verloren, also wohl ein echter Fehler | in der Roadmap unter „Bekannte Fehler“, nicht im Test versteckt |
| Unklar, ob ein Link im WebView oder im Browser aufgeht | Verhalten von Capacitor nicht belegt | `oeffneExtern` an einer Stelle; Léon prüft am Handy (P4-1) |

## 6. Besser mit Claude arbeiten

- „Überlege selber“ bei einer Rechtsfrage heißt für Claude: im Zweifel nicht abrufen und dir sagen, was fehlt. Wenn du eine erlaubte Quelle findest, genügt ein Satz.
- Ein Foto vom Prospekt plus die Format-Beschreibung in einem Chat ergibt eine Datei für Elan. Das bleibt deine Handlung, nicht ein Abruf der App.

## 7. Selbsttest (5 Fragen)

1. Warum ruft Elan keine Prospekte automatisch ab?
2. Welches Feld verknüpft einen Prospekt-Artikel mit einer Zutat?
3. Was passiert mit einem Link `javascript:alert(1)` in einer Angebotsdatei?
4. Wann steht „auf deiner Liste“ an einer Kachel?
5. Warum steht bei EDEKA „Website öffnen“ statt „Prospekt öffnen“?

<details><summary>Lösungen</summary>

1. Es gibt keine Quelle, deren Bedingungen das erlauben (E4.1).
2. `zutat`, nur bei ganzen Wörtern.
3. Er wird verworfen; nur `https://` zählt.
4. Wenn die Zutat des Artikels auf der Einkaufsliste dieser Woche steht.
5. Die Adresse der Prospekt-Seite war nicht belegt; Elan rät keine Adressen.

</details>

## 8. Mini-Übung (15 Minuten)

Mach ein Foto von einer Prospekt-Seite deines Markts. Gib es zusammen mit dem Abschnitt „Version 2“ aus `docs/ANGEBOTE-FORMAT.md` in einen Claude-Chat und bitte um eine Datei für Elan. Lade sie unter Mehr → Prospekte. Prüf drei Preise mit dem Foto. Stimmt einer nicht, überleg, an welcher Stelle der Vorlage du den Chat genauer anleiten würdest.
