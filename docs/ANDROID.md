# Elan als Android-App

Die Android-App ist dieselbe Web-App, verpackt mit Capacitor. Alle Dateien liegen im APK; die App braucht kein Netz und keinen Server.

## Was in der App anders ist

| Thema | Browser (PWA) | Android-App |
|---|---|---|
| Installation | „Zum Startbildschirm hinzufügen“ | APK installieren |
| Backup speichern | Download der Datei | Datei wird angelegt, dann öffnet sich das Teilen-Menü (Drive, Dateien, Mail) |
| Teilen (Einkaufsliste, Coach-Bericht) | Teilen-Menü des Browsers oder Zwischenablage | natives Teilen-Menü |
| Text aus anderen Apps teilen | Teilen-Ziel im Manifest | Eintrag „Elan“ im Teilen-Menü, öffnet den Rezept-Import |
| Open Food Facts | `fetch` im Browser | natives HTTP von Capacitor (keine CORS-Probleme) |
| Offline | Service Worker | Dateien liegen im APK; Service Worker ist aus |
| Speicher | Browser kann aufräumen, daher „Speicher schützen“ | Daten liegen in der App, „Speicher schützen“ entfällt |
| Cloud-Sicherung | – | **ausgeschaltet**, Gesundheitsdaten gehen nicht in die Google-Cloud |
| Vibration | `navigator.vibrate`, falls vorhanden | Plugin Haptics |
| Widget | – | Widget „Elan · heute“ (kcal übrig, Wasser), siehe unten |
| Health Connect | – | Schritte, Gewicht, Schlaf, Ruhepuls, Körperfett, HRV, Trainings lesen (Plugin `@capgo/capacitor-health` 8.11.13), siehe unten |
| Erinnerungen | – (Seite sagt „Nur in der Android-App“) | Plugin `@capacitor/local-notifications` 8.3.1 (MIT), täglich zu festen Uhrzeiten, siehe unten |

Alle Unterschiede stehen in `js/plattform.js`. Der Browser-Test `tools/pruefe-app.cjs` prüft die App-Zweige mit einer nachgebildeten Capacitor-Brücke („App-Lauf“).

## Bauen

Voraussetzungen: Node 22, Java 21, Android-SDK mit Plattform 36 und Build-Tools 36.

```bash
npm ci                          # Capacitor und drei Plugins: Teilen, Dateien, Vibration (nur für das APK)
node tools/apk-vorbereiten.cjs  # App-Dateien nach www/, Version nach build.gradle
npx cap sync android            # www/ ins Android-Projekt kopieren
cd android && ./gradlew assembleRelease
```

Ergebnis: `android/app/build/outputs/apk/release/app-release.apk`.

`tools/apk-vorbereiten.cjs` kopiert genau die Dateien aus der Liste `DATEIEN` in `sw.js`. Was offline im Browser fehlt, fehlt auch im APK; `test/projekt.test.js` prüft die Liste.

## Signieren

| Datei | Inhalt | Im Repo? |
|---|---|---|
| `android/keystore.properties` | Pfad, Passwort, Alias des Schlüssels | nein (`.gitignore`) |
| Schlüsselspeicher `elan.keystore` | der Schlüssel selbst | nein |

Fehlt `keystore.properties`, signiert Gradle mit dem Debug-Schlüssel. Ein so signiertes APK lässt sich nicht als Update über die mit dem Elan-Schlüssel signierte App installieren.

Den Elan-Schlüssel hat Léon als Datei (Passwort, Fingerabdruck, Base64). Fingerabdruck SHA-256: `BB:62:6E:B6:24:5F:CD:3C:6E:E5:6B:BB:78:7D:23:6F:96:79:E0:E6:1B:11:03:58:B7:59:C2:85:EE:DC:CE:FF`.

`keystore.properties`:

```properties
storeFile=/absoluter/pfad/elan.keystore
storePassword=…
keyAlias=elan
keyPassword=…
```

## Version

`APP_VERSION` in `js/logik/schema.js` ist die einzige Quelle für den Namen. `tools/apk-vorbereiten.cjs` macht daraus `versionName` und `versionCode` = Haupt × 10⁸ + Neben × 10⁶ + Flick × 10⁴ + Baunummer (Commits, höchstens 9999). So wächst der Code mit jedem Bau, auch bei gleichem Namen.

## Automatischer Bau auf GitHub

`.github/workflows/apk.yml` baut das APK bei jeder Änderung an `main` (außer reiner Doku), bei Pull Requests und auf Knopfdruck.

| Secret | Inhalt |
|---|---|
| `ELAN_KEYSTORE_BASE64` | der Schlüsselspeicher als Base64 |
| `ELAN_KEYSTORE_PASSWORT` | Passwort von Speicher und Schlüssel |

Mit beiden Secrets: signiertes APK unter „Releases“ (`v1.0.0`, bei jedem Bau ersetzt). Ohne sie: nur ein Test-APK als Artefakt des Laufs, mit Debug-Schlüssel.

Der `versionCode` enthält die Zahl der Commits (Baunummer). Der angezeigte Name bleibt `1.0.0`, bis Léon eine neue Version freigibt; Android nimmt trotzdem jedes neue APK als Update an.

## Widget

- Dateien: `ElanWidget.java` (zeichnet), `WidgetPlugin.java` (nimmt Werte aus der Web-App an), `res/layout/elan_widget.xml`, `res/xml/elan_widget_info.xml`, Eintrag `<receiver>` im Manifest (nicht exportiert, wie von Android empfohlen).
- Die Web-App schickt die Werte über `aktualisiereWidget()` in `js/plattform.js`, sobald „Heute“ gezeichnet wird oder Wasser dazukommt.
- Nach Mitternacht zeigt das Widget keine alten Zahlen, sondern „Öffne Elan für heute“. Android fragt es alle 30 Minuten neu ab.
- Datenschutz: Das Widget zeigt kcal und Wasser auf dem Startbildschirm. Es erscheint nur, wenn man es selbst hinzufügt.

## Health Connect

- Plugin `@capgo/capacitor-health` 8.11.13 (MPL-2.0, unverändert genutzt). Es verlangt Android 8 (API 26); deshalb `minSdkVersion = 26`.
- Das Plugin meldet viele Berechtigungen an. Das App-Manifest entfernt alle außer `READ_STEPS`, `READ_WEIGHT`, `READ_SLEEP`, `READ_RESTING_HEART_RATE`, `READ_BODY_FAT`, `READ_HEART_RATE_VARIABILITY`, `READ_EXERCISE` (`tools:node="remove"`). Nach jedem Plugin-Update mit `aapt2 dump permissions` prüfen.
- Datenschutzseite: `privacypolicy.html` im Wurzelverzeichnis; das Plugin zeigt sie, wenn man in Health Connect auf „Datenschutzerklärung“ tippt.
- Umrechnung: `js/logik/healthconnect.js` (getestet), Abgleich: `js/abgleich.js`, Aufrufe: `js/plattform.js`.
- Beim Bau meldet der Lint-Schritt „Module was compiled with an incompatible version of Kotlin“. Das kommt aus `lintVitalAnalyzeRelease` (älteres Kotlin im Lint), nicht aus dem Kompilieren; der Bau ist grün.
- Offen [vermutet]: Ob Health Connect einer App erlaubt, die nicht aus dem Play Store kommt, ist nicht dokumentiert. Ein Bericht von GrapheneOS sagt nein; auf normalem Android wird es meist gehen. Test am Gerät: Aufgabe A19 in `docs/AUFGABEN-LEON.md`.

## Offen

- Test auf einem echten Gerät; in der Arbeitsumgebung gibt es keinen Emulator.

## Annahmen [A]

- [A] Mindestversion Android 8 (API 26, wegen Health Connect), Ziel Android 16 (API 36).

## Quellen (mit Datum)

- Android-Dokumentation „Create a simple widget“ (developer.android.com/guide/topics/appwidgets): Receiver mit `exported="false"`, abgerufen 14.11.2026.
- Capacitor 8.6.2, Pakete `@capacitor/android`, `@capacitor/cli`, Typen der Konfiguration in `node_modules/@capacitor/cli/dist/declarations.d.ts`, gelesen 14.11.2026.

## Erinnerungen

- Plugin `@capacitor/local-notifications` 8.3.1 (MIT). Elan plant je Erinnerung eine tägliche Benachrichtigung (`schedule.on` mit Stunde und Minute) mit festen Kennungen 1001–1006 (Wasser), 1101 (Supplements), 1201 (Check-in). Bei jeder Änderung werden alle gelöscht und neu gesetzt.
- `isExactNotification: false`: Android darf ein paar Minuten verschieben. Dafür entfernt das Manifest `SCHEDULE_EXACT_ALARM`, und Android fragt nicht nach „Wecker und Erinnerungen“. Es bleiben `POST_NOTIFICATIONS` (Frage beim ersten Einschalten, ab Android 13), `RECEIVE_BOOT_COMPLETED` (nach Neustart neu planen) und `WAKE_LOCK`.
- Symbol: `res/drawable/ic_stat_elan.xml` (weißes Blatt), eingetragen in `capacitor.config.json` unter `plugins.LocalNotifications`.
