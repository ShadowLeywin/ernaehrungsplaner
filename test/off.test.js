import { test } from 'node:test';
import assert from 'node:assert/strict';
import { offZuLebensmittel, eigenesLebensmittel, istBarcode } from '../js/logic/off.js';
import { pruefeLebensmittel } from '../js/logic/ernaehrungsweise.js';

const skyr = {
  code: '4000400123456',
  product_name_de: 'Skyr Natur',
  brands: 'Ehrmann, Foo',
  serving_quantity: '150',
  nutriments: { 'energy-kcal_100g': 63, proteins_100g: 11, carbohydrates_100g: 4, sugars_100g: 4, fat_100g: 0.2, salt_100g: 0.1, 'calcium_100g': 0.15 },
  ingredients_analysis_tags: ['en:vegetarian'],
  allergens_tags: ['en:milk'],
};

test('OFF-Produkt umwandeln', () => {
  const lm = offZuLebensmittel(skyr);
  assert.equal(lm.id, 'off:4000400123456');
  assert.equal(lm.name, 'Skyr Natur');
  assert.equal(lm.marke, 'Ehrmann');
  assert.equal(lm.stueckG, 150);
  assert.equal(lm.je100g.kcal, 63);
  assert.equal(lm.je100g.natrium, 40);
  assert.equal(lm.je100g.calcium, 150);
  assert.equal(lm.flags.laktose, true);
  assert.equal(pruefeLebensmittel(lm, { weise: 'vegan' }).passt, false);
  assert.equal(pruefeLebensmittel(lm, { weise: 'vegetarisch' }).passt, true);
});

test('Energie aus kJ, fehlende Energie = null', () => {
  assert.equal(offZuLebensmittel({ code: '1', nutriments: { energy_100g: 418.4 } }).je100g.kcal, 100);
  assert.equal(offZuLebensmittel({ code: '1', nutriments: {} }), null);
});

test('Eigenes Lebensmittel und Barcode-Erkennung', () => {
  const lm = eigenesLebensmittel('x', { name: ' Proteinriegel ', kcal: 380, protein: 30, kh: 30, fett: 12, salz: 0.5, stueckG: 45 });
  assert.equal(lm.name, 'Proteinriegel');
  assert.equal(lm.je100g.natrium, 200);
  assert.equal(istBarcode('4000400123456'), true);
  assert.equal(istBarcode('skyr'), false);
});
