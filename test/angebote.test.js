import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { aktuelleJeZutat, angebotText, giltAm, istAbgelaufen, leseAngebotsDatei, pruefeAngebot } from '../js/logik/angebote.js';

test('pruefeAngebot: Markt und Preis sind Pflicht, der Rest freiwillig', () => {
  const p = pruefeAngebot({ markt: ' Testmarkt ', preis: '1,99', menge: '500 g', gueltigBis: '2026-11-20' });
  assert.equal(p.ok, true);
  assert.deepEqual(p.angebot, { markt: 'Testmarkt', preis: 1.99, menge: '500 g', gueltigBis: '2026-11-20' });
  assert.deepEqual(pruefeAngebot({ markt: 'Testmarkt', preis: '2' }).angebot, { markt: 'Testmarkt', preis: 2 });
  const f = pruefeAngebot({ markt: '', preis: '0', gueltigVon: '2026-11-20', gueltigBis: '2026-11-10' }).fehler;
  assert.deepEqual(Object.keys(f).sort(), ['gueltigBis', 'markt', 'preis']);
  assert.ok(pruefeAngebot({ markt: 'x', preis: '1', gueltigBis: 'bald' }).fehler.gueltigBis);
});

test('giltAm und istAbgelaufen: Grenzen zählen mit, ohne Datum gilt es weiter', () => {
  const a = { gueltigVon: '2026-11-10', gueltigBis: '2026-11-20' };
  assert.equal(giltAm(a, '2026-11-10'), true);
  assert.equal(giltAm(a, '2026-11-20'), true);
  assert.equal(giltAm(a, '2026-11-09'), false);
  assert.equal(giltAm(a, '2026-11-21'), false);
  assert.equal(giltAm({}, '2026-11-21'), true);
  assert.equal(istAbgelaufen(a, '2026-11-21'), true);
  assert.equal(istAbgelaufen(a, '2026-11-20'), false);
  assert.equal(istAbgelaufen({}, '2030-01-01'), false);
});

test('aktuelleJeZutat: nur Gültiges, günstigstes zuerst', () => {
  const liste = [
    { zutatId: 'a', markt: 'Teuer', preis: 2.5 }, { zutatId: 'a', markt: 'Günstig', preis: 1.5 },
    { zutatId: 'a', markt: 'Vorbei', preis: 0.5, gueltigBis: '2026-11-01' }, { zutatId: 'b', markt: 'Später', preis: 1, gueltigVon: '2026-12-01' },
  ];
  const k = aktuelleJeZutat(liste, '2026-11-14');
  assert.deepEqual(k.get('a').map((x) => x.markt), ['Günstig', 'Teuer']);
  assert.equal(k.has('b'), false);
});

test('angebotText nennt Markt, Preis, Menge und Zeitraum', () => {
  assert.equal(angebotText({ markt: 'Testmarkt', preis: 1.99, menge: '500 g', gueltigBis: '2026-11-20' }), 'Testmarkt: 1,99 € für 500 g, bis 20.11.');
  assert.equal(angebotText({ markt: 'Testmarkt', preis: 2, gueltigVon: '2026-11-16', gueltigBis: '2026-11-21' }), 'Testmarkt: 2,00 €, 16.11. bis 21.11.');
  assert.equal(angebotText({ markt: 'Testmarkt', preis: 0.5 }), 'Testmarkt: 0,50 €');
});

const ZUTATEN = [{ id: 'basis:apfel', name: 'Apfel' }, { id: 'basis:banane', name: 'Banane' }, { id: 'basis:apfelsaft', name: 'Apfelsaft' }];

test('Angebotsdatei: Zuordnung über Name oder Kennung, Unbekanntes und Ungültiges wird gezählt', () => {
  const datei = JSON.parse(readFileSync(new URL('./daten/angebote-beispiel.json', import.meta.url), 'utf8'));
  const p = leseAngebotsDatei(datei, ZUTATEN);
  assert.equal(p.ok, true);
  assert.deepEqual(p.angebote.map((a) => [a.zutatId, a.markt, a.preis, a.quelle]), [['basis:apfel', 'Testmarkt Nord', 1.99, 'datei'], ['basis:banane', 'Testmarkt Süd', 0.99, 'datei']]);
  assert.deepEqual(p.ohneTreffer, ['Einhornfilet']);
  assert.equal(p.ungueltig, 2);
});

test('Angebotsdatei: falsche Version und falscher Aufbau werden abgelehnt', () => {
  assert.equal(leseAngebotsDatei({ schemaVersion: 2, angebote: [] }, ZUTATEN).ok, false);
  assert.equal(leseAngebotsDatei({ schemaVersion: 1 }, ZUTATEN).ok, false);
  assert.equal(leseAngebotsDatei([], ZUTATEN).ok, false);
  assert.equal(leseAngebotsDatei(null, ZUTATEN).ok, false);
});
