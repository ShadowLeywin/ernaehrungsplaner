import assert from 'node:assert/strict';
import test from 'node:test';
import { alsEintraege, einkaufsliste, listeAlsText, mengeText, naechsterFreierSlot } from '../js/logik/plan.js';

const REZEPT = {
  id: 'r1', name: 'Testeintopf', portionen: 4,
  zutaten: [
    { zutatId: 'basis:bohnen', name: 'Bohnen', gramm: 800, je100: { kcal: 100 } },
    { zutatId: 'basis:reis', name: 'Reis', gramm: 400, je100: { kcal: 350 } },
  ],
};
const rezepte = new Map([['r1', REZEPT]]);
const zutaten = new Map([
  ['basis:bohnen', { id: 'basis:bohnen', kategorie: 'huelsenfruechte' }],
  ['basis:reis', { id: 'basis:reis', kategorie: 'getreide' }],
  ['basis:apfel', { id: 'basis:apfel', kategorie: 'obst', portionen: [{ name: 'Stück', gramm: 170 }] }],
]);
const posten = (zutatId, name, gramm, extra = {}) => ({ id: `p-${name}-${gramm}`, datum: '2026-11-09', slot: 'mittag', zutatId, name, gramm, je100: {}, ...extra });

test('naechsterFreierSlot: erster unbelegter Slot, sonst Mittagessen', () => {
  assert.equal(naechsterFreierSlot([]), 'fruehstueck');
  assert.equal(naechsterFreierSlot([{ slot: 'fruehstueck' }, { slot: 'morgensnack' }]), 'mittag');
  const voll = ['fruehstueck', 'morgensnack', 'mittag', 'nachmittagssnack', 'abend', 'abendsnack'].map((slot) => ({ slot }));
  assert.equal(naechsterFreierSlot(voll), 'mittag');
});

test('alsEintraege entfernt id und Plan-Merkmale', () => {
  const [e] = alsEintraege([{ id: 'p1', erstellt: 'x', uebernommen: false, datum: '2026-11-09', slot: 'abend', zutatId: 'a', name: 'A', gramm: 50, je100: { kcal: 1 }, rezeptId: 'r1' }]);
  assert.deepEqual(e, { datum: '2026-11-09', slot: 'abend', zutatId: 'a', name: 'A', gramm: 50, je100: { kcal: 1 }, rezeptId: 'r1' });
});

test('Einkaufsliste zählt gleiche Zutaten über Tage zusammen', () => {
  const liste = einkaufsliste([posten('basis:reis', 'Reis', 300), posten('basis:reis', 'Reis', 200), posten('basis:apfel', 'Apfel', 340)], rezepte, zutaten);
  assert.deepEqual(liste.map((p) => [p.name, p.gramm]), [['Apfel', 340], ['Reis', 500]]);
});

test('Einkaufsliste löst Rezepte in Zutaten auf und rechnet auf die geplante Menge um', () => {
  // Rezept wiegt roh 1.200 g; geplant sind 2 x 300 g = die Hälfte
  const p = [posten('rezept:r1', 'Testeintopf', 300, { rezeptId: 'r1' }), posten('rezept:r1', 'Testeintopf', 300, { rezeptId: 'r1' }), posten('basis:reis', 'Reis', 100)];
  const liste = einkaufsliste(p, rezepte, zutaten);
  assert.deepEqual(liste.map((x) => [x.name, x.gramm, x.kategorie]), [['Reis', 300, 'getreide'], ['Bohnen', 400, 'huelsenfruechte']]);
});

test('Einkaufsliste: gelöschtes Rezept bleibt als ein Posten, unbekannte Zutat landet unter Sonstiges', () => {
  const liste = einkaufsliste([posten('rezept:weg', 'Altes Rezept', 250, { rezeptId: 'weg' })], rezepte, zutaten);
  assert.deepEqual(liste.map((x) => [x.name, x.gramm, x.kategorie]), [['Altes Rezept', 250, 'sonstiges']]);
});

test('Einkaufsliste: Stückzahl wird aufgerundet, Reihenfolge folgt den Kategorien', () => {
  const liste = einkaufsliste([posten('basis:apfel', 'Apfel', 400), posten('basis:bohnen', 'Bohnen', 100)], rezepte, zutaten);
  assert.equal(liste[0].name, 'Apfel');
  assert.equal(liste[0].stueck, 3); // 400 g / 170 g = 2,35
  assert.equal(liste[1].stueck, null);
  assert.equal(einkaufsliste([posten('basis:apfel', 'Apfel', 340)], rezepte, zutaten)[0].stueck, 2);
  assert.deepEqual(einkaufsliste([], rezepte, zutaten), []);
});

test('mengeText rundet einkaufsgerecht', () => {
  assert.equal(mengeText(1250), '1,25 kg');
  assert.equal(mengeText(1000), '1 kg');
  assert.equal(mengeText(333), '335 g');
  assert.equal(mengeText(12.2), '13 g');
});

test('listeAlsText enthält nur Offenes, auch eigene Posten', () => {
  const liste = einkaufsliste([posten('basis:apfel', 'Apfel', 340), posten('basis:reis', 'Reis', 500)], rezepte, zutaten);
  const text = listeAlsText(liste, [{ name: 'Spülmittel', erledigt: false }, { name: 'Salz', erledigt: true }], new Set(['basis:reis']), 'Einkauf');
  assert.equal(text, 'Einkauf\n- Apfel: 340 g, etwa 2 Stück\n- Spülmittel');
});
