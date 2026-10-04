import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pruefeAngebote, aktuelleAngebote, zugeordnetesLebensmittel, angeboteJeLebensmittel, preisText } from '../js/logic/angebote.js';

const datei = {
  schema_version: 1,
  kalenderwoche: '2026-W40',
  maerkte: [
    { id: 'netto', haendler: 'Netto', ort: 'Offingen', angebote: [
      { produkt: 'Orangen', marke: null, preis: 2.29, preis_ab: false, streichpreis: 2.99, rabatt_prozent: 23, kategorie: 'lebensmittel', gueltig_von: '2026-10-02', gueltig_bis: '2026-10-10' },
      { produkt: 'Spülmittel', preis: 0.99, kategorie: 'haushalt_nonfood', gueltig_von: '2026-10-02', gueltig_bis: '2026-10-10' },
      { produkt: 'Alt', preis: 1, kategorie: 'lebensmittel', gueltig_von: '2026-09-01', gueltig_bis: '2026-09-07' },
      { produkt: 42 },
    ] },
    { id: 'lidl', haendler: 'Lidl', ort: 'Burgau', angebote: [
      { produkt: 'Brokkoli frisch', preis: 0.99, kategorie: 'lebensmittel', rabatt_prozent: 40, gueltig_von: null, gueltig_bis: null },
    ] },
  ],
};
const LM = [{ id: 'orange', name: 'Orange' }, { id: 'brokkoli', name: 'Brokkoli' }, { id: 'apfel', name: 'Apfel' }];

test('Prüfen: ungültige Angebote fliegen raus', () => {
  const { daten } = pruefeAngebote(JSON.stringify(datei));
  assert.equal(daten.maerkte[0].angebote.length, 3);
  assert.ok(pruefeAngebote('{}').fehler);
  assert.ok(pruefeAngebote('kaputt').fehler);
});

test('Aktuell, essbar, aktive Märkte', () => {
  const { daten } = pruefeAngebote(datei);
  const alle = aktuelleAngebote(daten, { heute: '2026-10-04' });
  assert.deepEqual(alle.map((a) => a.produkt), ['Brokkoli frisch', 'Orangen']);
  assert.equal(aktuelleAngebote(daten, { heute: '2026-10-04', nurEssbar: false }).length, 3);
  assert.deepEqual(aktuelleAngebote(daten, { heute: '2026-10-04', aktiv: new Set(['netto']) }).map((a) => a.produkt), ['Orangen']);
});

test('Zuordnung zu Lebensmitteln', () => {
  assert.equal(zugeordnetesLebensmittel({ produkt: 'Orangen' }, LM).id, 'orange');
  assert.equal(zugeordnetesLebensmittel({ produkt: 'Grana Padano' }, LM), null);
  const { daten } = pruefeAngebote(datei);
  const map = angeboteJeLebensmittel(aktuelleAngebote(daten, { heute: '2026-10-04' }), LM);
  assert.deepEqual([...map.keys()].sort(), ['brokkoli', 'orange']);
});

test('Preistext', () => {
  assert.equal(preisText({ preis: 2.29, streichpreis: 2.99 }), '2,29 € statt 2,99 €');
  assert.equal(preisText({ preis: 0.69, preisAb: true }), 'ab 0,69 €');
});
