import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chronik, tagHatInhalt } from '../js/logic/chronik.js';
import { UEBUNGEN } from '../js/daten/uebungen.js';
import { uebungsVerzeichnis } from '../js/logic/training.js';
import { beispielProfil } from './beispielprofil.js';

const kontext = { profil: beispielProfil(), lebensmittel: [], verzeichnis: uebungsVerzeichnis(UEBUNGEN) };
const tag = {
  datum: '2026-10-01', eintraege: [], supplements: {}, morningStackGenommen: false, gewichtKg: 80.4,
  wasser: [{ ml: 1500, zeit: '2026-10-01T08:00:00Z' }],
  trainings: [
    { id: 'a', typ: 'workout', name: 'Push 1', start: '2026-10-01T15:00:00Z', ende: 'x', dauerMin: 60, uebungen: [{ uebungId: 'bankdruecken_lh', saetze: [{ wdh: 10, kg: 100, erledigt: true }] }], rekorde: [{}] },
    { id: 'b', typ: 'aktivitaet', uebungId: 'laufen', dauerMin: 30, km: 5 },
  ],
};

test('Chronik episch und schlicht', () => {
  const episch = chronik(tag, kontext, 'episch');
  assert.equal(episch[0], 'Auf dem Übungsplatz: „Push 1“ – 1 Satz, 1 t bewegt, 1 neue Bestmarke.');
  assert.equal(episch[1], '5 km Laufen – 30 Minuten unterwegs.');
  assert.match(episch.join(' '), /Quelle spendete 1,5 l/);
  const schlicht = chronik(tag, kontext, 'schlicht');
  assert.equal(schlicht[0], 'Training „Push 1“: 1 Satz, 1 t, 60 min, 1 Rekord.');
  assert.equal(schlicht.at(-1), 'Gewicht: 80,4 kg.');
});

test('Leerer Tag', () => {
  const leer = { datum: '2026-10-02', eintraege: [], trainings: [], wasser: [] };
  assert.deepEqual(chronik(leer, kontext, 'schlicht'), ['Keine Einträge.']);
  assert.equal(tagHatInhalt(leer), false);
  assert.equal(tagHatInhalt({ ...leer, tagebuch: { stimmung: 4 } }), true);
});
