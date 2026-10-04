import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rest, wasFehlt, mikroTipps, skaliereRezept, SCHAETZWERTE } from '../js/logic/vorschlaege.js';

const skyr = { id: 'skyr', name: 'Skyr', je100g: { kcal: 63, protein: 11 } };
const banane = { id: 'banane', name: 'Banane', je100g: { kcal: 89, protein: 1 } };
const nuesse = { id: 'nuesse', name: 'Nüsse', je100g: { kcal: 600, protein: 20 } };

test('Rest und Vorschläge', () => {
  const r = rest({ kcal: 2400, protein: 140 }, { kcal: 2700, protein: 175 });
  assert.deepEqual(r, { kcal: 300, protein: 35 });
  const v = wasFehlt(r, [{ lm: skyr, gramm: 300 }, { lm: banane, gramm: 120 }, { lm: nuesse, gramm: 100 }]);
  assert.ok(v.length >= 1);
  assert.deepEqual(v[0].teile.map((t) => t.lm.id).sort(), ['banane', 'skyr']);
  assert.ok(!v.some((o) => o.teile.some((t) => t.lm.id === 'nuesse')));
  assert.deepEqual(wasFehlt({ kcal: 20, protein: 2 }, [{ lm: skyr, gramm: 300 }]), []);
});

test('Mikro-Tipps', () => {
  const lm = [
    { id: 'lachs', name: 'Lachs', quelle: 'usda_sr', kategorie: 'fleisch_fisch', je100g: { kcal: 200, vitD: 11 } },
    { id: 'reis', name: 'Reis', quelle: 'usda_sr', kategorie: 'getreide', je100g: { kcal: 350, vitD: 0 } },
  ];
  const t = mikroTipps({ vitD: 2 }, 'maenner_19_25', { kcal: 2800, ballaststoffeMinG: 30 }, lm, 20);
  const d = t.find((x) => x.schluessel === 'vitD');
  assert.equal(d.anteil, 10);
  assert.deepEqual(d.quellen.map((q) => q.id), ['lachs']);
});

test('Rezept skalieren, Schätzwerte', () => {
  const r = skaliereRezept({ portionen: 2, gewichtGekochtG: 800, zutaten: [{ lebensmittelId: 'a', gramm: 300 }] }, 7);
  assert.equal(r.zutaten[0].gramm, 1050);
  assert.equal(r.gewichtGekochtG, 2800);
  assert.ok(SCHAETZWERTE.every((s) => s.je100g.kcal > 0 && s.kategorie === 'auswaerts'));
});
