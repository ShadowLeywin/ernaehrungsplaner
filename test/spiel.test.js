import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UEBUNGEN } from '../js/daten/uebungen.js';
import { uebungsVerzeichnis } from '../js/logic/training.js';
import { rangAus, berechneRaenge, satzWertung, rangName } from '../js/logic/raenge.js';
import { sammleStatistik, laengsteFolge, aktuelleFolge } from '../js/logic/spielstand.js';
import { bewerteErfolg, bewerteAlle, neueErfolge, stufenStand, ERFOLGE, erfolgsText } from '../js/logic/erfolge.js';
import { berechneWerte, berechneXp, levelAus, bestimmeKlasse } from '../js/logic/charakter.js';
import { beispielProfil } from './beispielprofil.js';

const v = uebungsVerzeichnis(UEBUNGEN);
const satz = (wdh, kg) => ({ wdh, kg, erledigt: true });

test('Rang aus Wertung mit Stufen', () => {
  assert.equal(rangName(rangAus(0.1)), 'Schlacke II');
  assert.equal(rangAus(0.05).rang.id, 'schlacke');
  assert.equal(rangAus(0.05).stufe, 3);
  assert.equal(rangAus(0.52).rang.id, 'gold');
  assert.equal(rangAus(0.52).stufe, 3);
  assert.equal(rangAus(0.59).stufe, 1);
  assert.equal(rangName(rangAus(1.2)), 'Legende');
});

test('Bankdrücken 1 × Körpergewicht ≈ Gold', () => {
  const w = satzWertung(v.get('bankdruecken_lh'), satz(1, 80), 80);
  assert.equal(w, 0.5);
  // Frauen haben niedrigere Elite-Werte → höhere Wertung bei gleicher Leistung
  assert.ok(satzWertung(v.get('bankdruecken_lh'), satz(1, 40), 60, 'w') > satzWertung(v.get('bankdruecken_lh'), satz(1, 40), 60, 'm'));
});

test('Klimmzüge: Wiederholungen oder Zusatzlast', () => {
  assert.equal(satzWertung(v.get('klimmzuege'), satz(10, 0), 80), 10 / 25);
  assert.ok(satzWertung(v.get('klimmzuege'), satz(5, 40), 80) > 0.4);
});

test('Ränge je Gruppe, Gesamt erst ab 3 Gruppen', () => {
  const tage = [{ datum: '2026-10-01', trainings: [{ id: 'a', typ: 'workout', start: '2026-10-01T17:00:00Z', ende: 'x', uebungen: [
    { uebungId: 'bankdruecken_lh', saetze: [satz(5, 80)] },
    { uebungId: 'kniebeuge_lh', saetze: [satz(5, 100)] },
  ] }] }];
  const r = berechneRaenge(tage, v, 80, 'm', new Date(2026, 9, 4));
  assert.ok(r.gruppen.brust);
  assert.ok(r.gruppen.beine);
  assert.equal(r.gruppen.arme, null);
  assert.equal(r.gesamt, null);
  // Älter als 12 Wochen zählt nicht
  assert.equal(berechneRaenge(tage, v, 80, 'm', new Date(2027, 2, 1)).gruppen.brust, null);
});

test('Folgen', () => {
  assert.equal(laengsteFolge(['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05', '2026-10-06']), 3);
  assert.equal(aktuelleFolge(['2026-10-02', '2026-10-03'], '2026-10-04'), 2);
  assert.equal(aktuelleFolge(['2026-10-01'], '2026-10-04'), 0);
});

function beispielTage() {
  return [
    { datum: '2026-10-01', eintraege: [], supplements: {}, wasser: [], trainings: [
      { id: 'a', typ: 'workout', start: '2026-10-01T03:30:00Z', ende: 'x', intensitaet: 'hart', uebungen: [
        { uebungId: 'klimmzuege', saetze: [satz(10, 0), satz(8, 0)] },
        { uebungId: 'reiseimer', saetze: [{ sek: 60, erledigt: true }] },
      ] },
      { id: 'b', typ: 'aktivitaet', uebungId: 'laufen', start: '2026-10-01T16:00:00Z', dauerMin: 30, km: 6, intensitaet: 'mittel' },
    ] },
  ];
}

test('Spielstand sammelt Kennzahlen', () => {
  const st = sammleStatistik({ tage: beispielTage(), profil: beispielProfil(), lebensmittel: [], verzeichnis: v, kgKoerper: 80, heute: new Date(2026, 9, 4) });
  assert.equal(st.workouts, 1);
  assert.equal(st.aktivitaeten, 1);
  assert.equal(st.familien.klimmzug, 18);
  assert.equal(st.km, 6);
  assert.equal(st.maxLaufKmh, 12);
  assert.equal(st.geheim.reiseimer, true);
  assert.equal(st.cardioMin28, 30);
});

test('Erfolge: Stufen, neue Erfolge, Text', () => {
  const e = ERFOLGE.find((x) => x.id === 'klimmzugkoenig');
  const b = bewerteErfolg(e, { familien: { klimmzug: 300 } });
  assert.equal(b.stufe, 1);
  assert.equal(b.stufenInfo.id, 'silber');
  assert.equal(b.naechste, 1000);
  assert.equal(erfolgsText(e, 1000), '1.000 Klimmzüge insgesamt');
  const st = sammleStatistik({ tage: beispielTage(), profil: beispielProfil(), lebensmittel: [], verzeichnis: v, kgKoerper: 80, heute: new Date(2026, 9, 4) });
  const alle = bewerteAlle(st);
  const neu = neueErfolge(alle, {});
  assert.ok(neu.some((x) => x.erfolg.id === 'reiseimer'));
  assert.deepEqual(neueErfolge(alle, stufenStand(alle)), []);
});

test('Werte, XP, Level und Klasse', () => {
  assert.equal(levelAus(0).level, 1);
  assert.equal(levelAus(100).level, 2);
  assert.equal(levelAus(99).anteil, 0.99);
  const klasse = bestimmeKlasse({ staerke: 60, ausdauer: 55, tempo: 10, beweglichkeit: 10, willenskraft: 20, disziplin: 30 });
  assert.equal(klasse.episch, 'Krieger');
  assert.equal(bestimmeKlasse({ staerke: 60, ausdauer: 20, tempo: 10, beweglichkeit: 10, willenskraft: 20, disziplin: 30 }).episch, 'Schmied');
  assert.equal(bestimmeKlasse({ staerke: 5, ausdauer: 4, tempo: 3, beweglichkeit: 3, willenskraft: 3, disziplin: 3 }).id, 'lehrling');
  const st = sammleStatistik({ tage: beispielTage(), profil: beispielProfil(), lebensmittel: [], verzeichnis: v, kgKoerper: 80, heute: new Date(2026, 9, 4) });
  const w = berechneWerte(st, { gruppen: { brust: null, ruecken: { wertung: 0.4 }, schultern: null, arme: null, beine: null, rumpf: null } });
  assert.ok(w.staerke > 5 && w.staerke < 30);
  assert.ok(berechneXp(st) > 100);
});
