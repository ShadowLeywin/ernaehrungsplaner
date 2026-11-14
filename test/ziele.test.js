import assert from 'node:assert/strict';
import test from 'node:test';
import { bereinigeRinge, bereinigeWoche, bereinigeZiele, FEIER_RINGE, kachelSpalten, RINGE, fortschritt, makroAbweichung, neuErreicht, skaliereZiel, SLOTS, slotZiele, STANDARD_WOCHE, STANDARD_ZIELE, TAGESTYPEN, tagestypFuer } from '../js/logik/ziele.js';

test('sechs Slots, Anteile ergeben zusammen 100 %', () => {
  assert.equal(SLOTS.length, 6);
  assert.ok(Math.abs(SLOTS.reduce((s, x) => s + x.anteil, 0) - 1) < 1e-9);
});

test('Startwerte: jeder Tagestyp hat ein Ziel, Makros passen zur Energie (±10 kcal)', () => {
  for (const { id } of TAGESTYPEN) {
    const { abweichung } = makroAbweichung(STANDARD_ZIELE[id]);
    assert.ok(Math.abs(abweichung) <= 10, `${id}: ${abweichung}`);
  }
});

test('bereinigeZiele füllt Fehlendes und Ungültiges mit Startwerten', () => {
  const z = bereinigeZiele({ gym: { kcal: 3000, protein: -5, kh: 'viel' } });
  assert.equal(z.gym.kcal, 3000);
  assert.equal(z.gym.protein, STANDARD_ZIELE.gym.protein);
  assert.equal(z.gym.kh, STANDARD_ZIELE.gym.kh);
  assert.deepEqual(z.rest, STANDARD_ZIELE.rest);
  assert.deepEqual(bereinigeZiele(null), STANDARD_ZIELE);
});

test('bereinigeWoche liefert immer sieben gültige Tagestypen', () => {
  assert.deepEqual(bereinigeWoche(null), STANDARD_WOCHE);
  assert.deepEqual(bereinigeWoche(['rest', 'quatsch']).slice(0, 2), ['rest', STANDARD_WOCHE[1]]);
  assert.equal(bereinigeWoche(['rest']).length, 7);
});

test('tagestypFuer: Angabe am Tag schlägt den Wochenplan', () => {
  const woche = ['gym', 'gym', 'gym', 'gym', 'gym', 'calisthenics', 'rest'];
  assert.equal(tagestypFuer('2026-11-13', woche, null), 'gym'); // Freitag
  assert.equal(tagestypFuer('2026-11-15', woche, null), 'rest'); // Sonntag
  assert.equal(tagestypFuer('2026-11-13', woche, { datum: '2026-11-13', tagestyp: 'rest' }), 'rest');
  assert.equal(tagestypFuer('2026-11-13', woche, { datum: '2026-11-13', tagestyp: 'unbekannt' }), 'gym');
});

test('fortschritt: Anteil, Rest und Überschreitung', () => {
  assert.deepEqual(fortschritt(50, 200), { anteil: 0.25, rest: 150, ueber: false });
  assert.deepEqual(fortschritt(250, 200), { anteil: 1.25, rest: -50, ueber: true });
  assert.deepEqual(fortschritt(50, 0), { anteil: 0, rest: 0, ueber: false });
});

test('slotZiele verteilt das Tagesziel vollständig', () => {
  const z = slotZiele(2000);
  assert.equal(z.fruehstueck, 500);
  assert.ok(Math.abs(Object.values(z).reduce((a, b) => a + b, 0) - 2000) < 1e-6);
});

test('skaliereZiel: Eiweiß bleibt, Kohlenhydrate und Fett im alten Verhältnis, Energie passt', () => {
  const alt = { kcal: 2700, protein: 150, kh: 345, fett: 80, ballaststoffe: 30 };
  const neu = skaliereZiel(alt, 3000);
  assert.equal(neu.protein, 150);
  assert.equal(neu.ballaststoffe, 30);
  assert.equal(neu.kcal, 3000);
  assert.ok(neu.kh > alt.kh && neu.fett > alt.fett);
  assert.ok(Math.abs(makroAbweichung(neu).abweichung) <= 10, String(makroAbweichung(neu).abweichung));
  const knapp = skaliereZiel(alt, 500); // weniger als das Eiweiß allein
  assert.deepEqual([knapp.kh, knapp.fett], [0, 0]);
});

test('neuErreicht: nur beim Überschreiten der 100 %', () => {
  assert.equal(neuErreicht(0.9, 1), true);
  assert.equal(neuErreicht(0.5, 1.3), true);
  assert.equal(neuErreicht(1, 1.2), false, 'war schon erreicht');
  assert.equal(neuErreicht(undefined, 1.2), false, 'erstes Anzeigen ist keine Feier');
  assert.equal(neuErreicht(0.9, 0.99), false);
});

test('FEIER_RINGE: Kohlenhydrate und Fett werden nicht gefeiert', () => {
  assert.ok(FEIER_RINGE.includes('protein'));
  assert.ok(!FEIER_RINGE.includes('kh') && !FEIER_RINGE.includes('fett'));
});

test('bereinigeRinge: Standard alle, Reihenfolge fest, Unbekanntes fällt weg', () => {
  assert.deepEqual(bereinigeRinge(null), RINGE.map((r) => r.id));
  assert.deepEqual(bereinigeRinge(['wasser', 'protein', 'quatsch']), ['protein', 'wasser']);
  assert.deepEqual(bereinigeRinge([]), [], 'alle abgewählt bleibt erlaubt');
});

test('kachelSpalten: 4 als 2 × 2, sonst höchstens 3', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(kachelSpalten), [1, 2, 3, 2, 3, 3]);
});
