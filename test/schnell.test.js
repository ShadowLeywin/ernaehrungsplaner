// Alle Werte in diesem Test sind erfunden.
import assert from 'node:assert/strict';
import test from 'node:test';
import { fuerMenge } from '../js/logik/naehrwerte.js';
import { SCHNELL_NAME, kcalAusMakros, pruefeSchnell, schnellAlsText, schnellEintrag } from '../js/logik/schnell.js';

test('Schnell eintragen: kcal reichen, Komma erlaubt, Name fällt auf Standard', () => {
  const r = pruefeSchnell({ name: '  ', kcal: '650,5' });
  assert.deepEqual(r, { ok: true, name: SCHNELL_NAME, je100: { kcal: 650.5 } });
});

test('Schnell eintragen: ohne kcal rechnet Elan aus den Makros, mit kcal bleibt die Eingabe', () => {
  assert.equal(kcalAusMakros({ protein: 30, kh: 50, fett: 20 }), 500);
  assert.deepEqual(pruefeSchnell({ name: 'Mensa', protein: '30', kh: '50', fett: '20' }).je100, { protein: 30, kh: 50, fett: 20, kcal: 500 });
  assert.equal(pruefeSchnell({ kcal: '420', protein: '30' }).je100.kcal, 420);
});

test('Schnell eintragen: leer oder unsinnig ergibt Fehler je Feld', () => {
  assert.deepEqual(Object.keys(pruefeSchnell({ name: 'Döner' }).fehler), ['kcal']);
  const r = pruefeSchnell({ kcal: '-5', fett: 'viel' });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.fehler).sort(), ['fett', 'kcal']);
  assert.equal(pruefeSchnell({ kcal: '9000' }).ok, false);
});

test('Schnell-Eintrag rechnet als eine Portion und lässt sich zurück ins Formular holen', () => {
  const e = schnellEintrag({ name: 'Döner', je100: { kcal: 700, protein: 35 } }, '2026-11-15', 'mittag');
  assert.deepEqual(fuerMenge(e.je100, e.gramm), { kcal: 700, protein: 35 });
  assert.equal(e.schnell, true);
  assert.equal('zutatId' in e, false);
  assert.deepEqual(schnellAlsText(e), { name: 'Döner', kcal: '700', protein: '35', kh: '', fett: '' });
  assert.equal(schnellAlsText({ ...e, name: SCHNELL_NAME }).name, '');
});
