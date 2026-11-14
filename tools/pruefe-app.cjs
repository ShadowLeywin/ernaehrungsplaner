// Spielt die App im Handy-Emulator durch und prüft die Abnahmekriterien: node tools/pruefe-app.cjs
// Braucht Playwright (in der Claude-Cloud-Session vorhanden). Startet selbst einen lokalen Server.
// Open Food Facts wird NICHT angefragt: die Antwort kommt aus test/daten/off-suche.json.
// Bilder landen im Ordner aus der Umgebungsvariable BILDER (ohne Angabe: keine Bilder).
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium, devices } = require('playwright');
const { starte } = require('./server.cjs');

const PORT = 8137;
const URL_APP = `http://127.0.0.1:${PORT}/`;
const BILDER = process.env.BILDER;
const OFF_BEISPIEL = fs.readFileSync(path.resolve(__dirname, '..', 'test', 'daten', 'off-suche.json'), 'utf8');

let SCHEMA_VERSION; // wird beim Start aus js/logik/schema.js gelesen, damit der Test nicht bei jeder Schemaänderung angepasst werden muss

const ergebnisse = [];
const pruefe = (kriterium, ok, beleg = '') => { ergebnisse.push({ kriterium, ok: Boolean(ok), beleg: String(beleg) }); };
const bild = async (seite, name, ganz = true) => { if (BILDER) await seite.screenshot({ path: path.join(BILDER, `${name}.png`), fullPage: ganz }); };

async function neueSeite(browser, optionen = {}) {
  const kontext = await browser.newContext({ ...devices['Galaxy S9+'], locale: 'de-DE', timezoneId: 'Europe/Berlin', acceptDownloads: true, ...optionen });
  const seite = await kontext.newPage();
  const fehler = [];
  const fremd = new Set();
  seite.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  seite.on('pageerror', (e) => fehler.push(`Ausnahme: ${e.message}`));
  seite.on('request', (r) => { const host = new URL(r.url()).hostname; if (host !== '127.0.0.1') fremd.add(host); });
  await seite.route('https://world.openfoodfacts.org/**', (route) => route.fulfill({ contentType: 'application/json', body: OFF_BEISPIEL }));
  return { kontext, seite, fehler, fremd };
}

async function trageEin(seite, slot, begriff, gramm) {
  await seite.getByRole('button', { name: `Zu ${slot} hinzufügen` }).click();
  await seite.locator('dialog input[type=search]').fill(begriff);
  const zeile = seite.locator('dialog .zeilen .zeile').first();
  const name = (await zeile.locator('.zeile-name').innerText()).split('\n')[0];
  await zeile.click();
  await seite.locator('#f-gramm').fill(String(gramm));
  await seite.getByRole('button', { name: 'Eintragen' }).click();
  await seite.locator('dialog').waitFor({ state: 'detached' });
  return name;
}

async function hauptlauf(browser) {
  const { kontext, seite, fehler, fremd } = await neueSeite(browser);
  const start = Date.now();
  await seite.goto(URL_APP, { waitUntil: 'networkidle' });
  await seite.locator('h1').waitFor();
  pruefe('App lädt, Startseite ist das Tagebuch', (await seite.locator('h1').innerText()) === 'Heute', `h1 „${await seite.locator('h1').innerText()}“ nach ${Date.now() - start} ms`);
  pruefe('Sechs Slots sichtbar', (await seite.locator('.slot').count()) === 6, (await seite.locator('.slot h2').allInnerTexts()).join(', '));
  pruefe('Tagesscheibe hat sechs Segmente', (await seite.locator('.scheibe .segment').count()) === 6);
  await bild(seite, '01-heute-leer');

  /* Tagebuch */
  const name = await trageEin(seite, 'Frühstück', 'hafer', 80);
  const eintrag = seite.locator('#slot-fruehstueck .eintrag');
  pruefe('Eintrag anlegen', (await eintrag.count()) === 1, `${name}: ${(await eintrag.innerText()).replace(/\n/g, ' | ')}`);
  const kcalText = await seite.locator('.kcal-zeile').innerText();
  pruefe('Tagessumme rechnet mit', !kcalText.startsWith('0 von'), kcalText);
  await trageEin(seite, 'Mittagessen', 'reis', 200);
  await trageEin(seite, 'Mittagessen', 'hähnchen', 150);

  await seite.reload({ waitUntil: 'networkidle' });
  pruefe('Einträge überleben ein Neuladen (IndexedDB)', (await seite.locator('.eintrag').count()) === 3, `${await seite.locator('.eintrag').count()} Einträge`);

  await eintrag.click();
  await seite.locator('#f-gramm').fill('100');
  await seite.getByRole('button', { name: 'Speichern' }).click();
  await seite.locator('dialog').waitFor({ state: 'detached' });
  pruefe('Eintrag ändern', (await eintrag.locator('.eintrag-menge').innerText()) === '100 g', await eintrag.locator('.eintrag-menge').innerText());

  await eintrag.click();
  await seite.locator('#f-gramm').fill('abc');
  await seite.getByRole('button', { name: 'Speichern' }).click();
  pruefe('Ungültige Menge wird abgelehnt', (await seite.locator('#f-gramm-fehler').innerText()).length > 0, await seite.locator('#f-gramm-fehler').innerText());
  await seite.getByRole('button', { name: 'Löschen' }).click();
  await seite.locator('dialog').waitFor({ state: 'detached' });
  const nachLoeschen = await seite.locator('.eintrag').count();
  await seite.getByRole('button', { name: 'Rückgängig' }).click();
  await seite.locator('#slot-fruehstueck .eintrag').waitFor();
  pruefe('Eintrag löschen und zurückholen', nachLoeschen === 2 && (await seite.locator('.eintrag').count()) === 3, `nach Löschen ${nachLoeschen}, nach Rückgängig ${await seite.locator('.eintrag').count()}`);

  const vorher = await seite.locator('.kcal-zeile').innerText();
  const gedrueckt = await seite.locator('[aria-label=Tagestyp] .wahl-knopf[aria-pressed=true]').innerText();
  await seite.locator('[aria-label=Tagestyp] .wahl-knopf[aria-pressed=false]').last().click();
  await seite.waitForFunction((alt) => document.querySelector('.kcal-zeile')?.textContent !== alt, vorher);
  pruefe('Tagestyp wechseln ändert das Ziel', true, `${gedrueckt}: ${vorher} → ${await seite.locator('[aria-label=Tagestyp] .wahl-knopf[aria-pressed=true]').innerText()}: ${await seite.locator('.kcal-zeile').innerText()}`);
  await bild(seite, '02-heute-gefuellt');

  await seite.getByRole('link', { name: 'Einen Tag zurück' }).click();
  await seite.locator('h1', { hasText: 'Gestern' }).waitFor();
  pruefe('Blättern auf einen anderen Tag', (await seite.locator('.eintrag').count()) === 0, `${await seite.locator('h1').innerText()}, ${await seite.locator('.eintrag').count()} Einträge`);
  await seite.getByRole('link', { name: 'Zu heute' }).click();
  await seite.locator('h1', { hasText: 'Heute' }).waitFor();

  /* Zutaten */
  await seite.getByRole('link', { name: 'Zutaten', exact: true }).click();
  await seite.locator('.zeilen .zeile').first().waitFor();
  const alle = await seite.locator('.zeilen .zeile').count();
  await seite.locator('input[type=search]').fill('kase');
  const kaese = await seite.locator('.zeilen .zeile-name').allInnerTexts();
  pruefe('Zutatensuche findet ohne Umlaut', kaese.length > 0 && kaese.length < alle && kaese.some((t) => t.includes('Käse') || t.includes('käse')), `${alle} Zutaten gesamt, „kase“ → ${kaese.length} Treffer, z. B. ${kaese[0].split('\n')[0]}`);
  await bild(seite, '03-zutaten-suche');

  await seite.locator('input[type=search]').fill('skyr');
  await seite.getByRole('button', { name: /bei Open Food Facts suchen/ }).click();
  await seite.getByRole('button', { name: 'Übernehmen' }).first().waitFor();
  const treffer = await seite.getByRole('button', { name: 'Übernehmen' }).count();
  await seite.getByRole('button', { name: 'Übernehmen' }).first().click();
  await seite.getByRole('link', { name: 'Gespeichert' }).waitFor();
  pruefe('Online-Suche (Beispieldaten) und Übernehmen', treffer === 2, `${treffer} brauchbare von 4 Produkten, 1 übernommen`);

  await seite.locator('.zeilen a.zeile').first().click();
  await seite.locator('table.naehrwerte').waitFor();
  pruefe('Detail zeigt Nährwerte je 100 g', (await seite.locator('table.naehrwerte tr').count()) >= 4, `${await seite.locator('h1').innerText()}: ${await seite.locator('table.naehrwerte tr').count()} Zeilen`);

  await seite.goto(`${URL_APP}#/zutaten/neu`);
  await seite.getByRole('button', { name: 'Zutat speichern' }).click();
  const pflicht = await seite.locator('.fehlertext').allInnerTexts();
  pruefe('Leeres Formular zeigt Pflichtfehler', pflicht.length === 2, pflicht.join(' | '));
  await seite.locator('#f-name').fill('Testriegel');
  await seite.locator('#f-kcal').fill('412');
  await seite.locator('#f-protein').fill('20,5');
  await seite.locator('#f-kh').fill('45');
  await seite.locator('#f-fett').fill('15');
  await seite.locator('#f-portionName').fill('Riegel');
  await seite.locator('#f-portionGramm').fill('35');
  await bild(seite, '04-zutat-formular');
  await seite.getByRole('button', { name: 'Zutat speichern' }).click();
  await seite.locator('h1', { hasText: 'Testriegel' }).waitFor();
  pruefe('Eigene Zutat anlegen', (await seite.locator('table.naehrwerte').innerText()).includes('20,5'), 'Testriegel mit 20,5 g Eiweiß gespeichert');
  await seite.getByRole('link', { name: 'Bearbeiten' }).click();
  await seite.locator('#f-kcal').fill('400');
  await seite.getByRole('button', { name: 'Zutat speichern' }).click();
  await seite.locator('table.naehrwerte').waitFor();
  pruefe('Eigene Zutat ändern', (await seite.locator('table.naehrwerte').innerText()).includes('400 kcal'), 'Energie 412 → 400 kcal');

  await seite.goto(`${URL_APP}#/heute`);
  await seite.getByRole('button', { name: 'Zu Abendsnack hinzufügen' }).click();
  const zuletzt = await seite.locator('dialog .zwischentitel').first().innerText();
  await seite.locator('dialog input[type=search]').fill('testriegel');
  await seite.locator('dialog .zeilen .zeile').first().click();
  await seite.getByRole('button', { name: /1 Riegel/ }).click();
  const menge = await seite.locator('#f-gramm').inputValue();
  await seite.getByRole('button', { name: 'Eintragen' }).click();
  await seite.locator('dialog').waitFor({ state: 'detached' });
  pruefe('Eigene Zutat mit Portion eintragen', menge === '35' && (await seite.locator('#slot-abendsnack .eintrag-kcal').innerText()) === '140 kcal', `Liste zeigt „${zuletzt}“, 1 Riegel = ${menge} g = ${await seite.locator('#slot-abendsnack .eintrag-kcal').innerText()}`);

  /* Ziele */
  await seite.getByRole('link', { name: 'Mehr', exact: true }).click();
  await seite.locator('#f-ziel-kcal').waitFor();
  await seite.locator('#f-ziel-kcal').fill('3000');
  await seite.locator('#f-ziel-kcal').blur();
  const warnung = await seite.locator('.bereich').first().locator('.merkzettel').innerText().catch(() => '');
  await seite.getByRole('button', { name: 'Ziele speichern' }).click();
  await seite.locator('.hinweis', { hasText: 'Ziele gespeichert' }).waitFor();
  pruefe('Ziel ändern, Hinweis bei unpassenden Makros', warnung.includes('weniger'), warnung);
  await bild(seite, '05-mehr');

  /* Backup */
  const [download] = await Promise.all([seite.waitForEvent('download'), seite.getByRole('button', { name: 'Backup speichern' }).click()]);
  const datei = path.join(os.tmpdir(), `elan-test-${Date.now()}.json`);
  await download.saveAs(datei);
  const backup = JSON.parse(fs.readFileSync(datei, 'utf8'));
  pruefe('Backup speichern', backup.app === 'elan' && backup.schemaVersion === SCHEMA_VERSION && Array.isArray(backup.daten.rezepte) && backup.daten.eintraege.length === 4 && backup.daten.zutaten.length === 2,
    `${download.suggestedFilename()}: ${backup.daten.eintraege.length} Einträge, ${backup.daten.zutaten.length} Zutaten, ${backup.daten.einstellungen.length} Einstellungen`);

  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('#slot-abendsnack .eintrag').click();
  await seite.getByRole('button', { name: 'Löschen' }).click();
  await seite.locator('dialog').waitFor({ state: 'detached' });
  await seite.goto(`${URL_APP}#/mehr`);
  await seite.locator('#f-backup-datei').setInputFiles(datei);
  const rueckfrage = await seite.locator('dialog p').innerText();
  await seite.getByRole('button', { name: 'Alles ersetzen' }).click();
  await seite.locator('.hinweis', { hasText: 'Backup eingespielt' }).waitFor();
  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('.eintrag').first().waitFor();
  pruefe('Backup einspielen stellt den Stand wieder her', (await seite.locator('.eintrag').count()) === 4, `Rückfrage: „${rueckfrage}“ → ${await seite.locator('.eintrag').count()} Einträge`);

  fs.writeFileSync(datei, '{"app":"fremd","schemaVersion":1,"daten":{}}');
  await seite.goto(`${URL_APP}#/mehr`);
  await seite.locator('#f-backup-datei').setInputFiles(datei);
  const ablehnung = await seite.locator('dialog p').innerText();
  await seite.getByRole('button', { name: 'Verstanden' }).click();
  pruefe('Fremde Datei wird abgelehnt, Daten bleiben', ablehnung.includes('nicht aus dieser App'), ablehnung);
  fs.rmSync(datei);

  /* Alle Nährwerte, Wochenschnitt, Kopieren, Anteile */
  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('.eintrag').first().waitFor();
  await seite.locator('.alle-naehrwerte summary').click();
  const zeilenTag = await seite.locator('.alle-naehrwerte tr').count();
  const tagText = await seite.locator('.alle-naehrwerte').innerText();
  pruefe('Alle Nährwerte des Tages, Lücken sind gekennzeichnet', zeilenTag > 15 && tagText.includes('Vitamin C') && tagText.includes('mind.'), `${zeilenTag} Zeilen, z. B. ${tagText.match(/Vitamin C\s+[^\n]+/)?.[0].replace(/\s+/g, ' ')}`);
  await seite.getByRole('button', { name: 'Wochenschnitt' }).click();
  await seite.locator('.alle-naehrwerte .klein', { hasText: 'Schnitt je Tag' }).waitFor();
  pruefe('Wochenschnitt über Tage mit Einträgen', (await seite.locator('.alle-naehrwerte').getAttribute('open')) !== null, (await seite.locator('.alle-naehrwerte .klein').first().innerText()));
  await bild(seite, '10-alle-naehrwerte');
  await seite.getByRole('button', { name: 'Dieser Tag' }).click();
  await seite.locator('.alle-naehrwerte summary').click();

  const heuteAnzahl = await seite.locator('.eintrag').count();
  await seite.getByRole('link', { name: 'Einen Tag weiter' }).click();
  await seite.locator('h1', { hasText: 'Morgen' }).waitFor();
  const chip = seite.locator('#slot-fruehstueck .wie-vortag');
  const chipText = await chip.innerText();
  await chip.click();
  await seite.locator('#slot-fruehstueck .eintrag').waitFor();
  pruefe('Leere Mahlzeit: „Wie am Vortag“ übernimmt die Einträge', (await seite.locator('#slot-fruehstueck .eintrag').count()) === 1, chipText);

  await seite.getByRole('link', { name: 'Zu heute' }).click();
  await seite.locator('h1', { hasText: 'Heute' }).waitFor();
  await seite.getByRole('button', { name: 'Diesen Tag kopieren' }).click();
  const zielTag = await seite.locator('#f-kopierziel').inputValue();
  await seite.getByRole('button', { name: 'Kopieren', exact: true }).click();
  const kopiert = await seite.locator('.hinweis span').innerText();
  await seite.getByRole('button', { name: 'Hingehen' }).click();
  await seite.locator('h1', { hasText: 'Morgen' }).waitFor();
  await seite.locator('.eintrag').first().waitFor();
  pruefe('Ganzen Tag kopieren', (await seite.locator('.eintrag').count()) === heuteAnzahl + 1, `Ziel ${zielTag}: „${kopiert}“ → ${await seite.locator('.eintrag').count()} Einträge (1 war schon da)`);

  await seite.goto(`${URL_APP}#/mehr`);
  await seite.locator('#f-anteil-morgensnack').fill('0');
  const zuWenig = await seite.locator('#anteile-stand').innerText();
  await seite.getByRole('button', { name: 'Anteile speichern' }).click();
  const nichtGespeichert = (await seite.locator('.hinweis', { hasText: 'Anteile gespeichert' }).count()) === 0;
  await seite.locator('#f-anteil-fruehstueck').fill('33');
  await seite.getByRole('button', { name: 'Anteile speichern' }).click();
  await seite.locator('.hinweis', { hasText: 'Anteile gespeichert' }).waitFor();
  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('.eintrag').first().waitFor();
  const segmenteJetzt = await seite.locator('.scheibe .segment').count();
  const snack = await seite.locator('#slot-morgensnack .slot-stand').innerText();
  pruefe('Anteile der Mahlzeiten einstellbar, Summe 100 % wird erzwungen', nichtGespeichert && zuWenig.includes('fehlen 8') && segmenteJetzt === 5 && snack === '0 kcal',
    `„${zuWenig}“ → nicht gespeichert; nach Korrektur ${segmenteJetzt} Segmente, Morgensnack zeigt „${snack}“`);

  /* Layout */
  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('.eintrag').first().waitFor();
  const breiten = [];
  const unsinn = [];
  for (const [route, warteAuf] of [['heute', '.eintrag'], ['zutaten', '.zeilen .zeile'], ['zutaten/neu', '#f-name'], ['zutaten/basis%3Aapfel', 'table.naehrwerte'], ['mehr', '#f-ziel-kcal']]) {
    await seite.goto(`${URL_APP}#/${route}`);
    await seite.locator(warteAuf).first().waitFor();
    const b = await seite.evaluate(() => ({ inhalt: document.documentElement.scrollWidth, fenster: window.innerWidth }));
    breiten.push({ route, ...b });
    const text = await seite.locator('body').innerText();
    if (/\b(null|undefined|NaN)\b/.test(text)) unsinn.push(`${route}: „${text.match(/.{0,25}\b(null|undefined|NaN)\b.{0,10}/s)[0].replace(/\n/g, ' ')}“`);
  }
  pruefe('Kein „null“, „undefined“ oder „NaN“ im sichtbaren Text', unsinn.length === 0, unsinn.join(' | ') || 'fünf Seiten abgesucht');
  pruefe('Kein seitliches Rollen auf allen Seiten', breiten.every((b) => b.inhalt <= b.fenster), breiten.map((b) => `${b.route} ${b.inhalt}/${b.fenster} px`).join(', '));
  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('.eintrag').first().waitFor();
  const klein = await seite.evaluate(() => [...document.querySelectorAll('button, a, select, input')]
    .filter((e) => e.offsetParent && !e.closest('svg'))
    .map((e) => ({ t: (e.getAttribute('aria-label') || e.textContent || e.name).trim().slice(0, 20), h: Math.round(e.getBoundingClientRect().height) }))
    .filter((e) => e.h < 40));
  pruefe('Tippflächen mindestens 40 px hoch', klein.length === 0, klein.length ? JSON.stringify(klein) : 'alle sichtbaren Bedienelemente auf „Heute“');

  pruefe('Keine Konsolenfehler', fehler.length === 0, fehler.length ? fehler.slice(0, 3).join(' | ') : '0 Fehler im gesamten Durchlauf');
  pruefe('Kein fremder Server außer Open Food Facts auf Knopfdruck', [...fremd].every((h) => h === 'world.openfoodfacts.org'), [...fremd].join(', ') || 'keiner');
  await kontext.close();
}

async function offlineLauf(browser) {
  const { kontext, seite, fehler } = await neueSeite(browser);
  await seite.goto(`${URL_APP}?sw=1`, { waitUntil: 'networkidle' });
  const sw = await seite.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    const namen = await caches.keys();
    const eintraege = namen.length ? (await (await caches.open(namen[0])).keys()).length : 0;
    return { zustand: reg.active?.state, namen, eintraege };
  });
  const erwartet = [...fs.readFileSync(path.resolve(__dirname, '..', 'sw.js'), 'utf8').matchAll(/^\s*'(\.\/[^']*)',$/gm)].length;
  pruefe('Service Worker aktiv, Cache vollständig', sw.eintraege === erwartet && sw.namen.length === 1, `${sw.namen.join()} mit ${sw.eintraege} von ${erwartet} Dateien, Zustand ${sw.zustand}`);

  const manifest = await seite.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
  const icons = await Promise.all(manifest.icons.map(async (i) => (await kontext.request.get(new URL(i.src, URL_APP).href)).status()));
  pruefe('Manifest gültig, Icons erreichbar', manifest.display === 'standalone' && icons.every((s) => s === 200), `„${manifest.name}“, ${manifest.display}, Icons ${icons.join('/')}`);

  await seite.reload({ waitUntil: 'networkidle' }); // jetzt steuert der Service Worker die Seite
  await kontext.setOffline(true);
  await seite.reload({ waitUntil: 'load' });
  await seite.locator('h1').waitFor();
  const offlineSichtbar = await seite.locator('#offline').isVisible();
  await trageEin(seite, 'Abendessen', 'apfel', 170);
  await seite.getByRole('link', { name: 'Zutaten', exact: true }).click();
  await seite.locator('.zeilen .zeile').first().waitFor();
  const anzahl = await seite.locator('.zeilen .zeile').count();
  pruefe('Ohne Netz: App startet aus dem Cache, Eintragen und Zutatenliste gehen', offlineSichtbar && anzahl > 150, `Hinweis „offline“ sichtbar, ${anzahl} Zutaten, 1 Eintrag angelegt`);

  await seite.locator('input[type=search]').fill('skyr');
  await seite.unroute('https://world.openfoodfacts.org/**');
  await seite.getByRole('button', { name: /bei Open Food Facts suchen/ }).click();
  await seite.locator('.online .fehlertext').waitFor();
  pruefe('Ohne Netz: Online-Suche meldet sich verständlich', true, await seite.locator('.online .fehlertext').innerText());
  // Der Browser meldet den fehlgeschlagenen Abruf selbst in der Konsole; das ist hier erwartet.
  const echte = fehler.filter((f) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(f));
  pruefe('Offline-Lauf ohne unerwartete Konsolenfehler', echte.length === 0, echte.join(' | ') || '0 unerwartete Fehler');
  await kontext.close();
}

async function dunkelLauf(browser) {
  const { kontext, seite } = await neueSeite(browser, { colorScheme: 'dark' });
  await seite.goto(URL_APP, { waitUntil: 'networkidle' });
  await trageEin(seite, 'Frühstück', 'banane', 120);
  await trageEin(seite, 'Mittagessen', 'nudeln', 250);
  const modus = await seite.evaluate(() => document.documentElement.dataset.modus);
  pruefe('Dunkle Darstellung folgt dem System', modus === 'dunkel', `data-modus="${modus}"`);
  await bild(seite, '06-heute-dunkel');
  await seite.getByRole('button', { name: 'Zu Abendessen hinzufügen' }).click();
  await seite.locator('dialog input[type=search]').fill('lachs');
  await seite.locator('dialog .zeilen .zeile').first().click();
  await seite.locator('#f-gramm').fill('150');
  await bild(seite, '07-blatt-menge', false);
  await kontext.close();
}

async function rezeptLauf(browser) {
  const { kontext, seite, fehler } = await neueSeite(browser);
  await seite.goto(`${URL_APP}#/rezepte`, { waitUntil: 'networkidle' });
  pruefe('Rezepte: leere Liste lädt zum Anlegen ein', (await seite.locator('.leer').innerText()).includes('Noch kein Rezept'), await seite.locator('.leer').innerText());

  await seite.getByRole('link', { name: 'Neues Rezept' }).click();
  await seite.getByRole('button', { name: 'Rezept speichern' }).click();
  const pflicht = await seite.locator('.fehlertext').allInnerTexts();
  pruefe('Rezept: leeres Formular zeigt Pflichtfehler', pflicht.length === 2, pflicht.join(' | '));

  await seite.locator('#f-name').fill('Testchili');
  for (const [begriff, menge] of [['bohnen', '800'], ['reis', '400']]) {
    await seite.getByRole('button', { name: 'Zutat hinzufügen' }).click();
    await seite.locator('dialog input[type=search]').fill(begriff);
    await seite.locator('dialog .zeilen .zeile').first().click();
    await seite.locator('dialog').waitFor({ state: 'detached' });
    await seite.locator('.gramm-eingabe').last().fill(menge);
  }
  const summe = await seite.locator('#rezept-summe').innerText();
  await seite.locator('#f-schritt-0').fill('Alles 20 Minuten köcheln.');
  await seite.locator('#f-prinzip-0').fill('Lange Hitze macht Hülsenfrüchte weich.');
  await seite.getByRole('button', { name: 'Schritt hinzufügen' }).click();
  await seite.locator('#f-schritt-1').fill('Abschmecken.');
  await bild(seite, '08-rezept-formular');
  await seite.getByRole('button', { name: 'Rezept speichern' }).click();
  await seite.locator('h1', { hasText: 'Testchili' }).waitFor();
  const kcalText = await seite.locator('table.naehrwerte td').first().innerText();
  const kcalPortion = Number(kcalText.replace(/[^\d]/g, ''));
  pruefe('Rezept anlegen: Zutaten, Portionen, Schritte mit Prinzip', (await seite.locator('.schritte > li').count()) === 2 && (await seite.locator('.prinzip').count()) === 1 && kcalPortion > 0,
    `Formular: „${summe}“ → Detail: ${kcalText} je Portion, 2 Schritte, 1 Prinzip`);
  await bild(seite, '09-rezept-detail');

  await seite.getByRole('button', { name: 'Portion eintragen' }).click();
  const portionGramm = await seite.locator('#f-gramm').inputValue();
  await seite.getByRole('button', { name: 'Für heute eintragen' }).click();
  await seite.getByRole('button', { name: 'Zum Tagebuch' }).click();
  await seite.locator('.eintrag').first().waitFor();
  const eintrag = (await seite.locator('.eintrag').first().innerText()).replace(/\n/g, ' | ');
  const kcalEintrag = Number((await seite.locator('.eintrag-kcal').first().innerText()).replace(/[^\d]/g, ''));
  pruefe('Eine Portion landet im Tagebuch mit den Werten des Rezepts', Math.abs(kcalEintrag - kcalPortion) <= 1 && eintrag.includes('Rezept'), `${portionGramm} g vorbelegt → ${eintrag}`);

  await seite.getByRole('button', { name: 'Zu Abendsnack hinzufügen' }).click();
  await seite.locator('dialog input[type=search]').fill('testchili');
  const marke = await seite.locator('dialog .zeilen .zeile small').first().innerText();
  await seite.locator('dialog .zeilen .zeile').first().click();
  await seite.getByRole('button', { name: /½ Portion/ }).click();
  await seite.getByRole('button', { name: 'Eintragen', exact: true }).click();
  await seite.locator('dialog').waitFor({ state: 'detached' });
  const halb = Number((await seite.locator('#slot-abendsnack .eintrag-kcal').innerText()).replace(/[^\d]/g, ''));
  pruefe('Rezept ist im Tagebuch suchbar, halbe Portion möglich', marke === 'Rezept' && Math.abs(halb * 2 - kcalPortion) <= 2, `Kennzeichnung „${marke}“, ½ Portion = ${halb} kcal`);

  await seite.goto(`${URL_APP}#/rezepte`);
  await seite.locator('.zeilen a.zeile').first().click();
  await seite.getByRole('link', { name: 'Bearbeiten' }).click();
  await seite.locator('#f-portionen').fill('2');
  await seite.getByRole('button', { name: 'Rezept speichern' }).click();
  await seite.locator('table.naehrwerte').waitFor();
  const doppelt = Number((await seite.locator('table.naehrwerte td').first().innerText()).replace(/[^\d]/g, ''));
  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('.eintrag').first().waitFor();
  const alt = Number((await seite.locator('.eintrag-kcal').first().innerText()).replace(/[^\d]/g, ''));
  pruefe('Rezept ändern: neue Werte im Rezept, alte Einträge bleiben stabil', Math.abs(doppelt - kcalPortion * 2) <= 2 && alt === kcalEintrag, `je Portion ${kcalPortion} → ${doppelt} kcal, alter Eintrag weiter ${alt} kcal`);

  await seite.goto(`${URL_APP}#/rezepte`);
  await seite.locator('.zeilen a.zeile').first().click();
  await seite.getByRole('button', { name: 'Löschen' }).click();
  await seite.locator('dialog').getByRole('button', { name: 'Löschen' }).click();
  await seite.locator('.leer').waitFor();
  await seite.getByRole('button', { name: 'Rückgängig' }).click();
  await seite.locator('.zeilen a.zeile').waitFor();
  pruefe('Rezept löschen und zurückholen', (await seite.locator('.zeilen a.zeile').count()) === 1, 'nach Rückgängig wieder 1 Rezept');

  const id = (await seite.locator('.zeilen a.zeile').getAttribute('href')).split('/').pop();
  const mass = [];
  const unsinn = [];
  for (const [route, warteAuf] of [['rezepte', '.zeilen'], [`rezepte/${id}`, '.schritte'], [`rezepte/${id}/bearbeiten`, '#f-schritt-0'], ['rezepte/neu', '#f-name']]) {
    await seite.goto(`${URL_APP}#/${route}`);
    await seite.locator(warteAuf).first().waitFor();
    const b = await seite.evaluate(() => ({ inhalt: document.documentElement.scrollWidth, fenster: window.innerWidth }));
    mass.push(`${route.replace(id, '…')} ${b.inhalt}/${b.fenster}`);
    if (b.inhalt > b.fenster) unsinn.push(`${route} zu breit`);
    if (/\b(null|undefined|NaN)\b/.test(await seite.locator('body').innerText())) unsinn.push(`${route}: null/undefined/NaN im Text`);
  }
  pruefe('Rezeptseiten: kein seitliches Rollen, kein „null“ im Text', unsinn.length === 0, unsinn.join(' | ') || mass.join(', '));
  pruefe('Rezept-Lauf ohne Konsolenfehler', fehler.length === 0, fehler.slice(0, 3).join(' | ') || '0 Fehler');
  await kontext.close();
}

async function wochenLauf(browser) {
  const { kontext, seite, fehler } = await neueSeite(browser, { permissions: ['clipboard-read', 'clipboard-write'] });
  await seite.goto(`${URL_APP}#/woche`, { waitUntil: 'networkidle' });
  await seite.locator('h1', { hasText: 'Diese Woche' }).waitFor();
  pruefe('Woche: sieben Tage, leerer Plan lädt zum Planen ein', (await seite.locator('.plantag').count()) === 7 && (await seite.locator('.leer').count()) === 1, `${await seite.locator('.tagestitel p').innerText()}; ${await seite.locator('.plantag.heute h2').innerText()}`);

  // Ein Rezept direkt in die Datenbank legen (das Formular ist im Rezept-Lauf geprüft)
  await seite.evaluate(() => new Promise((ok, nein) => {
    const a = indexedDB.open('elan');
    a.onsuccess = () => {
      const t = a.result.transaction('rezepte', 'readwrite');
      t.objectStore('rezepte').put({
        id: 'test-eintopf', name: 'Testeintopf', portionen: 4, schritte: [],
        zutaten: [
          { zutatId: 'basis:kidneybohnen', name: 'Testbohnen', marke: '', gramm: 800, je100: { kcal: 100, protein: 7, kh: 12, fett: 0.5 } },
          { zutatId: 'basis:apfel', name: 'Apfel', marke: '', gramm: 400, je100: { kcal: 52, protein: 0.3, kh: 11.4, fett: 0.2 } },
        ],
      });
      t.oncomplete = () => { a.result.close(); ok(); };
      t.onerror = () => nein(t.error);
    };
  }));

  const plane = async (tagIndex, begriff, chip, gramm) => {
    await seite.locator('.plantag').nth(tagIndex).locator('.plus').click();
    await seite.locator('dialog input[type=search]').fill(begriff);
    await seite.locator('dialog .zeilen .zeile').first().click();
    if (chip) await seite.getByRole('button', { name: chip }).click();
    else await seite.locator('#f-gramm').fill(String(gramm));
    await seite.getByRole('button', { name: 'Einplanen', exact: true }).click();
    await seite.locator('dialog').waitFor({ state: 'detached' });
  };
  const heuteIndex = await seite.locator('.plantag').evaluateAll((tage) => tage.findIndex((t) => t.classList.contains('heute')));
  const andererTag = heuteIndex === 0 ? 1 : 0;
  await plane(heuteIndex, 'testeintopf', /^1 Portion/);
  await plane(heuteIndex, 'apfel', null, 340);
  await plane(andererTag, 'testeintopf', /^1 Portion/);
  await plane(andererTag, 'apfel', null, 170);
  const tagHeute = seite.locator('.plantag.heute');
  const slotsGeplant = await tagHeute.locator('.eintrag small').allInnerTexts();
  pruefe('Mahlzeiten einplanen, der nächste freie Slot wird vorgeschlagen', (await seite.locator('.plantag .eintrag').count()) === 4 && slotsGeplant.join() === 'Frühstück,Morgensnack',
    `${await tagHeute.locator('.slot-stand').innerText()}; Slots: ${slotsGeplant.join(', ')}`);
  await bild(seite, '11-woche');

  await seite.getByRole('link', { name: 'Einkaufsliste' }).click();
  await seite.locator('.haken').first().waitFor();
  const posten = await seite.locator('.haken').evaluateAll((z) => z.map((x) => x.innerText.replace(/\n+/g, ' | ')));
  const apfel = posten.find((x) => x.startsWith('Apfel')) ?? '';
  const bohnen = posten.find((x) => x.startsWith('Testbohnen')) ?? '';
  // 2 Portionen von 4 = halbes Rezept: 400 g Bohnen, 200 g Apfel; dazu 340 g + 170 g Apfel direkt = 710 g
  pruefe('Einkaufsliste: Rezepte aufgelöst, gleiche Zutaten summiert, nach Kategorie', posten.length === 2 && apfel.includes('710 g') && apfel.includes('5 Stück') && bohnen.includes('400 g'),
    `${posten.join(' ; ')} unter ${(await seite.locator('.seite h2').allInnerTexts()).join(', ')}`);

  await seite.locator('.haken input').first().check();
  await seite.locator('#f-eigener-posten').fill('Spülmittel');
  await seite.getByRole('button', { name: 'Dazu' }).click();
  await seite.locator('.haken', { hasText: 'Spülmittel' }).waitFor();
  await seite.reload({ waitUntil: 'networkidle' });
  await seite.locator('.haken').first().waitFor();
  const stand = await seite.locator('#einkauf-stand').innerText();
  pruefe('Häkchen und eigene Posten überleben ein Neuladen', stand === '1 von 3 erledigt' && (await seite.locator('.haken.erledigt').count()) === 1, stand);
  await bild(seite, '12-einkauf');

  // Im Emulator gibt es kein "Teilen"-Menü; dort wird kopiert. Am Handy öffnet sich das Menü des Systems.
  await seite.evaluate(() => { if (navigator.share) Object.defineProperty(navigator, 'share', { value: undefined }); });
  await seite.getByRole('button', { name: 'Offene Posten teilen' }).click();
  await seite.locator('.hinweis', { hasText: 'Liste kopiert' }).waitFor();
  const kopie = await seite.evaluate(() => navigator.clipboard.readText());
  pruefe('Offene Posten als Text', kopie.startsWith('Einkauf ') && kopie.includes('- Spülmittel') && kopie.split('\n').length === 3, kopie.replace(/\n/g, ' / '));

  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('.geplant').waitFor();
  const merk = await seite.locator('.geplant p').innerText();
  await seite.locator('.geplant').getByRole('button', { name: 'Übernehmen' }).click();
  await seite.locator('.eintrag').first().waitFor();
  const imTagebuch = await seite.locator('.eintrag').count();
  await seite.goto(`${URL_APP}#/woche`);
  await seite.locator('.plantag.heute .eintrag').first().waitFor();
  const erledigt = await seite.locator('.plantag.heute .eintrag.erledigt').count();
  const andere = seite.locator('.plantag').nth(andererTag);
  await andere.getByRole('button', { name: 'Ins Tagebuch übernehmen' }).click();
  await seite.locator('.hinweis', { hasText: 'ins Tagebuch übernommen' }).waitFor();
  pruefe('Geplantes ins Tagebuch übernehmen (aus „Heute“ und aus der Woche)', imTagebuch === 2 && erledigt === 2 && (await seite.locator('.geplant').count()) === 0 && (await andere.locator('.eintrag.erledigt').count()) === 2,
    `„${merk}“ → ${imTagebuch} Einträge heute, im Plan als erledigt markiert`);

  await seite.locator('.plantag.heute .eintrag').first().click();
  await seite.getByRole('button', { name: 'Löschen' }).click();
  await seite.locator('.hinweis', { hasText: 'Aus dem Plan entfernt' }).waitFor();
  await seite.getByRole('link', { name: 'Eine Woche weiter' }).click();
  await seite.locator('h1', { hasText: 'Nächste Woche' }).waitFor();
  pruefe('Plan-Posten entfernen, Woche wechseln', (await seite.locator('.plantag .eintrag').count()) === 0, `${await seite.locator('h1').innerText()}: ${await seite.locator('.tagestitel p').innerText()}`);

  const unsinn = [];
  const mass = [];
  for (const [route, warteAuf] of [['woche', '.plantag'], ['woche/' + (await seite.evaluate(() => new Date().toISOString().slice(0, 10))) + '/einkauf', '.zusatz']]) {
    await seite.goto(`${URL_APP}#/${route}`);
    await seite.locator(warteAuf).first().waitFor();
    const b = await seite.evaluate(() => ({ inhalt: document.documentElement.scrollWidth, fenster: window.innerWidth }));
    mass.push(`${route.replace(/\d{4}-\d\d-\d\d/, '…')} ${b.inhalt}/${b.fenster}`);
    if (b.inhalt > b.fenster) unsinn.push(`${route} zu breit`);
    if (/\b(null|undefined|NaN)\b/.test(await seite.locator('body').innerText())) unsinn.push(`${route}: null/undefined/NaN im Text`);
    const klein = await seite.evaluate(() => [...document.querySelectorAll('button, a, select, input:not([type=checkbox])')].filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().height)).filter((h) => h < 40).length);
    if (klein) unsinn.push(`${route}: ${klein} Tippflächen unter 40 px`);
  }
  pruefe('Woche und Einkauf: Breite, Text und Tippflächen', unsinn.length === 0, unsinn.join(' | ') || mass.join(', '));
  pruefe('Wochen-Lauf ohne Konsolenfehler', fehler.length === 0, fehler.slice(0, 3).join(' | ') || '0 Fehler');
  await kontext.close();
}

async function migrationsLauf(browser) {
  const { kontext, seite, fehler } = await neueSeite(browser);
  // Datenbank im Aufbau von Schema-Version 1 anlegen, bevor die App sie öffnet (Seite ohne App-Code, gleiche Herkunft)
  await seite.goto(`${URL_APP}manifest.webmanifest`);
  await seite.evaluate(() => new Promise((ok, nein) => {
    const anfrage = indexedDB.open('elan', 1);
    anfrage.onupgradeneeded = () => {
      const db = anfrage.result;
      db.createObjectStore('zutaten', { keyPath: 'id' });
      db.createObjectStore('eintraege', { keyPath: 'id' }).createIndex('datum', 'datum');
      db.createObjectStore('tage', { keyPath: 'datum' });
      db.createObjectStore('einstellungen', { keyPath: 'schluessel' });
    };
    anfrage.onsuccess = () => {
      const db = anfrage.result;
      const d = new Date();
      const heute = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const t = db.transaction('eintraege', 'readwrite');
      t.objectStore('eintraege').put({ id: 'alt-1', datum: heute, slot: 'mittag', zutatId: 'basis:apfel', name: 'Apfel', marke: '', gramm: 170, je100: { kcal: 52 }, erstellt: d.toISOString() });
      t.oncomplete = () => { db.close(); ok(); };
      t.onerror = () => nein(t.error);
    };
    anfrage.onerror = () => nein(anfrage.error);
  }));
  await seite.goto(URL_APP, { waitUntil: 'networkidle' });
  await seite.locator('.eintrag').waitFor();
  const stand = await seite.evaluate(async () => {
    const info = (await indexedDB.databases()).find((d) => d.name === 'elan');
    const speicher = await new Promise((ok) => { const a = indexedDB.open('elan'); a.onsuccess = () => { const n = [...a.result.objectStoreNames]; a.result.close(); ok(n); }; });
    return { version: info.version, speicher };
  });
  pruefe('Migration: Datenbank aus Version 1 wird angehoben, Einträge bleiben', stand.version === SCHEMA_VERSION && stand.speicher.includes('rezepte') && stand.speicher.includes('plan') && (await seite.locator('.eintrag').count()) === 1,
    `Version ${stand.version}, Speicher ${stand.speicher.join(', ')}, alter Eintrag: ${(await seite.locator('.eintrag').innerText()).replace(/\n/g, ' | ')}`);

  await seite.goto(`${URL_APP}#/mehr`);
  await seite.locator('#f-backup-datei').setInputFiles(path.resolve(__dirname, '..', 'test', 'daten', 'backup-v1.json'));
  const frage = await seite.locator('dialog p').innerText();
  await seite.getByRole('button', { name: 'Alles ersetzen' }).click();
  await seite.locator('.hinweis', { hasText: 'Backup eingespielt' }).waitFor();
  await seite.goto(`${URL_APP}#/heute/2026-11-01`);
  await seite.locator('.eintrag').waitFor();
  const typ = await seite.locator('[aria-label=Tagestyp] .wahl-knopf[aria-pressed=true]').innerText();
  pruefe('Backup aus Version 1 lässt sich einspielen', (await seite.locator('.eintrag-name').innerText()).includes('Beispielmüsli') && typ === 'Rest',
    `„${frage.slice(0, 70)}…“ → Eintrag ${(await seite.locator('.eintrag-name').innerText()).split('\n')[0]}, Tagestyp ${typ}`);
  pruefe('Migrations-Lauf ohne Konsolenfehler', fehler.length === 0, fehler.slice(0, 3).join(' | ') || '0 Fehler');
  await kontext.close();
}

(async () => {
  if (BILDER) fs.mkdirSync(BILDER, { recursive: true });
  ({ SCHEMA_VERSION } = await import('../js/logik/schema.js'));
  const server = await starte(PORT);
  const browser = await chromium.launch();
  let abbruch = null;
  try {
    await hauptlauf(browser);
    await rezeptLauf(browser);
    await wochenLauf(browser);
    await migrationsLauf(browser);
    await offlineLauf(browser);
    await dunkelLauf(browser);
  } catch (fehler) {
    abbruch = fehler;
  }
  await browser.close();
  server.close();

  for (const e of ergebnisse) console.log(`${e.ok ? 'OK    ' : 'FEHLER'} | ${e.kriterium} | ${e.beleg}`);
  const fehlgeschlagen = ergebnisse.filter((e) => !e.ok).length;
  console.log(`\n${ergebnisse.length - fehlgeschlagen} von ${ergebnisse.length} Kriterien erfüllt.`);
  if (abbruch) console.log(`ABBRUCH nach Kriterium ${ergebnisse.length}: ${abbruch.message.split('\n').slice(0, 4).join(' / ')}`);
  process.exit(fehlgeschlagen || abbruch ? 1 : 0);
})();
