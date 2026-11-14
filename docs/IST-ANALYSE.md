# Ist-Analyse des früheren Stands

Geprüft am 13.11.2026 am Commit `4926827`. Der Stand wurde danach auf Léons Wunsch entfernt und durch einen Neuaufbau ersetzt. Er bleibt in der Git-Historie.

## Befund

| Punkt | Ergebnis | Beleg |
|---|---|---|
| Umfang | 192 Dateien, rund 14.900 Zeilen, App „FORGEBORN“ (Ernährung, Training, Spiel-Ebene) | `git ls-files`, `wc -l` |
| Technik | Vanilla JS, ES-Module, kein Build, IndexedDB mit 3 Speichern | `js/db.js` |
| Tests | 171 von 171 grün | `npm test` |
| App im Browser | lädt, 0 Konsolenfehler, 16 Ansichten | Playwright-Durchlauf |
| Service Worker | aktiv, 110 Dateien von Hand gelistet | `sw.js` |
| Angebote | Action zweimal je Woche, Quelle marktguru (inoffiziell), keine Secrets, Schreibrecht aufs Repo | `.github/workflows/angebote.yml` |
| `angebote.json` | gültig, 5 Märkte, 1.691 Angebote, davon 713 Non-Food | Prüfskript |

## Warum neu gebaut

| Grund | Erklärung |
|---|---|
| Umfang passt nicht | etwa die Hälfte des Codes war Training und Spiel-Ebene, die das neue Konzept ausschließt |
| Kopplung | 7 Ernährungs-Dateien importierten Spiel- oder Trainingscode |
| Datenmodell | wenige große Blöcke statt Entitäten, keine Migrationslogik |
| Lernziel | Léon will jeden Baustein verstehen |

## Was übernommen wurde

- Nur Daten, kein Code: die Nährwerte von 184 Lebensmitteln (173 aus USDA SR Legacy, 11 Richtwerte), umgewandelt in das neue Format `data/zutaten-basis.json`.

## Weg zurück

`git checkout 4926827 -- <pfad>` holt einzelne alte Dateien, zum Beispiel das Angebots-Skript.

## Annahmen [A]

- [A] Die übernommenen Nährwerte sind korrekt aus den USDA-Rohdaten erzeugt worden; geprüft ist nur die Plausibilität (Energie gegen Makros).

## Quellen (mit Datum)

- Git-Historie dieses Repos, Commit `4926827`, geprüft 13.11.2026.
