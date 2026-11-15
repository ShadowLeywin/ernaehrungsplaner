// Alle Werte in diesem Test sind erfunden.
import assert from 'node:assert/strict';
import test from 'node:test';
import { fuerMenge, summeEintraege } from '../js/logik/naehrwerte.js';
import { bereinigeGerichte, fuegeZusammen, gerichtId, korbEintraege, korbSumme, leseUnterwegsDatei, pruefeGericht, restaurants, setzeGericht } from '../js/logik/unterwegs.js';

const burger = { restaurant: 'Testgrill', name: 'Testburger', kcal: 500, protein: 25, kh: 40, fett: 25 };
const pommes = { restaurant: 'Testgrill', name: 'Pommes M', kcal: 330, protein: 4, kh: 42, fett: 16 };
const wrap = { restaurant: 'Wrapladen', name: 'Wrap', kcal: 450 };

test('Gericht prüfen: Restaurant und Name nötig, Werte wie bei „Schnell eintragen“', () => {
  const ok = pruefeGericht({ restaurant: ' Testgrill ', name: 'Testburger', kcal: '500', protein: '25,5' });
  assert.deepEqual(ok, { ok: true, gericht: { id: 'testgrill|testburger', restaurant: 'Testgrill', name: 'Testburger', kcal: 500, protein: 25.5 } });
  const leer = pruefeGericht({});
  assert.deepEqual(Object.keys(leer.fehler).sort(), ['kcal', 'name', 'restaurant']);
});

test('Liste bereinigen: Unbrauchbares weg, Doppelte einmal, sortiert; Restaurants alphabetisch', () => {
  const liste = bereinigeGerichte([wrap, burger, { ...burger, kcal: 510 }, { restaurant: '', name: 'x', kcal: 1 }, { restaurant: 'A', name: 'y' }, null]);
  assert.deepEqual(liste.map((g) => `${g.restaurant}/${g.name}/${g.kcal}`), ['Testgrill/Testburger/510', 'Wrapladen/Wrap/450']);
  assert.deepEqual(restaurants(bereinigeGerichte([wrap, burger, pommes])), ['Testgrill', 'Wrapladen']);
});

test('Gericht umbenennen ersetzt das alte statt es zu verdoppeln', () => {
  const liste = bereinigeGerichte([burger, pommes]);
  const neu = setzeGericht(liste, { ...burger, name: 'Testburger XL', id: gerichtId('Testgrill', 'Testburger XL') }, gerichtId('Testgrill', 'Testburger'));
  assert.deepEqual(neu.map((g) => g.name), ['Pommes M', 'Testburger XL']);
});

test('Bestellung: Summe und Einträge rechnen gleich', () => {
  const liste = bereinigeGerichte([burger, pommes, wrap]);
  const korb = new Map([[gerichtId('Testgrill', 'Testburger'), 2], [gerichtId('Testgrill', 'Pommes M'), 1], [gerichtId('Wrapladen', 'Wrap'), 0]]);
  assert.deepEqual(korbSumme(liste, korb), { anzahl: 3, kcal: 1330, protein: 54, kh: 122, fett: 66 });
  const eintraege = korbEintraege(liste, korb, '2026-11-15', 'mittag');
  assert.deepEqual(eintraege.map((e) => `${e.name} (${e.marke})`), ['Pommes M (Testgrill)', '2× Testburger (Testgrill)']);
  assert.ok(eintraege.every((e) => e.schnell && e.gramm === 100 && e.datum === '2026-11-15' && e.slot === 'mittag'));
  assert.equal(summeEintraege(eintraege).kcal, 1330);
  assert.deepEqual(fuerMenge(eintraege[0].je100, 100), { kcal: 330, protein: 4, kh: 42, fett: 16 });
});

test('Datei lesen: Format prüfen, Gerichte übernehmen, Unbrauchbares zählen', () => {
  const datei = { format: 'elan-unterwegs', version: 1, quelle: 'Nährwerttabelle Testgrill', stand: '2026-11-01', restaurants: [{ name: 'Testgrill', gerichte: [burger, pommes, { name: 'ohne Werte' }] }] };
  const r = leseUnterwegsDatei(JSON.stringify(datei));
  assert.equal(r.ok, true);
  assert.equal(r.gerichte.length, 2);
  assert.equal(r.verworfen, 1);
  assert.equal(r.stand, '2026-11-01');
  assert.equal(leseUnterwegsDatei('{kaputt').ok, false);
  assert.match(leseUnterwegsDatei('{"format":"anders"}').fehler, /keine Unterwegs-Liste/);
  assert.match(leseUnterwegsDatei({ ...datei, version: 2 }).fehler, /Version 2/);
  const zusammen = fuegeZusammen(bereinigeGerichte([{ ...burger, kcal: 1 }, wrap]), r.gerichte);
  assert.deepEqual(zusammen.map((g) => `${g.name}:${g.kcal}`), ['Pommes M:330', 'Testburger:500', 'Wrap:450']);
});
