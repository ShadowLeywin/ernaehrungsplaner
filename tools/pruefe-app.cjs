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

async function neueSeite(browser, { einrichtung = false, ...optionen } = {}) {
  const kontext = await browser.newContext({ ...devices['Galaxy S9+'], locale: 'de-DE', timezoneId: 'Europe/Berlin', acceptDownloads: true, ...optionen });
  // Die Ersteinrichtung hat einen eigenen Lauf; alle anderen Läufe starten wie ein eingerichtetes Gerät
  if (!einrichtung) await kontext.addInitScript(() => { try { localStorage.setItem('elan.eingerichtet', '1'); } catch { /* egal */ } });
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

  /* Blatt: Standard-Design, Ring-Kacheln, Plus-Knopf */
  const darstellung = await seite.evaluate(() => `${document.documentElement.dataset.thema}/${document.documentElement.dataset.modus}`);
  pruefe('Standard-Design ist Blatt, dunkel', darstellung === 'blatt/dunkel', darstellung);
  await seite.locator('.kachel.makro-wasser').click();
  await seite.locator('.kachel.makro-wasser .kachel-wert', { hasText: '250 ml' }).waitFor();
  await seite.getByRole('button', { name: 'Rückgängig' }).click();
  await seite.locator('.kachel.makro-wasser .kachel-wert', { hasText: /^0 ml$/ }).waitFor();
  pruefe('Wasser-Ring zählt mit einem Tipp, Rückgängig nimmt es zurück', (await seite.locator('.kacheln .kachel').count()) === 6, `${await seite.locator('.kacheln .kachel').count()} Kacheln, Wasser wieder ${await seite.locator('.kachel.makro-wasser .kachel-wert').innerText()}`);
  await seite.getByRole('button', { name: 'Essen erfassen' }).click();
  await seite.locator('dialog .zeilen .zeile').first().click();
  const vorbelegt = await seite.locator('#f-slot').inputValue();
  const erwartet = await seite.evaluate(() => { const h = new Date().getHours(); return h < 10 ? 'fruehstueck' : h < 12 ? 'morgensnack' : h < 15 ? 'mittag' : h < 18 ? 'nachmittagssnack' : h < 21 ? 'abend' : 'abendsnack'; });
  pruefe('Plus-Knopf öffnet das Eintragen mit der Mahlzeit zur Uhrzeit', vorbelegt === erwartet, `vorbelegt ${vorbelegt}, erwartet ${erwartet}`);
  await seite.keyboard.press('Escape');
  await seite.locator('dialog').waitFor({ state: 'detached' });

  // Plus-Knopf: hängt am Bildschirm, nicht an der Seite; kleine Gegenbewegungen holen ihn nicht zurück;
  // am Seitenende ist er da und verdeckt nichts
  const fabZustand = async (y) => {
    await seite.evaluate((z) => window.scrollTo(0, z), y);
    await seite.waitForTimeout(120);
    return seite.evaluate(() => {
      const f = document.querySelector('.fab');
      return { weg: f.classList.contains('weg'), abstand: Math.round(innerHeight - f.getBoundingClientRect().bottom) };
    });
  };
  await seite.waitForTimeout(500); // Seitenübergang abwarten
  const fabOben = await fabZustand(0);
  const fabRunter = await fabZustand(500);
  const fabZittern = await fabZustand(480);
  const fabHoch = await fabZustand(400);
  const fabEnde = await fabZustand(100000);
  const ueberdeckt = await seite.evaluate(() => {
    const f = document.querySelector('.fab').getBoundingClientRect();
    return [...document.querySelectorAll('.seite > :not(.fab)')].filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.bottom > f.top && r.top < f.bottom && r.right > f.left && r.left < f.right; }).map((e) => e.className || e.tagName);
  });
  pruefe('Plus-Knopf: fest über der Leiste, ruhig beim Scrollen, am Ende ohne zu verdecken',
    fabOben.abstand === fabEnde.abstand && fabHoch.abstand === fabOben.abstand && !fabOben.weg && fabRunter.weg && fabZittern.weg && !fabHoch.weg && !fabEnde.weg && ueberdeckt.length === 0,
    `Abstand unten (sichtbar) ${fabOben.abstand}/${fabHoch.abstand}/${fabEnde.abstand} px; oben ${fabOben.weg ? 'weg' : 'da'}, runter ${fabRunter.weg ? 'weg' : 'da'}, 20 px zurück ${fabZittern.weg ? 'weg' : 'da'}, 100 px hoch ${fabHoch.weg ? 'weg' : 'da'}, Ende ${fabEnde.weg ? 'weg' : 'da'}; verdeckt: ${ueberdeckt.join(', ') || 'nichts'}`);
  await seite.evaluate(() => window.scrollTo(0, 0));

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
  await seite.locator('dialog').getByRole('button', { name: 'Speichern', exact: true }).click();
  await seite.locator('dialog').waitFor({ state: 'detached' });
  pruefe('Eintrag ändern', (await eintrag.locator('.eintrag-menge').innerText()) === '100 g', await eintrag.locator('.eintrag-menge').innerText());

  await eintrag.click();
  await seite.locator('#f-gramm').fill('abc');
  await seite.locator('dialog').getByRole('button', { name: 'Speichern', exact: true }).click();
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
  await seite.goto(`${URL_APP}#/zutaten`);
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
  await seite.getByRole('button', { name: 'Zu Morgensnack hinzufügen' }).click();
  const schnell = seite.locator('dialog .chip.schnell').first();
  const schnellText = await schnell.innerText();
  const vorherAnzahl = await seite.locator('#slot-morgensnack .eintrag').count();
  await schnell.click();
  await seite.locator('dialog').waitFor({ state: 'detached' });
  await seite.locator('#slot-morgensnack .eintrag').first().waitFor();
  const meldung = await seite.locator('.hinweis span').innerText();
  await seite.getByRole('button', { name: 'Rückgängig' }).click();
  await seite.locator('#slot-morgensnack .eintrag').waitFor({ state: 'detached' });
  pruefe('Zuletzt Gegessenes mit einem Tipp eintragen, mit Rückgängig', vorherAnzahl === 0 && /^\+ [\d,]+ g$/.test(schnellText) && meldung.includes('eingetragen'), `„${schnellText}“ → „${meldung}“ → Rückgängig entfernt den Eintrag`);
  pruefe('Eigene Zutat mit Portion eintragen', menge === '35' && (await seite.locator('#slot-abendsnack .eintrag-kcal').innerText()) === '140 kcal', `Liste zeigt „${zuletzt}“, 1 Riegel = ${menge} g = ${await seite.locator('#slot-abendsnack .eintrag-kcal').innerText()}`);

  /* Ziele */
  await seite.getByRole('link', { name: 'Mehr', exact: true }).click();
  await seite.locator('.menuepunkt').first().waitFor();
  const menue = await seite.locator('.menuekarte-titel').allInnerTexts();
  const standZiele = await seite.locator('#menue-ziele small').innerText();
  const standDarstellung = await seite.locator('#menue-darstellung small').innerText();
  await seite.getByRole('link', { name: /Ziele je Tagestyp/ }).click();
  await seite.locator('#f-ziel-kcal').waitFor();
  pruefe('Mehr: Karten mit Überblick, jede Zeile zeigt den aktuellen Stand', menue.length === 5 && menue[0].toLowerCase().startsWith('dabei seit') && standZiele === '2.300 bis 2.700 kcal je Tag' && standDarstellung === 'Blatt · Dunkel · Vibration an' && seite.url().endsWith('#/mehr/ziele'),
    `Karten: ${menue.join(', ')}; Ziele „${standZiele}“, Darstellung „${standDarstellung}“`);
  await seite.getByRole('link', { name: 'Zurück zu Mehr' }).waitFor();
  await seite.goto(`${URL_APP}#/mehr/datenschutz`);
  await seite.locator('.datenschutz h2').first().waitFor();
  const datenschutz = await seite.locator('.datenschutz').innerText();
  pruefe('Datenschutz in der App: nennt Health Connect und dass nichts das Gerät verlässt', datenschutz.includes('Health Connect') && datenschutz.includes('Nirgendwohin'), datenschutz.slice(0, 80).replace(/\n/g, ' '));
  await seite.goto(`${URL_APP}#/mehr/ziele`);
  await seite.locator('#f-ziel-kcal').waitFor();
  await seite.locator('#f-ziel-kcal').fill('3000');
  await seite.locator('#f-ziel-kcal').blur();
  const warnung = await seite.locator('.unterseite .merkzettel').first().innerText().catch(() => '');
  await seite.getByRole('button', { name: 'Ziele speichern' }).click();
  await seite.locator('.hinweis', { hasText: 'Ziele gespeichert' }).waitFor();
  pruefe('Ziel ändern, Hinweis bei unpassenden Makros', warnung.includes('weniger'), warnung);
  await bild(seite, '05-mehr');

  /* Backup */
  await seite.goto(`${URL_APP}#/mehr/backup`);
  await seite.getByRole('button', { name: 'Backup speichern' }).waitFor();
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
  await seite.goto(`${URL_APP}#/mehr/backup`);
  await seite.locator('#f-backup-datei').setInputFiles(datei);
  const rueckfrage = await seite.locator('dialog p').innerText();
  await seite.getByRole('button', { name: 'Alles ersetzen' }).click();
  await seite.locator('.hinweis', { hasText: 'Backup eingespielt' }).waitFor();
  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('.eintrag').first().waitFor();
  pruefe('Backup einspielen stellt den Stand wieder her', (await seite.locator('.eintrag').count()) === 4, `Rückfrage: „${rueckfrage}“ → ${await seite.locator('.eintrag').count()} Einträge`);

  fs.writeFileSync(datei, '{"app":"fremd","schemaVersion":1,"daten":{}}');
  await seite.goto(`${URL_APP}#/mehr/backup`);
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
  const ohneGruppe = await seite.locator('.alle-naehrwerte').innerText();
  await seite.goto(`${URL_APP}#/mehr/referenz`);
  await seite.locator('#f-ref-geschlecht').selectOption('w');
  await seite.locator('#f-ref-alter').selectOption('25');
  await seite.locator('.hinweis', { hasText: 'Referenzgruppe gespeichert' }).waitFor();
  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('.alle-naehrwerte summary').waitFor();
  if ((await seite.locator('.alle-naehrwerte').getAttribute('open')) === null) await seite.locator('.alle-naehrwerte summary').click();
  await seite.getByRole('button', { name: 'Wochenschnitt' }).click();
  const vitC = (await seite.locator('.alle-naehrwerte tr', { hasText: 'Vitamin C' }).innerText()).replace(/\s+/g, ' ');
  const anteile = await seite.locator('.alle-naehrwerte td.anteil').count();
  pruefe('Referenzwerte: ohne Gruppe ein Hinweis, mit Gruppe Prozent je Nährstoff', ohneGruppe.includes('Referenzgruppe wählen') && /Vitamin C .* \d+ %/.test(vitC) && anteile > 20,
    `Gruppe Frau 25–50: „${vitC}“, ${anteile} Zeilen mit Anteil`);
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

  await seite.goto(`${URL_APP}#/mehr/mahlzeiten`);
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
  for (const [route, warteAuf] of [['heute', '.eintrag'], ['zutaten', '.zeilen .zeile'], ['zutaten/neu', '#f-name'], ['zutaten/basis%3Aapfel', 'table.naehrwerte'], ['mehr', '.menuepunkt'], ['mehr/coach', '.unterseite'], ['mehr/ueber', '.funktionen'], ['mehr/neu', '.neuigkeiten']]) {
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
  await seite.goto(`${URL_APP}#/zutaten`);
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
  await seite.keyboard.press('Escape');
  await seite.locator('dialog').waitFor({ state: 'detached' });

  // Doppeltipp auf „Eintragen“ legt nur einen Eintrag an
  await seite.getByRole('button', { name: 'Zu Abendessen hinzufügen' }).click();
  await seite.locator('dialog input[type=search]').fill('lachs');
  await seite.locator('dialog .zeilen .zeile').first().click();
  await seite.locator('#f-gramm').fill('150');
  await seite.getByRole('button', { name: 'Eintragen', exact: true }).dblclick();
  await seite.locator('dialog').waitFor({ state: 'detached' });
  await seite.waitForTimeout(300);
  const abend = await seite.locator('#slot-abend .eintrag').count();
  pruefe('Stabil: Doppeltipp auf „Eintragen“ legt nur einen Eintrag an', abend === 1, `${abend} Eintrag/Einträge im Abendessen`);

  // Über dem Ziel: 12 × 250 ml = 3.000 ml bei 2.500 ml Ziel, die zweite Runde zeigt 20 %
  for (let i = 0; i < 12; i++) await seite.locator('.kachel.makro-wasser').click();
  await seite.locator('.kachel.makro-wasser .kachel-wert', { hasText: '3.000 ml' }).waitFor();
  const gefeiert = await seite.locator('.kachel.makro-wasser.gefeiert').count();
  pruefe('Ziel-Feier: Wasser-Ring leuchtet auf, sobald er voll wird', gefeiert === 1, `${gefeiert} gefeierte Kachel nach 2.500 ml`);
  const runde2 = await seite.locator('.kachel.makro-wasser .ring-runde2').getAttribute('stroke-dasharray');
  pruefe('Ring über 100 %: zweite Runde zeigt den Überschuss', runde2 === '20.0 100', `Wasser 3.000 von 2.500 ml, zweite Runde „${runde2}“`);

  // Übergänge: Richtung beim Seitenwechsel, Ruhe beim Neuzeichnen, offene Blätter schließen beim Seitenwechsel
  await seite.goto(`${URL_APP}#/woche`);
  await seite.locator('.seite-woche').waitFor();
  const klasseWoche = await seite.locator('.seite').getAttribute('class');
  await seite.getByRole('button', { name: 'Für Montag einplanen' }).click();
  await seite.locator('dialog').waitFor();
  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('.seite-heute').waitFor();
  const offeneBlaetter = await seite.locator('dialog').count();
  const klasseHeute = await seite.locator('.seite').getAttribute('class');
  await seite.locator('.kachel.makro-wasser').click();
  await seite.getByRole('button', { name: 'Rückgängig' }).click();
  await trageEin(seite, 'Frühstück', 'banane', 100);
  await seite.waitForTimeout(200);
  const klasseNachSpeichern = await seite.locator('.seite').getAttribute('class');
  pruefe('Übergänge: Seite gleitet in Richtung der Leiste, Speichern bleibt ruhig, Blatt schließt beim Seitenwechsel',
    klasseWoche.includes('richtung-vor') && klasseHeute.includes('richtung-zurueck') && !klasseNachSpeichern.includes('einblenden') && offeneBlaetter === 0,
    `Woche: ${klasseWoche}; Heute: ${klasseHeute}; nach Speichern: ${klasseNachSpeichern}; offene Blätter nach Wechsel: ${offeneBlaetter}`);

  // Ringe abwählen: Fett und „Alle Nährwerte“ aus, Heute zeigt 4 Kacheln als 2 × 2
  await seite.goto(`${URL_APP}#/mehr/ziele`);
  await seite.locator('#ring-fett').uncheck();
  await seite.locator('#ring-alle').uncheck();
  await seite.waitForFunction(async () => ((await (await import('./js/speicher.js')).einstellung('ringe')) ?? []).length === 4);
  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('.kacheln').waitFor();
  const kachelStand = await seite.locator('.kacheln').evaluate((k) => `${k.children.length} Kacheln, Spalten ${k.style.getPropertyValue('--spalten')}, ${[...k.children].map((c) => c.className.match(/makro-(\w+)/)?.[1] ?? 'alle').join(',')}`);
  pruefe('Ringe abwählbar: Auswahl gilt auf „Heute“, 4 Kacheln als 2 × 2', kachelStand === '4 Kacheln, Spalten 2, protein,kh,ballaststoffe,wasser', kachelStand);

  // Das erste Design bleibt wählbar und wirkt sofort
  await seite.goto(`${URL_APP}#/mehr/darstellung`);
  // Wie ein Mensch: die Zeile antippen; der versteckte Radioknopf dahinter wird gewählt
  await seite.locator('label.auswahl', { hasText: 'Zitrus' }).click();
  await seite.locator('label.auswahl', { hasText: /^Hell/ }).click();
  await seite.getByRole('radio', { name: /^Hell/ }).waitFor({ state: 'attached' });
  const gewaehlt = await seite.evaluate(() => [...document.querySelectorAll('input[type=radio]:checked')].map((r) => r.value).join(','));
  pruefe('Darstellung: Häkchen-Liste wählt Design und Modus', gewaehlt === 'zitrus,hell', gewaehlt);
  const zitrus = await seite.evaluate(() => `${document.documentElement.dataset.thema}/${document.documentElement.dataset.modus}/${getComputedStyle(document.body).fontFamily.split(',')[0]}/${localStorage.getItem('elan.thema')}`);
  pruefe('Darstellung: Zitrus hell wählbar, mit eigener Schrift, bleibt gespeichert', zitrus.startsWith('zitrus/hell/') && zitrus.includes('Bricolage') && zitrus.endsWith('/zitrus'), zitrus);
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
  const held = await seite.locator('.rezept-held').evaluate((e) => ({ symbol: e.textContent, farbe: e.style.getPropertyValue('--bild-farbe'), versteckt: e.getAttribute('aria-hidden') }));
  pruefe('Rezept: Bildfläche mit Symbol und Farbton, für Screenreader ausgeblendet', held.symbol.length > 0 && held.farbe.startsWith('var(--') && held.versteckt === 'true', `${held.symbol} auf ${held.farbe}`);
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
  // Gezielt die halbe Portion: Je nach Uhrzeit landet auch die Portion von der Rezeptseite im Abendsnack
  const abendsnack = await seite.locator('#slot-abendsnack .eintrag').allInnerTexts();
  const halbeZeile = seite.locator('#slot-abendsnack .eintrag').filter({ has: seite.locator('.eintrag-menge', { hasText: /^150 g$/ }) });
  const halb = Number((await halbeZeile.locator('.eintrag-kcal').innerText()).replace(/[^\d]/g, ''));
  pruefe('Rezept ist im Tagebuch suchbar, halbe Portion möglich', marke === 'Rezept' && Math.abs(halb * 2 - kcalPortion) <= 2, `Kennzeichnung „${marke}“, ½ Portion = ${halb} kcal; Abendsnack: ${abendsnack.map((t) => t.replace(/\n/g, ' ')).join(' / ')}`);

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

  // Zeitraum wählen: Monat summiert alle geplanten Tage des Monats, frei mit zwei Tagen, zu lang wird abgelehnt
  const wochenAdresse = await seite.evaluate(() => location.hash);
  await seite.getByRole('button', { name: 'Monat', exact: true }).click();
  await seite.locator('.wahl-knopf[aria-pressed=true]', { hasText: 'Monat' }).waitFor();
  const monatAdresse = await seite.evaluate(() => location.hash);
  const monatPosten = await seite.locator('.haken').evaluateAll((z) => z.map((x) => x.innerText.replace(/\n+/g, ' | ')));
  const monatStand = await seite.locator('#einkauf-stand').innerText().catch(() => '');
  // Beide Plantage liegen in dieser Woche; liegen sie im selben Monat, zählt der Monat dieselben 710 g Apfel
  const monatApfel = monatPosten.find((x) => x.startsWith('Apfel')) ?? '';
  pruefe('Einkaufsliste für den Monat: eigener Zeitraum, eigene Häkchen', /^#\/einkauf\/\d{4}-\d\d-01\/\d{4}-\d\d-\d\d$/.test(monatAdresse) && /\d+ g/.test(monatApfel) && monatStand.startsWith('0 von'),
    `${monatAdresse}: ${monatPosten.join(' ; ')}; ${monatStand}`);
  await bild(seite, '12b-einkauf-monat');
  await seite.getByRole('button', { name: 'Frei', exact: true }).click();
  await seite.locator('#f-zeitraum-von').fill('2026-01-01');
  await seite.locator('#f-zeitraum-bis').fill('2026-03-31');
  await seite.getByRole('button', { name: 'Zeigen' }).click();
  const zuLang = await seite.locator('#f-zeitraum-fehler').innerText();
  const heuteIso = await seite.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  await seite.locator('#f-zeitraum-von').fill(heuteIso);
  await seite.locator('#f-zeitraum-bis').fill(heuteIso);
  await seite.getByRole('button', { name: 'Zeigen' }).click();
  await seite.waitForFunction((t) => location.hash === `#/einkauf/${t}/${t}`, heuteIso);
  await seite.locator('.wahl-knopf[aria-pressed=true]', { hasText: 'Frei' }).waitFor();
  const tagPosten = await seite.locator('.haken').evaluateAll((z) => z.map((x) => x.innerText.replace(/\n+/g, ' | ')));
  const tagApfel = tagPosten.find((x) => x.startsWith('Apfel')) ?? '';
  // Nur heute: 1 Portion Eintopf (ein Viertel von 400 g = 100 g Apfel) + 340 g Apfel = 440 g
  pruefe('Einkaufsliste frei gewählt: nur die Tage im Zeitraum, höchstens 62 Tage', zuLang.includes('Höchstens 62 Tage') && tagApfel.includes('440 g') && (await seite.locator('.tagestitel .ueberzeile').innerText()).includes('1 Tage') === false,
    `zu lang: „${zuLang}“; nur heute: ${tagPosten.join(' ; ')}; Kopf ${await seite.locator('.tagestitel .ueberzeile').innerText()}`);
  await bild(seite, '12c-einkauf-frei');
  await seite.goto(`${URL_APP}${wochenAdresse}`);
  await seite.locator('.haken').first().waitFor();

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
  await seite.goto(`${URL_APP}#/woche/${await seite.evaluate(() => new Date().toISOString().slice(0, 10))}/einkauf`);
  await seite.locator('.zusatz').waitFor();
  const umgeleitet = await seite.evaluate(() => location.hash);
  pruefe('Alte Adresse der Wochenliste leitet auf die Liste des Zeitraums um', /^#\/einkauf\/\d{4}-\d\d-\d\d\/\d{4}-\d\d-\d\d$/.test(umgeleitet) && (await seite.locator('.wahl-knopf[aria-pressed=true]').innerText()) === 'Woche', umgeleitet);
  await seite.setViewportSize({ width: 320, height: 640 });
  await seite.getByRole('button', { name: 'Frei', exact: true }).click();
  const freiBreit = await seite.evaluate(() => document.documentElement.scrollWidth);
  pruefe('Einkauf bei 320 px mit offenem Zeitraum-Formular ohne seitliches Rollen', freiBreit <= 320, `${freiBreit} px`);
  await seite.setViewportSize(devices['Galaxy S9+'].viewport);
  for (const [route, warteAuf] of [['woche', '.plantag'], ['einkauf', '.zusatz']]) {
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

async function vorkochLauf(browser) {
  const { kontext, seite, fehler } = await neueSeite(browser);
  await seite.goto(`${URL_APP}#/rezepte`, { waitUntil: 'networkidle' });
  await seite.locator('.leer').waitFor();
  await seite.evaluate(() => new Promise((ok, nein) => {
    const a = indexedDB.open('elan');
    a.onsuccess = () => {
      const t = a.result.transaction('rezepte', 'readwrite');
      t.objectStore('rezepte').put({
        id: 'test-vorkochen', name: 'Vorkochtopf', portionen: 4, schritte: [], gewichtGekocht: 1400, haltbarTage: 2, einfrierbar: true,
        zutaten: [{ zutatId: 'basis:kidneybohnen', name: 'Testbohnen', marke: '', gramm: 1000, je100: { kcal: 100, protein: 7, kh: 12, fett: 0.5 } }],
      });
      t.oncomplete = () => { a.result.close(); ok(); };
      t.onerror = () => nein(t.error);
    };
  }));
  await seite.goto(`${URL_APP}#/rezepte/test-vorkochen`);
  await seite.locator('table.naehrwerte').waitFor();
  const kopf = (await seite.locator('.detailkopf').innerText()).replace(/\n/g, ' | ');
  const kcal = await seite.locator('table.naehrwerte td').first().innerText();
  pruefe('Meal-Prep: Gewicht nach dem Kochen ergibt das Portionsgewicht, Energie je Portion bleibt', kopf.includes('350 g gekocht') && kopf.includes('2 Tage') && kopf.includes('einfrieren') && kcal === '250 kcal', `${kopf} → ${kcal}`);

  await seite.getByRole('link', { name: 'Bearbeiten' }).click();
  await seite.locator('#f-haltbarTage').fill('2,5');
  await seite.getByRole('button', { name: 'Rezept speichern' }).click();
  const tageFehler = await seite.locator('.fehlertext').first().innerText();
  await seite.locator('#f-haltbarTage').fill('2');
  await seite.locator('#f-gewichtGekocht').fill('1200');
  await bild(seite, '13-rezept-vorkochen');
  await seite.getByRole('button', { name: 'Rezept speichern' }).click();
  await seite.locator('table.naehrwerte').waitFor();
  pruefe('Meal-Prep: Angaben im Formular änderbar und geprüft', (await seite.locator('.detailkopf').innerText()).includes('300 g gekocht'), `„${tageFehler}“ bei 2,5 Tagen; danach ${(await seite.locator('.detailkopf p').first().innerText())}`);

  // Nächste Woche: Montag kochen, Donnerstag wieder essen = 3 Tage alt bei 2 Tagen Haltbarkeit
  await seite.goto(`${URL_APP}#/woche`);
  await seite.getByRole('link', { name: 'Eine Woche weiter' }).click();
  await seite.locator('h1', { hasText: 'Nächste Woche' }).waitFor();
  for (const tag of [0, 2, 3]) {
    await seite.locator('.plantag').nth(tag).locator('.plus').click();
    await seite.locator('dialog input[type=search]').fill('vorkochtopf');
    await seite.locator('dialog .zeilen .zeile').first().click();
    await seite.getByRole('button', { name: 'Einplanen', exact: true }).click();
    await seite.locator('dialog').waitFor({ state: 'detached' });
  }
  const warnungen = await seite.locator('.haltbar').allInnerTexts();
  const amDonnerstag = await seite.locator('.plantag').nth(3).locator('.haltbar').count();
  pruefe('Wochenplan warnt, wenn eine vorgekochte Portion zu alt wäre', warnungen.length === 1 && amDonnerstag === 1 && warnungen[0].includes('3 Tage alt') && warnungen[0].includes('einfrieren'), warnungen.join(' | '));
  await bild(seite, '14-woche-haltbar');

  await seite.getByRole('link', { name: 'Einkaufsliste' }).click();
  await seite.locator('.haken').first().waitFor();
  const posten = (await seite.locator('.haken').first().innerText()).replace(/\n+/g, ' | ');
  // 3 Portionen zu 300 g gekocht = 900 von 1.200 g = drei Viertel des Rezepts = 750 g Rohware
  pruefe('Einkaufsliste rechnet gekochte Portionen auf Rohware zurück', posten.includes('750 g'), posten);

  /* Mag-Liste */
  await seite.goto(`${URL_APP}#/zutaten/mag`);
  await seite.locator('.magzeile').first().waitFor();
  const vorher = await seite.locator('#mag-stand').innerText();
  await seite.locator('[id="mag-basis:apfel"]').selectOption('N');
  await seite.waitForFunction((alt) => document.getElementById('mag-stand').textContent !== alt, vorher);
  const nachher = await seite.locator('#mag-stand').innerText();
  await seite.getByRole('button', { name: 'Offen' }).click();
  await seite.locator('.wahl-knopf[aria-pressed=true]', { hasText: 'Offen' }).waitFor(); // erst zählen, wenn neu gezeichnet ist
  const apfelOffen = await seite.locator('[id="mag-basis:apfel"]').count();
  await seite.reload({ waitUntil: 'networkidle' });
  await seite.getByRole('button', { name: 'Alle' }).click();
  pruefe('Mag-Liste: Angabe je Obst und Gemüse, Filter „Offen“, übersteht Neuladen', vorher.startsWith('0 von') && nachher.startsWith('1 von') && apfelOffen === 0 && (await seite.locator('[id="mag-basis:apfel"]').inputValue()) === 'N', `${vorher} → ${nachher}`);
  await bild(seite, '15-magliste');

  await seite.goto(`${URL_APP}#/heute`);
  await seite.getByRole('button', { name: 'Zu Frühstück hinzufügen' }).click();
  await seite.locator('dialog input[type=search]').fill('apfel');
  const namen = await seite.locator('dialog .zeilen .zeile-name').evaluateAll((z) => z.map((x) => x.firstChild.textContent));
  const zusatz = await seite.locator('dialog .zeilen .zeile').last().locator('small').innerText();
  pruefe('Suchliste: Abgelehntes steht am Ende und ist gekennzeichnet', namen.length > 1 && namen.at(-1) === 'Apfel' && zusatz === 'magst du nicht', `Reihenfolge: ${namen.join(', ')}; Zusatz „${zusatz}“`);
  await seite.locator('dialog').getByRole('button', { name: 'Schließen' }).click();

  await seite.goto(`${URL_APP}#/zutaten/basis%3Aapfel`);
  await seite.locator('#f-mag').selectOption('S');
  await seite.locator('#f-mag-notiz').waitFor();
  await seite.locator('#f-mag-notiz').fill('nur geschält');
  await seite.locator('#f-mag-notiz').blur();
  // Der Hinweis „Gemerkt“ von der Auswahl steht noch da und taugt nicht als Signal: auf den gespeicherten Wert warten
  await seite.waitForFunction(async () => {
    const speicher = await import('./js/speicher.js');
    return (await speicher.alleVorlieben()).get('basis:apfel')?.notiz === 'nur geschält';
  });
  await seite.reload({ waitUntil: 'networkidle' });
  await seite.locator('#f-mag-notiz').waitFor();
  pruefe('Sonderfall mit Beschreibung an der Zutat', (await seite.locator('#f-mag').inputValue()) === 'S' && (await seite.locator('#f-mag-notiz').inputValue()) === 'nur geschält', `Auswahl S, Notiz „${await seite.locator('#f-mag-notiz').inputValue()}“`);

  const unsinn = [];
  const mass = [];
  for (const [route, warteAuf] of [['zutaten/mag', '.magzeile'], ['rezepte/test-vorkochen/bearbeiten', '#f-einfrierbar'], ['zutaten/basis%3Aapfel', '#f-mag']]) {
    await seite.goto(`${URL_APP}#/${route}`);
    await seite.locator(warteAuf).first().waitFor();
    const b = await seite.evaluate(() => ({ inhalt: document.documentElement.scrollWidth, fenster: window.innerWidth }));
    mass.push(`${route} ${b.inhalt}/${b.fenster}`);
    if (b.inhalt > b.fenster) unsinn.push(`${route} zu breit`);
    if (/\b(null|undefined|NaN)\b/.test(await seite.locator('body').innerText())) unsinn.push(`${route}: null/undefined/NaN im Text`);
    const klein = await seite.evaluate(() => [...document.querySelectorAll('button, a, select, input:not([type=checkbox])')].filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().height)).filter((h) => h < 40).length);
    if (klein) unsinn.push(`${route}: ${klein} Tippflächen unter 40 px`);
  }
  pruefe('Mag-Liste und Vorkochen: Breite, Text und Tippflächen', unsinn.length === 0, unsinn.join(' | ') || mass.join(', '));
  pruefe('Vorkoch-Lauf ohne Konsolenfehler', fehler.length === 0, fehler.slice(0, 3).join(' | ') || '0 Fehler');
  await kontext.close();
}

async function healthLauf(browser) {
  // Alle Werte in diesem Lauf sind erfunden.
  // Aufbau seit Session 14: Eintragen auf „Heute“ (Tageswerte, Wasser, Supplements), Entwicklung unter „Fortschritt“.
  const { kontext, seite, fehler } = await neueSeite(browser);
  await seite.goto(`${URL_APP}#/fortschritt`, { waitUntil: 'networkidle' });
  const leer = await seite.locator('#gewicht-trend').innerText();
  pruefe('Fortschritt: ohne Daten ehrliche Auskunft statt Trend', leer.includes('je 3 Werte'), leer);

  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('#f-gewicht').waitFor();
  await seite.locator('#f-gewicht').fill('500');
  await seite.getByRole('button', { name: 'Tageswerte speichern' }).click();
  const grenze = await seite.locator('.tageswerte .fehlertext').first().innerText();
  await seite.locator('#f-gewicht').fill('80,4');
  await seite.locator('#f-schlaf').fill('7,5');
  await seite.locator('#f-schritte').fill('9000');
  await seite.getByRole('button', { name: 'Tageswerte speichern' }).click();
  await seite.locator('.hinweis', { hasText: 'Tageswerte gespeichert' }).waitFor();
  await seite.reload({ waitUntil: 'networkidle' });
  await seite.locator('#f-gewicht').waitFor();
  pruefe('Heute: Gewicht, Schlaf und Schritte speichern, Grenzen werden geprüft', (await seite.locator('#f-gewicht').inputValue()) === '80,4' && (await seite.locator('#f-schritte').inputValue()) === '9000' && grenze.includes('20 bis 400'),
    `„${grenze}“ bei 500 kg; gespeichert: ${await seite.locator('#f-gewicht').inputValue()} kg, ${await seite.locator('#f-schlaf').inputValue()} h, ${await seite.locator('#f-schritte').inputValue()} Schritte`);

  // Zwei Wochen erfundene Gewichte direkt in die Datenbank: Vorwoche 80,0, diese Woche 80,3
  await seite.evaluate(() => new Promise((ok, nein) => {
    const zwei = (n) => String(n).padStart(2, '0');
    const tag = (zurueck) => { const d = new Date(); d.setHours(12); d.setDate(d.getDate() - zurueck); return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`; };
    const a = indexedDB.open('elan');
    a.onsuccess = () => {
      const t = a.result.transaction('messungen', 'readwrite');
      for (let i = 0; i < 14; i += 1) t.objectStore('messungen').put({ id: `gewicht|${tag(i)}`, art: 'gewicht', datum: tag(i), wert: i < 7 ? 80.3 : 80.0 });
      t.oncomplete = () => { a.result.close(); ok(); };
      t.onerror = () => nein(t.error);
    };
  }));
  await seite.goto(`${URL_APP}#/fortschritt`);
  await seite.locator('.gewicht-karte .verlauf').waitFor();
  const halten = await seite.locator('#gewicht-trend').innerText();
  const karteVorher = await seite.locator('.gewicht-karte').evaluate((k) => `${k.querySelector('.gewicht-zahl').textContent}|${k.querySelector('.gewicht-aenderung')?.textContent}|${k.querySelector('.trend-pille')?.textContent}`);
  await seite.goto(`${URL_APP}#/mehr/koerper`);
  await seite.locator('#f-ziel-wochenzielKg').fill('0,25');
  await seite.locator('#f-wasser-menge-0').fill('330');
  await seite.getByRole('button', { name: 'Ziele speichern' }).click();
  await seite.locator('.hinweis', { hasText: 'Ziele gespeichert' }).waitFor();
  await seite.goto(`${URL_APP}#/fortschritt`);
  await seite.locator('.gewicht-karte .trend-pille').waitFor();
  const zunehmen = await seite.locator('#gewicht-trend').innerText();
  pruefe('Fortschritt: 7-Tage-Schnitt gegen das Wochenziel', halten.includes('80,3 kg') && halten.includes('+0,3 kg zur Vorwoche') && halten.includes('mehr als geplant') && zunehmen.includes('im Ziel'),
    `Ziel ±0: „${halten}“ | Ziel +0,25: „…${zunehmen.slice(-45)}“`);
  const pilleNachher = await seite.locator('.gewicht-karte .trend-pille').innerText();
  pruefe('Fortschritt: Gewichts-Karte mit großem Schnitt, Pfeil und Stand zum Ziel', karteVorher === '80,3 kg|↑ +0,3 kg|über Plan' && pilleNachher === 'im Ziel', `vorher ${karteVorher}, mit Ziel +0,25: ${pilleNachher}`);
  await bild(seite, '16-fortschritt');
  const rueckblick = (await seite.locator('.rueckblick').innerText()).replace(/\s+/g, ' ');
  pruefe('Fortschritt: Rückblick der letzten 7 Tage mit Schlaf und Schritten vom Tag', /Schlaf Ø 7,5 h/i.test(rueckblick) && /Schritte Ø 9\.000/i.test(rueckblick) && rueckblick.includes('keine Vorwoche'), rueckblick.slice(0, 160));

  // Wasser mit eigenen Knöpfen; Getipptes im Gewichtsfeld bleibt erhalten
  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('#f-gewicht').fill('81');
  const knoepfe = await seite.locator('.wasser-knoepfe .chip').allInnerTexts();
  const ring = await seite.locator('.kachel.makro-wasser .kachel-plus').innerText();
  await seite.getByRole('button', { name: '+ 330 ml' }).click();
  await seite.locator('#wasser-stand', { hasText: '330 von' }).waitFor();
  await seite.getByRole('button', { name: '+ 500 ml' }).click();
  await seite.locator('#wasser-stand', { hasText: '830 von' }).waitFor();
  const getippt = await seite.locator('#f-gewicht').inputValue();
  await seite.getByRole('button', { name: 'Letzten Schluck zurücknehmen' }).click();
  await seite.locator('#wasser-stand', { hasText: '330 von' }).waitFor();
  pruefe('Heute: eigene Wasser-Knöpfe, Ring nimmt die erste Menge, Getipptes bleibt', getippt === '81' && knoepfe.join() === '+ 330 ml,+ 500 ml,+ 750 ml' && ring === '+330',
    `Knöpfe ${knoepfe.join(' / ')}, Ring ${ring}; Gewichtsfeld behält „${getippt}“; ${await seite.locator('#wasser-stand').innerText()}`);

  await seite.locator('#f-supplement-name').fill('Testpulver');
  await seite.locator('#f-supplement-dosis').fill('5 g');
  await seite.locator('.zusatz').getByRole('button', { name: 'Dazu' }).click();
  await seite.locator('.haken', { hasText: 'Testpulver' }).waitFor();
  const blieb = await seite.locator('#f-gewicht').inputValue();
  await seite.locator('.supplemente .haken input').check();
  await seite.locator('#supplement-stand', { hasText: '1 von 1' }).waitFor();
  await seite.reload({ waitUntil: 'networkidle' });
  await seite.locator('.supplemente .haken').waitFor();
  const amTag = await seite.locator('.supplemente .haken.erledigt').count();
  await seite.getByRole('link', { name: 'Einen Tag zurück' }).click();
  await seite.locator('h1', { hasText: 'Gestern' }).waitFor();
  await seite.locator('.supplemente .haken').waitFor();
  pruefe('Heute: Supplement anlegen und je Tag abhaken', amTag === 1 && (await seite.locator('.supplemente .haken.erledigt').count()) === 0 && blieb === '81', 'heute abgehakt, gestern offen; Entwurf im Gewichtsfeld überlebt das Neuzeichnen');

  // Check-in: ein Tipp je Frage speichert sofort, ohne die Seite neu zu zeichnen; nochmal tippen nimmt zurück
  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('.checkin').waitFor();
  await seite.locator('#f-gewicht').fill('82');
  await seite.getByRole('button', { name: 'Energie 4 von 5' }).click();
  await seite.getByRole('button', { name: 'Stimmung 3 von 5' }).click();
  await seite.getByRole('button', { name: 'Stress 2 von 5' }).click();
  await seite.getByRole('button', { name: 'Stress 5 von 5' }).click();
  await seite.locator('.checkin [aria-pressed=true]', { hasText: '5' }).waitFor();
  const entwurfBleibt = await seite.locator('#f-gewicht').inputValue();
  await seite.locator('.checkin').scrollIntoViewIfNeeded();
  await bild(seite, '40-checkin', false);
  await seite.getByRole('button', { name: 'Stress 5 von 5' }).click();
  await seite.locator('.checkin .checkin-reihe').nth(2).locator('[aria-pressed=true]').waitFor({ state: 'detached' });
  await seite.reload({ waitUntil: 'networkidle' });
  await seite.locator('.checkin').waitFor();
  const gewaehlt = await seite.locator('.checkin [aria-pressed=true]').evaluateAll((k) => k.map((x) => x.getAttribute('aria-label')));
  await seite.goto(`${URL_APP}#/fortschritt`);
  await seite.locator('.rueckblick').waitFor();
  const rueckblickCheckin = (await seite.locator('.rueckblick').innerText()).replace(/\s+/g, ' ');
  pruefe('Heute: Check-in mit einem Tipp, zurücknehmbar; Rückblick zeigt den Schnitt',
    gewaehlt.join() === 'Energie 4 von 5,Stimmung 3 von 5' && entwurfBleibt === '82' && /Energie Ø 4 von 5/i.test(rueckblickCheckin) && /Kalorien Ø/i.test(rueckblickCheckin) && !/Stress Ø/i.test(rueckblickCheckin),
    `gespeichert: ${gewaehlt.join(' / ')}; Gewichtsfeld behält „${entwurfBleibt}“; Rückblick: ${rueckblickCheckin.match(/Energie Ø[^↑↓→]*/i)?.[0] ?? 'kein Energie-Wert'}`);

  // Schnell eintragen: Suchbegriff wird zum Namen, kcal aus Makros, Fehler am Feld, ändern und löschen
  await seite.goto(`${URL_APP}#/heute`);
  await seite.getByRole('button', { name: 'Zu Mittagessen hinzufügen' }).click();
  await seite.locator('dialog .suchfeld').fill('Mensa Pasta');
  await seite.locator('#nur-kcal').click();
  await seite.locator('#f-schnell-kcal').waitFor();
  const vorbelegtName = await seite.locator('#f-schnell-name').inputValue();
  await seite.locator('dialog').getByRole('button', { name: 'Eintragen' }).click();
  const leerFehler = await seite.locator('#f-schnell-kcal-fehler').innerText();
  await seite.locator('#f-schnell-protein').fill('30');
  await seite.locator('#f-schnell-kh').fill('80');
  await seite.locator('#f-schnell-fett').fill('15');
  const makroHinweis = `${await seite.locator('#f-schnell-kcal').getAttribute('placeholder')}|${await seite.locator('#f-schnell-kcal-fehler').innerText()}`;
  await bild(seite, '42-schnell', false);
  await seite.locator('dialog').getByRole('button', { name: 'Eintragen' }).click();
  await seite.locator('dialog').waitFor({ state: 'detached' }).catch(async (f) => { console.log('DIAGNOSE', (await seite.locator('dialog').innerText()).replace(/\s+/g, ' ')); throw f; });
  const schnellZeile = (await seite.locator('#slot-mittag .eintrag', { hasText: 'Mensa Pasta' }).innerText()).replace(/\s+/g, ' ');
  await seite.locator('#slot-mittag .eintrag', { hasText: 'Mensa Pasta' }).click();
  await seite.locator('#f-schnell-kcal').fill('600');
  await seite.locator('dialog').getByRole('button', { name: 'Speichern' }).click();
  await seite.locator('dialog').waitFor({ state: 'detached' });
  const geaendert = (await seite.locator('#slot-mittag .eintrag', { hasText: 'Mensa Pasta' }).innerText()).replace(/\s+/g, ' ');
  await seite.locator('#slot-mittag .eintrag', { hasText: 'Mensa Pasta' }).click();
  await seite.locator('dialog').getByRole('button', { name: 'Löschen' }).click();
  await seite.locator('dialog').waitFor({ state: 'detached' });
  const weg = await seite.locator('#slot-mittag .eintrag', { hasText: 'Mensa Pasta' }).count();
  pruefe('Schnell eintragen: nur Kalorien oder Makros, ändern und löschen',
    vorbelegtName === 'Mensa Pasta' && /Kalorien/.test(leerFehler) && makroHinweis === '575 aus Makros|' && /Portion/.test(schnellZeile) && /575 kcal/.test(schnellZeile) && /600 kcal/.test(geaendert) && weg === 0,
    `Name „${vorbelegtName}“; leer: „${leerFehler}“; mit Makros: „${makroHinweis}“; eingetragen „${schnellZeile}“; geändert „${geaendert}“; nach Löschen ${weg}`);

  // Unterwegs-Rechner: Gerichte anlegen, Bestellung zusammentippen, eintragen, Rückgängig; Liste aus Datei laden
  await seite.getByRole('button', { name: 'Zu Abendessen hinzufügen' }).click();
  await seite.locator('#unterwegs-oeffnen').click();
  // Mitgelieferte Ketten sind ohne Datei da; Frühstück (McMuffin) wird fürs Abendessen nicht vorgeschlagen
  await seite.getByRole('button', { name: "McDonald's" }).click();
  const kettenAnfang = await seite.locator('.unterwegs-restaurants .chip').allInnerTexts();
  await seite.locator('#f-unterwegs-budget').fill('600');
  await seite.locator('.vorschlag').first().waitFor();
  await seite.waitForTimeout(400);
  const mcdVorschlaege = (await seite.locator('#vorschlaege').innerText()).replace(/\s+/g, ' ');
  const getraenkChip = await seite.locator('.vorschlag').first().locator('.chip.getraenk').first().innerText();
  await bild(seite, '45-ketten', false);
  const gerichtAnlegen = async (restaurant, name, kcal, protein) => {
    await seite.locator('#gericht-neu').click();
    await seite.locator('#f-schnell-restaurant').fill(restaurant);
    await seite.locator('#f-schnell-name').fill(name);
    await seite.locator('#f-schnell-kcal').fill(kcal);
    if (protein) await seite.locator('#f-schnell-protein').fill(protein);
    await seite.locator('dialog').getByRole('button', { name: 'Anlegen' }).click();
    await seite.locator('#gericht-neu').waitFor();
  };
  await gerichtAnlegen('Testgrill', 'Testburger', '500', '25');
  await gerichtAnlegen('Testgrill', 'Pommes M', '330', '4');
  await gerichtAnlegen('Wrapladen', 'Wrap', '450', '');
  await gerichtAnlegen('Testgrill', 'Salat', '150', '8');
  // Vorschläge: Budget 700 kcal, meiste Eiweiß zuerst; „Übernehmen“ füllt die Bestellung
  await seite.getByRole('button', { name: 'Testgrill' }).click();
  await seite.locator('#f-unterwegs-budget').fill('700');
  await seite.getByRole('button', { name: 'Viel Eiweiß' }).click();
  // Das Budget wirkt erst kurz nach dem Tippen (Verzögerung, damit das Handy nicht bei jeder Ziffer rechnet)
  await seite.locator('.vorschlag', { hasText: '650 kcal' }).first().waitFor();
  const ersterVorschlag = (await seite.locator('.vorschlag').first().innerText()).replace(/\s+/g, ' ');
  await bild(seite, '44-vorschlaege', false);
  await seite.getByRole('button', { name: 'Mager' }).click();
  await seite.locator('#f-unterwegs-budget').fill('700');
  await seite.getByRole('button', { name: 'Viel Eiweiß' }).click();
  await seite.locator('.vorschlag', { hasText: '650 kcal' }).first().waitFor();
  await seite.locator('#vorschlag-0').click();
  await seite.locator('.unterwegs-zeile').first().waitFor();
  const uebernommen = (await seite.locator('#unterwegs-summe').innerText()).replace(/\s+/g, ' ');
  await seite.getByRole('button', { name: 'Salat weniger' }).click();
  await seite.getByRole('button', { name: 'Testburger dazu' }).click();
  await seite.getByRole('button', { name: 'Pommes M dazu' }).click();
  await seite.getByRole('button', { name: 'Wrapladen' }).click();
  await seite.getByRole('button', { name: 'Wrap dazu' }).click();
  await seite.getByRole('button', { name: 'Wrap weniger' }).click();
  await seite.getByRole('button', { name: 'Testgrill' }).click();
  const korbText = (await seite.locator('#unterwegs-summe').innerText()).replace(/\s+/g, ' ');

  const nochDa = await seite.locator('.unterwegs-zeile', { hasText: 'Testburger' }).locator('.zaehler-wert').innerText();
  await bild(seite, '43-unterwegs', false);
  await seite.locator('#unterwegs-eintragen').click();
  await seite.locator('dialog').waitFor({ state: 'detached' });
  const abend = (await seite.locator('#slot-abend .eintraege').innerText()).replace(/\s+/g, ' ');
  await seite.locator('.hinweis').getByRole('button', { name: 'Rückgängig' }).click();
  await seite.locator('#slot-abend .eintraege').waitFor({ state: 'detached' });
  // Liste aus Datei: Format aus docs/UNTERWEGS-FORMAT.md
  await seite.getByRole('button', { name: 'Zu Abendessen hinzufügen' }).click();
  await seite.locator('#unterwegs-oeffnen').click();
  await seite.locator('#f-unterwegs-datei').setInputFiles({ name: 'liste.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({
    format: 'elan-unterwegs', version: 1, quelle: 'Testdaten', stand: '2026-11-01',
    restaurants: [{ name: 'Dateigrill', gerichte: [{ name: 'Datei-Burger', kcal: 600, protein: 30 }, { name: 'Salat', kcal: 120 }, { name: 'kaputt' }] }],
  })) });
  const geladen = await seite.locator('.hinweis', { hasText: 'geladen' }).innerText();
  const chips = await seite.locator('.unterwegs-restaurants .chip').allInnerTexts();
  await seite.keyboard.press('Escape');
  await seite.locator('dialog').waitFor({ state: 'detached' });
  pruefe('Unterwegs: Vorschläge fürs Budget übernehmen, Bestellung eintragen, Liste aus Datei laden',
    /650 kcal E 33 g/.test(ersterVorschlag) && /Testburger/.test(ersterVorschlag) && /Salat/.test(ersterVorschlag) && /^650 kcal · 2 Gerichte · E 33 g/.test(uebernommen) &&
    kettenAnfang.join() === "Burger King,Coffee Fellows,dean&david,Hans im Glück,KFC,McDonald's,Peter Pane,Subway" && /kcal/.test(mcdVorschlaege) && !/McMuffin|Pancake/.test(mcdVorschlaege) && /Zero/.test(getraenkChip) && /1\.330 kcal · 3 Gerichte · E 54 g$/.test(korbText) && nochDa === '2'
      && /2× Testburger/.test(abend) && /Testgrill/.test(abend) && /Pommes M/.test(abend) && !/Wrap/.test(abend)
      && /2 Gerichte von 1 Restaurant geladen, Stand 01\.11\.2026; 1 ohne brauchbare Werte/.test(geladen) && chips.join() === "Burger King,Coffee Fellows,Dateigrill,dean&david,Hans im Glück,KFC,McDonald's,Peter Pane,Subway,Testgrill,Wrapladen",
    `Ketten ${kettenAnfang.join(', ')}; Getränk-Tipp „${getraenkChip}“; McDonald's 600 kcal: „${mcdVorschlaege.slice(0, 90)}…“; Vorschlag „${ersterVorschlag}“, übernommen „${uebernommen}“; Korb „${korbText}“ (Burger ${nochDa}); Abendessen „${abend.slice(0, 120)}“; Datei: „${geladen}“; Restaurants ${chips.join(', ')}`);

  // Meine Mahlzeiten: Frühstück merken, an einem anderen Tag mit einem Tipp eintragen, Rückgängig, vergessen
  const schnellIns = async (slotName, name, kcal) => {
    await seite.getByRole('button', { name: `Zu ${slotName} hinzufügen` }).click();
    await seite.locator('dialog .suchfeld').fill(name);
    await seite.locator('#nur-kcal').click();
    await seite.locator('#f-schnell-kcal').fill(kcal);
    await seite.locator('dialog').getByRole('button', { name: 'Eintragen' }).click();
    await seite.locator('dialog').waitFor({ state: 'detached' });
  };
  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('#slot-fruehstueck').waitFor();
  await schnellIns('Frühstück', 'Testmüsli', '400');
  await schnellIns('Frühstück', 'Testkaffee', '50');
  await seite.locator('#slot-fruehstueck .als-vorlage').click();
  const vorlageName = await seite.locator('#f-vorlage-name').inputValue();
  await seite.locator('dialog').getByRole('button', { name: 'Merken' }).click();
  await seite.locator('.hinweis', { hasText: 'gemerkt' }).waitFor();
  // aufräumen: die beiden Einträge von heute wieder löschen
  for (const name of ['Testmüsli', 'Testkaffee']) {
    await seite.locator('#slot-fruehstueck .eintrag', { hasText: name }).click();
    await seite.locator('dialog').getByRole('button', { name: 'Löschen' }).click();
    await seite.locator('dialog').waitFor({ state: 'detached' });
  }
  await seite.getByRole('link', { name: 'Einen Tag zurück' }).click();
  await seite.locator('h1', { hasText: 'Gestern' }).waitFor();
  await seite.getByRole('button', { name: 'Zu Morgensnack hinzufügen' }).click();
  const vorlageZeile = (await seite.locator('dialog .vorlagen li').first().innerText()).replace(/\s+/g, ' ');
  await bild(seite, '46-vorlagen', false);
  await seite.getByRole('button', { name: 'Mein Frühstück eintragen' }).click();
  await seite.locator('dialog').waitFor({ state: 'detached' });
  const eingetragen = (await seite.locator('#slot-morgensnack .eintraege').innerText()).replace(/\s+/g, ' ');
  await seite.locator('.hinweis').getByRole('button', { name: 'Rückgängig' }).click();
  await seite.locator('#slot-morgensnack .eintraege').waitFor({ state: 'detached' });
  await seite.getByRole('button', { name: 'Zu Morgensnack hinzufügen' }).click();
  await seite.getByRole('button', { name: 'Mein Frühstück vergessen' }).click();
  await seite.locator('dialog .vorlagen').waitFor({ state: 'detached' });
  await seite.keyboard.press('Escape');
  await seite.locator('dialog').waitFor({ state: 'detached' });
  pruefe('Meine Mahlzeiten: merken, an anderem Tag mit einem Tipp eintragen, Rückgängig, vergessen',
    vorlageName === 'Mein Frühstück' && /2 Teile, 450 kcal/.test(vorlageZeile) && /Testmüsli/.test(eingetragen) && /Testkaffee/.test(eingetragen),
    `Name „${vorlageName}“; im Blatt „${vorlageZeile}“; eingetragen „${eingetragen}“; danach zurückgenommen und vergessen`);

  // Unterwegs: Kette unter Mehr ausblenden, Gericht als Favorit markieren, Vorschläge nur aus Favoriten
  await seite.goto(`${URL_APP}#/mehr/unterwegs`);
  await seite.locator('label', { hasText: 'KFC' }).locator('input').uncheck();
  await seite.goto(`${URL_APP}#/mehr`);
  const menueUnterwegs = (await seite.locator('#menue-unterwegs').innerText()).replace(/\s+/g, ' ');
  await seite.goto(`${URL_APP}#/heute`);
  await seite.getByRole('button', { name: 'Zu Abendessen hinzufügen' }).click();
  await seite.locator('#unterwegs-oeffnen').click();
  await seite.locator('.unterwegs-restaurants .chip').first().waitFor();
  const ohneKfc = await seite.locator('.unterwegs-restaurants .chip').allInnerTexts();
  await seite.getByRole('button', { name: 'Selbst wählen' }).click();
  await seite.getByRole('button', { name: 'Testgrill' }).click();
  await seite.getByRole('button', { name: 'Salat als Favorit' }).click();
  await seite.keyboard.press('Escape');
  await seite.locator('dialog').waitFor({ state: 'detached' });
  await seite.getByRole('button', { name: 'Zu Abendessen hinzufügen' }).click();
  await seite.locator('#unterwegs-oeffnen').click();
  const ersteZeile = await seite.locator('.unterwegs-zeile .unterwegs-name span').first().innerText();
  await seite.getByRole('button', { name: 'Vorschläge' }).click();
  await seite.locator('#f-unterwegs-budget').fill('200');
  await seite.locator('#f-nur-favoriten').check();
  await seite.locator('.vorschlag', { hasText: 'Salat' }).first().waitFor();
  const nurFav = (await seite.locator('#vorschlaege').innerText()).replace(/\s+/g, ' ');
  await seite.locator('#f-nur-favoriten').uncheck();
  await seite.keyboard.press('Escape');
  await seite.locator('dialog').waitFor({ state: 'detached' });
  await seite.goto(`${URL_APP}#/mehr/unterwegs`);
  await seite.locator('label', { hasText: 'KFC' }).locator('input').check();
  pruefe('Unterwegs: Kette ausblenden, Favorit oben, Vorschläge nur aus Favoriten',
    !ohneKfc.includes('KFC') && ohneKfc.includes("McDonald's") && /von .* Restaurants/.test(menueUnterwegs) && ersteZeile === 'Salat' && /Salat/.test(nurFav) && !/Testburger|Pommes/.test(nurFav),
    `Menü „${menueUnterwegs}“; Restaurants ohne KFC: ${ohneKfc.join(', ')}; erste Zeile „${ersteZeile}“; nur Favoriten: „${nurFav.slice(0, 80)}“`);

  // Körpermaße: Kacheln wie beim Maßband, Eintragen im Blatt, eigenes Maß mit Namen
  await seite.goto(`${URL_APP}#/fortschritt`);
  await seite.locator('.mass-kachel').first().waitFor();
  const kacheln = await seite.locator('.mass-kachel').count();
  await seite.locator('#mass-taille').click();
  await seite.locator('#f-mass-wert').fill('84,5');
  await seite.locator('dialog').getByRole('button', { name: 'Speichern' }).click();
  await seite.locator('.hinweis', { hasText: 'Taille: 84,5 cm gespeichert' }).waitFor();
  await seite.locator('dialog').waitFor({ state: 'detached' });
  await seite.locator('#mass-eigen1').click();
  await seite.locator('#f-mass-name').fill('Unterbauch');
  await seite.locator('#f-mass-wert').fill('88');
  await seite.locator('dialog').getByRole('button', { name: 'Speichern' }).click();
  try {
    await seite.locator('.hinweis', { hasText: 'Unterbauch: 88 cm gespeichert' }).waitFor({ timeout: 5000 });
  } catch (fehlerBeimWarten) {
    const zustand = await seite.evaluate(() => ({
      dialoge: [...document.querySelectorAll('dialog')].map((d) => `${d.className}|offen=${d.open}|${d.querySelector('.blatt-titel')?.textContent}|fehler=${d.querySelector('.fehlertext')?.textContent}|name=${d.querySelector('#f-mass-name')?.value}|wert=${d.querySelector('#f-mass-wert')?.value}`),
      hinweis: document.getElementById('hinweis').textContent, adresse: location.hash,
      kachel: document.getElementById('mass-eigen1')?.textContent,
    }));
    // Unterscheidet „gespeichert, nur Hinweis verpasst“ von „Klick ging verloren, nichts gespeichert“
    zustand.gespeichert = await seite.evaluate(() => new Promise((ok) => {
      const r = indexedDB.open('elan');
      r.onsuccess = () => { const q = r.result.transaction('messungen').objectStore('messungen').getAll(); q.onsuccess = () => ok(q.result.filter((m) => m.art === 'mass:eigen1').map((m) => m.wert)); q.onerror = () => ok('Lesefehler'); };
      r.onerror = () => ok('DB nicht offen');
    }));
    console.log('DIAGNOSE', JSON.stringify(zustand));
    throw fehlerBeimWarten;
  }
  await seite.reload({ waitUntil: 'networkidle' });
  const taille = await seite.locator('#mass-taille').innerText();
  const eigen = await seite.locator('#mass-eigen1').innerText();
  await seite.getByRole('button', { name: 'Maße wählen' }).click();
  await seite.locator('#f-zeige-hals').uncheck();
  await seite.locator('dialog').getByRole('button', { name: 'Schließen' }).click();
  await seite.locator('dialog').waitFor({ state: 'detached' });
  await seite.locator('#mass-hals').waitFor({ state: 'detached' });
  const nachAuswahl = await seite.locator('section[aria-label="Körpermaße"] .mass-kachel').count();
  // Körperwerte (Ruhepuls, Körperfett, HRV, …) wachsen mit der App: zählen statt fest annehmen
  const koerperKacheln = await seite.locator('section[aria-label="Körperwerte"] .mass-kachel').count();
  pruefe('Fortschritt: Maße wählbar, ausgeblendete Kachel verschwindet', nachAuswahl === kacheln - koerperKacheln - 1, `${kacheln} Kacheln (davon ${koerperKacheln} Körperwerte), nach „Hals aus“: ${nachAuswahl}`);
  pruefe('Fortschritt: alle Körpermaße als Kacheln, Wert und eigener Name bleiben', kacheln >= 19 && taille.includes('84,5') && eigen.startsWith('Unterbauch') && eigen.includes('88'),
    `${kacheln} Kacheln; ${taille.replace(/\n/g, ' ')}; ${eigen.replace(/\n/g, ' ')}`);
  await bild(seite, '17-koerpermasse');

  const unsinn = [];
  for (const route of ['heute', 'fortschritt', 'mehr/koerper']) {
    await seite.goto(`${URL_APP}#/${route}`);
    await seite.locator('h1').first().waitFor();
    const b = await seite.evaluate(() => ({ inhalt: document.documentElement.scrollWidth, fenster: window.innerWidth }));
    if (b.inhalt > b.fenster) unsinn.push(`${route} zu breit`);
    if (/\b(null|undefined|NaN)\b/.test(await seite.locator('body').innerText())) unsinn.push(`${route}: null/undefined/NaN im Text`);
    const klein = await seite.evaluate(() => [...document.querySelectorAll('button, a, select, summary, input:not([type=checkbox])')].filter((e) => e.offsetParent).map((e) => ({ t: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 18), h: Math.round(e.getBoundingClientRect().height) })).filter((e) => e.h < 40));
    if (klein.length) unsinn.push(`${route}: Tippflächen unter 40 px: ${JSON.stringify(klein)}`);
  }
  const leiste = await seite.locator('.navigation a').allInnerTexts();
  pruefe('Heute, Fortschritt, Ziele: Breite, Text, Tippflächen; Leiste mit fünf Einträgen', unsinn.length === 0 && leiste.length === 5 && leiste.map((t) => t.trim()).includes('Fortschritt'), unsinn.join(' | ') || `Leiste: ${leiste.map((t) => t.trim()).join(', ')}`);
  pruefe('Health-Lauf ohne Konsolenfehler', fehler.length === 0, fehler.slice(0, 3).join(' | ') || '0 Fehler');
  await kontext.close();
}

async function befundLauf(browser) {
  // Alle Werte in diesem Lauf sind erfunden.
  const { kontext, seite, fehler } = await neueSeite(browser);
  await seite.goto(`${URL_APP}#/health`, { waitUntil: 'networkidle' }); // alte Adresse: muss zu Fortschritt weiterleiten
  await seite.locator('h1', { hasText: 'Fortschritt' }).waitFor();
  pruefe('Alte Adresse #/health führt zu Fortschritt', seite.url().endsWith('#/fortschritt'), seite.url().split('#')[1]);
  await seite.getByRole('link', { name: 'Laborwerte' }).click();
  await seite.locator('h1', { hasText: 'Laborwerte' }).waitFor();
  const leer = await seite.locator('.leer').innerText();

  const gestern = await seite.evaluate(() => { const d = new Date(); d.setHours(12); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  await seite.getByRole('button', { name: 'Wert eintragen' }).click();
  await seite.getByRole('button', { name: 'Laborwert speichern' }).click();
  const pflicht = await seite.locator('dialog .fehlertext').allInnerTexts();
  await seite.locator('#f-labor-name').fill('Testwert A');
  await seite.locator('#f-labor-wert').fill('6,1');
  await seite.locator('#f-labor-einheit').fill('mmol/l');
  await seite.locator('#f-labor-refMin').fill('3,5');
  await seite.locator('#f-labor-refMax').fill('5');
  await seite.locator('#f-labor-datum').fill(gestern);
  await seite.getByRole('button', { name: 'Laborwert speichern' }).click();
  await seite.locator('.laborgruppe').waitFor();
  const drueber = await seite.locator('.laborgruppe .merkzettel').innerText();
  pruefe('Laborwert mit Datum und Referenzbereich; außerhalb wird markiert', leer.includes('Noch kein') && pflicht.length === 2 && drueber === 'über dem Bereich 3,5 bis 5 mmol/l', `Pflichtfehler: ${pflicht.join(' | ')}; danach „${drueber}“`);

  await seite.getByRole('button', { name: 'Wert eintragen' }).click();
  await seite.locator('#f-labor-name').fill('testwert a');
  await seite.locator('#f-labor-name').blur();
  await seite.locator('#f-labor-einheit').waitFor();
  await seite.waitForFunction(() => document.getElementById('f-labor-einheit')?.value === 'mmol/l');
  const vorschlag = `${await seite.locator('#f-labor-name').inputValue()}, ${await seite.locator('#f-labor-refMin').inputValue()} bis ${await seite.locator('#f-labor-refMax').inputValue()} ${await seite.locator('#f-labor-einheit').inputValue()}`;
  await seite.locator('#f-labor-wert').fill('4,2');
  await seite.getByRole('button', { name: 'Laborwert speichern' }).click();
  await seite.locator('.laborgruppe details').waitFor();
  const neuester = (await seite.locator('.laborwert').innerText()).replace(/\s+/g, ' ');
  const status = await seite.locator('.laborgruppe > p.klein').innerText();
  pruefe('Zweiter Wert: Einheit und Bereich werden vorgeschlagen, Verlauf je Name', vorschlag === 'Testwert A, 3,5 bis 5 mmol/l' && neuester.startsWith('4,2 mmol/l') && status.startsWith('im Bereich') && (await seite.locator('.laborgruppe').count()) === 1,
    `Vorschlag: ${vorschlag}; neuester: ${neuester}, ${status}; ${await seite.locator('.laborgruppe summary').innerText()}`);
  await bild(seite, '17-labor');

  await seite.locator('.laborgruppe > .zeilen .rund').click();
  await seite.locator('.laborgruppe .merkzettel').waitFor();
  await seite.getByRole('button', { name: 'Rückgängig' }).click();
  await seite.locator('.laborgruppe details').waitFor();
  pruefe('Laborwert löschen und zurückholen', (await seite.locator('.laborwert').innerText()).startsWith('4,2'), 'nach Rückgängig wieder 2 Werte');

  /* Symptome */
  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('.slot').first().waitFor();
  await trageEin(seite, 'Frühstück', 'apfel', 150);
  await trageEin(seite, 'Mittagessen', 'reis', 200);
  await seite.goto(`${URL_APP}#/fortschritt/symptome`);
  await seite.locator('h1', { hasText: 'Symptome' }).waitFor();
  const trage = async (art, staerke, haken) => {
    await seite.getByRole('button', { name: 'Symptom eintragen' }).click();
    await seite.locator('#symptom-mahlzeiten .haken').first().waitFor();
    await seite.locator('#f-symptom-art').fill(art);
    await seite.locator('dialog .wahl-knopf', { hasText: String(staerke) }).click();
    for (const index of haken) await seite.locator('#symptom-mahlzeiten input').nth(index).check();
    await seite.getByRole('button', { name: 'Symptom speichern' }).click();
    await seite.locator('dialog').waitFor({ state: 'detached' });
  };
  await seite.getByRole('button', { name: 'Symptom eintragen' }).click();
  await seite.getByRole('button', { name: 'Symptom speichern' }).click();
  const artFehler = await seite.locator('dialog .fehlertext').first().innerText();
  await seite.locator('dialog').getByRole('button', { name: 'Schließen' }).click();
  await trage('Testsymptom', 4, [0, 1]);
  await trage('Testsymptom', 2, [0]);
  const zeilen = await seite.locator('.seite > .zeilen .zeile-name').allInnerTexts();
  pruefe('Symptom mit Stärke, Uhrzeit und Zuordnung zu Mahlzeiten', zeilen.length === 2 && zeilen.some((t) => t.includes('Stärke 4') && t.includes('Davor: ') && t.includes('Uhr')), `„${artFehler}“ ohne Angabe; gespeichert: ${zeilen.map((t) => t.replace(/\n/g, ' | ')).join(' ; ')}`);
  const tabelle = (await seite.locator('#vor-symptomen').innerText()).replace(/\s+/g, ' ');
  pruefe('Übersicht: was öfter vor Symptomen gegessen wurde', (await seite.locator('#vor-symptomen tr').count()) === 1 && tabelle.includes('bei 2 von 2 Symptomen'), tabelle);
  await bild(seite, '18-symptome');
  await seite.reload({ waitUntil: 'networkidle' });
  await seite.locator('.seite > .zeilen .zeile').first().waitFor();

  const unsinn = [];
  const mass = [];
  for (const [route, warteAuf] of [['fortschritt/labor', '.laborgruppe'], ['fortschritt/symptome', '#vor-symptomen']]) {
    await seite.goto(`${URL_APP}#/${route}`);
    await seite.locator(warteAuf).first().waitFor();
    const b = await seite.evaluate(() => ({ inhalt: document.documentElement.scrollWidth, fenster: window.innerWidth }));
    mass.push(`${route} ${b.inhalt}/${b.fenster}`);
    if (b.inhalt > b.fenster) unsinn.push(`${route} zu breit`);
    if (/\b(null|undefined|NaN)\b/.test(await seite.locator('body').innerText())) unsinn.push(`${route}: null/undefined/NaN im Text`);
    const klein = await seite.evaluate(() => [...document.querySelectorAll('button, a, select, summary, input:not([type=checkbox])')].filter((e) => e.offsetParent).map((e) => ({ t: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 18), h: Math.round(e.getBoundingClientRect().height) })).filter((e) => e.h < 40));
    if (klein.length) unsinn.push(`${route}: Tippflächen unter 40 px ${JSON.stringify(klein)}`);
  }
  pruefe('Labor und Symptome: Daten bleiben nach Neuladen; Breite, Text, Tippflächen', unsinn.length === 0, unsinn.join(' | ') || mass.join(', '));
  pruefe('Befund-Lauf ohne Konsolenfehler', fehler.length === 0, fehler.slice(0, 3).join(' | ') || '0 Fehler');
  await kontext.close();
}

async function importLauf(browser) {
  const { kontext, seite, fehler } = await neueSeite(browser, { permissions: ['clipboard-read', 'clipboard-write'] });
  const beispiel = (name) => fs.readFileSync(path.resolve(__dirname, '..', 'test', 'daten', name), 'utf8');
  await seite.goto(`${URL_APP}#/rezepte`, { waitUntil: 'networkidle' });
  await seite.getByRole('link', { name: 'Rezept importieren' }).click();
  await seite.locator('#f-import-text').waitFor();
  await seite.getByRole('button', { name: 'Rezept erkennen' }).click();
  const leerMeldung = await seite.locator('#import-ergebnis').innerText();
  await seite.locator('#f-import-text').fill('https://example.org/rezept/123');
  await seite.getByRole('button', { name: 'Rezept erkennen' }).click();
  const nurAdresse = await seite.locator('#import-ergebnis').innerText();
  pruefe('Import: leeres Feld und bloße Adresse werden erklärt, nichts wird abgerufen', leerMeldung.includes('Füge zuerst') && nurAdresse.includes('ruft keine fremden Seiten ab'), `„${leerMeldung}“ | „${nurAdresse.slice(0, 60)}…“`);

  await seite.locator('#f-import-text').fill(beispiel('rezept-text.txt'));
  await seite.getByRole('button', { name: 'Rezept erkennen' }).click();
  await seite.locator('#import-ergebnis h2').waitFor();
  const zeilen = await seite.locator('#import-ergebnis .zeile').evaluateAll((z) => z.map((x) => x.innerText.replace(/\n+/g, ' → ')));
  const kopfzeile = await seite.locator('#import-ergebnis .klein').first().innerText();
  pruefe('Import aus Text: Name, Portionen, Zutaten zugeordnet, Unsicheres markiert', (await seite.locator('#import-ergebnis h2').innerText()) === 'Linsen-Eintopf' && zeilen.length === 7 && kopfzeile.includes('4 Portionen') && kopfzeile.includes('3 Schritte') && zeilen.some((z) => z.includes('geschätzt')) && zeilen.some((z) => z.includes('nicht gefunden')),
    `${kopfzeile} Beispiele: ${zeilen.slice(0, 2).join(' ; ')} ; ${zeilen.find((z) => z.includes('nicht gefunden'))}`);
  await bild(seite, '19-import');

  await seite.getByRole('button', { name: 'Ins Rezeptformular übernehmen' }).click();
  await seite.locator('#f-schritt-2').waitFor();
  const uebernommen = { name: await seite.locator('#f-name').inputValue(), portionen: await seite.locator('#f-portionen').inputValue(), zutaten: await seite.locator('.rezeptzeile').count(), schritt: await seite.locator('#f-schritt-0').inputValue() };
  // Mengen, die der Import nicht kennt, trägt der Nutzer im Formular nach
  for (const feld of await seite.locator('.gramm-eingabe').all()) if (!(await feld.inputValue())) await feld.fill('50');
  await seite.getByRole('button', { name: 'Rezept speichern' }).click();
  await seite.locator('.schritte').waitFor();
  pruefe('Import landet als Entwurf im Rezeptformular und lässt sich speichern', uebernommen.name === 'Linsen-Eintopf' && uebernommen.portionen === '4' && uebernommen.zutaten >= 3 && (await seite.locator('.schritte > li').count()) === 3,
    `Formular: ${uebernommen.name}, ${uebernommen.portionen} Portionen, ${uebernommen.zutaten} Zutaten, erster Schritt „${uebernommen.schritt.slice(0, 40)}…“; gespeichert mit 3 Schritten`);

  await seite.goto(`${URL_APP}#/rezepte/import`);
  await seite.locator('#f-import-text').fill(beispiel('rezept-schema.html'));
  await seite.getByRole('button', { name: 'Rezept erkennen' }).click();
  await seite.locator('#import-ergebnis h2').waitFor();
  const schema = await seite.locator('#import-ergebnis .klein').first().innerText();
  pruefe('Import aus Schema.org-Daten eines eingefügten Seitenquelltexts', (await seite.locator('#import-ergebnis h2').innerText()) === 'Haferbrei mit Apfel & Zimt' && schema.includes('Rezeptdaten der Seite') && schema.includes('2 Portionen'), schema);

  // Android "Teilen": Die App wird mit Parametern geöffnet
  const geteilt = `${URL_APP}?titel=${encodeURIComponent('Schnelles Müsli')}&text=${encodeURIComponent('80 g Haferflocken\n1 Banane\n200 ml Milch\nAlles in eine Schale geben und fünf Minuten quellen lassen.')}`;
  await seite.goto(geteilt, { waitUntil: 'networkidle' });
  await seite.locator('#import-ergebnis h2').waitFor();
  const adresse = await seite.evaluate(() => `${location.search}|${location.hash}`);
  const manifest = await seite.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
  pruefe('Share Target: geteilter Text öffnet den Import und wird sofort erkannt', adresse === '|#/rezepte/import' && (await seite.locator('#import-ergebnis h2').innerText()) === 'Schnelles Müsli' && manifest.share_target?.params?.text === 'text',
    `Adresse aufgeräumt („${adresse}“), erkannt: ${await seite.locator('#import-ergebnis h2').innerText()}, ${await seite.locator('#import-ergebnis .klein').first().innerText()}`);

  /* Coach-Export */
  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('.slot').first().waitFor();
  await trageEin(seite, 'Frühstück', 'haferflocken', 80);
  await trageEin(seite, 'Mittagessen', 'reis', 200);
  await seite.goto(`${URL_APP}#/mehr/coach`);
  await seite.getByRole('button', { name: 'Bericht erstellen' }).click();
  await seite.locator('#f-coach-text').waitFor();
  const bericht = await seite.locator('#f-coach-text').inputValue();
  await seite.getByRole('button', { name: 'Bericht kopieren' }).click();
  await seite.locator('.hinweis', { hasText: 'Bericht kopiert' }).waitFor();
  const kopie = await seite.evaluate(() => navigator.clipboard.readText());
  await seite.getByRole('button', { name: 'Letzte Woche' }).click();
  await seite.waitForFunction((alt) => document.getElementById('f-coach-text').value !== alt, bericht);
  const letzte = await seite.locator('#f-coach-text').inputValue();
  pruefe('Coach-Export: Wochenbericht als Text, kopierbar, Woche wählbar', bericht.startsWith('Wochenbericht ') && bericht.includes('ERNÄHRUNG') && bericht.includes('Schnitt je Tag aus 1 Tag') && kopie === bericht && letzte.includes('Keine Einträge in dieser Woche'),
    `${bericht.split('\n').length} Zeilen, z. B. „${bericht.split('\n').find((z) => z.startsWith('- Energie'))}“; letzte Woche: „Keine Einträge …“`);
  await bild(seite, '20-coach');

  const unsinn = [];
  for (const [route, warteAuf] of [['rezepte/import', '#f-import-text'], ['mehr', '.menuepunkt']]) {
    await seite.goto(`${URL_APP}#/${route}`);
    await seite.locator(warteAuf).first().waitFor();
    const b = await seite.evaluate(() => ({ inhalt: document.documentElement.scrollWidth, fenster: window.innerWidth }));
    if (b.inhalt > b.fenster) unsinn.push(`${route} zu breit (${b.inhalt})`);
    if (/\b(null|undefined|NaN)\b/.test(await seite.locator('body').innerText())) unsinn.push(`${route}: null/undefined/NaN im Text`);
    const klein = await seite.evaluate(() => [...document.querySelectorAll('button, a, select, summary, textarea, input:not([type=checkbox]):not([type=file])')].filter((e) => e.offsetParent).map((e) => ({ t: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 18), h: Math.round(e.getBoundingClientRect().height) })).filter((e) => e.h < 40));
    if (klein.length) unsinn.push(`${route}: Tippflächen unter 40 px ${JSON.stringify(klein)}`);
  }
  pruefe('Import und Mehr: Breite, Text, Tippflächen', unsinn.length === 0, unsinn.join(' | ') || 'beide Seiten in Ordnung');
  pruefe('Import-Lauf ohne Konsolenfehler', fehler.length === 0, fehler.slice(0, 3).join(' | ') || '0 Fehler');
  await kontext.close();
}

async function angebotLauf(browser) {
  const { kontext, seite, fehler } = await neueSeite(browser);
  const tag = (versatz) => seite.evaluate((v) => { const d = new Date(); d.setHours(12); d.setDate(d.getDate() + v); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }, versatz);
  await seite.goto(`${URL_APP}#/zutaten/basis%3Aapfel`, { waitUntil: 'networkidle' });
  await seite.locator('.angebot-bereich').waitFor();
  const leer = await seite.locator('.angebot-bereich p.klein').innerText();
  await seite.getByRole('button', { name: 'Angebot eintragen' }).click();
  await seite.getByRole('button', { name: 'Angebot speichern' }).click();
  const pflicht = await seite.locator('dialog .fehlertext').allInnerTexts();
  await seite.locator('#f-angebot-markt').fill('Testmarkt');
  await seite.locator('#f-angebot-preis').fill('1,99');
  await seite.locator('#f-angebot-menge').fill('1 kg');
  await seite.locator('#f-angebot-gueltigBis').fill(await tag(3));
  await seite.getByRole('button', { name: 'Angebot speichern' }).click();
  await seite.locator('.angebot-bereich .zeile').waitFor();
  const zeile = (await seite.locator('.angebot-bereich .zeile-name').innerText()).replace(/\n/g, ' | ');
  pruefe('Angebot an einer Zutat eintragen', leer.includes('Kein aktuelles') && pflicht.length === 2 && zeile.startsWith('Testmarkt | 1,99 € für 1 kg, bis '), `Pflichtfehler: ${pflicht.join(' | ')}; gespeichert: ${zeile}`);

  // Ein günstigeres und ein abgelaufenes Angebot direkt in die Datenbank
  const gestern = await tag(-1);
  await seite.evaluate((abgelaufenBis) => new Promise((ok, nein) => {
    const a = indexedDB.open('elan');
    a.onsuccess = () => {
      const t = a.result.transaction('angebote', 'readwrite');
      t.objectStore('angebote').put({ id: 'test-guenstig', zutatId: 'basis:apfel', zutatName: 'Apfel', markt: 'Günstigmarkt', preis: 1.49, quelle: 'hand' });
      t.objectStore('angebote').put({ id: 'test-alt', zutatId: 'basis:apfel', zutatName: 'Apfel', markt: 'Altmarkt', preis: 0.5, gueltigBis: abgelaufenBis, quelle: 'hand' });
      t.oncomplete = () => { a.result.close(); ok(); };
      t.onerror = () => nein(t.error);
    };
  }), gestern);
  await seite.reload({ waitUntil: 'networkidle' });
  await seite.locator('.angebot-bereich .zeile').first().waitFor();
  const maerkte = await seite.locator('.angebot-bereich .zeile-name').evaluateAll((z) => z.map((x) => x.firstChild.textContent));
  pruefe('Abgelaufene Angebote verschwinden, das günstigste steht oben', maerkte.join() === 'Günstigmarkt,Testmarkt', `bei der Zutat: ${maerkte.join(', ')} (Altmarkt mit 0,50 € bis gestern fehlt)`);

  await seite.goto(`${URL_APP}#/woche`);
  await seite.locator('.plantag.heute .plus').click();
  await seite.locator('dialog input[type=search]').fill('apfel');
  await seite.locator('dialog .zeilen .zeile', { hasText: /^Apfel/ }).first().click();
  await seite.locator('#f-gramm').fill('340');
  await seite.getByRole('button', { name: 'Einplanen', exact: true }).click();
  await seite.locator('dialog').waitFor({ state: 'detached' });
  await seite.getByRole('link', { name: 'Einkaufsliste' }).click();
  await seite.locator('.haken').first().waitFor();
  const posten = (await seite.locator('.haken').first().innerText()).replace(/\n+/g, ' | ');
  pruefe('Einkaufsliste zeigt das günstigste aktuelle Angebot', posten.includes('Angebot Günstigmarkt: 1,49 €'), posten);
  await bild(seite, '21-einkauf-angebot');

  await seite.goto(`${URL_APP}#/woche`);
  await seite.getByRole('link', { name: 'Angebote' }).click();
  await seite.locator('h1', { hasText: 'Angebote' }).waitFor();
  const gruppen = await seite.locator('.seite > h2').allInnerTexts();
  await seite.locator('#angebote-abgelaufen summary').click();
  await seite.getByRole('button', { name: 'Abgelaufene löschen' }).click();
  await seite.locator('.hinweis', { hasText: 'abgelaufene gelöscht' }).waitFor();
  await seite.locator('#angebote-abgelaufen').waitFor({ state: 'detached' });
  pruefe('Übersicht nach Markt, Abgelaufene lassen sich aufräumen', gruppen.join() === 'Günstigmarkt,Testmarkt', `Märkte: ${gruppen.join(', ')}; 1 abgelaufenes gelöscht`);

  const datei = path.resolve(__dirname, '..', 'test', 'daten', 'angebote-beispiel.json');
  await seite.locator('#f-angebote-datei').setInputFiles(datei);
  await seite.locator('.hinweis', { hasText: 'eingelesen' }).waitFor();
  const meldung = await seite.locator('.hinweis span').innerText();
  await seite.locator('.seite > h2', { hasText: 'Testmarkt Nord' }).waitFor();
  await seite.locator('#f-angebote-datei').setInputFiles(datei);
  await seite.locator('.hinweis', { hasText: 'eingelesen' }).waitFor();
  await seite.waitForTimeout(300);
  const anzahl = await seite.locator('.seite > .zeilen .zeile').count();
  pruefe('Angebotsdatei einlesen: zugeordnet, Unbekanntes genannt, erneutes Einlesen ersetzt', meldung.startsWith('2 Angebote eingelesen. Nicht zugeordnet: Einhornfilet. 2 Zeilen ungültig.') && anzahl === 4, `„${meldung}“; nach zweimaligem Einlesen ${anzahl} aktuelle Angebote (2 von Hand, 2 aus der Datei)`);
  await bild(seite, '22-angebote');

  const unsinn = [];
  for (const [route, warteAuf] of [['angebote', '#f-angebote-datei'], ['zutaten/basis%3Aapfel', '.angebot-bereich']]) {
    await seite.goto(`${URL_APP}#/${route}`);
    await seite.locator(warteAuf).first().waitFor({ state: 'attached' });
    await seite.locator('h1').waitFor();
    const b = await seite.evaluate(() => ({ inhalt: document.documentElement.scrollWidth, fenster: window.innerWidth }));
    if (b.inhalt > b.fenster) unsinn.push(`${route} zu breit (${b.inhalt})`);
    if (/\b(null|undefined|NaN)\b/.test(await seite.locator('body').innerText())) unsinn.push(`${route}: null/undefined/NaN im Text`);
    const klein = await seite.evaluate(() => [...document.querySelectorAll('button, a, select, summary, label.knopf, input:not([type=checkbox]):not([type=file])')].filter((e) => e.offsetParent).map((e) => ({ t: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 18), h: Math.round(e.getBoundingClientRect().height) })).filter((e) => e.h < 40));
    if (klein.length) unsinn.push(`${route}: Tippflächen unter 40 px ${JSON.stringify(klein)}`);
  }
  pruefe('Angebote: Breite, Text, Tippflächen', unsinn.length === 0, unsinn.join(' | ') || 'beide Seiten in Ordnung');
  pruefe('Angebots-Lauf ohne Konsolenfehler', fehler.length === 0, fehler.slice(0, 3).join(' | ') || '0 Fehler');
  await kontext.close();
}

async function feinschliffLauf(browser) {
  // Alle Werte in diesem Lauf sind erfunden.
  const { kontext, seite, fehler } = await neueSeite(browser);
  await seite.goto(URL_APP, { waitUntil: 'networkidle' });
  await seite.locator('.slot').first().waitFor();
  const schreibe = (saetze) => seite.evaluate((liste) => new Promise((ok, nein) => {
    const zwei = (n) => String(n).padStart(2, '0');
    const tag = (zurueck) => { const d = new Date(); d.setHours(12); d.setDate(d.getDate() - zurueck); return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`; };
    const a = indexedDB.open('elan');
    a.onsuccess = () => {
      const t = a.result.transaction([...new Set(liste.map((x) => x.store))], 'readwrite');
      for (const { store, satz, vorTagen, feld = 'datum' } of liste) t.objectStore(store).put(vorTagen === undefined ? satz : { ...satz, [feld]: tag(vorTagen) });
      t.oncomplete = () => { a.result.close(); ok(); };
      t.onerror = () => nein(t.error);
    };
  }), saetze);
  const eintrag = (n) => ({ store: 'eintraege', vorTagen: 0, satz: { id: `t${n}`, slot: 'mittag', zutatId: 'basis:apfel', name: 'Apfel', marke: '', gramm: 100, je100: { kcal: 52, protein: 0.3 }, erstellt: `2026-01-01T0${n}:00:00Z` } });
  const messung = (art, vorTagen, wert, zusatz = '') => ({ store: 'messungen', vorTagen, satz: { id: `${art}|${vorTagen}${zusatz}`, art, wert } });

  await schreibe([1, 2, 3, 4].map(eintrag));
  await seite.reload({ waitUntil: 'networkidle' });
  await seite.locator('.eintrag').first().waitFor();
  const beiVier = await seite.locator('.backup-erinnerung').count();
  await schreibe([eintrag(5)]);
  await seite.reload({ waitUntil: 'networkidle' });
  await seite.locator('.backup-erinnerung').waitFor();
  const ohneBackup = await seite.locator('.backup-erinnerung p').innerText();
  await schreibe([{ store: 'einstellungen', vorTagen: 20, feld: 'wert', satz: { schluessel: 'letztesBackup' } }]);
  await seite.reload({ waitUntil: 'networkidle' });
  await seite.locator('.backup-erinnerung').waitFor();
  const altesBackup = await seite.locator('.backup-erinnerung p').innerText();
  await schreibe([{ store: 'einstellungen', vorTagen: 0, feld: 'wert', satz: { schluessel: 'letztesBackup' } }]);
  await seite.reload({ waitUntil: 'networkidle' });
  await seite.locator('.eintrag').first().waitFor();
  pruefe('Backup-Erinnerung: erst ab fünf Einträgen, ohne Backup oder nach 14 Tagen, sonst still', beiVier === 0 && ohneBackup.includes('noch kein Backup') && altesBackup === 'Dein letztes Backup ist 20 Tage her.' && (await seite.locator('.backup-erinnerung').count()) === 0,
    `4 Einträge: nichts; 5 Einträge: „${ohneBackup}“; danach „${altesBackup}“; frisches Backup: nichts`);

  await schreibe([
    messung('schlaf', 2, 7), messung('schlaf', 1, 6.5), messung('schlaf', 0, 8),
    messung('wasser', 1, 500, 'a'), messung('wasser', 1, 750, 'b'), messung('wasser', 0, 2000),
    messung('mass:taille', 60, 86), messung('mass:taille', 0, 84.5),
    messung('schritte', 0, 9000),
  ]);
  await seite.goto(`${URL_APP}#/fortschritt`);
  await seite.locator('#verlaeufe .verlauf').first().waitFor();
  const linien = await seite.locator('#verlaeufe figcaption').allInnerTexts();
  pruefe('Verläufe für Wasser, Schlaf und Maße; ein einzelner Wert ergibt keine Linie', linien.length === 3 && linien.some((t) => t.startsWith('Wasser') && t.includes('von 1.250 bis 2.000 ml')) && linien.some((t) => t.startsWith('Taille') && t.includes('180 Tagen')) && !linien.some((t) => t.startsWith('Schritte')),
    linien.join(' | '));
  await bild(seite, '23-verlaeufe');

  await schreibe([{ store: 'rezepte', satz: { id: 'test-kopie', name: 'Testsuppe', portionen: 2, zutaten: [{ zutatId: 'basis:apfel', name: 'Apfel', marke: '', gramm: 300, je100: { kcal: 52 } }], schritte: [{ text: 'Erster Schritt.' }, { text: 'Zweiter Schritt.', prinzip: 'Erfundenes Prinzip.' }] } }]);
  await seite.goto(`${URL_APP}#/rezepte/test-kopie`);
  await seite.getByRole('button', { name: 'Kopieren' }).click();
  await seite.locator('#f-schritt-1').waitFor();
  const kopieName = await seite.locator('#f-name').inputValue();
  await seite.getByRole('button', { name: 'Schritt 2 nach oben' }).click();
  const getauscht = `${await seite.locator('#f-schritt-0').inputValue()} / ${await seite.locator('#f-prinzip-0').inputValue()} / ${await seite.locator('#f-schritt-1').inputValue()}`;
  await seite.getByRole('button', { name: 'Rezept speichern' }).click();
  await seite.locator('.schritte').waitFor();
  await seite.goto(`${URL_APP}#/rezepte`);
  await seite.locator('.zeilen a.zeile').first().waitFor();
  const namen = await seite.locator('.zeilen .zeile-name').evaluateAll((z) => z.map((x) => x.firstChild.textContent));
  pruefe('Rezept kopieren und Schritte umsortieren', kopieName === 'Testsuppe (Kopie)' && getauscht === 'Zweiter Schritt. / Erfundenes Prinzip. / Erster Schritt.' && namen.join() === 'Testsuppe,Testsuppe (Kopie)',
    `Formular: ${kopieName}; nach „nach oben“: ${getauscht}; Liste: ${namen.join(', ')}`);

  const unsinn = [];
  await schreibe([{ store: 'einstellungen', vorTagen: 20, feld: 'wert', satz: { schluessel: 'letztesBackup' } }]);
  for (const [route, warteAuf, oeffne] of [['heute', '.backup-erinnerung', null], ['fortschritt', '#verlaeufe', null], ['rezepte/test-kopie/bearbeiten', '#f-schritt-1', null]]) {
    await seite.goto(`${URL_APP}#/${route}`);
    await seite.locator(warteAuf).first().waitFor();
    if (oeffne && !(await seite.locator('#verlaeufe').getAttribute('open'))) await seite.locator(oeffne).click();
    const b = await seite.evaluate(() => ({ inhalt: document.documentElement.scrollWidth, fenster: window.innerWidth }));
    if (b.inhalt > b.fenster) unsinn.push(`${route} zu breit (${b.inhalt})`);
    if (/\b(null|undefined|NaN)\b/.test(await seite.locator('body').innerText())) unsinn.push(`${route}: null/undefined/NaN im Text`);
    const klein = await seite.evaluate(() => [...document.querySelectorAll('button, a, select, summary, textarea, input:not([type=checkbox]):not([type=file])')].filter((e) => e.offsetParent && !e.closest('svg')).map((e) => ({ t: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 22), h: Math.round(e.getBoundingClientRect().height) })).filter((e) => e.h < 40));
    if (klein.length) unsinn.push(`${route}: Tippflächen unter 40 px ${JSON.stringify(klein)}`);
  }
  pruefe('Feinschliff: Breite, Text, Tippflächen', unsinn.length === 0, unsinn.join(' | ') || 'drei Seiten in Ordnung');
  pruefe('Feinschliff-Lauf ohne Konsolenfehler', fehler.length === 0, fehler.slice(0, 3).join(' | ') || '0 Fehler');
  await kontext.close();
}

async function appLauf(browser) {
  // Bildet die Android-App nach: window.Capacitor mit isNativePlatform() und nativePromise(), das jeden Aufruf mitschreibt.
  const { kontext, seite, fehler, fremd } = await neueSeite(browser);
  await kontext.addInitScript((offAntwort) => {
    window.__aufrufe = [];
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => 'android',
      nativePromise: async (plugin, methode, optionen) => {
        window.__aufrufe.push({ plugin, methode, optionen });
        if (plugin === 'Filesystem' && methode === 'writeFile') return { uri: `file:///data/cache/${optionen.path}` };
        if (plugin === 'CapacitorHttp') return { status: 200, data: offAntwort, headers: {} };
        // Health Connect mit erfundenen Werten: heute 6.543 Schritte, 79,9 kg, letzte Nacht 7,5 h Schlaf
        if (plugin === 'Health') {
          const heute = (stunde, minute = 0) => { const d = new Date(); d.setHours(stunde, minute, 0, 0); return d.toISOString(); };
          const gestern = (stunde) => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(stunde, 0, 0, 0); return d.toISOString(); };
          if (methode === 'isAvailable') return { available: true, platform: 'android' };
          if (methode === 'checkAuthorization') return { readAuthorized: window.__hcErlaubt ?? [] };
          if (methode === 'requestAuthorization') { window.__hcErlaubt = optionen.read; return { readAuthorized: optionen.read }; }
          if (methode === 'queryAggregated') return { samples: [{ startDate: heute(0), endDate: heute(23), value: 6543, unit: 'count' }] };
          if (methode === 'readSamples' && optionen.dataType === 'weight') return { samples: [{ startDate: heute(7), endDate: heute(7), value: 79.9, unit: 'kilogram' }] };
          if (methode === 'readSamples' && optionen.dataType === 'sleep') return { samples: [{ startDate: gestern(23), endDate: heute(6, 30), value: 450, unit: 'minute', sleepState: 'light' }] };
          if (methode === 'readSamples' && optionen.dataType === 'restingHeartRate') return { samples: [{ startDate: heute(6), endDate: heute(6), value: 61, unit: 'bpm' }] };
          if (methode === 'readSamples' && optionen.dataType === 'bodyFat') return { samples: [{ startDate: heute(7), endDate: heute(7), value: 17.8, unit: 'percent' }] };
          if (methode === 'readSamples' && optionen.dataType === 'heartRateVariability') return { samples: [{ startDate: heute(3), endDate: heute(3), value: 44, unit: 'millisecond' }, { startDate: heute(5), endDate: heute(5), value: 52, unit: 'millisecond' }] };
          if (methode === 'queryWorkouts') return { workouts: [{ workoutType: 'strengthTraining', duration: 3600, startDate: heute(10), endDate: heute(11) }] };
        }
        // Benachrichtigungen: Erlaubnis zuerst offen; __verweigern spielt „Nicht zulassen“ nach
        if (plugin === 'LocalNotifications') {
          if (methode === 'checkPermissions') return { display: window.__benachrichtigung ?? 'prompt' };
          if (methode === 'requestPermissions') { window.__benachrichtigung = window.__verweigern ? 'denied' : 'granted'; return { display: window.__benachrichtigung }; }
          if (methode === 'schedule') return { notifications: optionen.notifications.map((n) => ({ id: n.id })) };
        }
        return {};
      },
    };
    // Capacitor setzt diese Werte, sobald die Seite steht; vorher gibt es noch kein <html>
    document.addEventListener('readystatechange', () => {
      document.documentElement.style.setProperty('--safe-area-inset-top', '32px');
      document.documentElement.style.setProperty('--safe-area-inset-bottom', '24px');
    }, { once: true });
  }, JSON.parse(OFF_BEISPIEL));
  await seite.goto(`${URL_APP}#/mehr/backup`, { waitUntil: 'networkidle' });
  await seite.getByRole('button', { name: 'Backup speichern' }).waitFor();
  const texte = await seite.locator('.seite').innerText();
  pruefe('App: Texte passen zur App, „Speicher schützen“ entfällt', texte.includes('Deine Daten liegen nur in dieser App') && !texte.includes('Speicher schützen'), 'Backup-Text für die App, Abschnitt „Speicher“ ausgeblendet');

  const leisten = await seite.evaluate(() => window.__aufrufe.filter((a) => a.plugin === 'SystemBars').map((a) => a.optionen.style));
  pruefe('App: Symbole der Systemleisten hell auf dunklem Blatt', leisten.length > 0 && leisten.every((s) => s === 'DARK'), `SystemBars.setStyle: ${leisten.join(', ') || 'kein Aufruf'}`);
  await seite.evaluate(() => { window.__aufrufe = []; });
  await seite.getByRole('button', { name: 'Backup speichern' }).click();
  await seite.locator('.hinweis', { hasText: 'Backup erstellt' }).waitFor();
  const backupAufrufe = await seite.evaluate(() => window.__aufrufe.map((a) => `${a.plugin}.${a.methode}`));
  const datei = await seite.evaluate(() => window.__aufrufe.find((a) => a.methode === 'writeFile').optionen);
  const geteilt = await seite.evaluate(() => window.__aufrufe.find((a) => a.plugin === 'Share').optionen);
  const inhalt = JSON.parse(datei.data);
  pruefe('App: Backup wird als Datei angelegt und über das Teilen-Menü abgelegt', backupAufrufe.join() === 'Filesystem.writeFile,Share.share' && datei.directory === 'CACHE' && inhalt.app === 'elan' && geteilt.files[0] === `file:///data/cache/${datei.path}`,
    `${backupAufrufe.join(' → ')}; Datei ${datei.path}, Schema ${inhalt.schemaVersion}`);

  await seite.evaluate(() => { window.__aufrufe = []; });
  await seite.goto(`${URL_APP}#/mehr/coach`);
  await seite.getByRole('button', { name: 'Bericht erstellen' }).click();
  await seite.locator('#f-coach-text').waitFor();
  await seite.locator('#coach-ausgabe').getByRole('button', { name: 'Teilen' }).click();
  await seite.waitForFunction(() => window.__aufrufe.some((a) => a.plugin === 'Share'));
  const coach = await seite.evaluate(() => window.__aufrufe.find((a) => a.plugin === 'Share').optionen);
  pruefe('App: Coach-Bericht über das native Teilen-Menü', coach.text.startsWith('Wochenbericht ') && coach.title === 'Wochenbericht', `Share.share mit ${coach.text.split('\n').length} Zeilen Text`);

  await seite.evaluate(() => { window.__aufrufe = []; });
  await seite.goto(`${URL_APP}#/zutaten`);
  await seite.locator('input[type=search]').fill('skyr');
  await seite.getByRole('button', { name: /bei Open Food Facts suchen/ }).click();
  await seite.getByRole('button', { name: 'Übernehmen' }).first().waitFor();
  const http = await seite.evaluate(() => window.__aufrufe.filter((a) => a.plugin === 'CapacitorHttp').map((a) => a.optionen.url));
  pruefe('App: Open Food Facts über natives HTTP, nicht über fetch', http.length === 1 && http[0].startsWith('https://world.openfoodfacts.org/') && !fremd.has('world.openfoodfacts.org'),
    `1 Aufruf CapacitorHttp.request, kein fetch an fremde Server (${[...fremd].join(', ') || 'keiner'})`);

  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('.slot').first().waitFor();
  const abstaende = await seite.evaluate(() => ({
    oben: parseFloat(getComputedStyle(document.querySelector('.inhalt')).paddingTop),
    // Abstand der Tippflächen zum unteren Rand: Innenabstand der Leiste plus ihr Abstand zum Rand (falls die Leiste schwebt)
    unten: (() => { const n = document.querySelector('.navigation'); return innerHeight - n.getBoundingClientRect().bottom + parseFloat(getComputedStyle(n).paddingBottom); })(),
  }));
  pruefe('App: Abstand zu Status- und Gestenleiste aus den Werten von Capacitor', abstaende.oben >= 32 && abstaende.unten >= 24, `oben ${abstaende.oben} px, unten ${abstaende.unten} px (vorgegeben 32 und 24)`);
  await bild(seite, '24-app-heute');

  // Widget: Heute schickt die Werte des Tages an das Android-Widget
  const widget = await seite.evaluate(() => window.__aufrufe.filter((a) => a.plugin === 'ElanWidget').at(-1)?.optionen);
  const heuteIso = await seite.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  pruefe('App: Widget bekommt kcal übrig und Wasser von heute', widget?.datum === heuteIso && Number.isInteger(widget?.kcalUebrig) && widget?.wasserZielMl === 2500,
    widget ? `${widget.datum}: ${widget.kcalUebrig} kcal übrig, ${widget.wasserMl} von ${widget.wasserZielMl} ml` : 'kein Aufruf');

  // Vibration: Wasser tippt leicht an; unter Darstellung abschaltbar
  await seite.evaluate(() => { window.__aufrufe = []; });
  await seite.locator('.kachel.makro-wasser').click();
  await seite.locator('.kachel.makro-wasser .kachel-wert', { hasText: '250 ml' }).waitFor();
  const tipp = await seite.evaluate(() => window.__aufrufe.filter((a) => a.plugin === 'Haptics').map((a) => `${a.methode}:${a.optionen.style ?? a.optionen.type}`));
  await trageEin(seite, 'Frühstück', 'apfel', 100);
  const erfolg = await seite.evaluate(() => window.__aufrufe.filter((a) => a.plugin === 'Haptics').map((a) => `${a.methode}:${a.optionen.style ?? a.optionen.type}`));
  await seite.goto(`${URL_APP}#/mehr/darstellung`);
  await seite.getByRole('switch', { name: /Vibration beim Tippen/ }).uncheck();
  await seite.goto(`${URL_APP}#/heute`);
  await seite.evaluate(() => { window.__aufrufe = []; });
  await seite.locator('.kachel.makro-wasser').click();
  await seite.locator('.kachel.makro-wasser .kachel-wert', { hasText: '500 ml' }).waitFor();
  const ohne = await seite.evaluate(() => window.__aufrufe.filter((a) => a.plugin === 'Haptics').length);
  // Health Connect: verbinden, abgleichen; eigene Eingaben bleiben
  await seite.goto(`${URL_APP}#/mehr/healthconnect`);
  await seite.getByRole('button', { name: 'Mit Health Connect verbinden' }).click();
  await seite.locator('.hinweis', { hasText: 'übernommen' }).waitFor();
  const hcHinweis = await seite.locator('.hinweis').innerText();
  const angefragt = await seite.evaluate(() => window.__aufrufe.filter((a) => a.plugin === 'Health' && a.methode === 'requestAuthorization').map((a) => a.optionen.read.join('+')));
  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('#f-schritte').waitFor();
  const hcWerte = `${await seite.locator('#f-gewicht').inputValue()}|${await seite.locator('#f-schlaf').inputValue()}|${await seite.locator('#f-schritte').inputValue()}`;
  const markiert = await seite.locator('.tageswerte label', { hasText: 'aus Health Connect' }).count();
  await seite.locator('#f-schritte').fill('7000');
  await seite.getByRole('button', { name: 'Tageswerte speichern' }).click();
  await seite.locator('.hinweis', { hasText: 'Tageswerte gespeichert' }).waitFor();
  await seite.goto(`${URL_APP}#/mehr/healthconnect`);
  await seite.getByRole('button', { name: 'Jetzt abgleichen' }).click();
  await seite.locator('.hinweis', { hasText: /übernommen|schon da/ }).waitFor();
  await seite.goto(`${URL_APP}#/heute`);
  await seite.locator('#f-schritte').waitFor();
  const eigenBleibt = await seite.locator('#f-schritte').inputValue();
  const gymGewaehlt = await seite.locator('[aria-label=Tagestyp] .wahl-knopf[aria-pressed=true]').innerText();
  const quelleHinweis = await seite.locator('.tagestyp-quelle').count();
  await seite.goto(`${URL_APP}#/fortschritt`);
  await seite.locator('#mass-ruhepuls').waitFor();
  const koerperwerte = `${await seite.locator('#mass-ruhepuls .mass-wert').innerText()}|${await seite.locator('#mass-koerperfett .mass-wert').innerText()}|${await seite.locator('#mass-hrv .mass-wert').innerText()}`;
  pruefe('App: Ruhepuls, Körperfett, HRV (Tagesschnitt) und Tagestyp aus dem Training übernommen', koerperwerte === '61 bpm|17,8 %|48 ms' && gymGewaehlt === 'Gym' && quelleHinweis === 1,
    `${koerperwerte}; Tagestyp ${gymGewaehlt} mit Hinweis auf Health Connect: ${quelleHinweis}`);
  pruefe('App: Health Connect liest nur die sieben freigegebenen Arten; eigene Eingabe geht vor',
    angefragt.join() === 'steps+weight+sleep+restingHeartRate+bodyFat+heartRateVariability+workouts' && hcWerte === '79,9|7,5|6543' && markiert === 3 && eigenBleibt === '7000',
    `angefragt ${angefragt.join()}; „${hcHinweis}“; übernommen ${hcWerte} (${markiert} markiert); nach eigener Eingabe und erneutem Abgleich: ${eigenBleibt} Schritte`);

  // Erinnerungen: Einschalten fragt nach der Erlaubnis und plant täglich, ohne exakte Wecker
  const geplant = () => seite.evaluate(() => window.__aufrufe.filter((a) => a.plugin === 'LocalNotifications' && a.methode === 'schedule').at(-1)?.optionen.notifications ?? []);
  await seite.goto(`${URL_APP}#/mehr/erinnerungen`);
  await seite.locator('#f-erinnerung-wasser').check();
  await seite.locator('#f-wasser-zeit-3').waitFor();
  const wasserPlan = await geplant();
  await seite.locator('#wasser-zeit-dazu').click();
  await seite.locator('#f-wasser-zeit-4').waitFor();
  await seite.getByRole('button', { name: 'Erinnerung 1 entfernen' }).click();
  await seite.locator('#f-wasser-zeit-4').waitFor({ state: 'detached' });
  await seite.locator('#f-erinnerung-supplements').check();
  await seite.locator('#f-supplements-zeit').selectOption('07:30');
  await seite.waitForFunction(() => window.__aufrufe.some((a) => a.methode === 'schedule' && a.optionen.notifications.some((n) => n.id === 1101 && n.schedule.on.hour === 7)));
  const endPlan = await geplant();
  await bild(seite, '41-erinnerungen');
  await seite.evaluate(() => { window.__verweigern = true; window.__benachrichtigung = 'prompt'; });
  await seite.locator('#f-erinnerung-checkin').check();
  await seite.locator('.hinweis', { hasText: 'Benachrichtigungen sind für Elan aus' }).waitFor();
  // Die Seite zeichnet nach dem Speichern neu; erst dann zeigt der Schalter den gespeicherten Stand
  await seite.waitForFunction(() => document.getElementById('f-erinnerung-wasser')?.checked === false, null, { timeout: 5000 }).catch(() => {});
  const nachVerweigern = await seite.locator('#f-erinnerung-wasser').isChecked();
  await seite.goto(`${URL_APP}#/mehr`);
  const menueStand = await seite.locator('#menue-erinnerungen').innerText();
  const alleTaeglich = endPlan.every((n) => n.isExactNotification === false && n.schedule.on && n.schedule.allowWhileIdle);
  pruefe('App: Erinnerungen planen täglich, ohne exakte Wecker; ohne Erlaubnis bleibt alles aus',
    wasserPlan.map((n) => `${n.schedule.on.hour}`).join() === '10,13,16,19' && endPlan.map((n) => n.id).join() === '1001,1002,1003,1004,1101' && alleTaeglich && !nachVerweigern && /Aus/.test(menueStand),
    `Wasser ${wasserPlan.map((n) => n.schedule.on.hour).join('/')} Uhr; danach ${endPlan.map((n) => `${n.id}@${n.schedule.on.hour}:${String(n.schedule.on.minute).padStart(2, '0')}`).join(', ')}; täglich und ungenau: ${alleTaeglich}; nach „Nicht zulassen“ Wasser an: ${nachVerweigern}; Menü „${menueStand.replace(/\s+/g, ' ')}“`);

  pruefe('App: Vibration beim Tippen, abschaltbar', tipp.join() === 'impact:LIGHT' && erfolg.join() === 'impact:LIGHT,notification:SUCCESS' && ohne === 0, `Wasser: ${tipp.join() || 'kein Aufruf'}; nach Eintragen: ${erfolg.join()}; aus: ${ohne} Aufrufe`);
  pruefe('App-Lauf ohne Konsolenfehler', fehler.length === 0, fehler.slice(0, 3).join(' | ') || '0 Fehler');
  await kontext.close();
}

async function willkommenLauf(browser) {
  const { kontext, seite, fehler } = await neueSeite(browser, { einrichtung: true });
  await seite.goto(URL_APP, { waitUntil: 'networkidle' });
  await seite.locator('.willkommen h1').waitFor();
  const start = `${seite.url().split('#')[1]}: ${await seite.locator('h1').innerText()}, Leiste ${await seite.locator('.navigation').isVisible() ? 'sichtbar' : 'ausgeblendet'}`;
  await bild(seite, '25-willkommen', false);
  await seite.getByRole('button', { name: 'Los geht’s' }).click();
  await seite.locator('#f-start-gym').fill('3000');
  await seite.getByRole('button', { name: 'Weiter' }).click();
  await seite.locator('#f-start-geschlecht').selectOption('m');
  await seite.locator('#f-start-alter').selectOption('25');
  await seite.getByRole('button', { name: 'Fertig' }).click();
  await seite.locator('.slot').first().waitFor();
  const ziel = seite.url().split('#')[1];
  await seite.goto(`${URL_APP}#/mehr/ziele`);
  await seite.locator('#f-ziel-kcal').waitFor();
  const ziele = `${await seite.locator('#f-ziel-kcal').inputValue()} kcal, Eiweiß ${await seite.locator('#f-ziel-protein').inputValue()} g, KH ${await seite.locator('#f-ziel-kh').inputValue()} g, Fett ${await seite.locator('#f-ziel-fett').inputValue()} g`;
  const passt = (await seite.locator('.unterseite').innerText()).includes('passt zum Energieziel');
  await seite.goto(`${URL_APP}#/mehr/referenz`);
  const gruppe = `${await seite.locator('#f-ref-geschlecht').inputValue()}/${await seite.locator('#f-ref-alter').inputValue()}`;
  await seite.goto(URL_APP, { waitUntil: 'networkidle' });
  await seite.locator('.slot').first().waitFor();
  pruefe('Ersteinrichtung: drei Schritte, Ziele umgerechnet, Gruppe gespeichert, nur einmal', start.startsWith('/willkommen') && start.includes('ausgeblendet') && ziel === '/heute' && ziele.startsWith('3000 kcal, Eiweiß 150') && passt && gruppe === 'm/25' && !seite.url().includes('willkommen'),
    `${start}; danach ${ziel}; Gym ${ziele}, Makros passen: ${passt}; Gruppe ${gruppe}; zweiter Start ohne Einrichtung`);
  await kontext.close();

  // Wer schon Einträge hat (Update von einer älteren Fassung), sieht keine Einrichtung
  const zweit = await neueSeite(browser, { einrichtung: true });
  await zweit.seite.goto(`${URL_APP}manifest.webmanifest`);
  await zweit.seite.evaluate(() => new Promise((ok) => {
    const a = indexedDB.open('elan', 1);
    a.onupgradeneeded = () => { const db = a.result; db.createObjectStore('zutaten', { keyPath: 'id' }); db.createObjectStore('eintraege', { keyPath: 'id' }).createIndex('datum', 'datum'); db.createObjectStore('tage', { keyPath: 'datum' }); db.createObjectStore('einstellungen', { keyPath: 'schluessel' }); };
    a.onsuccess = () => { const t = a.result.transaction('eintraege', 'readwrite'); t.objectStore('eintraege').put({ id: 'alt', datum: '2026-01-01', slot: 'mittag', name: 'Apfel', gramm: 100, je100: { kcal: 52 } }); t.oncomplete = () => { a.result.close(); ok(); }; };
  }));
  await zweit.seite.goto(URL_APP, { waitUntil: 'networkidle' });
  await zweit.seite.locator('.slot').first().waitFor();
  pruefe('Ersteinrichtung entfällt, wenn schon Daten da sind', zweit.seite.url().endsWith('#/heute') || !zweit.seite.url().includes('willkommen'), zweit.seite.url().split('#')[1] || '/');
  pruefe('Einrichtungs-Lauf ohne Konsolenfehler', fehler.length === 0 && zweit.fehler.length === 0, [...fehler, ...zweit.fehler].slice(0, 3).join(' | ') || '0 Fehler');
  await zweit.kontext.close();
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
  pruefe('Migration: Datenbank aus Version 1 wird angehoben, Einträge bleiben', stand.version === SCHEMA_VERSION && stand.speicher.includes('rezepte') && stand.speicher.includes('plan') && stand.speicher.includes('vorlieben') && stand.speicher.includes('messungen') && stand.speicher.includes('labor') && stand.speicher.includes('angebote') && (await seite.locator('.eintrag').count()) === 1,
    `Version ${stand.version}, Speicher ${stand.speicher.join(', ')}, alter Eintrag: ${(await seite.locator('.eintrag').innerText()).replace(/\n/g, ' | ')}`);

  await seite.goto(`${URL_APP}#/mehr/backup`);
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

/** Schema 7 → 8: Häkchen und eigene Posten der Wochen-Einkaufsliste ziehen in den Zeitraum Montag bis Sonntag um. */
async function migration7Lauf(browser) {
  const { kontext, seite, fehler } = await neueSeite(browser);
  await seite.goto(`${URL_APP}manifest.webmanifest`);
  // Version 7 mit den echten Migrationen der App bauen, dann Daten im alten Aufbau hineinlegen
  const montag = await seite.evaluate(async () => {
    const { MIGRATIONEN } = await import('/js/db.js');
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const mo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await new Promise((ok, nein) => {
      const anfrage = indexedDB.open('elan', 7);
      anfrage.onupgradeneeded = (e) => { for (let v = e.oldVersion; v < 7; v += 1) MIGRATIONEN[v](anfrage.result, anfrage.transaction); };
      anfrage.onsuccess = () => {
        const db = anfrage.result;
        const t = db.transaction(['plan', 'einkauf'], 'readwrite');
        t.objectStore('plan').put({ id: 'p-apfel', datum: mo, slot: 'mittag', zutatId: 'basis:apfel', name: 'Apfel', marke: '', gramm: 340, je100: { kcal: 52 }, erstellt: d.toISOString() });
        t.objectStore('plan').put({ id: 'p-reis', datum: mo, slot: 'mittag', zutatId: 'basis:reis', name: 'Reis', marke: '', gramm: 200, je100: { kcal: 350 }, erstellt: d.toISOString() });
        t.objectStore('einkauf').put({ id: `${mo}|basis:apfel`, woche: mo, schluessel: 'basis:apfel', erledigt: true });
        t.objectStore('einkauf').put({ id: 'eigen-1', woche: mo, eigen: true, name: 'Spülmittel', erledigt: false, erstellt: d.toISOString() });
        t.oncomplete = () => { db.close(); ok(); };
        t.onerror = () => nein(t.error);
      };
      anfrage.onerror = () => nein(anfrage.error);
    });
    return mo;
  });
  await seite.goto(`${URL_APP}#/woche/${montag}/einkauf`, { waitUntil: 'networkidle' });
  await seite.locator('.zusatz').waitFor();
  const apfelHaken = await seite.locator('.haken', { hasText: 'Apfel' }).locator('input').isChecked();
  const reisHaken = await seite.locator('.haken', { hasText: 'Reis' }).locator('input').isChecked();
  const eigene = await seite.locator('.haken', { hasText: 'Spülmittel' }).count();
  const saetze = await seite.evaluate(() => new Promise((ok) => {
    const a = indexedDB.open('elan');
    a.onsuccess = () => {
      const r = a.result.transaction('einkauf').objectStore('einkauf').getAll();
      r.onsuccess = () => { const v = a.result.version; a.result.close(); ok({ version: v, saetze: r.result.map((x) => `${x.id} [${x.zeitraum}${'woche' in x ? ', woche' : ''}]`) }); };
    };
  }));
  pruefe('Migration 7 → 8: Häkchen und eigene Posten der Woche bleiben erhalten', saetze.version === SCHEMA_VERSION && apfelHaken && !reisHaken && eigene === 1 && saetze.saetze.every((x) => !x.includes('woche') && x.includes('..')),
    `Version ${saetze.version}; Apfel ${apfelHaken ? 'abgehakt' : 'offen'}, Reis ${reisHaken ? 'abgehakt' : 'offen'}, Spülmittel ${eigene}; ${saetze.saetze.join('; ')}`);
  // Ein neues Häkchen nach der Migration landet unter dem neuen Schlüssel und übersteht ein Neuladen
  await seite.locator('.haken', { hasText: 'Reis' }).locator('input').check();
  await seite.waitForTimeout(150);
  await seite.reload({ waitUntil: 'networkidle' });
  await seite.locator('.zusatz').waitFor();
  pruefe('Nach der Migration: neues Häkchen bleibt nach Neuladen', await seite.locator('.haken', { hasText: 'Reis' }).locator('input').isChecked());
  pruefe('Migration 7 → 8 ohne Konsolenfehler', fehler.length === 0, fehler.slice(0, 3).join(' | ') || '0 Fehler');
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
    await vorkochLauf(browser);
    await healthLauf(browser);
    await befundLauf(browser);
    await importLauf(browser);
    await angebotLauf(browser);
    await feinschliffLauf(browser);
    await appLauf(browser);
    await willkommenLauf(browser);
    await migrationsLauf(browser);
    await migration7Lauf(browser);
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
