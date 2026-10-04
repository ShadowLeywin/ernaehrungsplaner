import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  neuesRezept, rezeptGesamt, portionsGewicht, proPortion, mealPrep, rezeptAlsLebensmittel, gesamtNote, fertigGewicht,
} from '../js/logic/rezepte.js';

const LM = [
  { id: 'mehl', je100g: { kcal: 350, protein: 10, kh: 70, fett: 1 } },
  { id: 'skyr', je100g: { kcal: 60, protein: 11, kh: 4, fett: 0.2 } },
];

const fladen = { ...neuesRezept('f'), name: 'Skyr-Fladen', portionen: 2, zutaten: [{ lebensmittelId: 'mehl', gramm: 90 }, { lebensmittelId: 'skyr', gramm: 90 }] };

test('Summe und pro Portion', () => {
  assert.equal(rezeptGesamt(fladen, LM).kcal, 315 + 54);
  assert.equal(proPortion(fladen, LM).kcal, 184.5);
  assert.equal(portionsGewicht(fladen), 90);
});

test('Gekochtes Gewicht hat Vorrang', () => {
  const chili = { ...fladen, gewichtGekochtG: 140, portionen: 7 };
  assert.equal(fertigGewicht(chili), 140);
  assert.equal(portionsGewicht(chili), 20);
});

test('Meal-Prep', () => {
  const r = mealPrep({ gesamtGewichtG: 3600, portionen: 7, gesamtNaehrwerte: { kcal: 4200 } });
  assert.equal(Math.round(r.portionsGewichtG), 514);
  assert.equal(r.proPortion.kcal, 600);
});

test('Rezept als Lebensmittel', () => {
  const lm = rezeptAlsLebensmittel(fladen, LM);
  assert.equal(lm.id, 'rezept:f');
  assert.equal(lm.stueckG, 90);
  assert.equal(Math.round(lm.je100g.kcal), 205);
  assert.equal(rezeptAlsLebensmittel(neuesRezept('leer'), LM), null);
});

test('Gesamtnote', () => {
  assert.equal(gesamtNote({ bewertung: { gesamt: 9 } }), 9);
  assert.equal(gesamtNote({ bewertung: { geschmack: 8, saettigung: 7 } }), 7.5);
  assert.equal(gesamtNote({ bewertung: {} }), null);
});
