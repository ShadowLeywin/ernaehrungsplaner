# Bauanleitung P5: Rezepte aus Social Media

Wie eine Lego-Anleitung. Alles hier ist im Lernlog (Session 16, Runden P5.1 bis P5.3) oder im Code belegt. Stand 23.11.2026.

## 1. Fertiges Modell

In TikTok, Instagram oder YouTube tippst du auf „Teilen“ und dann auf **Elan**. Elan öffnet „Rezept importieren“ mit dem, was Android übergibt: dem Link und, je nach App, der Bildunterschrift. Steht dort ein Rezept, erkennt Elan Name, Zutaten und Schritte, ohne Emojis und Hashtags. Kommt nur ein Link, erklärt Elan die **Prompt-Brücke**: Prompt kopieren, in einem Claude-Chat einfügen, Antwort zurück, „Rezept erkennen“. Das gespeicherte Rezept zeigt „Aus TikTok · Beitrag öffnen“. Elan selbst öffnet und lädt nie ein Video.

## 2. Teileliste

| Teil | Wo | Wozu |
|---|---|---|
| Android-Eingang | `AndroidManifest.xml` (Intent-Filter `text/plain`), `MainActivity.java` (`onNewIntent`) | gab es schon: geteilter Text kommt als `?titel=&text=&url=` |
| Einordnen | `js/logik/teilen.js` | `plattformVon`, `ordneGeteiltesEin`, `bereinigeBildunterschrift` |
| Rezept-Leser | `leseRezeptText` in `js/logik/import.js` | unverändert, bekommt den aufgeräumten Text |
| Brücke | `promptVorlage`, `lesePlanImport` aus P2 | dasselbe Format `elan-import` |
| Seite | `js/ansichten/import.js` | Reihenfolge: Chat-Antwort, Schema.org, Bildunterschrift, Brücke |
| Quelle | `quelle` am Rezept, `quelleZeile` in `js/ansichten/rezepte.js` | Plattform nennen, Link nur auf Tipp |

## 3. Bauschritte

**Schritt 1: Erst nachsehen.** Teilen an Elan gab es seit 1.0.0. Darum brauchte es kein neues Plugin und kein neues Android-Recht.

**Schritt 2: Einordnen ohne Netz.** Die Plattform erkennt Elan nur am Hostnamen, und zwar als ganzes Wort:

```js
const treffer = PLATTFORMEN.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`)));
```

**Schritt 3: Bildunterschrift aufräumen.** Emojis am Zeilenanfang (`\p{Extended_Pictographic}`), Hashtag-Zeilen und „Zutaten 👇“ werden zu dem, was der vorhandene Leser kennt („Zutaten“, „Zubereitung“).

**Schritt 4: Die Reihenfolge auf der Seite.** Zuerst kommt eine Chat-Antwort (`"format": "elan-import"`), dann ein Seitenquelltext mit Schema.org, dann eine Bildunterschrift, und nur wenn nichts davon passt, die Brücke.

**Schritt 5: Die Quelle durchreichen.** Import → Entwurf → Rezeptformular → Speichern. Dabei durfte das Formular das Feld `quelle` nicht verlieren.

## 4. Code erklärt

- **Warum „nurLink“ eine Schwelle hat:** Unter 20 Buchstaben neben dem Link („Schau mal!“) ist kein Rezept zu erwarten. Dann bietet Elan gleich die Brücke an.
- **Warum Schema.org zuerst:** Ein eingefügter Seitenquelltext enthält auch Links. Ohne diese Reihenfolge hielt ihn Elan für eine Bildunterschrift; ein alter Test hat das sofort gemeldet.
- **Warum dasselbe Format wie P2:** Ein Leser, eine Prompt-Vorlage, eine Abmachung. Wer P2 versteht, versteht P5.

## 5. Fehler und Sackgassen

| Was passierte | Ursache | Lösung |
|---|---|---|
| Alter Test „Import aus Schema.org“ fiel | Seitenquelltext enthält Links und landete im Weg für Bildunterschriften | Schema.org zuerst prüfen |
| Alter Test erwartete „ruft keine fremden Seiten ab“ | Text der neuen Brücke war anders | Satz übernommen; der alte Test bleibt unverändert |
| „1 Portionen“ | Einzahl vergessen | „1 Portion“ |
| Ob TikTok und Instagram die Bildunterschrift mitgeben | hängt von der App ab, nicht prüfbar ohne Handy | Léon testet P5-1 und P5-2 |

## 6. Besser mit Claude arbeiten

- Bei der Brücke weiß der Chat nur, was du ihm gibst. Schreib dazu, was du im Video siehst oder hörst, dann wird das Rezept genauer.
- Wenn eine App nur einen Link teilt, ist das kein Elan-Fehler. Sag Claude, welche App das war; dann kann der Text in Elan genauer erklären, was zu tun ist.

## 7. Selbsttest (5 Fragen)

1. Was übergibt Android beim Teilen an Elan?
2. Woran erkennt Elan, dass ein Link von TikTok ist?
3. Was macht Elan, wenn nur ein YouTube-Link ankommt?
4. Warum wird ein eingefügter Seitenquelltext nicht als Bildunterschrift gelesen?
5. Wann öffnet Elan den Link eines Beitrags?

<details><summary>Lösungen</summary>

1. Text: Titel, Bildunterschrift (wenn die App sie mitgibt) und Link.
2. Am Hostnamen, als ganzes Wort (`tiktok.com` oder eine Unteradresse davon).
3. Es zeigt die Prompt-Brücke; selbst lädt es nichts.
4. Schema.org-Daten werden vorher geprüft und gehen vor.
5. Nur, wenn du auf „Beitrag öffnen“ tippst.

</details>

## 8. Mini-Übung (15 Minuten)

Schreib eine eigene erfundene Bildunterschrift mit Emojis, Hashtags und „Zutaten 👇“. Füge sie mit einem Link wie `https://vm.tiktok.com/abc/` in „Rezept importieren“ ein. Schau, was erkannt wird. Füge dann eine Zeile hinzu, die Elan falsch liest, und schreib einen Test dafür in `test/teilen.test.js`, bevor du `bereinigeBildunterschrift` änderst.
