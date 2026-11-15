# Aufgaben für Léon

Was nur du erledigen kannst, weil es ein echtes Handy oder dein GitHub-Konto braucht. Von oben nach unten, ein Punkt nach dem anderen. Stand: Version 1.0.0 (Android-App, in Arbeit), 14.11.2026.

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
| A14 | Mehr → Darstellung: Design Blatt und Zitrus, dazu Hell und Dunkel durchschalten | Alles bleibt lesbar, die Wahl bleibt nach Neustart |
| A15 | Mehr → „Was ist neu“ und „Über Elan“ lesen | Liste der Neuerungen, Funktionen kurz erklärt |
| A16 | Bei einer Mahlzeit auf das Plus: Steht oben „Zuletzt eingetragen“ mit „+ 80 g“? Antippen | Eintrag ist sofort da, unten „Rückgängig“ |
| A17 | Startbildschirm lange drücken → Widgets → Elan → „Elan · heute“ hinzufügen. Danach Wasser eintragen | Widget zeigt kcal übrig und das neue Wasser |
| A18 | Zwei Minuten frei herumtippen | Notiere, was hakt, zu klein ist oder unklar heißt |
| A19a | Samsung Health → Einstellungen → Health Connect → Synchronisieren einschalten (sonst kommen Ring-Daten nicht in Health Connect an) | Health Connect → Daten und Zugriff zeigt Schritte, Schlaf, Herzfrequenz von Samsung Health |
| A19 | Mehr → Health Connect → „Mit Health Connect verbinden“, alle sechs Arten erlauben | Heute zeigt die Werte mit „aus Health Connect“. Falls kein Erlaubnis-Fenster kommt: Bildschirmfoto an Claude |

## B. Automatischer Bau einrichten (5 Minuten, am Rechner oder Handy)

Danach baut GitHub nach jeder Änderung ein signiertes APK und legt es unter „Releases“ ab.

| Nr. | Was du tust |
|---|---|
| B1 | Auf github.com das Repo `ernaehrungsplaner` öffnen → **Settings** → **Secrets and variables** → **Actions** |
| B2 | **New repository secret**: Name `ELAN_KEYSTORE_BASE64`, Wert: die lange Zeile ganz unten aus `Elan-Signaturschluessel.txt` (alles in einer Zeile) → **Add secret** |
| B3 | Noch einmal **New repository secret**: Name `ELAN_KEYSTORE_PASSWORT`, Wert: das Passwort aus derselben Datei → **Add secret** |
| B4 | Reiter **Actions** → „Android-App bauen“ → **Run workflow** → **Run workflow** |
| B5 | Nach etwa 5 Minuten: Startseite des Repos → rechts **Releases** → „Elan 1.0.0“ → APK antippen. Updates installieren sich über die vorhandene App, die Daten bleiben |

Was du als Nächstes verbessert haben willst: ein Satz an Claude genügt.

## C. Freiwillig

| Nr. | Aufgabe | Nutzen |
|---|---|---|
| C1 | Coach-Prompt ausprobieren: `docs/COACH-PROMPT.md`, Prompt und Wochenbericht (Mehr → Coach-Export) in einen KI-Chat | Du siehst, ob die Auswertung hilft |
| C2 | Die Lego-Anleitung lesen: `docs/lernen/ANLEITUNG-SESSION-0.md` | Verstehen, wie die App gebaut ist, mit Selbsttest |
| C3 | Die Web-Version (Adresse oben in der README) einmal im Browser öffnen | Gleiche App ohne Installation, praktisch für Freunde |
