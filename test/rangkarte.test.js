import { test } from 'node:test';
import assert from 'node:assert/strict';
import { erstelleKarte, kodiereKarte, dekodiereKarte, codeAusLink } from '../js/logic/rangkarte.js';
import { rangAus } from '../js/logic/raenge.js';

const stand = {
  level: { level: 7 },
  klasse: { id: 'ausdauer+staerke' },
  raenge: { gesamt: rangAus(0.55), gruppen: { brust: rangAus(0.62), ruecken: null, schultern: rangAus(0.3), arme: null, beine: rangAus(1), rumpf: null } },
  werte: { staerke: 50, ausdauer: 45, tempo: 20, beweglichkeit: 10, willenskraft: 30, disziplin: 70 },
  bewertungen: [{ stufe: 0 }, { stufe: -1 }, { stufe: 3 }],
};

test('Karte hin und zurück (mit Umlauten)', () => {
  const karte = erstelleKarte(stand, 'Jörg 💪', new Date('2026-10-04T10:00:00Z'));
  const code = kodiereKarte(karte);
  assert.match(code, /^[A-Za-z0-9_-]+$/);
  const zurueck = dekodiereKarte(code);
  assert.equal(zurueck.name, 'Jörg 💪');
  assert.equal(zurueck.level, 7);
  assert.equal(zurueck.erfolge, 2);
  assert.deepEqual(zurueck.gesamt, { rangId: 'gold', stufe: 2 });
  assert.deepEqual(zurueck.gruppen.beine, { rangId: 'legende', stufe: null });
  assert.equal(zurueck.gruppen.ruecken, null);
  assert.equal(zurueck.werte.disziplin, 70);
});

test('Ungültige Karten werden abgelehnt', () => {
  assert.equal(dekodiereKarte('kaputt!'), null);
  assert.equal(dekodiereKarte(kodiereKarte({ v: 1, l: 5000, e: 1, w: [1, 2, 3, 4, 5, 6] })), null);
  assert.equal(dekodiereKarte(kodiereKarte({ v: 1, l: 5, e: 1, w: [1, 2, 3, 4, 5, 600] })), null);
  assert.equal(dekodiereKarte(kodiereKarte({ v: 1, l: 5, e: 1, w: [1, 2, 3, 4, 5, 6], m: { brust: [99, 1] } })), null);
  assert.equal(dekodiereKarte('x'.repeat(5000)), null);
});

test('Code aus Link', () => {
  assert.equal(codeAusLink('https://x.github.io/app/#/freunde/karte/abc_-1'), 'abc_-1');
  assert.equal(codeAusLink('abc'), 'abc');
  assert.equal(codeAusLink('hallo welt'), null);
});
