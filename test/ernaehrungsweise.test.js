import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pruefeLebensmittel, diaetMakros, imEssensfenster, eigenschaften } from '../js/logic/ernaehrungsweise.js';

const lm = (id, kategorie) => ({ id, kategorie });

test('Ernährungsweisen', () => {
  assert.equal(pruefeLebensmittel(lm('lachs', 'fleisch_fisch'), { weise: 'pescetarisch' }).passt, true);
  assert.equal(pruefeLebensmittel(lm('haehnchenbrust', 'fleisch_fisch'), { weise: 'pescetarisch' }).passt, false);
  assert.equal(pruefeLebensmittel(lm('lachs', 'fleisch_fisch'), { weise: 'vegetarisch' }).passt, false);
  assert.equal(pruefeLebensmittel(lm('ei', 'milch_ei'), { weise: 'vegetarisch' }).passt, true);
  assert.deepEqual(pruefeLebensmittel(lm('honig', 'suesses'), { weise: 'vegan' }).gruende, ['nicht vegan']);
  assert.equal(pruefeLebensmittel(lm('tofu', 'huelsenfruechte'), { weise: 'vegan' }).passt, true);
  assert.deepEqual(pruefeLebensmittel(lm('putenbrust', 'fleisch_fisch'), { weise: 'flexitarisch' }).hinweise, ['Fleisch – lieber selten']);
});

test('Unverträglichkeiten', () => {
  assert.equal(pruefeLebensmittel(lm('skyr', 'milch_ei'), { unvertraeglich: ['laktosefrei'] }).passt, false);
  assert.equal(pruefeLebensmittel(lm('parmesan', 'milch_ei'), { unvertraeglich: ['laktosefrei'] }).passt, true);
  assert.equal(pruefeLebensmittel(lm('nudeln', 'getreide'), { unvertraeglich: ['glutenfrei'] }).passt, false);
  assert.equal(pruefeLebensmittel(lm('haferflocken', 'getreide'), { unvertraeglich: ['glutenfrei'] }).hinweise.length, 1);
  assert.equal(pruefeLebensmittel(lm('mandeln', 'nuesse_samen'), { unvertraeglich: ['nussfrei'] }).passt, false);
});

test('Eigene Lebensmittel mit Flags', () => {
  assert.equal(eigenschaften({ id: 'x', flags: { tierisch: true } }).tierisch, true);
});

test('Diät-Makros halten die Kalorien', () => {
  const typ = { kcal: 2875, protein: 175, kh: 375, fett: 75 };
  for (const d of ['highprotein', 'lowcarb', 'keto', 'lowfat', 'mediterran']) {
    const m = diaetMakros(typ, d, 80);
    const kcal = m.protein * 4 + m.kh * 4 + m.fett * 9;
    assert.ok(Math.abs(kcal - 2875) < 15, `${d}: ${kcal}`);
  }
  assert.equal(diaetMakros(typ, 'keto', 80).kh, 30);
  assert.equal(diaetMakros(typ, 'highprotein', 80).protein, 176);
  assert.equal(diaetMakros(typ, 'keine', 80), null);
});

test('Essensfenster', () => {
  assert.equal(imEssensfenster(new Date(2026, 9, 4, 12, 0), '12:00', '20:00'), true);
  assert.equal(imEssensfenster(new Date(2026, 9, 4, 20, 0), '12:00', '20:00'), false);
});
