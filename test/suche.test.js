import assert from 'node:assert/strict';
import test from 'node:test';
import { normalisiere, sucheZutaten, zuletztVerwendet } from '../js/logik/suche.js';

const z = (name, marke) => ({ id: name, name, marke });
const LISTE = [z('Haferflocken'), z('Haferdrink'), z('Käse, Gouda'), z('Quark', 'Hofgut Käsemann'), z('Apfel'), z('Vollkornbrot mit Hafer')];
const namen = (liste) => liste.map((x) => x.name);

test('normalisiere gleicht Umlaute, ß und Großschreibung an', () => {
  assert.equal(normalisiere('Käse'), normalisiere('kaese'));
  assert.equal(normalisiere('Käse'), normalisiere('KASE'));
  assert.equal(normalisiere('Weißbrot'), normalisiere('weissbrot'));
  assert.equal(normalisiere('  Rote-Bete  Saft '), 'rote bete saft');
});

test('leerer Begriff liefert alles alphabetisch', () => {
  assert.deepEqual(namen(sucheZutaten(LISTE, '')), ['Apfel', 'Haferdrink', 'Haferflocken', 'Käse, Gouda', 'Quark', 'Vollkornbrot mit Hafer']);
});

test('Treffer am Namensanfang stehen vor Treffern mitten im Namen', () => {
  assert.deepEqual(namen(sucheZutaten(LISTE, 'hafer')), ['Haferdrink', 'Haferflocken', 'Vollkornbrot mit Hafer']);
});

test('die Suche findet ohne Umlaute und in der Marke', () => {
  assert.deepEqual(namen(sucheZutaten(LISTE, 'kase')), ['Käse, Gouda', 'Quark']);
});

test('mehrere Wörter müssen alle vorkommen', () => {
  assert.deepEqual(namen(sucheZutaten(LISTE, 'brot hafer')), ['Vollkornbrot mit Hafer']);
  assert.deepEqual(sucheZutaten(LISTE, 'hafer banane'), []);
});

test('limit begrenzt die Trefferzahl', () => {
  assert.equal(sucheZutaten(LISTE, '', 2).length, 2);
});

test('zuletztVerwendet: neueste zuerst, jede Zutat einmal', () => {
  const eintraege = [
    { zutatId: 'a', erstellt: '2026-11-10T08:00:00Z' },
    { zutatId: 'b', erstellt: '2026-11-12T08:00:00Z' },
    { zutatId: 'a', erstellt: '2026-11-13T08:00:00Z' },
    { erstellt: '2026-11-14T08:00:00Z' },
  ];
  assert.deepEqual(zuletztVerwendet(eintraege), ['a', 'b']);
  assert.deepEqual(zuletztVerwendet(eintraege, 1), ['a']);
});
