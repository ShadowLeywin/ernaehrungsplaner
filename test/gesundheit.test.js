// Alle Werte in diesen Tests sind erfunden.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ARTEN, STANDARD_GESUNDHEIT, bereinigeGesundheit, gewichtsTrend, gleitenderSchnitt, letzterWert, linienPunkte, messungId,
  pruefeGesundheit, pruefeMesswert, tagesSumme, tagesWert, verlauf,
} from '../js/logik/gesundheit.js';
import { verschiebe } from '../js/logik/datum.js';

const m = (art, datum, wert) => ({ id: `${art}|${datum}|${wert}`, art, datum, wert });
const reihe = (start, werte) => werte.map((w, i) => m('gewicht', verschiebe(start, i), w));

test('Arten: eindeutige Kennungen, sinnvolle Grenzen', () => {
  assert.equal(new Set(ARTEN.map((a) => a.id)).size, ARTEN.length);
  for (const a of ARTEN) assert.ok(a.name && a.min < a.max && ['einmal', 'summe'].includes(a.proTag), a.id);
});

test('pruefeMesswert: Komma erlaubt, Grenzen je Art', () => {
  assert.deepEqual(pruefeMesswert('gewicht', '80,4'), { ok: true, wert: 80.4 });
  assert.equal(pruefeMesswert('gewicht', '').ok, false);
  assert.equal(pruefeMesswert('gewicht', '5').ok, false);
  assert.match(pruefeMesswert('schlaf', '30').fehler, /Schlaf.*0 bis 24 h/);
  assert.equal(pruefeMesswert('schritte', '0').ok, true);
  assert.equal(pruefeMesswert('wasser', 'viel').ok, false);
});

test('messungId: ein Wert je Tag überschreibt, Wasser sammelt', () => {
  assert.equal(messungId('gewicht', '2026-11-14', 'x'), 'gewicht|2026-11-14');
  assert.equal(messungId('wasser', '2026-11-14', 'x'), 'wasser|2026-11-14|x');
});

test('tagesSumme, tagesWert, letzterWert', () => {
  const liste = [m('wasser', '2026-11-14', 250), m('wasser', '2026-11-14', 500), m('wasser', '2026-11-13', 1000), m('mass:taille', '2026-11-01', 85), m('mass:taille', '2026-11-10', 84.5)];
  assert.equal(tagesSumme(liste, 'wasser', '2026-11-14'), 750);
  assert.equal(tagesSumme(liste, 'wasser', '2026-11-12'), 0);
  assert.equal(tagesWert(liste, 'mass:taille', '2026-11-10'), 84.5);
  assert.equal(tagesWert(liste, 'mass:taille', '2026-11-11'), null);
  assert.deepEqual([letzterWert(liste, 'mass:taille', '2026-11-14').wert, letzterWert(liste, 'mass:taille', '2026-11-05').wert], [84.5, 85]);
  assert.equal(letzterWert(liste, 'schlaf', '2026-11-14'), null);
});

test('gleitenderSchnitt: sieben Tage bis einschließlich heute, Lücken zählen nicht', () => {
  const liste = [...reihe('2026-11-08', [80, 81, 80, 82]), m('gewicht', '2026-11-14', 81), m('gewicht', '2026-11-01', 60)];
  // 08. bis 14.: 80, 81, 80, 82, 81 → 80,8; der 01. liegt außerhalb
  const { schnitt, anzahl } = gleitenderSchnitt(liste, 'gewicht', '2026-11-14');
  assert.equal(anzahl, 5);
  assert.ok(Math.abs(schnitt - 80.8) < 1e-9);
  assert.deepEqual(gleitenderSchnitt([], 'gewicht', '2026-11-14'), { schnitt: null, anzahl: 0 });
});

test('gewichtsTrend: Änderung zur Vorwoche gegen das Wochenziel', () => {
  // Vorwoche Schnitt 80,0; diese Woche Schnitt 80,3 → +0,3 kg
  const liste = [...reihe('2026-11-01', [80, 80, 80, 80, 80, 80, 80]), ...reihe('2026-11-08', [80.3, 80.3, 80.3, 80.3, 80.3, 80.3, 80.3])];
  const imZiel = gewichtsTrend(liste, '2026-11-14', 0.25);
  assert.equal(imZiel.status, 'imZiel');
  assert.ok(Math.abs(imZiel.aenderung - 0.3) < 1e-9);
  assert.equal(gewichtsTrend(liste, '2026-11-14', 0).status, 'darueber');
  assert.equal(gewichtsTrend(liste, '2026-11-14', 0.5).status, 'darunter');
});

test('gewichtsTrend: unter drei Werten je Woche keine Aussage', () => {
  const liste = [...reihe('2026-11-01', [80, 80]), ...reihe('2026-11-08', [80.3, 80.3, 80.3, 80.3])];
  const t = gewichtsTrend(liste, '2026-11-14', 0);
  assert.equal(t.status, 'zuWenigDaten');
  assert.equal(t.anzahl, 4);
  assert.equal(t.anzahlDavor, 2);
  assert.equal(t.aenderung, null);
});

test('verlauf und linienPunkte', () => {
  const liste = reihe('2026-11-10', [80, 82, 81]);
  assert.deepEqual(verlauf(liste, 'gewicht', '2026-11-14', 4).map((p) => p.wert), [82, 81]);
  assert.equal(linienPunkte([80], 100, 40), '');
  assert.equal(linienPunkte([80, 82, 81], 100, 40, 0), '0.0,40.0 50.0,0.0 100.0,20.0');
  assert.equal(linienPunkte([5, 5], 100, 40, 0), '0.0,40.0 100.0,40.0'); // gleiche Werte: flache Linie statt Division durch null
});

test('Health-Ziele: Startwerte, Bereinigung, Prüfung', () => {
  assert.deepEqual(bereinigeGesundheit(null), STANDARD_GESUNDHEIT);
  assert.equal(bereinigeGesundheit({ wochenzielKg: -0.5 }).wochenzielKg, -0.5);
  assert.equal(bereinigeGesundheit({ wochenzielKg: 9 }).wochenzielKg, 0);
  const gut = pruefeGesundheit({ wochenzielKg: '0,25', wasserZielMl: '3000', schlafZielH: '7,5', schritteZiel: '10000' });
  assert.deepEqual(gut.ziele, { wochenzielKg: 0.25, wasserZielMl: 3000, schlafZielH: 7.5, schritteZiel: 10000 });
  const schlecht = pruefeGesundheit({ wochenzielKg: '5', wasserZielMl: '', schlafZielH: '8', schritteZiel: '8000' });
  assert.equal(schlecht.ok, false);
  assert.deepEqual(Object.keys(schlecht.fehler), ['wochenzielKg', 'wasserZielMl']);
});

test('verlaufJeTag: Wasser wird je Tag summiert, andere Arten bleiben Einzelwerte', async () => {
  const { verlaufJeTag } = await import('../js/logik/gesundheit.js');
  const liste = [m('wasser', '2026-11-13', 500), m('wasser', '2026-11-13', 250), m('wasser', '2026-11-14', 1000), m('wasser', '2026-10-01', 9999), m('schlaf', '2026-11-13', 7), m('schlaf', '2026-11-14', 8)];
  assert.deepEqual(verlaufJeTag(liste, 'wasser', '2026-11-14', 30), [{ datum: '2026-11-13', wert: 750 }, { datum: '2026-11-14', wert: 1000 }]);
  assert.deepEqual(verlaufJeTag(liste, 'schlaf', '2026-11-14', 30).map((p) => p.wert), [7, 8]);
});
