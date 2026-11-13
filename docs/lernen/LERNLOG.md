# Lernlog

Ein Eintrag pro Runde, höchstens 8 Zeilen. Keine persönlichen Gesundheitsdaten.

## Session 0, Runde 1: Bestand (13.11.2026)

- **Was und warum:** Repo inventarisiert und die App selbst gestartet, bevor irgendetwas gelöscht wird. Grund: Der Auftrag nannte den Stand „frühe PWA“, tatsächlich liegen rund 14.900 Zeilen Code, 171 Tests und eine laufende Angebots-Pipeline im Repo.
- **Befehle:** `git ls-files | wc -l` (zählt versionierte Dateien) · `npm test` (startet `node --test`, 171 von 171 grün) · `python3 -m http.server 8080 --bind 127.0.0.1` (liefert die App lokal aus) · `node pruef.cjs` (Playwright öffnet die App im Handy-Emulator, liest Konsole, Manifest, Service Worker, schaltet das Netz ab).
- **Entscheidung:** Erst messen, dann leeren. Verworfen: sofort alles löschen, weil dabei auch die Angebots-Action und getestete Rechenlogik verschwinden würden.
- **Sackgasse:** Das Prüfskript blieb in der Ersteinrichtung hängen („Weiter“ gesperrt). Ursache: Pflichtfeld „Geschlecht“ ist ein `select`, das Skript füllte nur `input`-Felder. Lösung: Auswahlfelder mit `selectOption` setzen.
- **Einschränkung:** Auf `localhost` arbeitet der Service Worker „Netz zuerst“, live „Cache zuerst“. Der Offline-Test hier prüft also nur den Rückfall auf den Cache, nicht das Live-Verhalten.
- **Fachbegriffe:** App-Hülle (App Shell), Vorab-Cache (Precache), Cache-first / Network-first, Hash-Router, `workflow_dispatch`, `permissions: contents: write`, Headless-Browser.
- **Zum Auftrag:** Geholfen haben die klare Arbeitsschleife und die Erlaubnisliste. Gefehlt hat der echte Stand des Repos; die Zusatzanweisung „leeren“ widersprach der Regel „Löschen nur mit Ja nach der Bewertung“ und der Frage „erweitern oder neu bauen“.
