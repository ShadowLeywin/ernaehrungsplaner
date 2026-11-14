# Aufgaben für Léon

Was nur du erledigen kannst. Von oben nach unten, ein Punkt nach dem anderen. Stand: Version 1.0.0 (Android-App), 14.11.2026.

**So antwortest du:** Schreib die Nummer und was passiert ist, zum Beispiel „A3 geht, A4: Knopf verdeckt“ oder „B1: ja“.

## 0. Zuerst (5 Minuten)

| Nr. | Was du tust | Warum |
|---|---|---|
| 01 | Die Datei `Elan-Signaturschluessel.txt` aus dem Chat in deinen Passwort-Manager oder einen privaten Ordner legen, **nicht** auf den Firmenrechner | Ohne diesen Schlüssel lassen sich keine Updates über die installierte App spielen |
| 02 | `Elan-1.0.0.apk` aus dem Chat aufs Handy laden und antippen | Installation startet |
| 03 | Android fragt nach „Installation aus unbekannten Quellen“: für diese eine App (Browser oder Dateien-App) erlauben, dann „Installieren“ | Ohne Play Store ist das der normale Weg |
| 04 | Play Protect warnt eventuell vor einer unbekannten App: „Trotzdem installieren“ | Die App ist nur nicht im Play Store registriert |

## A. Am Handy testen (zusammen etwa 20 Minuten)

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| A1 | Elan vom Startbildschirm öffnen | Grünes Zitrus-Icon, dann Seite „Heute“ mit Scheibe und sechs Mahlzeiten |
| A2 | Oben und unten schauen | Nichts liegt unter der Statusleiste oder der Gestenleiste |
| A3 | Bei „Frühstück“ auf das Plus, „hafer“ suchen, antippen, 80 eingeben, „Eintragen“ | Eintrag erscheint, die Scheibe füllt sich |
| A4 | Beim Eintippen der Menge: Ist „Eintragen“ sichtbar, oder verdeckt ihn die Tastatur? | Knopf ist erreichbar |
| A5 | Zurück-Taste von Android, während ein Blatt offen ist | Notiere, ob das Blatt schließt oder die App zur vorigen Seite springt |
| A6 | Rezepte → „Zutaten und Mag-Liste“ → „skyr“ → „bei Open Food Facts suchen“ | Treffer mit „Übernehmen“; bei Fehlermeldung: Wortlaut notieren |
| A7 | Flugmodus an, App schließen, neu öffnen, etwas eintragen | Alles geht, oben steht „offline“ |
| A8 | Flugmodus aus. Mehr → „Backup speichern“ | Teilen-Menü öffnet sich; „In Drive speichern“ oder „Dateien“ wählen |
| A9 | Mehr → „Backup einspielen“ → die gespeicherte Datei wählen → „Alles ersetzen“ | „Backup eingespielt“, Einträge sind da |
| A10 | In einer anderen App Text markieren → Teilen → „Elan“ | Elan öffnet „Rezept importieren“ mit dem Text |
| A11 | Woche → etwas einplanen → „Einkaufsliste“ → „Offene Posten teilen“ | Teilen-Menü mit der Liste |
| A12 | Mehr → Referenzwerte: Geschlecht und Alter wählen. Dann Heute → „Alle Nährwerte“ | Prozent je Vitamin und Mineralstoff |
| A13 | Health → Gewicht eintragen → „Tageswerte speichern“, App schließen und öffnen | Wert ist noch da |
| A14 | Mehr → Darstellung → „Dunkel“ | Alles bleibt lesbar |
| A15 | Zwei Minuten frei herumtippen | Notiere, was hakt, zu klein ist oder unklar heißt |

## B. Entscheidungen (2 Minuten)

| Nr. | Frage | Möglichkeiten | Empfehlung |
|---|---|---|---|
| B1 | Soll GitHub das APK künftig automatisch bauen? | ja: Claude legt den Workflow an, du trägst zwei Secrets ein (Anleitung kommt dann); nein: Claude baut neue Versionen in einer Session | ja |
| B2 | Was soll als Nächstes besser werden? | ein Satz genügt | – |

Schon übernommen, weil du „alle Vorschläge umsetzen“ geschrieben hast: Name bleibt „Elan“, Lizenz MIT, Angebote ohne marktguru, „Zutaten“ bleibt unter „Rezepte“ und „Mehr“.

## C. Freiwillig

| Nr. | Aufgabe | Nutzen |
|---|---|---|
| C1 | Coach-Prompt ausprobieren: `docs/COACH-PROMPT.md`, Prompt und Wochenbericht (Mehr → Coach-Export) in einen KI-Chat | Du siehst, ob die Auswertung hilft |
| C2 | Die Lego-Anleitung lesen: `docs/lernen/ANLEITUNG-SESSION-0.md` | Verstehen, wie die App gebaut ist, mit Selbsttest |
| C3 | Die Web-Version (Adresse oben in der README) einmal im Browser öffnen | Gleiche App ohne Installation, praktisch für Freunde |

## Was Claude ohne dich nicht prüfen kann

- alles, was ein echtes Gerät braucht: Installation, Tastatur, Zurück-Taste, Teilen-Menü, Statusleiste
- ob Open Food Facts von deinem Handy aus antwortet
- ob Namen und Texte für dich natürlich klingen
