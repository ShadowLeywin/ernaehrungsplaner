import assert from 'node:assert/strict';
import test from 'node:test';
import { runde } from '../js/logik/naehrwerte.js';
import { pruefeRezept, rezeptAlsZutat, rezeptWerte } from '../js/logik/rezepte.js';
import { slotFuerUhrzeit } from '../js/logik/ziele.js';

const REZEPT = {
  id: 'r1',
  name: 'Testeintopf',
  portionen: 4,
  zutaten: [
    { zutatId: 'a', name: 'A', gramm: 400, je100: { kcal: 100, protein: 10, kh: 5, fett: 2 } },
    { zutatId: 'b', name: 'B', gramm: 600, je100: { kcal: 50, protein: 2, kh: 10, fett: 0.5 } },
  ],
  schritte: [{ text: 'Alles kochen.', prinzip: 'Hitze macht Stärke verdaulich.' }],
};

test('rezeptWerte: Summe, Portion und Werte je 100 g', () => {
  const w = rezeptWerte(REZEPT);
  assert.equal(w.gesamtGramm, 1000);
  assert.equal(w.gesamt.kcal, 700);
  assert.equal(w.portionGramm, 250);
  assert.equal(w.jePortion.kcal, 175);
  assert.equal(runde(w.jePortion.protein, 1), 13);
  assert.deepEqual(w.je100, { kcal: 70, protein: 5.2, kh: 8, fett: 1.1 });
  assert.equal(w.unvollstaendig, false);
});

test('rezeptWerte: eine Portion aus den 100-g-Werten ergibt dasselbe wie die direkte Rechnung', () => {
  const w = rezeptWerte(REZEPT);
  assert.equal(runde((w.je100.kcal * w.portionGramm) / 100, 0), runde(w.jePortion.kcal, 0));
});

test('rezeptWerte verträgt leere und unvollständige Rezepte', () => {
  const leer = rezeptWerte({ zutaten: [], portionen: 0 });
  assert.equal(leer.gesamtGramm, 0);
  assert.deepEqual(leer.je100, {});
  assert.equal(leer.portionen, 1);
  const luecke = rezeptWerte({ portionen: 1, zutaten: [{ gramm: 100, je100: { kcal: 50 } }] });
  assert.equal(luecke.unvollstaendig, true);
});

test('rezeptAlsZutat: Kennung, Portion und Werte je 100 g', () => {
  const z = rezeptAlsZutat(REZEPT);
  assert.equal(z.id, 'rezept:r1');
  assert.equal(z.istRezept, true);
  assert.deepEqual(z.portionen, [{ name: 'Portion', gramm: 250 }]);
  assert.equal(z.je100.kcal, 70);
});

test('pruefeRezept: gültige Eingabe, leere Schritte fallen weg', () => {
  const { ok, rezept } = pruefeRezept({
    name: ' Testeintopf ', portionen: '4',
    zutaten: [{ zutatId: 'a', name: 'A', je100: { kcal: 100 }, gramm: '400' }, { zutatId: 'b', name: 'B', je100: { kcal: 50 }, gramm: '0,5' }],
    schritte: [{ text: ' Kochen ', prinzip: ' Warum ' }, { text: '', prinzip: '' }, { text: 'Servieren', prinzip: '' }],
  });
  assert.equal(ok, true);
  assert.equal(rezept.name, 'Testeintopf');
  assert.equal(rezept.portionen, 4);
  assert.deepEqual(rezept.zutaten.map((z) => z.gramm), [400, 0.5]);
  assert.deepEqual(rezept.schritte, [{ text: 'Kochen', prinzip: 'Warum' }, { text: 'Servieren' }]);
});

test('pruefeRezept: Pflichtfelder und Grenzen', () => {
  const p = pruefeRezept({ name: '', portionen: '0', zutaten: [], schritte: [] });
  assert.equal(p.ok, false);
  assert.ok(p.fehler.name && p.fehler.portionen && p.fehler.zutaten);
  assert.equal(p.rezept, null);
});

test('pruefeRezept: Fehler je Zutat und je Schritt tragen die Position', () => {
  const p = pruefeRezept({
    name: 'x', portionen: '2',
    zutaten: [{ zutatId: 'a', name: 'A', je100: {}, gramm: '100' }, { zutatId: 'b', name: 'B', je100: {}, gramm: '' }, { zutatId: 'c', name: 'C', je100: {}, gramm: 'viel' }],
    schritte: [{ text: 'ok' }, { text: '', prinzip: 'Prinzip ohne Schritt' }],
  });
  assert.deepEqual(Object.keys(p.fehler.gramm), ['1', '2']);
  assert.deepEqual(Object.keys(p.fehler.schritt), ['1']);
});

test('slotFuerUhrzeit ordnet jede Stunde einem Slot zu', () => {
  assert.equal(slotFuerUhrzeit(7), 'fruehstueck');
  assert.equal(slotFuerUhrzeit(10), 'morgensnack');
  assert.equal(slotFuerUhrzeit(13), 'mittag');
  assert.equal(slotFuerUhrzeit(16), 'nachmittagssnack');
  assert.equal(slotFuerUhrzeit(19), 'abend');
  assert.equal(slotFuerUhrzeit(23), 'abendsnack');
});
