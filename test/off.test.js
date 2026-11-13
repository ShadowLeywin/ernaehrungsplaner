import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ausOffProdukt, ausOffSuche, istBarcode, offProduktUrl, offSuchUrl } from '../js/logik/off.js';

const beispiel = JSON.parse(readFileSync(new URL('./daten/off-suche.json', import.meta.url), 'utf8'));

test('istBarcode: 8 bis 14 Ziffern', () => {
  assert.equal(istBarcode('4000000000017'), true);
  assert.equal(istBarcode(' 40000017 '), true);
  assert.equal(istBarcode('1234567'), false);
  assert.equal(istBarcode('skyr'), false);
});

test('Adressen enthalten den kodierten Begriff und nur die nötigen Felder', () => {
  const url = new URL(offSuchUrl('Käse & Brot'));
  assert.equal(url.hostname, 'world.openfoodfacts.org');
  assert.equal(url.searchParams.get('search_terms'), 'Käse & Brot');
  assert.equal(url.searchParams.get('json'), '1');
  assert.ok(url.searchParams.get('fields').includes('nutriments'));
  assert.ok(offProduktUrl('4000000000017').includes('/api/v2/product/4000000000017.json'));
});

test('Produkt wird übersetzt: deutscher Name, erste Marke, Portion', () => {
  const z = ausOffProdukt(beispiel.products[0]);
  assert.equal(z.id, 'off:4000000000017');
  assert.equal(z.name, 'Skyr Natur');
  assert.equal(z.marke, 'Beispielhof');
  assert.equal(z.quelle, 'off');
  assert.deepEqual(z.je100, { kcal: 63, protein: 11, kh: 4, zucker: 4, fett: 0.2, gesFett: 0.1, salz: 0.13 });
  assert.deepEqual(z.portionen, [{ name: 'Portion', gramm: 150 }]);
  assert.equal(z.unvollstaendig, false);
});

test('kJ wird in kcal umgerechnet, Natrium in Salz, Lücken werden gekennzeichnet', () => {
  const z = ausOffProdukt(beispiel.products[1]);
  assert.equal(z.je100.kcal, 42);
  assert.equal(z.je100.salz, 0.1);
  assert.equal(z.unvollstaendig, true);
});

test('Produkte ohne Name oder ohne Energie fallen weg', () => {
  assert.equal(ausOffProdukt(beispiel.products[2]), null);
  assert.equal(ausOffProdukt(beispiel.products[3]), null);
  assert.equal(ausOffProdukt(null), null);
  assert.equal(ausOffSuche(beispiel).length, 2);
  assert.deepEqual(ausOffSuche({}), []);
});
