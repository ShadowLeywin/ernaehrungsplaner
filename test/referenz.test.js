import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { NAEHRSTOFFE } from '../js/logik/naehrwerte.js';
import { bereinigeGruppe, prozent, werteFuer } from '../js/logik/referenz.js';

const daten = JSON.parse(readFileSync(new URL('../data/referenzwerte.json', import.meta.url), 'utf8'));

test('Datei: Quelle, Stand, Abrufdatum und vier Altersgruppen', () => {
  assert.equal(daten.schemaVersion, 1);
  assert.match(daten.quelle, /DGE/);
  assert.match(daten.abgerufen, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(daten.altersgruppen.map((a) => a.id), ['19', '25', '51', '65']);
});

test('Datei: nur bekannte Nährstoffe, je Geschlecht vier positive Werte', () => {
  const bekannt = new Set(NAEHRSTOFFE.map((n) => n.id));
  for (const [id, eintrag] of Object.entries(daten.werte)) {
    assert.ok(bekannt.has(id), id);
    for (const g of ['m', 'w']) {
      assert.equal(eintrag[g].length, 4, `${id} ${g}`);
      assert.ok(eintrag[g].every((w) => typeof w === 'number' && w > 0), `${id} ${g}`);
    }
  }
  assert.ok(Object.keys(daten.werte).length >= 20);
});

test('Stichproben gegen die DGE-Tabellen (Stand Mai 2026)', () => {
  const m25 = werteFuer(daten, { geschlecht: 'm', alter: '25' });
  const w25 = werteFuer(daten, { geschlecht: 'w', alter: '25' });
  const w51 = werteFuer(daten, { geschlecht: 'w', alter: '51' });
  const m65 = werteFuer(daten, { geschlecht: 'm', alter: '65' });
  assert.equal(m25.vitC.wert, 110);
  assert.equal(w25.vitC.wert, 95);
  assert.equal(m25.vitB1.wert, 1.2);
  assert.equal(w25.eisen.wert, 16);
  assert.equal(w51.eisen.wert, 14);
  assert.equal(m25.zink.wert, 14);
  assert.equal(m65.vitB3.wert, 14);
  assert.equal(m65.vitK.wert, 80);
  assert.equal(m25.jod.wert, 150);
  assert.match(m25.zink.hinweis, /Phytat/);
});

test('bereinigeGruppe: nur vollständige, bekannte Angaben', () => {
  assert.deepEqual(bereinigeGruppe({ geschlecht: 'w', alter: '19' }, daten), { geschlecht: 'w', alter: '19' });
  assert.equal(bereinigeGruppe({ geschlecht: 'w' }, daten), null);
  assert.equal(bereinigeGruppe({ geschlecht: 'x', alter: '25' }, daten), null);
  assert.equal(bereinigeGruppe(null, daten), null);
  assert.deepEqual(werteFuer(daten, null), {});
});

test('prozent rundet und verträgt fehlende Werte', () => {
  assert.equal(prozent(55, 110), 50);
  assert.equal(prozent(0.6, 1.2), 50);
  assert.equal(prozent(10, 0), null);
  assert.equal(prozent(undefined, 10), null);
});
