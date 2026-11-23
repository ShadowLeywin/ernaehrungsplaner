import assert from 'node:assert/strict';
import test from 'node:test';
import { normalisiereBarcode, pruefzifferStimmt, zutatZumBarcode } from '../js/logik/barcode.js';

test('Barcode aus dem Scan: Ziffern, Länge', () => {
  assert.equal(normalisiereBarcode(' 4000417 025005 '), '4000417025005');
  assert.equal(normalisiereBarcode('1234567'), null);
  assert.equal(normalisiereBarcode('abc'), null);
  assert.equal(normalisiereBarcode(null), null);
});

test('Prüfziffer nach GS1 erkennt Lesefehler', () => {
  assert.equal(pruefzifferStimmt('4006381333931'), true); // EAN-13 aus der GS1-Beschreibung
  assert.equal(pruefzifferStimmt('4006381333932'), false);
  assert.equal(pruefzifferStimmt('73513537'), true); // EAN-8
  assert.equal(pruefzifferStimmt('036000291452'), true); // UPC-A
  assert.equal(pruefzifferStimmt('123'), false);
});

test('Gespeicherte Zutat zum Barcode finden', () => {
  const zutaten = [{ id: 'off:4006381333931', name: 'A' }, { id: 'eigen:1', name: 'B', quelleId: '73513537' }, { id: 'basis:x', name: 'C' }];
  assert.equal(zutatZumBarcode(zutaten, '4006381333931').name, 'A');
  assert.equal(zutatZumBarcode(zutaten, '73513537').name, 'B');
  assert.equal(zutatZumBarcode(zutaten, '036000291452'), null);
});
