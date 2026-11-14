// Alle Werte in diesem Test sind erfunden.
import assert from 'node:assert/strict';
import test from 'node:test';
import { coachBericht } from '../js/logik/coach.js';
import { STANDARD_GESUNDHEIT } from '../js/logik/gesundheit.js';
import { wochenTage } from '../js/logik/woche.js';
import { STANDARD_WOCHE, STANDARD_ZIELE } from '../js/logik/ziele.js';
import { verschiebe } from '../js/logik/datum.js';

const tage = wochenTage('2026-11-11');
const e = (id, datum, name, kcal, protein) => ({ id, datum, slot: 'mittag', name, gramm: 100, je100: { kcal, protein, kh: 10, fett: 5, ballaststoffe: 3 } });
const basis = {
  tage, stichtag: tage[6], ziele: STANDARD_ZIELE, wochenplan: STANDARD_WOCHE, tagSaetze: new Map(),
  eintraege: [], messungen: [], gesundheit: STANDARD_GESUNDHEIT, symptome: [], supplements: [],
};

test('leere Woche: ehrlicher Kurzbericht ohne leere Abschnitte', () => {
  const text = coachBericht(basis);
  assert.match(text, /^Wochenbericht 9\. November bis 15\. November 2026/);
  assert.match(text, /Keine Einträge in dieser Woche\./);
  for (const abschnitt of ['GEWICHT', 'ALLTAG', 'SUPPLEMENTS', 'SYMPTOME']) assert.ok(!text.includes(abschnitt), abschnitt);
});

test('Ernährung: Schnitt über Tage mit Einträgen, Ziel je Tagestyp, Tagesliste, häufigste Lebensmittel', () => {
  const text = coachBericht({
    ...basis,
    eintraege: [e('1', tage[0], 'Testbrot', 2000, 100), e('2', tage[0], 'Testapfel', 400, 20), e('3', tage[1], 'Testbrot', 2600, 160)],
  });
  // Montag (Gym, 2.700) 2.400 kcal, Dienstag (Calisthenics, 2.500) 2.600 kcal → Schnitt 2.500, Ziel im Schnitt 2.600
  assert.match(text, /Schnitt je Tag aus 2 Tagen mit Einträgen/);
  assert.match(text, /- Energie: 2\.500 kcal \(2\.600\)/);
  assert.match(text, /- Eiweiß: 140 g \(150\)/);
  assert.match(text, /- Mo 09\.11\. Gym: 2\.400 von 2\.700 kcal, Eiweiß 120 von 150 g/);
  assert.match(text, /- Mi 11\.11\. Gym: kein Eintrag/);
  assert.match(text, /Am häufigsten gegessen: Testbrot \(2 Tage\), Testapfel \(1 Tag\)/);
});

test('abweichender Tagestyp eines Tages wird beachtet', () => {
  const text = coachBericht({ ...basis, eintraege: [e('1', tage[0], 'Testbrot', 2000, 100)], tagSaetze: new Map([[tage[0], { datum: tage[0], tagestyp: 'rest' }]]) });
  assert.match(text, /- Mo 09\.11\. Rest: 2\.000 von 2\.300 kcal/);
});

test('Gewicht, Alltag, Supplements und Symptome erscheinen, wenn Daten da sind', () => {
  const gewicht = (start, wert) => Array.from({ length: 7 }, (_, i) => ({ id: `g${start}${i}`, art: 'gewicht', datum: verschiebe(start, i), wert }));
  const text = coachBericht({
    ...basis,
    eintraege: [e('1', tage[2], 'Testmilch', 500, 30)],
    gesundheit: { ...STANDARD_GESUNDHEIT, wochenzielKg: 0.25 },
    messungen: [
      ...gewicht(verschiebe(tage[0], -7), 80), ...gewicht(tage[0], 80.3),
      { id: 's1', art: 'schlaf', datum: tage[0], wert: 7 }, { id: 's2', art: 'schlaf', datum: tage[1], wert: 8 },
      { id: 'w1', art: 'wasser', datum: tage[0], wert: 500 }, { id: 'w2', art: 'wasser', datum: tage[0], wert: 1500 },
      { id: 'x1', art: 'schritte', datum: tage[0], wert: 9000 },
    ],
    supplements: [{ id: 'sup1', name: 'Testpulver', dosis: '5 g' }],
    tagSaetze: new Map([[tage[0], { datum: tage[0], supplements: ['sup1'] }], [tage[3], { datum: tage[3], supplements: ['sup1'] }]]),
    symptome: [{ id: 'sy1', datum: tage[2], zeit: '14:30', art: 'Testsymptom', staerke: 3, eintragIds: ['1'], notiz: 'nach dem Essen' }],
  });
  assert.match(text, /GEWICHT\n- 7-Tage-Schnitt 80,3 kg, \+0,3 kg zur Vorwoche, Wochenziel \+0,25 kg/);
  assert.match(text, /- Schlaf: 7,5 h im Schnitt aus 2 Nächten \(Ziel 8 h\)/);
  assert.match(text, /- Wasser: 2\.000 ml im Schnitt aus 1 Tag \(Ziel 2\.500 ml\)/);
  assert.match(text, /- Schritte: 9\.000 im Schnitt aus 1 Tag \(Ziel 8\.000\)/);
  assert.match(text, /- Testpulver \(5 g\): an 2 von 7 Tagen/);
  assert.match(text, /- Mi 11\.11\. 14:30 Testsymptom, Stärke 3 von 5; davor: Testmilch; nach dem Essen/);
  assert.match(text, /Selbstangaben aus der App Elan\.$/);
});
