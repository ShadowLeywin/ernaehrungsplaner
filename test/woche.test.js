import assert from 'node:assert/strict';
import test from 'node:test';
import { fuellRadius, segmente } from '../js/logik/scheibe.js';
import { kopiereEintraege, wochenSchnitt, wochenTage } from '../js/logik/woche.js';
import { SLOTS, STANDARD_ANTEILE, bereinigeAnteile, pruefeAnteile, slotsMitAnteilen } from '../js/logik/ziele.js';

test('wochenTage: Montag bis Sonntag, auch über den Monatswechsel', () => {
  assert.deepEqual(wochenTage('2026-11-13'), ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']);
  assert.equal(wochenTage('2026-11-09')[0], '2026-11-09');
  assert.equal(wochenTage('2026-11-15')[6], '2026-11-15');
  assert.deepEqual([wochenTage('2026-12-01')[0], wochenTage('2026-12-01')[6]], ['2026-11-30', '2026-12-06']);
});

test('wochenSchnitt teilt durch die Tage mit Einträgen, nicht durch sieben', () => {
  const e = (datum, kcal) => ({ datum, gramm: 100, je100: { kcal, vitC: 10 } });
  const { tage, schnitt } = wochenSchnitt([e('2026-11-09', 1000), e('2026-11-09', 1000), e('2026-11-11', 1000)]);
  assert.equal(tage, 2);
  assert.equal(schnitt.kcal, 1500);
  assert.equal(schnitt.vitC, 15);
});

test('wochenSchnitt ohne Einträge', () => {
  assert.deepEqual(wochenSchnitt([]), { tage: 0, schnitt: {} });
});

test('kopiereEintraege: neues Datum, keine id, Werte unverändert', () => {
  const quelle = [{ id: 'x', erstellt: 'jetzt', datum: '2026-11-12', slot: 'mittag', name: 'A', gramm: 50, je100: { kcal: 1 } }];
  const kopie = kopiereEintraege(quelle, '2026-11-13');
  assert.deepEqual(kopie, [{ datum: '2026-11-13', slot: 'mittag', name: 'A', gramm: 50, je100: { kcal: 1 } }]);
  assert.equal(kopiereEintraege(quelle, '2026-11-13', 'abend')[0].slot, 'abend');
  assert.equal(quelle[0].id, 'x'); // Quelle bleibt unberührt
});

test('Startwerte der Anteile ergeben 100 %', () => {
  assert.equal(Object.values(STANDARD_ANTEILE).reduce((a, b) => a + b, 0), 100);
});

test('bereinigeAnteile nimmt nur vollständige Angaben mit Summe 100', () => {
  const eigen = { fruehstueck: 30, morgensnack: 0, mittag: 30, nachmittagssnack: 10, abend: 30, abendsnack: 0 };
  assert.deepEqual(bereinigeAnteile(eigen), eigen);
  assert.deepEqual(bereinigeAnteile({ ...eigen, abend: 20 }), STANDARD_ANTEILE);
  assert.deepEqual(bereinigeAnteile({ fruehstueck: 100 }), STANDARD_ANTEILE);
  assert.deepEqual(bereinigeAnteile(null), STANDARD_ANTEILE);
});

test('slotsMitAnteilen liefert Bruchteile für die Tagesscheibe', () => {
  const slots = slotsMitAnteilen({ fruehstueck: 30, morgensnack: 0, mittag: 30, nachmittagssnack: 10, abend: 30, abendsnack: 0 });
  assert.equal(slots.length, SLOTS.length);
  assert.equal(slots[0].anteil, 0.3);
  assert.equal(slots[1].anteil, 0);
  assert.equal(slots[0].name, 'Frühstück');
});

test('pruefeAnteile: Summe muss 100 sein, Meldung nennt die Differenz', () => {
  const basis = { fruehstueck: '25', morgensnack: '8', mittag: '27', nachmittagssnack: '10', abend: '25', abendsnack: '5' };
  assert.equal(pruefeAnteile(basis).ok, true);
  assert.equal(pruefeAnteile({ ...basis, abend: '12,5', abendsnack: '17,5' }).ok, true);
  const zuWenig = pruefeAnteile({ ...basis, abendsnack: '0' });
  assert.equal(zuWenig.ok, false);
  assert.match(zuWenig.fehler, /95 %.*fehlen 5 %/);
  assert.match(pruefeAnteile({ ...basis, abendsnack: '10' }).fehler, /105 %.*5 % zu viel/);
  assert.match(pruefeAnteile({ ...basis, mittag: 'viel' }).fehler, /Mittagessen/);
  assert.match(pruefeAnteile({ ...basis, mittag: '' }).fehler, /Mittagessen/);
});

test('Tagesscheibe: Slot mit 0 % hat kein sichtbares Segment, die anderen füllen den Kreis', () => {
  const slots = slotsMitAnteilen({ fruehstueck: 30, morgensnack: 0, mittag: 30, nachmittagssnack: 10, abend: 30, abendsnack: 0 });
  const s = segmente(slots, { morgensnack: 200 }, 2000, 4);
  assert.deepEqual(s.map((x) => x.sichtbar), [true, false, true, true, true, false]);
  assert.equal(s[1].anteil, 0); // kein Ziel, also kein Füllstand
  assert.ok(fuellRadius(50, 96, s[0].anteil) >= 50);
});
