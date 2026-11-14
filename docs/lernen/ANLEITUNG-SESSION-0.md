# Bauanleitung: Elan von leer bis Android-App

Wie eine Lego-Anleitung: erst das fertige Modell, dann die Teile, dann Schritt für Schritt. Alles hier ist im Lernlog (`docs/lernen/LERNLOG.md`) oder im Code belegt.

## 1. Fertiges Modell

Elan ist eine Ernährungs- und Health-App, die komplett auf dem Handy läuft: Tagebuch mit sechs Mahlzeiten, Rezepte, Wochenplan mit Einkaufsliste, Health-Werte, Laborwerte und Symptome. Dieselben Dateien laufen als Web-App im Browser und, verpackt mit Capacitor, als Android-App (APK). Alle Daten liegen in der Datenbank des Geräts (IndexedDB); ein Backup ist eine JSON-Datei, die du selbst aufbewahrst.

## 2. Teileliste

| Teil | Wo | Wozu |
|---|---|---|
| Startseite | `index.html` | lädt Schrift, CSS und `js/main.js`; enthält die untere Leiste |
| Rechenlogik | `js/logik/*.js` | reine Funktionen: Nährwerte, Ziele, Rezepte, Plan, Backup, Import … |
| Datenbank | `js/db.js`, `js/speicher.js` | IndexedDB mit einer Migration je Schema-Version |
| Ansichten | `js/ansichten/*.js` | eine Datei je Seite |
| Werkzeugkasten | `js/ui.js` | `el()`, `haenge()`, `blatt()`, `hinweis()` |
| Plattform | `js/plattform.js` | Unterschiede Browser und App |
| Offline | `sw.js`, `manifest.webmanifest` | Service Worker und Installationsangaben der Web-App |
| Daten | `data/zutaten-basis.json`, `data/referenzwerte.json` | 184 Zutaten (USDA), Referenzwerte (DGE) |
| Android | `android/`, `capacitor.config.json` | das native Projekt |
| Tests | `test/*.test.js`, `tools/pruefe-app.cjs` | 143 Unit-Tests, 110 Kriterien im Handy-Emulator |

**Werkzeuge:** Node 22, `node --test`, Playwright (Browser zum Testen), Java 21, Android-SDK, Gradle, Git.

**Befehle:** `npm test`, `node tools/pruefe-app.cjs`, `node tools/server.cjs`, `node tools/apk-vorbereiten.cjs`, `npx cap sync android`, `./gradlew assembleRelease`.

## 3. Bauschritte

**Schritt 1: Bestand prüfen, bevor man löscht.**
Ziel: wissen, was verloren geht. Gemacht: Repo gezählt, Tests ausgeführt, alte App im Emulator gestartet. Wie: `git ls-files | wc -l`, `npm test`. Warum: Der Auftrag sprach von einer „frühen PWA“, tatsächlich lagen dort 14.900 Zeilen. Erfolg: Ist-Analyse in `docs/IST-ANALYSE.md`.

**Schritt 2: Leeren, aber umkehrbar.**
Ziel: sauberer Neuanfang. Wie: `git rm -r -q -- . ':!docs/lernen'`. Warum: Die Git-Historie behält den alten Stand (Commit `4926827`). Erfolg: `git ls-files` zeigt nur noch vier Dateien.

**Schritt 3: Rechenlogik zuerst, als reine Funktionen.**
Ziel: Logik ohne Browser testen. Gemacht: `js/logik/naehrwerte.js`, `ziele.js`, `datum.js` und weitere. Warum: Eine reine Funktion rechnet nur aus ihren Eingaben, deshalb prüft `node --test` sie in Millisekunden. Erfolg: `npm test` grün.

**Schritt 4: Datenbank mit Schema-Version.**
Ziel: Daten auf dem Gerät, die Updates überleben. Wie: `MIGRATIONEN` in `js/db.js`, eine Funktion je Version. Warum: Ein Handy mit Version 1 muss auf Version 7 kommen, ohne Daten zu verlieren. Erfolg: Kriterium „Migration: Datenbank aus Version 1 wird angehoben“.

**Schritt 5: Ansichten und Design.**
Ziel: drei, später fünf Seiten. Leitidee Zitrusfrucht: Die Tagesscheibe hat sechs Segmente, eines je Mahlzeit. Erfolg: Bilder im Emulator ansehen, nicht nur Tests lesen.

**Schritt 6: Offline.**
Ziel: App startet ohne Netz. Wie: `sw.js` mit fester Liste `DATEIEN`, „Cache zuerst“. Erfolg: Kriterium „Ohne Netz: App startet aus dem Cache“.

**Schritt 7: Ein Modul nach dem anderen.**
Rezepte (0.2), Tagebuch-Ausbau (0.3), Wochenplan und Einkauf (0.4), Meal-Prep und Mag-Liste (0.5), Health (0.6), Laborwerte und Symptome (0.7), Import und Coach-Export (0.8), Angebote (0.9), Feinschliff (0.10). Jedes Mal: Logik mit Test, Ansicht, Browser-Durchlauf, Bilder ansehen, Lernlog, Pull Request.

**Schritt 8: Android-App.**
Ziel: installierbares APK. Wie: `npx cap add android`, dann `./gradlew assembleRelease`. Warum Capacitor: Es packt die vorhandenen Dateien; es gibt keine zweite Codebasis. Erfolg: `apksigner verify` zeigt „CN=Elan“.

## 4. Code erklärt

**a) Ein Element bauen, ohne „null“ in die Seite zu schreiben** (`js/ui.js`)

```js
export const haenge = (knoten, ...kinder) => fuelle(knoten, null, kinder);
```

- `haenge` hängt Kinder an ein vorhandenes Element.
- Intern überspringt `fuelle` alles, was `null`, `undefined` oder `false` ist.
- Grund: `element.append(null)` schreibt den Text „null“ in die Seite. Genau das stand einmal unter den Makros.

**b) Migration je Schema-Version** (`js/db.js`)

```js
anfrage.onupgradeneeded = (ereignis) => {
  for (let v = ereignis.oldVersion; v < SCHEMA_VERSION; v += 1) MIGRATIONEN[v](anfrage.result, anfrage.transaction);
};
```

- `onupgradeneeded` feuert, wenn die gespeicherte Version kleiner ist als `SCHEMA_VERSION`.
- `oldVersion` ist 0 bei einer neuen Installation, sonst die alte Nummer.
- Die Schleife führt nur die fehlenden Schritte aus, zum Beispiel von 3 bis 6.

**c) Service Worker: Cache zuerst** (`sw.js`)

```js
ereignis.respondWith(caches.match(anfrage, { ignoreSearch: true }).then((treffer) => treffer ?? fetch(anfrage)));
```

- Jede Anfrage der App wird zuerst im Cache gesucht.
- `ignoreSearch` übersieht `?…` in der Adresse, damit `/?sw=1` dieselbe Seite findet.
- Nur was nicht im Cache liegt, geht ins Netz.

**d) Ein Rezept wie eine Zutat behandeln** (`js/logik/rezepte.js`, gekürzt)

```js
export function rezeptAlsZutat(rezept) {
  const w = rezeptWerte(rezept);
  return {
    id: `rezept:${rezept.id}`, name: rezept.name, istRezept: true, je100: w.je100,
    portionen: w.portionGramm > 0 ? [{ name: 'Portion', gramm: runde(w.portionGramm, 0) }] : [],
    // … dazu marke, kategorie, quelle, unvollstaendig
  };
}
```

- Das Tagebuch kennt nur Zutaten mit Werten je 100 g.
- Statt einer zweiten Logik wird das Rezept umgerechnet und verpackt (Adapter).
- Dadurch funktionieren Suche, Mengen-Blatt und Summen ohne Änderung.

**e) Browser oder App** (`js/plattform.js`)

```js
export const istApp = () => Boolean(cap()?.isNativePlatform?.());
const nativ = (plugin, methode, optionen) => cap().nativePromise(plugin, methode, optionen);
```

- In der App fügt Capacitor `window.Capacitor` ein; im Browser fehlt es.
- `nativePromise` ruft ein natives Plugin auf, zum Beispiel `Share` oder `Filesystem`.
- So braucht die Web-App weiterhin keine Bibliothek und keinen Build-Schritt.

## 5. Fehler und Sackgassen

| Symptom | Ursache | Lösung |
|---|---|---|
| Unter den Makros stand „null“ | `append(null)` schreibt Text | `haenge()` überspringt leere Werte; Test sucht „null“ auf allen Seiten |
| „EPA + DHA 11 g“ bei 0,93 g Omega-3 | Einheit Gramm statt Milligramm | Einheit korrigiert; Test „EPA + DHA nie größer als Omega-3“ |
| „1,5 l Wasser“ wurde zu Wassermelone | Suche akzeptiert Wortanfänge | Import ordnet nur bei ganzen Wörtern zu |
| Getipptes verschwand nach einem Häkchen | ganze Seite neu gezeichnet | Häkchen ändern nur ihre Zeile |
| Test schlug bei jeder neuen Schema-Version fehl | feste Zahl im Test | Erwartung aus `schema.js` ableiten |
| Android-Bau: „429 Too Many Requests“ | Maven Central drosselt | ein Download zur Zeit, mit Pausen wiederholen |
| Test klappte „Alle Nährwerte“ wieder zu | `getAttribute('open')` liefert `''`, das gilt als falsch | auf `=== null` prüfen |
| Seiten nicht erreichbar (USDA, DGE, Android-SDK) | Netzwerkregeln der Arbeitsumgebung | Freigabe beantragt; bis dahin Annahmen mit [vermutet] |

## 6. Mit Claude besser arbeiten

| Was gut war | Was fehlte | Besser formuliert |
|---|---|---|
| Arbeitsschleife und Erlaubnisliste im Startprompt | der echte Stand des Repos | „Das Repo enthält vermutlich eine ältere App; prüfe den Umfang, bevor du etwas löschst.“ |
| „Teste so oft, bis eine erste Version steht“ | was „erste Version“ mindestens können muss | „Erste Version heißt: Tagebuch, Zutaten, Ziele, Backup, offline.“ |
| „Gib mir die Aufgaben als PDF“: klares Ziel und Format | – | – |
| „1 ja, 2 nein“ als Antwortform | Zuordnung, wenn Vorschläge und Fragen beide nummeriert sind | „Frage 1: nein. Vorschlag 2: ja.“ |
| „als APK“ eindeutig | Hinweis, dass dafür Netzfreigaben nötig sind | „Du darfst dafür Netzfreigaben beantragen.“ |

## 7. Selbsttest

1. Warum liegt die Rechenlogik in `js/logik/` und nicht in den Ansichten?
2. Was passiert, wenn du eine Datei zur App hinzufügst, aber nicht in `DATEIEN` in `sw.js` einträgst?
3. Warum speichert ein Tagebuch-Eintrag eine Kopie der Nährwerte statt nur der Zutat-Kennung?
4. Wozu dient der Signierschlüssel des APK, und was passiert, wenn er verloren geht?
5. Warum teilt der Wochenschnitt durch die Tage mit Einträgen und nicht durch sieben?

## 8. Mini-Übung (15 Minuten, ohne Claude)

Füge eine neue Kategorie „Gewürze“ für Zutaten hinzu.

1. Öffne `js/logik/zutat.js` und ergänze in `KATEGORIEN` einen Eintrag `{ id: 'gewuerze', name: 'Gewürze' }`.
2. Führe `npm test` aus. Läuft alles?
3. Starte `node tools/server.cjs`, öffne http://127.0.0.1:8080/#/zutaten/neu und prüfe, ob „Gewürze“ in der Auswahl steht.
4. Bonus: Erhöhe `VERSION` in `sw.js`. Warum ist das nötig?

## Lösungen zum Selbsttest

1. Reine Funktionen lassen sich ohne Browser mit `node --test` prüfen, schnell und zuverlässig.
2. Offline fehlt die Datei; `test/projekt.test.js` schlägt fehl, und das APK enthält sie auch nicht, weil `tools/apk-vorbereiten.cjs` dieselbe Liste nutzt.
3. Damit eine spätere Änderung oder Löschung der Zutat vergangene Tage nicht verändert.
4. Android installiert ein Update nur mit demselben Schlüssel. Ohne ihn: deinstallieren, neu installieren, Daten per Backup zurückholen.
5. Ein vergessener Tag würde den Schnitt sonst nach unten ziehen, obwohl nichts gegessen wurde, sondern nur nichts eingetragen.

## Quellen (mit Datum)

- `docs/lernen/LERNLOG.md` und Code dieses Repos, Stand 14.11.2026.
