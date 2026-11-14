import assert from 'node:assert/strict';
import test from 'node:test';
import { tageZwischen } from '../js/logik/datum.js';
import { einkaufsliste } from '../js/logik/plan.js';
import { haltbarkeitsWarnungen, pruefeRezept, rezeptAlsZutat, rezeptWerte } from '../js/logik/rezepte.js';
import { MAG, istObstGemuese, magHinweis, sortiereNachVorliebe, vorschlaege } from '../js/logik/vorlieben.js';

const REZEPT = {
  id: 'r1', name: 'Testeintopf', portionen: 4,
  zutaten: [{ zutatId: 'a', name: 'A', gramm: 1000, je100: { kcal: 100, protein: 10, kh: 5, fett: 2 } }],
};

test('Meal-Prep: Gewicht nach dem Kochen bestimmt Portion und Werte je 100 g, die Summe bleibt', () => {
  const roh = rezeptWerte(REZEPT);
  const gekocht = rezeptWerte({ ...REZEPT, gewichtGekocht: 1400 });
  assert.equal(roh.portionGramm, 250);
  assert.equal(gekocht.portionGramm, 350);
  assert.equal(gekocht.gekocht, true);
  assert.equal(gekocht.gesamt.kcal, roh.gesamt.kcal);
  assert.equal(gekocht.jePortion.kcal, roh.jePortion.kcal);
  assert.equal(gekocht.je100.kcal, 71.43); // 1000 kcal auf 1400 g
  assert.equal(rezeptAlsZutat({ ...REZEPT, gewichtGekocht: 1400 }).portionen[0].gramm, 350);
});

test('Meal-Prep: Einkaufsliste rechnet von Gramm auf dem Teller zurück auf Rohware', () => {
  const rezepte = new Map([['r1', { ...REZEPT, gewichtGekocht: 1400 }]]);
  // 700 g gekocht = halbes Rezept = 500 g Rohware
  const liste = einkaufsliste([{ id: 'p', zutatId: 'rezept:r1', rezeptId: 'r1', name: 'Testeintopf', gramm: 700 }], rezepte, new Map());
  assert.deepEqual(liste.map((x) => [x.name, x.gramm]), [['A', 500]]);
});

test('pruefeRezept: Angaben zum Vorkochen sind freiwillig und werden geprüft', () => {
  const basis = { name: 'x', portionen: '4', zutaten: [{ zutatId: 'a', name: 'A', je100: {}, gramm: '100' }], schritte: [] };
  assert.deepEqual(Object.keys(pruefeRezept(basis).rezept), ['name', 'portionen', 'zutaten', 'schritte']);
  const voll = pruefeRezept({ ...basis, gewichtGekocht: '1.400'.replace('.', ''), haltbarTage: '3', einfrierbar: true }).rezept;
  assert.equal(voll.gewichtGekocht, 1400);
  assert.equal(voll.haltbarTage, 3);
  assert.equal(voll.einfrierbar, true);
  assert.ok(pruefeRezept({ ...basis, gewichtGekocht: '0' }).fehler.gewichtGekocht);
  assert.ok(pruefeRezept({ ...basis, haltbarTage: '2,5' }).fehler.haltbarTage);
  assert.ok(pruefeRezept({ ...basis, haltbarTage: '99' }).fehler.haltbarTage);
});

test('tageZwischen zählt Kalendertage, auch über die Zeitumstellung', () => {
  assert.equal(tageZwischen('2026-11-09', '2026-11-12'), 3);
  assert.equal(tageZwischen('2026-10-24', '2026-10-26'), 2);
  assert.equal(tageZwischen('2026-11-12', '2026-11-09'), -3);
});

test('Haltbarkeit: Portion nach Ablauf wird gewarnt, danach zählt ein neuer Kochtag', () => {
  const rezepte = new Map([['r1', { ...REZEPT, haltbarTage: 3, einfrierbar: true }], ['r2', { id: 'r2', name: 'Ohne Angabe', zutaten: [] }]]);
  const p = (id, datum, rezeptId = 'r1') => ({ id, datum, rezeptId });
  const w = haltbarkeitsWarnungen([p('do', '2026-11-12'), p('mo', '2026-11-09'), p('fr', '2026-11-13'), p('sa', '2026-11-14'), p('x', '2026-11-20', 'r2')], rezepte);
  // Montag gekocht: Donnerstag = Tag 3 geht noch, Freitag = Tag 4 nicht mehr; Samstag zählt ab Freitag
  assert.deepEqual([...w.keys()], ['fr']);
  assert.deepEqual(w.get('fr'), { tage: 4, haltbar: 3, einfrierbar: true });
});

test('Haltbarkeit: ohne Angabe am Rezept und bei Einzelzutaten keine Warnung', () => {
  const rezepte = new Map([['r1', REZEPT]]);
  assert.equal(haltbarkeitsWarnungen([{ id: 'a', datum: '2026-11-09', rezeptId: 'r1' }, { id: 'b', datum: '2026-11-19', rezeptId: 'r1' }, { id: 'c', datum: '2026-11-09' }], rezepte).size, 0);
});

const Z = [
  { id: 'apfel', name: 'Apfel', kategorie: 'obst' },
  { id: 'brokkoli', name: 'Brokkoli', kategorie: 'gemuese' },
  { id: 'gurke', name: 'Gurke', kategorie: 'gemuese' },
  { id: 'pilz', name: 'Pilze', kategorie: 'gemuese' },
  { id: 'reis', name: 'Reis', kategorie: 'getreide' },
];
const V = new Map([['brokkoli', { mag: 'K' }], ['gurke', { mag: 'R' }], ['pilz', { mag: 'N' }]]);
const ids = (liste) => liste.map((z) => z.id);

test('Mag-Liste: fünf Stufen, nur Obst und Gemüse', () => {
  assert.deepEqual(MAG.map((m) => m.id), ['J', 'R', 'K', 'N', 'S']);
  assert.equal(istObstGemuese(Z[0]), true);
  assert.equal(istObstGemuese(Z[4]), false);
});

test('Vorschläge: Nein fällt weg, roh und gekocht werden beachtet, Unbekanntes bleibt', () => {
  assert.deepEqual(ids(vorschlaege(Z, V)), ['apfel', 'brokkoli', 'gurke']);
  assert.deepEqual(ids(vorschlaege(Z, V, 'gekocht')), ['apfel', 'brokkoli']);
  assert.deepEqual(ids(vorschlaege(Z, V, 'roh')), ['apfel', 'gurke']);
});

test('Suchlisten: Nein rutscht ans Ende, Hinweise nennen die Einschränkung', () => {
  assert.deepEqual(ids(sortiereNachVorliebe(Z, V)), ['apfel', 'brokkoli', 'gurke', 'reis', 'pilz']);
  assert.equal(magHinweis({ mag: 'N' }), 'magst du nicht');
  assert.equal(magHinweis({ mag: 'K' }), 'magst du nur gekocht');
  assert.equal(magHinweis({ mag: 'S', notiz: 'nur geschält' }), 'Sonderfall: nur geschält');
  assert.equal(magHinweis({ mag: 'J' }), '');
  assert.equal(magHinweis(undefined), '');
});
