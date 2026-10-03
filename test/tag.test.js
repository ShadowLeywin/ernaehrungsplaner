import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  eintragNaehrwerte, mahlzeitSumme, tagesNaehrwerte, gemueseObstGramm, wochenSchluessel, wochenDurchschnitt,
} from '../js/logic/tag.js';
import { referenzwerte, bewerte } from '../js/logic/referenzwerte.js';
import { standardProfil } from '../js/logic/profil.js';
import { NAEHRSTOFFE } from '../js/logic/naehrstoffe.js';

const { lebensmittel } = JSON.parse(readFileSync(new URL('../data/lebensmittel.json', import.meta.url), 'utf8'));
const nahe = (ist, soll, toleranz) => assert.ok(Math.abs(ist - soll) <= toleranz, `${ist} statt ca. ${soll}`);

const leererTag = (eintraege = []) => ({ datum: '2026-10-05', morningStackGenommen: false, supplements: {}, wasser: [], eintraege });
const e = (mahlzeit, lebensmittelId, gramm) => ({ id: `${lebensmittelId}-${gramm}`, mahlzeit, lebensmittelId, gramm });

test('Eintrag: 150 g Haferflocken', () => {
  const w = eintragNaehrwerte(e('fruehstueck', 'haferflocken', 150), lebensmittel);
  nahe(w.kcal, 568, 2);
  nahe(w.protein, 19.8, 0.1);
});

test('Eintrag mit unbekanntem Lebensmittel ergibt keine Werte statt Absturz', () => {
  assert.deepEqual(eintragNaehrwerte(e('fruehstueck', 'gibtsnicht', 100), lebensmittel), {});
});

test('Summe pro Mahlzeit trennt die Mahlzeiten', () => {
  const tag = leererTag([e('fruehstueck', 'banane', 100), e('fruehstueck', 'banane', 100), e('mittagessen', 'reis', 100)]);
  nahe(mahlzeitSumme(tag, 'fruehstueck', lebensmittel).kcal, 178, 1);
  assert.deepEqual(mahlzeitSumme(tag, 'abendsnack', lebensmittel), {});
});

test('Tageswerte: Morning Stack nur wenn getrunken, Supplements nur wenn abgehakt', () => {
  const profil = standardProfil();
  const tag = leererTag([e('fruehstueck', 'banane', 100)]);
  nahe(tagesNaehrwerte(tag, profil, lebensmittel).kcal, 89, 1);

  tag.morningStackGenommen = true;
  tag.supplements = { athlete_stack: true };
  const w = tagesNaehrwerte(tag, profil, lebensmittel);
  nahe(w.kcal, 89 + 163, 10);
  assert.ok(w.vitD >= 25); // aus dem Athlete Stack
});

test('Gemüse und Obst: Kartoffeln zählen nicht als Gemüse', () => {
  const tag = leererTag([e('mittagessen', 'brokkoli', 200), e('mittagessen', 'kartoffel', 300), e('abendsnack', 'apfel', 150)]);
  assert.deepEqual(gemueseObstGramm(tag, lebensmittel), { gemuese: 200, obst: 150 });
});

test('Wochenschlüssel: Montag bis Sonntag, auch über den Monatswechsel', () => {
  assert.deepEqual(wochenSchluessel(new Date(2026, 9, 3)), // Sa 03.10.2026
    ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  assert.equal(wochenSchluessel(new Date(2026, 9, 5))[0], '2026-10-05'); // Montag selbst
});

test('Wochendurchschnitt nur über Tage mit Einträgen', () => {
  const profil = standardProfil();
  const tage = [leererTag([e('mittagessen', 'banane', 100)]), leererTag([e('mittagessen', 'banane', 300)]), leererTag()];
  const w = wochenDurchschnitt(tage, profil, lebensmittel);
  assert.equal(w.tage, 2);
  nahe(w.werte.kcal, 178, 1);
  assert.equal(w.gemueseObst.obst, 200);
});

test('Referenzwerte: alle Schlüssel sind bekannte Nährstoffe, gesättigte Fette aus kcal', () => {
  const profil = standardProfil();
  const ref = referenzwerte(profil.referenzgruppe, profil.tagestypen[0]);
  for (const k of Object.keys(ref)) assert.ok(NAEHRSTOFFE[k], k);
  assert.equal(ref.gesFett.wert, 32); // 10 % von 2.875 kcal / 9
  assert.equal(ref.ballaststoffe.wert, 35);
});

test('Bewertung: Ziel, Begrenzen und Obergrenze', () => {
  assert.equal(bewerte(50, { wert: 100, art: 'ziel' }).status, 'niedrig');
  assert.equal(bewerte(80, { wert: 100, art: 'ziel' }).status, 'fast');
  assert.equal(bewerte(120, { wert: 100, art: 'ziel' }).anteil, 120);
  assert.equal(bewerte(30, { wert: 14, art: 'ziel', obergrenze: 25 }).status, 'ueber_obergrenze');
  assert.equal(bewerte(40, { wert: 32, art: 'begrenzen' }).status, 'zu_viel');
});
