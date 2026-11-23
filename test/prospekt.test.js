import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { leseAngebotsDateiBeliebig, leseProspektDatei, linkFuer, prospektSeiten } from '../js/logik/prospekt.js';

const V2 = JSON.parse(readFileSync(new URL('./daten/angebote-v2.json', import.meta.url), 'utf8'));
const LINKS = JSON.parse(readFileSync(new URL('../data/prospekt-links.json', import.meta.url), 'utf8'));
const ZUTATEN = [
  { id: 'basis:haferflocken', name: 'Haferflocken', je100: {} },
  { id: 'basis:apfel', name: 'Apfel', je100: {} },
  { id: 'basis:apfelsaft', name: 'Apfelsaft', je100: {} },
];

test('Version 2: Artikel, Zuordnung nur mit Zutat, ungültige gezählt, unsichere Links verworfen', () => {
  const e = leseProspektDatei(V2, ZUTATEN);
  assert.equal(e.ok, true);
  assert.equal(e.prospekt.artikel.length, 5);
  assert.equal(e.ungueltig, 2);
  assert.deepEqual(e.angebote.map((a) => [a.zutatId, a.markt, a.preis, a.notiz]), [['basis:haferflocken', 'Testmarkt', 0.79, 'Bio Haferflocken zart'], ['basis:apfel', 'Testmarkt', 1.99, 'Äpfel Elstar']]);
  assert.deepEqual(e.ohneTreffer, ['Drachenfrucht']);
  assert.equal(e.prospekt.artikel.find((a) => a.artikel === 'Schokoriegel 5er').zutatId, undefined);
  assert.equal(e.prospekt.artikel[0].grundpreis, '1,58 €/kg');
  assert.deepEqual(e.prospekt.links, [{ kette: 'Testmarkt', url: 'https://www.example.org/prospekt', art: 'prospekt' }]);
});

test('Falsches Format wird abgelehnt, Version 1 bleibt lesbar', () => {
  assert.equal(leseProspektDatei({ format: 'elan-angebote', version: 3, angebote: [] }, ZUTATEN).ok, false);
  const v1 = leseAngebotsDateiBeliebig({ schemaVersion: 1, angebote: [{ zutat: 'Apfel', markt: 'X', preis: 1 }] }, ZUTATEN);
  assert.equal(v1.ok, true);
  assert.equal(v1.prospekt, null);
  assert.equal(v1.angebote[0].zutatId, 'basis:apfel');
  assert.equal(leseAngebotsDateiBeliebig(V2, ZUTATEN).prospekt.artikel.length, 5);
});

test('Prospekt-Seiten: nur gültige, je Markt und Kategorie, Treffer zur Liste zuerst', () => {
  const { prospekt } = leseProspektDatei(V2, ZUTATEN);
  const seiten = prospektSeiten(prospekt.artikel, '2026-11-25', new Set(['basis:apfel']));
  assert.deepEqual(seiten.map((s) => [s.markt, s.anzahl]), [['Anderer Markt', 1], ['Testmarkt', 3]]);
  const test_ = seiten.find((s) => s.markt === 'Testmarkt');
  assert.deepEqual(test_.kategorien.map((k) => k.kategorie), ['obst', 'getreide', 'suesses']);
  assert.equal(test_.kategorien[0].artikel[0].aufListe, true);
  assert.equal(prospektSeiten(prospekt.artikel, '2026-12-01').find((s) => s.markt === 'Testmarkt'), undefined);
});

test('Links: aus der Datei vor der mitgelieferten Liste, Kette als ganzes Wort', () => {
  assert.equal(linkFuer({ name: 'Lidl', marke: 'Lidl' }, [], LINKS.ketten).art, 'prospekt');
  assert.equal(linkFuer({ name: 'EDEKA Beispiel', marke: 'EDEKA' }, [], LINKS.ketten).url, 'https://www.edeka.de/');
  assert.equal(linkFuer({ markt: 'Testmarkt' }, [{ kette: 'Testmarkt', url: 'https://www.example.org/prospekt', art: 'prospekt' }], LINKS.ketten).url, 'https://www.example.org/prospekt');
  assert.equal(linkFuer({ name: 'Hofladen Huber' }, [], LINKS.ketten), null);
  for (const k of LINKS.ketten) assert.match(k.url, /^https:\/\//);
});
