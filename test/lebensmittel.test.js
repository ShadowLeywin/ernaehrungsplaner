import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NAEHRSTOFFE, KATEGORIEN, naehrwerteFuerMenge, istUnvollstaendig } from '../js/logic/naehrstoffe.js';
import { kcalAusMakros } from '../js/logic/ziele.js';
import { sucheLebensmittel } from '../js/lebensmittel.js';

const daten = JSON.parse(readFileSync(new URL('../data/lebensmittel.json', import.meta.url), 'utf8'));
const finde = (id) => daten.lebensmittel.find((l) => l.id === id);

test('lebensmittel.json: Version und Inhalt vorhanden', () => {
  assert.equal(daten.version, 1);
  assert.ok(daten.lebensmittel.length >= 150);
});

test('jedes Lebensmittel: eindeutige id, gültige Kategorie, Makros vorhanden', () => {
  const ids = new Set();
  for (const l of daten.lebensmittel) {
    assert.ok(!ids.has(l.id), `doppelt: ${l.id}`);
    ids.add(l.id);
    assert.ok(KATEGORIEN[l.kategorie], `${l.id}: Kategorie ${l.kategorie}`);
    for (const k of ['kcal', 'protein', 'kh', 'fett']) {
      assert.equal(typeof l.je100g[k], 'number', `${l.id}: ${k} fehlt`);
      assert.ok(l.je100g[k] >= 0, `${l.id}: ${k} negativ`);
    }
    for (const k of Object.keys(l.je100g)) assert.ok(NAEHRSTOFFE[k], `${l.id}: unbekannter Nährstoff ${k}`);
  }
});

test('kcal passen grob zu den Makros (Ballaststoffe mit 2 kcal/g)', () => {
  for (const l of daten.lebensmittel) {
    const w = l.je100g;
    const geschaetzt = kcalAusMakros(w) + 2 * (w.ballaststoffe ?? 0);
    const toleranz = Math.max(25, w.kcal * 0.15);
    assert.ok(Math.abs(geschaetzt - w.kcal) <= toleranz, `${l.id}: ${w.kcal} kcal vs. ${Math.round(geschaetzt)} aus Makros`);
  }
});

test('Kohlenhydrate nach EU-Kennzeichnung (ohne Ballaststoffe)', () => {
  // USDA: Brokkoli 6,64 g KH inkl. 2,6 g Ballaststoffe → 4,04 g
  assert.equal(finde('brokkoli').je100g.kh, 4.04);
});

test('Stichproben: Lachs liefert EPA+DHA, Haferflocken Ballaststoffe', () => {
  assert.ok(finde('lachs').je100g.epaDha > 1000);
  assert.ok(finde('haferflocken').je100g.ballaststoffe > 8);
});

test('Suche ignoriert Groß-/Kleinschreibung und Umlaute', () => {
  const ids = (anfrage) => sucheLebensmittel(daten.lebensmittel, anfrage).map((l) => l.id);
  assert.ok(ids('broK').includes('brokkoli'));
  assert.ok(ids('walnüsse').includes('walnuesse'));
  assert.ok(ids('walnuesse').includes('walnuesse'));
  assert.ok(ids('honig manuka').includes('manuka_honig'));
});

test('Nährwerte für eine Menge umrechnen', () => {
  const w = naehrwerteFuerMenge({ kcal: 200, protein: 10 }, 50);
  assert.deepEqual(w, { kcal: 100, protein: 5 });
});

test('Unvollständig: eigene Richtwerte ohne Mikros werden erkannt, USDA nicht', () => {
  assert.equal(istUnvollstaendig(finde('skyr').je100g), true);
  assert.equal(istUnvollstaendig(finde('brokkoli').je100g), false);
});
