// Alle Werte in diesem Test sind erfunden.
import assert from 'node:assert/strict';
import test from 'node:test';
import { summeEintraege } from '../js/logik/naehrwerte.js';
import { MAX_VORLAGEN, bereinigeVorlagen, fuerPlanGeeignet, pruefeVorlagenName, vorlageAus, vorlageEintraege, vorlageText } from '../js/logik/vorlagen.js';

const eintrag = (name, gramm, kcal, extra = {}) => ({ id: `x-${name}`, datum: '2026-11-20', slot: 'fruehstueck', erstellt: '2026-11-20T07:00:00Z', zutatId: `z-${name}`, name, marke: '', gramm, je100: { kcal, protein: 10 }, ...extra });

test('Vorlage aus einer Mahlzeit: ohne Datum, Mahlzeit und Kennung, Werte bleiben gleich', () => {
  const v = vorlageAus([eintrag('Haferflocken', 80, 370), eintrag('Skyr', 150, 63)], ' Mein Frühstück ', 'v1');
  assert.equal(v.name, 'Mein Frühstück');
  assert.equal(v.teile.length, 2);
  assert.ok(v.teile.every((t) => !('id' in t) && !('datum' in t) && !('slot' in t) && !('erstellt' in t)));
  assert.equal(vorlageText(v), '2 Teile, 391 kcal');
  assert.equal(vorlageAus([], 'Leer', 'v2'), null);
});

test('Vorlage eintragen: neue Einträge mit neuem Tag und Mahlzeit, gleiche Summe', () => {
  const v = vorlageAus([eintrag('Haferflocken', 80, 370), eintrag('Skyr', 150, 63)], 'Frühstück', 'v1');
  const neu = vorlageEintraege(v, '2026-11-23', 'morgensnack');
  assert.ok(neu.every((e) => e.datum === '2026-11-23' && e.slot === 'morgensnack' && !e.id));
  assert.equal(Math.round(summeEintraege(neu).kcal), 391);
  neu[0].je100.kcal = 0; // Änderungen an Einträgen dürfen die Vorlage nicht verändern
  assert.equal(v.teile[0].je100.kcal, 370);
});

test('Name prüfen: leer und doppelt abgelehnt, eigene Vorlage darf ihren Namen behalten', () => {
  const vorlagen = [{ id: 'a', name: 'Frühstück', teile: [] }];
  assert.equal(pruefeVorlagenName('  ', vorlagen).ok, false);
  assert.match(pruefeVorlagenName('frühstück', vorlagen).fehler, /gibt es schon/);
  assert.equal(pruefeVorlagenName('Frühstück', vorlagen, 'a').ok, true);
});

test('Gespeicherte Vorlagen bereinigen und Eignung für den Wochenplan', () => {
  const gut = vorlageAus([eintrag('Brot', 60, 250)], 'Brot', 'g');
  const schnell = vorlageAus([eintrag('Mensa', 100, 600, { schnell: true, zutatId: undefined })], 'Mensa', 's');
  const roh = [gut, schnell, { id: 'kaputt', name: 'Kaputt', teile: [{ name: 'x' }] }, null, ...Array.from({ length: 60 }, (_, i) => ({ ...gut, id: `n${i}` }))];
  const liste = bereinigeVorlagen(roh);
  assert.equal(liste.length, MAX_VORLAGEN);
  assert.deepEqual(liste.slice(0, 2).map((v) => v.id), ['g', 's']);
  assert.equal(fuerPlanGeeignet(gut), true);
  assert.equal(fuerPlanGeeignet(schnell), false);
});
