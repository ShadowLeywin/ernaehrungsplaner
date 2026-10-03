import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summiere, naehrwerteZutaten, fixeNaehrwerte } from '../js/logic/fixeintraege.js';
import { beispielProfil as standardProfil } from './beispielprofil.js';
import { mahlzeitenZiele, datumSchluessel } from '../js/logic/ziele.js';

const { lebensmittel } = JSON.parse(readFileSync(new URL('../data/lebensmittel.json', import.meta.url), 'utf8'));
const nahe = (ist, soll, toleranz) => assert.ok(Math.abs(ist - soll) <= toleranz, `${ist} statt ca. ${soll}`);

test('summiere: unbekannte Nährstoffe bleiben weg, bekannte werden addiert', () => {
  assert.deepEqual(summiere([{ kcal: 10 }, { kcal: 5, eisen: 1 }, {}]), { kcal: 15, eisen: 1 });
});

test('Zutaten mit unbekanntem Lebensmittel werfen einen Fehler', () => {
  assert.throws(() => naehrwerteZutaten([{ lebensmittelId: 'gibtsnicht', gramm: 5 }], lebensmittel));
});

test('Morning Stack: ca. 163 kcal, 28 g KH, 4,5 g Fett', () => {
  const { morningStack } = fixeNaehrwerte(standardProfil(), lebensmittel);
  nahe(morningStack.kcal, 163, 10);
  nahe(morningStack.kh, 28, 3);
  nahe(morningStack.fett, 4.5, 0.5);
});

test('Supplements: Kreatin ohne kcal, Flohsamen mit ca. 4 g Ballaststoffen, Omega-3 mit 2.100 mg EPA+DHA', () => {
  const { supplements } = fixeNaehrwerte(standardProfil(), lebensmittel);
  const werte = Object.fromEntries(supplements.map((s) => [s.id, s.werte]));
  assert.equal(werte.kreatin.kcal, 0);
  nahe(werte.flohsamen.ballaststoffe, 4.25, 0.1);
  assert.equal(werte.omega3.epaDha, 2100);
  assert.equal(werte.multi.vitD, 25);
});

test('Inaktive Einträge zählen nicht', () => {
  const profil = standardProfil();
  profil.morningStack.aktiv = false;
  profil.supplements.forEach((s) => { s.aktiv = false; });
  const { gesamt } = fixeNaehrwerte(profil, lebensmittel);
  assert.deepEqual(gesamt, {});
});

test('Mahlzeitenziele ziehen die festen Einträge vom Tagesziel ab', () => {
  const profil = standardProfil();
  const { gesamt } = fixeNaehrwerte(profil, lebensmittel);
  const ziele = mahlzeitenZiele(profil.tagestypen[0], profil.mahlzeiten, gesamt);
  const summeKcal = ziele.reduce((s, z) => s + z.kcal, 0);
  nahe(summeKcal, 2875 - gesamt.kcal, 3);
});

test('Datumsschlüssel nutzt lokale Zeit', () => {
  assert.equal(datumSchluessel(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});
