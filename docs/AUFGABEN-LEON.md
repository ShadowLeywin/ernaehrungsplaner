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

Erledigt am 23.11.2026, alle ohne gemeldeten Fehler ([A] laut Startprompt vom 23.11.2026; Rückmeldungen im Einzelnen, etwa zu A5 und A22, fehlen noch).

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| A1 ✓ 23.11. | Elan vom Startbildschirm öffnen | Grünes Zitrus-Icon, dann Seite „Heute“ mit Scheibe und sechs Mahlzeiten |
| A2 ✓ 23.11. | Oben und unten schauen | Nichts liegt unter der Statusleiste oder der Gestenleiste |
| A3 ✓ 23.11. | Bei „Frühstück“ auf das Plus, „hafer“ suchen, antippen, 80 eingeben, „Eintragen“ | Eintrag erscheint, die Scheibe füllt sich |
| A4 ✓ 23.11. | Beim Eintippen der Menge: Ist „Eintragen“ sichtbar, oder verdeckt ihn die Tastatur? | Knopf ist erreichbar |
| A5 ✓ 23.11. | Zurück-Taste von Android, während ein Blatt offen ist | Notiere, ob das Blatt schließt oder die App zur vorigen Seite springt |
| A6 ✓ 23.11. | Rezepte → „Zutaten und Mag-Liste“ → „skyr“ → „bei Open Food Facts suchen“ | Treffer mit „Übernehmen“; bei Fehlermeldung: Wortlaut notieren |
| A7 ✓ 23.11. | Flugmodus an, App schließen, neu öffnen, etwas eintragen | Alles geht, oben steht „offline“ |
| A8 ✓ 23.11. | Flugmodus aus. Mehr → „Backup speichern“ | Teilen-Menü öffnet sich; „In Drive speichern“ oder „Dateien“ wählen |
| A9 ✓ 23.11. | Mehr → „Backup einspielen“ → die gespeicherte Datei wählen → „Alles ersetzen“ | „Backup eingespielt“, Einträge sind da |
| A10 ✓ 23.11. | In einer anderen App Text markieren → Teilen → „Elan“ | Elan öffnet „Rezept importieren“ mit dem Text |
| A11 ✓ 23.11. | Woche → etwas einplanen → „Einkaufsliste“ → „Offene Posten teilen“ | Teilen-Menü mit der Liste |
| A12 ✓ 23.11. | Mehr → Referenzwerte: Geschlecht und Alter wählen. Dann Heute → „Alle Nährwerte“ | Prozent je Vitamin und Mineralstoff |
| A13 ✓ 23.11. | Health → Gewicht eintragen → „Tageswerte speichern“, App schließen und öffnen | Wert ist noch da |
| A14 ✓ 23.11. | Mehr → Darstellung: Design Blatt und Zitrus, dazu Hell und Dunkel durchschalten | Alles bleibt lesbar, die Wahl bleibt nach Neustart |
| A15 ✓ 23.11. | Mehr → „Was ist neu“ und „Über Elan“ lesen | Liste der Neuerungen, Funktionen kurz erklärt |
| A16 ✓ 23.11. | Bei einer Mahlzeit auf das Plus: Steht oben „Zuletzt eingetragen“ mit „+ 80 g“? Antippen | Eintrag ist sofort da, unten „Rückgängig“ |
| A17 ✓ 23.11. | Startbildschirm lange drücken → Widgets → Elan → „Elan · heute“ hinzufügen. Danach Wasser eintragen | Widget zeigt kcal übrig und das neue Wasser |
| A18 ✓ 23.11. | Zwei Minuten frei herumtippen | Notiere, was hakt, zu klein ist oder unklar heißt |
| A19a ✓ 23.11. | Samsung Health → Einstellungen → Health Connect → Synchronisieren einschalten (sonst kommen Ring-Daten nicht in Health Connect an) | Health Connect → Daten und Zugriff zeigt Schritte, Schlaf, Herzfrequenz von Samsung Health |
| A19 ✓ 23.11. | Mehr → Health Connect → „Mit Health Connect verbinden“, alle sieben Arten erlauben (auch HRV) | Heute zeigt die Werte mit „aus Health Connect“. Falls kein Erlaubnis-Fenster kommt: Bildschirmfoto an Claude |
| A20 ✓ 23.11. | Mehr → Erinnerungen → „Ans Trinken erinnern“ an, eine Uhrzeit auf in 30 Minuten stellen | Android fragt einmal nach Benachrichtigungen; zur Uhrzeit (auf ein paar Minuten genau) kommt „Wasser“ mit dem Blatt-Symbol |
| A21 ✓ 23.11. | Heute → „Wie geht es dir heute?“: je Frage eine Zahl tippen, dann Fortschritt öffnen | Zahlen bleiben gewählt; „Letzte 7 Tage“ zeigt Energie, Stimmung, Stress |
| A22 ✓ 23.11. | Fortschritt → Körperwerte: Steht bei HRV ein Wert? | Wenn „noch kein Wert“: Samsung Health gibt HRV nicht an Health Connect weiter; kurz melden |

## P1. Planung und Einkauf am Handy testen (etwa 10 Minuten, nach dem Merge von P1)

Vorher: Mehr → „Backup speichern“ (das Update hebt die Datenbank auf Schema 8).

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| P1-1 | Leiste unten: steht dort „Plan“ statt „Woche“? Antippen | Woche wie bisher, oben neu „Woche \| Monat“ |
| P1-2 | „Monat“ tippen, App schließen, öffnen, „Plan“ tippen | Monat erscheint wieder; jede Woche eine Karte mit „KW …“ |
| P1-3 | Im Monat auf einen Tag tippen, bei „Abendessen“ auf das Plus, etwas einplanen | Blatt ist mit „Abendessen“ vorbelegt; danach „x von y kcal“ beim Abendessen |
| P1-4 | „Einkaufsliste Monat“ öffnen, dann „Frei“ und zwei Tage wählen, „Zeigen“ | Liste summiert über den Zeitraum; Datumsfelder im deutschen Format |
| P1-5 | Hattest du vor dem Update in einer Wochenliste etwas abgehakt? Diese Woche öffnen | Häkchen sind noch da |
| P1-6 | Datumsfelder bei „Frei“ antippen | Android-Kalender öffnet sich, Tastatur verdeckt „Zeigen“ nicht |

## P3. Märkte und Preise am Handy testen (etwa 10 Minuten, nach dem Merge von P3)

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| P3-1 | Mehr → Märkte → deine Postleitzahl → „Suchen“ | Liste mit Läden und Adressen; bei Fehler den Wortlaut notieren |
| P3-2 | Dasselbe mit dem Ortsnamen, z. B. „Burgau“ | Läden dieses Orts; falls „Keine Läden gefunden“, melden |
| P3-3 | Zwei Märkte „Merken“, einen Hofladen von Hand anlegen | alle drei unter „Meine Märkte“ |
| P3-4 | Einkaufsliste → „Preise bei“ einen Markt wählen → bei einer Zutat „€ ?“ → Preis und Packung eintragen | Betrag rechts, oben „Grob … €“ |
| P3-5 | „Märkte vergleichen“ | Märkte mit Summe und „x von y Posten mit Preis“ |

## B. Automatischer Bau einrichten (5 Minuten, am Rechner oder Handy)

Erledigt am 23.11.2026: Secrets eingetragen, Release „Elan 1.0.0“ mit signiertem APK gebaut.

Danach baut GitHub nach jeder Änderung ein signiertes APK und legt es unter „Releases“ ab.

| Nr. | Was du tust |
|---|---|
| B1 ✓ 23.11. | Auf github.com das Repo `ernaehrungsplaner` öffnen → **Settings** → **Secrets and variables** → **Actions** |
| B2 ✓ 23.11. | **New repository secret**: Name `ELAN_KEYSTORE_BASE64`, Wert: die lange Zeile ganz unten aus `Elan-Signaturschluessel.txt` (alles in einer Zeile) → **Add secret** |
| B3 ✓ 23.11. | Noch einmal **New repository secret**: Name `ELAN_KEYSTORE_PASSWORT`, Wert: das Passwort aus derselben Datei → **Add secret** |
| B4 ✓ 23.11. | Reiter **Actions** → „Android-App bauen“ → **Run workflow** → **Run workflow** |
| B5 ✓ 23.11. | Nach etwa 5 Minuten: Startseite des Repos → rechts **Releases** → „Elan 1.0.0“ → APK antippen. Updates installieren sich über die vorhandene App, die Daten bleiben |

Was du als Nächstes verbessert haben willst: ein Satz an Claude genügt.

## C. Freiwillig

| Nr. | Aufgabe | Nutzen |
|---|---|---|
| C1 | Coach-Prompt ausprobieren: `docs/COACH-PROMPT.md`, Prompt und Wochenbericht (Mehr → Coach-Export) in einen KI-Chat | Du siehst, ob die Auswertung hilft |
| C2 | Die Lego-Anleitung lesen: `docs/lernen/ANLEITUNG-SESSION-0.md` | Verstehen, wie die App gebaut ist, mit Selbsttest |
| C3 | Die Web-Version (Adresse oben in der README) einmal im Browser öffnen | Gleiche App ohne Installation, praktisch für Freunde |
