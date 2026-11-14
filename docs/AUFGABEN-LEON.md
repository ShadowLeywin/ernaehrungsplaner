# Aufgaben für Léon

Was nur du erledigen kannst, während Claude pausiert. Von oben nach unten, ein Punkt nach dem anderen. Stand: Version 0.9, 14.11.2026.

**So antwortest du:** Schreib die Nummer und was passiert ist, zum Beispiel „A3 geht, A4: Knopf verdeckt“ oder „B2: MIT“.

## A. Am Handy testen (zusammen etwa 20 Minuten)

Adresse: https://shadowleywin.github.io/ernaehrungsplaner/

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| A1 | Adresse in Chrome öffnen | Seite „Heute“ mit grüner Scheibe und sechs Mahlzeiten |
| A2 | Menü von Chrome → „Zum Startbildschirm hinzufügen“, dann die App vom Startbildschirm öffnen | App startet ohne Adressleiste, Icon ist eine grüne Zitrusscheibe |
| A3 | Bei „Frühstück“ auf das Plus, „hafer“ suchen, antippen, 80 eingeben, „Eintragen“ | Eintrag erscheint, die Scheibe füllt sich |
| A4 | Beim Eintippen der Menge: Ist der Knopf „Eintragen“ sichtbar, oder verdeckt ihn die Tastatur? | Knopf ist erreichbar |
| A5 | Rezepte → „Zutaten und Mag-Liste“ → „skyr“ eintippen → „bei Open Food Facts suchen“ | Treffer mit „Übernehmen“. Wenn eine Fehlermeldung kommt: Wortlaut notieren |
| A6 | Flugmodus an, App ganz schließen, neu öffnen | App startet, oben rechts steht „offline“ |
| A7 | Flugmodus aus. Mehr → „Backup speichern“ | Eine Datei `elan-backup-….json` wird gespeichert |
| A8 | Mehr → „Backup einspielen“ → die Datei wählen → „Alles ersetzen“ | Hinweis „Backup eingespielt“, Einträge sind noch da |
| A9 | Mehr → „Speicher schützen“ | „Der Speicher ist jetzt geschützt“ oder eine Ablehnung (beides notieren) |
| A10 | In einer anderen App (Notizen, Browser) einen Rezepttext markieren → Teilen → „Elan“ | Elan öffnet „Rezept importieren“ mit dem Text. Fehlt Elan im Teilen-Menü: notieren |
| A11 | Woche → an zwei Tagen etwas einplanen → „Einkaufsliste“ → „Offene Posten teilen“ | Teilen-Menü öffnet sich mit der Liste als Text |
| A12 | Health → Gewicht eintragen (ein Wert reicht) → „Tageswerte speichern“ | Wert bleibt nach dem Neuladen stehen |
| A13 | Mehr → Darstellung → „Dunkel“ | Alles bleibt lesbar |
| A15 | Rezepte → „Zutaten und Mag-Liste“ → eine Zutat öffnen → „Angebot eintragen“ (Markt, Preis) | Angebot steht bei der Zutat; plane die Zutat ein, dann steht es auch in der Einkaufsliste |
| A14 | Zwei Minuten frei herumtippen | Notiere alles, was hakt, zu klein ist oder unklar heißt |

## B. Entscheidungen (zusammen etwa 5 Minuten)

| Nr. | Frage | Möglichkeiten | Empfehlung |
|---|---|---|---|
| B1 | Bleibt der Name „Elan“? | ja; anderer Name | ja |
| B2 | Lizenz des Repos? | MIT (jeder darf weiterbauen); GPL-3.0 (Ableger müssen offen bleiben); keine (niemand darf den Code nutzen) | MIT |
| B3 | Angebote über marktguru wieder automatisch holen? | nein, von Hand und per Datei reicht (geht seit 0.9); ja, wenn marktguru es erlaubt (dann fragst du dort an) | nein |
| B4 | Fehlt dir „Zutaten“ in der unteren Leiste? | passt so; soll zurück (dann muss ein anderer Eintrag weichen) | passt so |
| B5 | Was soll als Nächstes besser werden? | ein Satz genügt | – |

## C. Freiwillig, wenn du Zeit hast

| Nr. | Aufgabe | Nutzen |
|---|---|---|
| C1 | Coach-Prompt ausprobieren: `docs/COACH-PROMPT.md` öffnen, Prompt und einen Wochenbericht (Mehr → Coach-Export) in einen KI-Chat kopieren | Du siehst, ob die Auswertung hilft |
| C2 | In den Netzwerk-Einstellungen dieser Claude-Umgebung die Seite `www.dge.de` erlauben | Dann kann Claude die Referenzwerte für Vitamine und Mineralstoffe mit Quelle einbauen |
| C3 | „Session 0 fertig“ schreiben | Claude schreibt die Lego-Anleitung aus Lernlog und Code |
| C4 | Im Lernlog (`docs/lernen/LERNLOG.md`) die Einträge „Fehler“ lesen | Die drei wichtigsten Lehren der Nacht in fünf Minuten |

## Was Claude ohne dich nicht prüfen kann

- alles, was eine echte Tastatur, Kamera oder das Teilen-Menü braucht
- ob Open Food Facts von deinem Handy aus antwortet
- ob Namen und Texte in der App für dich natürlich klingen
