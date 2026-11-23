import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { baueUebernahme, entferneZaeune, lesePlanImport, offeneZutaten, promptVorlage } from '../js/logik/planimport.js';

const BEISPIEL = readFileSync(new URL('./daten/import-plan.json', import.meta.url), 'utf8');
const ZUTATEN = [
  { id: 'basis:haferflocken', name: 'Haferflocken', je100: { kcal: 370 } },
  { id: 'basis:apfel', name: 'Apfel', je100: { kcal: 52 }, portionen: [{ name: 'Stück', gramm: 170 }] },
  { id: 'basis:reis', name: 'Reis', je100: { kcal: 350 } },
  { id: 'basis:reiswaffeln', name: 'Reiswaffeln', je100: { kcal: 380 } },
];
let zaehler = 0;
const neueId = () => `id${++zaehler}`;

test('Zäune und Text drumherum werden entfernt', () => {
  assert.equal(entferneZaeune('Hier:\n```json\n{"a":1}\n```\nViel Spaß'), '{"a":1}');
  assert.equal(entferneZaeune('Klar! {"a":1} Gern.'), '{"a":1}');
});

test('Ganze Datei abgelehnt: kein JSON, falsches Format, leer', () => {
  assert.match(lesePlanImport('kein json').fehler[0], /kein gültiges JSON/);
  assert.match(lesePlanImport('{"format":"anders","version":1}').fehler[0], /elan-import/);
  assert.match(lesePlanImport('{"format":"elan-import","version":2}').fehler[0], /"version": 1/);
  assert.match(lesePlanImport('{"format":"elan-import","version":1}').fehler[0], /weder Rezepte noch Plan/);
});

test('Beispielplan: Zuordnung nur bei ganzen Wörtern, ungültige Zeilen werden genannt', () => {
  const e = lesePlanImport(`\`\`\`json\n${BEISPIEL}\n\`\`\``, { zutaten: ZUTATEN });
  assert.equal(e.ok, true);
  assert.equal(e.rezepte.length, 1);
  const brei = e.rezepte[0];
  assert.deepEqual(brei.zutaten.map((z) => [z.name, z.treffer?.id ?? null, z.gramm]), [['Haferflocken', 'basis:haferflocken', 120], ['Apfel', 'basis:apfel', 170], ['Zauberpulver', null, 10]]);
  assert.equal(e.plan.length, 3);
  assert.equal(e.plan.find((p) => p.zutatName === 'Reis').treffer.id, 'basis:reis'); // nicht Reiswaffeln
  assert.equal(e.plan.find((p) => p.zutatName === 'Drachenfrucht-Chips').treffer, null);
  assert.deepEqual(e.abgelehnt.map((a) => a.wo), ['Plan 4 (2026-12-02)', 'Plan 5 (2026-12-03)']);
  assert.match(e.abgelehnt[0].grund, /Unbekannte Mahlzeit „brunch“/);
  assert.deepEqual(offeneZutaten(e), ['Zauberpulver', 'Drachenfrucht-Chips']);
  assert.deepEqual(e.quelle, { art: 'chat', notiz: 'Beispielplan, erfunden für Tests' });
});

test('Übernahme: Rezept mit Portion, offene Zutaten ausgelassen oder gewählt', () => {
  const e = lesePlanImport(BEISPIEL, { zutaten: ZUTATEN });
  const ohneWahl = baueUebernahme(e, { neueId, jetzt: '2026-11-23T10:00:00Z' });
  assert.equal(ohneWahl.rezepte.length, 1);
  assert.deepEqual(ohneWahl.rezepte[0].zutaten.map((z) => [z.zutatId, z.gramm]), [['basis:haferflocken', 120], ['basis:apfel', 170]]);
  const brei = ohneWahl.plan.find((p) => p.rezeptId);
  assert.equal(brei.gramm, 145); // (120 + 170) / 2 Portionen
  assert.equal(brei.zutatId, `rezept:${ohneWahl.rezepte[0].id}`);
  assert.equal(ohneWahl.plan.length, 2);
  assert.deepEqual(ohneWahl.ausgelassen, ['Testbrei: „Zauberpulver“ ohne passende Zutat', '2026-12-02: „Drachenfrucht-Chips“ ohne passende Zutat']);
  const mitWahl = baueUebernahme(e, { neueId, wahl: new Map([['drachenfrucht chips', ZUTATEN[1]]]) });
  assert.equal(mitWahl.plan.length, 3);
  assert.equal(mitWahl.plan.at(-1).zutatId, 'basis:apfel');
});

test('Vorhandenes Rezept wird genutzt, nicht doppelt angelegt', () => {
  const vorhanden = [{ id: 'alt', name: 'Testbrei', portionen: 1, zutaten: [{ zutatId: 'basis:reis', gramm: 100, je100: { kcal: 350 } }] }];
  const datei = JSON.stringify({ format: 'elan-import', version: 1, plan: [{ datum: '2026-12-01', mahlzeit: 'abend', rezept: 'testbrei', portionen: 2 }] });
  const e = lesePlanImport(datei, { zutaten: ZUTATEN, rezepte: vorhanden });
  assert.equal(e.abgelehnt.length, 0);
  const u = baueUebernahme(e, { neueId, vorhandene: vorhanden });
  assert.equal(u.rezepte.length, 0);
  assert.deepEqual([u.plan[0].rezeptId, u.plan[0].gramm], ['alt', 200]);
});

test('Mehr als 62 Tage werden abgelehnt', () => {
  const datei = JSON.stringify({ format: 'elan-import', version: 1, plan: [
    { datum: '2026-12-01', mahlzeit: 'mittag', zutat: 'Reis', gramm: 80 },
    { datum: '2027-02-15', mahlzeit: 'mittag', zutat: 'Reis', gramm: 80 },
  ] });
  const e = lesePlanImport(datei, { zutaten: ZUTATEN });
  assert.equal(e.plan.length, 1);
  assert.match(e.abgelehnt[0].grund, /62 Tage/);
});

test('Prompt-Vorlage nennt Zeitraum und alle Mahlzeiten, keine Nährwerte', () => {
  const p = promptVorlage({ von: '2026-12-01', bis: '2026-12-31', inhalt: 'Montag: Haferbrei' });
  assert.match(p, /Zeitraum: 2026-12-01 bis 2026-12-31/);
  assert.match(p, /fruehstueck, morgensnack, mittag, nachmittagssnack, abend, abendsnack/);
  assert.match(p, /Keine Nährwerte/);
  assert.ok(p.endsWith('Montag: Haferbrei'));
});
