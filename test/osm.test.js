import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { adresseText, leseOverpass, overpassAbfrage, overpassUrl, pruefeEigenerMarkt, pruefeOrt } from '../js/logik/osm.js';

const BEISPIEL = JSON.parse(readFileSync(new URL('./daten/overpass-maerkte.json', import.meta.url), 'utf8'));

test('Ort oder Postleitzahl prüfen', () => {
  assert.deepEqual(pruefeOrt(' 12345 ').ort, { art: 'plz', wert: '12345' });
  assert.deepEqual(pruefeOrt('Bad  Muster').ort, { art: 'name', wert: 'Bad Muster' });
  assert.equal(pruefeOrt('1234').ok, false);
  assert.equal(pruefeOrt('').ok, false);
  assert.equal(pruefeOrt('x'.repeat(61)).ok, false);
});

test('Abfrage: Gebiet in Deutschland, Läden darin, Anführungszeichen maskiert', () => {
  const name = overpassAbfrage({ art: 'name', wert: 'Muster"stadt' });
  assert.match(name, /\["boundary"="administrative"\]\["name"="Muster\\"stadt"\]\["de:amtlicher_gemeindeschluessel"\];/);
  // Kein Suchgebiet „ganz Deutschland“ mehr: das war am Handy zu langsam
  assert.doesNotMatch(name, /area\.de|ISO3166/);
  assert.match(name, /nwr\["shop"~"\^\(supermarket\|/);
  assert.match(name, /out center tags 100;/);
  assert.match(overpassAbfrage({ art: 'plz', wert: '12345' }), /\["boundary"="postal_code"\]\["postal_code"="12345"\];/);
  assert.ok(overpassUrl({ art: 'plz', wert: '12345' }).startsWith('https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D'));
});

test('Antwort lesen: Mittelpunkt bei Gebäuden, ohne Namen weg, doppelt weg, sortiert', () => {
  const m = leseOverpass(BEISPIEL);
  assert.deepEqual(m.map((x) => x.id), ['osm:node/3003', 'osm:way/2002', 'osm:node/1001']);
  const edeka = m.find((x) => x.id === 'osm:way/2002');
  assert.deepEqual([edeka.name, edeka.marke, edeka.lat, edeka.lon, edeka.art], ['EDEKA Beispiel', 'EDEKA', 48.2, 10.2, 'Supermarkt']);
  assert.equal(adresseText(m.find((x) => x.id === 'osm:node/1001')), 'Teststraße 1, 12345 Musterstadt');
  assert.deepEqual(leseOverpass(null), []);
  assert.deepEqual(leseOverpass({ elements: 'kaputt' }), []);
});

test('Eigener Markt: Name Pflicht, Kette aus dem ersten Wort', () => {
  assert.deepEqual(pruefeEigenerMarkt({ name: ' Lidl Musterstadt ', ort: 'Musterstadt' }).markt, { name: 'Lidl Musterstadt', marke: 'Lidl', quelle: 'eigen', ort: 'Musterstadt' });
  assert.equal(pruefeEigenerMarkt({ name: '' }).ok, false);
});

test('Antwort deuten: Fehlerseite, Überlastung und Laufzeitfehler führen zum Ersatzserver', async () => {
  const { deuteOverpassAntwort, overpassUrl, OVERPASS_SERVER } = await import('../js/logik/osm.js');
  assert.equal(deuteOverpassAntwort(200, '{"elements":[]}').ok, true);
  assert.deepEqual(deuteOverpassAntwort(429, ''), { ok: false, weiter: true, grund: 'Server ausgelastet (429)' });
  const html = deuteOverpassAntwort(403, '<html><body><h1>Forbidden</h1></body></html>');
  assert.equal(html.ok, false);
  assert.match(html.grund, /Fehler 403: Forbidden/);
  assert.match(deuteOverpassAntwort(200, '<html>kaputt</html>').grund, /keine gültige Antwort/);
  assert.match(deuteOverpassAntwort(200, '{"elements":[],"remark":"runtime error: Query timed out"}').grund, /Abfrage abgebrochen/);
  assert.equal(OVERPASS_SERVER.length, 2);
  assert.ok(overpassUrl({ art: 'plz', wert: '1' }, OVERPASS_SERVER[1]).startsWith('https://overpass.private.coffee/'));
});
