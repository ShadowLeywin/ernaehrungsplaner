import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  verdient, kosten, kontostand, baueAus, kaufeSchild, setzeSchild, leeresLager, BAUTEN, bauXp,
} from '../js/logic/lagerbau.js';
import {
  auftraegeDerWoche, auftragsStand, bossStand, bossLeben, gruppiere, alleBelohnungen, BOSSE, vormonat, geplanteTrainingstage,
} from '../js/logic/auftraege.js';
import { tagesKennzahlen } from '../js/logic/tageswerte.js';
import { beispielProfil } from './beispielprofil.js';

const k = (datum, werte = {}) => ({
  datum, workouts: 0, aktivitaeten: 0, saetze: 0, volumenKg: 0, ausdauerMin: 0, rekorde: 0, geloggt: false, protein: false,
  kcalImZiel: false, gemuese: false, wasser: false, supplements: false, gewicht: false, tagebuch: false, ...werte,
});

test('Verdienst: Erz aus Training, Glut aus Disziplin', () => {
  const v = verdient([k('2026-10-01', { workouts: 1, saetze: 18, ausdauerMin: 30, rekorde: 1 }), k('2026-10-02', { geloggt: true, protein: true, wasser: true })]);
  assert.deepEqual(v, { erz: 20 + 18 + 10 + 10, glut: 20 });
});

test('Ausbauen: Kosten, Level, Kontostand', () => {
  const amboss = BAUTEN.find((b) => b.id === 'amboss');
  assert.deepEqual(kosten(amboss, 1), { erz: 40, glut: 10 });
  assert.deepEqual(kosten(amboss, 2), { erz: 100, glut: 25 });
  let lager = leeresLager();
  const konto = kontostand({ erz: 100, glut: 50 }, { erz: 0, glut: 0 }, lager);
  const r = baueAus(lager, 'amboss', konto, 1);
  lager = r.lager;
  assert.equal(lager.bauten.amboss, 1);
  assert.deepEqual(kontostand({ erz: 100, glut: 50 }, null, lager), { erz: 60, glut: 40 });
  assert.ok(baueAus(lager, 'amboss', { erz: 60, glut: 40 }, 1).fehler);
  assert.ok(baueAus(lager, 'trophaeenhalle', { erz: 9999, glut: 9999 }, 5).fehler);
  assert.equal(bauXp(lager), 60);
});

test('Glutschild kaufen und setzen', () => {
  let lager = leeresLager();
  assert.ok(kaufeSchild(lager, { erz: 0, glut: 10 }).fehler);
  lager = kaufeSchild(lager, { erz: 0, glut: 50 }).lager;
  assert.equal(lager.schilde, 1);
  lager = setzeSchild(lager, '2026-10-03').lager;
  assert.deepEqual(lager.schildTage, ['2026-10-03']);
  assert.ok(setzeSchild(lager, '2026-10-04').fehler);
});

test('Aufträge: fest je Woche, Workouts-Ziel aus dem Profil', () => {
  const p = beispielProfil();
  const a = auftraegeDerWoche('2026-09-28', p);
  assert.equal(a.length, 3);
  assert.equal(a[0].id, 'workouts');
  assert.equal(a[0].ziel, geplanteTrainingstage(p));
  assert.deepEqual(auftraegeDerWoche('2026-09-28', p).map((x) => x.id), a.map((x) => x.id));
  assert.notEqual(a[1].id, a[2].id);
  const stand = auftragsStand('2026-09-28', p, [k('2026-09-28', { workouts: 9 })]);
  assert.equal(stand[0].fertig, true);
});

test('Boss: Leben aus dem Vormonat, Schaden, Belohnung', () => {
  assert.equal(vormonat('2026-01'), '2025-12');
  const boss = BOSSE.find((b) => b.id === 'drache');
  assert.equal(bossLeben(boss, []), 120);
  assert.equal(bossLeben(boss, [k('x', { saetze: 200 })]), 220);
  assert.equal(bossLeben(boss, [k('x', { saetze: 10 })]), 72);
  const liste = Array.from({ length: 28 }, (_, i) => k(`2026-10-${String(i + 1).padStart(2, '0')}`, { saetze: 20, volumenKg: 2000, ausdauerMin: 30, geloggt: true, protein: true }));
  const { monate } = gruppiere(liste);
  const s = bossStand('2026-10', monate);
  assert.equal(s.besiegt, true);
  const b = alleBelohnungen(liste, beispielProfil());
  assert.equal(b.bosse, 1);
  assert.ok(b.auftraege >= 1);
});

test('Tageskennzahlen', () => {
  const tag = {
    datum: '2026-10-01', eintraege: [], supplements: {}, wasser: [], gewichtKg: 80,
    trainings: [{ id: 'a', typ: 'workout', ende: 'x', start: 'x', uebungen: [{ uebungId: 'bankdruecken_lh', saetze: [{ wdh: 10, kg: 50, erledigt: true }] }] }],
  };
  const r = tagesKennzahlen(tag, { profil: beispielProfil(), lebensmittel: [] });
  assert.equal(r.workouts, 1);
  assert.equal(r.volumenKg, 500);
  assert.equal(r.gewicht, true);
  assert.equal(r.geloggt, false);
});
