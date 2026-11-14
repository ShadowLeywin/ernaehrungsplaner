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

Alle Unterschiede stehen in `js/plattform.js`. Der Browser-Test `tools/pruefe-app.cjs` prüft die App-Zweige mit einer nachgebildeten Capacitor-Brücke („App-Lauf“).

## Bauen

Voraussetzungen: Node 22, Java 21, Android-SDK mit Plattform 36 und Build-Tools 36.

```bash
npm ci                          # Capacitor und zwei Plugins (nur für das APK)
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

`APP_VERSION` in `js/logik/schema.js` ist die einzige Quelle. Daraus macht `tools/apk-vorbereiten.cjs` `versionName` und `versionCode` (Haupt × 1.000.000 + Neben × 1.000 + Flick). Jede neue Fassung braucht eine höhere Version, sonst lehnt Android das Update ab.

## Offen

- Automatischer Bau auf GitHub (Workflow mit dem Schlüssel als Secret): vorbereitet, braucht Léons Ja.
- Test auf einem echten Gerät; in der Arbeitsumgebung gibt es keinen Emulator.

## Annahmen [A]

- [A] Mindestversion Android 7 (API 24), Ziel Android 16 (API 36), wie von Capacitor 8.6 vorgegeben.

## Quellen (mit Datum)

- Capacitor 8.6.2, Pakete `@capacitor/android`, `@capacitor/cli`, Typen der Konfiguration in `node_modules/@capacitor/cli/dist/declarations.d.ts`, gelesen 14.11.2026.
