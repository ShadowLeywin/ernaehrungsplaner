# Offene Fragen

Jede Frage hat eine Empfehlung. Léon entscheidet.

| Nr. | Frage | Stand | Empfehlung | Blockiert |
|---|---|---|---|---|
| 1 | Bundeslebensmittelschlüssel 4.0 als deutsche Grunddatenbank? | Seit Dezember 2025 kostenfrei, über 7.000 Lebensmittel [belegt]. Der genaue Lizenztext (Weitergabe in einer App, Namensnennung) ist nicht geprüft [offen] | Lizenz auf der Seite des Max Rubner-Instituts lesen. Passt sie: Auszug als Datei mitliefern, sonst bei USDA-Basis bleiben | nichts; würde Modul 1 verbessern |
| 2 | Angebote: weiter über marktguru? | Die frühere Action nutzte eine inoffizielle Schnittstelle und las Zugangsschlüssel aus der Webseite. Nutzungsbedingungen dazu nicht gefunden [offen]. Bricht, sobald die Seite sich ändert [vermutet] | Nicht automatisiert weiterführen, bis geklärt. Alternativen: Anbieter um Erlaubnis fragen; Angebote von Hand an einer Zutat notieren; Datei selbst pflegen und importieren | Session 6 |
| 3 | USDA-Suche: wie mit dem API-Schlüssel umgehen? | Ein Schlüssel im Client-Code ist für jeden lesbar. USDA verlangt einen Schlüssel je Nutzer [vermutet, Doku war nicht abrufbar] | Kein Schlüssel im Repo. Variante A: jeder Nutzer trägt seinen eigenen Schlüssel in der App ein (liegt nur lokal, nicht im Backup). Variante B: auf Live-Suche verzichten und Daten vorab als Datei aufbereiten. Empfehlung: B, zusammen mit Frage 1 | USDA-Teil von Modul 1 |
| 4 | Lizenz des Repos? | Früher GPL-3.0, beim Neuaufbau entfernt. Ohne Lizenzdatei darf niemand den Code weiterverwenden | MIT, wenn Freunde frei weiterbauen sollen; GPL-3.0, wenn Ableger offen bleiben müssen; keine, wenn es privat bleiben soll | nichts |
| 5 | Referenzwerte für Mikronährstoffe? | Noch keine im Code | D-A-CH-Referenzwerte der DGE mit Quelle und Datum als Datei; Obergrenzen der EFSA. Vor Session 3 nachschlagen | Session 3 |
| 6 | Open Food Facts: Limits und Pflichten? | Nutzung nur auf Knopfdruck. Limits (etwa 10 Suchen je Minute) und Lizenz ODbL [vermutet, Doku war nicht abrufbar]. Live nicht getestet, nur mit Beispieldaten | Am Handy testen. Doku bei nächster Gelegenheit nachschlagen und hier belegen | nichts |
| 7 | Name „Elan“? | Annahme, weil kein Name genannt wurde | bestätigen oder ändern (drei Stellen, siehe `CLAUDE.md`) | nichts |
| 8 | Alte Daten der früheren App im Browser? | Die frühere App nutzte auf derselben Adresse die Datenbank `ernaehrungsplaner`. Elan fasst sie nicht an | So lassen. Wer aufräumen will: App-Daten im Browser löschen | nichts |
| 9 | Startwerte für Ziele und Slot-Anteile? | Neutrale Zahlen im Code, in der App änderbar. Slot-Anteile noch nicht einstellbar | reicht bis Session 3 | nichts |

## Was nicht getestet werden konnte

| Punkt | Grund | Wer prüft |
|---|---|---|
| Live-Abruf bei Open Food Facts | Host in der Arbeitsumgebung gesperrt | Léon am Handy |
| Installation auf dem Startbildschirm | braucht ein echtes Gerät | Léon am Handy |
| Verhalten der Bildschirmtastatur im Mengen-Blatt | Emulator hat keine Tastatur | Léon am Handy |
| Backup-Datei speichern und wieder auswählen unter Android | Dateidialog des Systems | Léon am Handy |

## Annahmen [A]

- [A] Die Angebots-Action bleibt abgeschaltet, bis Frage 2 entschieden ist.
- [A] Kein Verzicht auf Open Food Facts trotz offener Frage 6, weil nur einzelne, vom Nutzer ausgelöste Abrufe stattfinden.

## Quellen (mit Datum)

- BLS 4.0: [heise](https://heise.de/-11123877), [Agrolab](https://agrolab.com/en/news/food-news/6105-bls-datenbank-radar-01-26-en.html), [Lebensmittelpraxis](https://lebensmittelpraxis.de/handel-aktuell/47047-nationale-naehrstoffdatenbank-bundeslebensmittelschluessel-wird-kostenfrei-zugaenglich.html), abgerufen 13.11.2026.
- marktguru: Websuche nach Nutzungsbedingungen am 13.11.2026 ohne Treffer; früheres Skript in der Git-Historie (`4926827:scripts/angebote_holen.py`).
- USDA und Open Food Facts: Dokumentation am 13.11.2026 aus der Arbeitsumgebung nicht erreichbar.
