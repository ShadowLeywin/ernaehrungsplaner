import assert from 'node:assert/strict';
import test from 'node:test';
import { pruefeBackup } from '../js/logik/backup.js';
import { euroText, listenPreis, packungAusText, packungenFuer, passtZuMarkt, preisFuerPosten, preisId, preisText, pruefePreis, vergleicheMaerkte } from '../js/logik/preise.js';

const LIDL = { id: 'osm:node/1', name: 'Lidl', marke: 'Lidl', ort: 'Teststadt' };
const EDEKA = { id: 'osm:node/2', name: 'EDEKA Müller', marke: 'EDEKA' };
const ECKE = { id: 'eigen:3', name: 'Laden an der Ecke' };
const TAG = '2026-11-25';

test('Packungsgröße aus Text, Liter als Schätzung, ohne Einheit nichts', () => {
  assert.deepEqual(packungAusText('500 g'), { gramm: 500, geschaetzt: false });
  assert.deepEqual(packungAusText('1,5 kg'), { gramm: 1500, geschaetzt: false });
  assert.deepEqual(packungAusText('6 x 1,5 l'), { gramm: 9000, geschaetzt: true });
  assert.deepEqual(packungAusText('750ml'), { gramm: 750, geschaetzt: true });
  assert.equal(packungAusText('1 Stück'), null);
  assert.equal(packungAusText('Packung'), null);
  assert.equal(packungAusText(undefined), null);
  assert.equal(packungAusText('0 g'), null);
});

test('Ganze Packungen, kleiner Rest zählt nicht', () => {
  assert.equal(packungenFuer(400, 500), 1);
  assert.equal(packungenFuer(502, 500), 1);
  assert.equal(packungenFuer(600, 500), 2);
  assert.equal(packungenFuer(1, 1000), 1);
});

test('Angebot gehört zur Kette, zur Filiale oder über die Kennung', () => {
  assert.equal(passtZuMarkt({ markt: 'Lidl' }, LIDL), true);
  assert.equal(passtZuMarkt({ markt: 'lidl Teststadt' }, LIDL), true);
  assert.equal(passtZuMarkt({ markt: 'Lidlmarkt' }, LIDL), false); // nur ganze Wörter
  assert.equal(passtZuMarkt({ markt: 'Edeka' }, EDEKA), true);
  assert.equal(passtZuMarkt({ markt: 'Lidl', marktId: 'osm:node/2' }, LIDL), false);
  assert.equal(passtZuMarkt({ markt: 'irgendwas', marktId: 'osm:node/1' }, LIDL), true);
  assert.equal(passtZuMarkt({ markt: '' }, ECKE), false);
});

test('Gemerkten Preis prüfen: Komma, Grenzen, Pflichtfelder', () => {
  assert.deepEqual(pruefePreis({ preis: '1,29', packung: '500' }).wert, { preis: 1.29, packungGramm: 500 });
  assert.equal(pruefePreis({ preis: '0', packung: '500' }).ok, false);
  assert.equal(pruefePreis({ preis: '1,29', packung: '' }).ok, false);
  assert.ok(pruefePreis({ preis: 'abc', packung: '500' }).fehler.preis);
});

test('Vorrang: Angebot vor gemerktem Preis vor unbekannt', () => {
  const posten = { schluessel: 'basis:reis', gramm: 1200 };
  const angebote = [
    { zutatId: 'basis:reis', markt: 'Lidl', preis: 1.49, menge: '1 kg', gueltigBis: '2026-11-28' },
    { zutatId: 'basis:reis', markt: 'Lidl', preis: 0.89, menge: '500 g', gueltigBis: '2026-11-20' }, // abgelaufen
    { zutatId: 'basis:reis', markt: 'Lidl', preis: 0.5, menge: 'Packung' }, // ohne Größe: nicht rechenbar
  ];
  const preise = [{ id: preisId('basis:reis', LIDL.id), zutatId: 'basis:reis', marktId: LIDL.id, preis: 1.99, packungGramm: 1000, datum: '2026-11-01' },
    { id: preisId('basis:reis', EDEKA.id), zutatId: 'basis:reis', marktId: EDEKA.id, preis: 2.29, packungGramm: 1000, datum: '2026-11-02' }];
  const lidl = preisFuerPosten(posten, LIDL, { angebote, preise, tag: TAG });
  assert.equal(lidl.quelle, 'angebot');
  assert.equal(lidl.packungen, 2);
  assert.equal(lidl.betrag, 2.98);
  const edeka = preisFuerPosten(posten, EDEKA, { angebote, preise, tag: TAG });
  assert.equal(edeka.quelle, 'gemerkt');
  assert.equal(edeka.betrag, 4.58);
  const ecke = preisFuerPosten(posten, ECKE, { angebote, preise, tag: TAG });
  assert.deepEqual([ecke.quelle, ecke.betrag], ['unbekannt', null]);
  assert.equal(preisText(ecke), 'Preis unbekannt');
  assert.equal(preisText(lidl), `2 × 1 kg à ${euroText(1.49)} = ${euroText(2.98)}, Angebot`);
});

test('Liste und Vergleich: unbekannte Posten zählen nicht, mehr bekannte Posten gehen vor', () => {
  const liste = [{ schluessel: 'basis:reis', gramm: 500 }, { schluessel: 'basis:apfel', gramm: 600 }];
  const preise = [
    { id: preisId('basis:reis', LIDL.id), preis: 1.0, packungGramm: 500 },
    { id: preisId('basis:reis', EDEKA.id), preis: 1.5, packungGramm: 500 },
    { id: preisId('basis:apfel', EDEKA.id), preis: 2.0, packungGramm: 1000 },
  ];
  const lidl = listenPreis(liste, LIDL, { preise, tag: TAG });
  assert.deepEqual([lidl.summe, lidl.mitPreis, lidl.gesamt], [1, 1, 2]);
  const vergleich = vergleicheMaerkte(liste, [LIDL, ECKE, EDEKA], { preise, tag: TAG });
  assert.deepEqual(vergleich.map((v) => [v.markt.id, v.mitPreis, v.summe]), [[EDEKA.id, 2, 3.5], [LIDL.id, 1, 1], [ECKE.id, 0, 0]]);
});

test('Backup der Version 8 bekommt leere Märkte und Preise', () => {
  const p = pruefeBackup({ app: 'elan', schemaVersion: 8, daten: { zutaten: [] } });
  assert.equal(p.ok, true);
  assert.deepEqual([p.daten.maerkte, p.daten.preise], [[], []]);
});
