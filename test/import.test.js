import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { alsVorlage, leseRezept, leseRezeptText, leseSchemaOrg, leseZutatZeile, ordneZu } from '../js/logik/import.js';

const lies = (name) => readFileSync(new URL(`./daten/${name}`, import.meta.url), 'utf8');
const kurz = (z) => [z.menge, z.einheit, z.name, z.gramm, z.unsicher];

test('Zutatenzeile: Gramm und Kilogramm sind sicher', () => {
  assert.deepEqual(kurz(leseZutatZeile('200 g Mehl')), [200, 'g', 'Mehl', 200, false]);
  assert.deepEqual(kurz(leseZutatZeile('- 1,5 kg Kartoffeln')), [1.5, 'kg', 'Kartoffeln', 1500, false]);
  assert.deepEqual(kurz(leseZutatZeile('200g Zucker')), [200, 'g', 'Zucker', 200, false]);
});

test('Zutatenzeile: Löffel und Volumen sind Schätzungen', () => {
  assert.deepEqual(kurz(leseZutatZeile('1 EL Olivenöl')), [1, 'EL', 'Olivenöl', 15, true]);
  assert.deepEqual(kurz(leseZutatZeile('½ TL Salz')), [0.5, 'TL', 'Salz', 2.5, true]);
  assert.deepEqual(kurz(leseZutatZeile('300 ml Milch')), [300, 'ml', 'Milch', 300, true]);
  assert.deepEqual(kurz(leseZutatZeile('1 1/2 l Wasser')), [1.5, 'l', 'Wasser', 1500, true]);
});

test('Zutatenzeile: Stück und Angaben ohne Menge bleiben ohne Gramm', () => {
  assert.deepEqual(kurz(leseZutatZeile('2 Karotten')), [2, 'Stück', 'Karotten', null, true]);
  assert.deepEqual(kurz(leseZutatZeile('1 Zwiebel, fein gewürfelt')), [1, 'Stück', 'Zwiebel, fein gewürfelt', null, true]);
  assert.deepEqual(kurz(leseZutatZeile('Pfeffer nach Geschmack')), [null, '', 'Pfeffer nach Geschmack', null, true]);
});

test('Rezepttext mit Überschriften: Name, Portionen, Zutaten, Schritte', () => {
  const r = leseRezeptText(lies('rezept-text.txt'));
  assert.equal(r.name, 'Linsen-Eintopf');
  assert.equal(r.portionen, 4);
  assert.equal(r.zutaten.length, 7);
  assert.deepEqual(kurz(r.zutaten[0]), [250, 'g', 'rote Linsen', 250, false]);
  assert.deepEqual(r.schritte, [
    'Zwiebel und Karotten würfeln und im Öl anschwitzen.',
    'Linsen und Wasser dazugeben, 20 Minuten köcheln lassen.',
    'Mit Salz und Pfeffer abschmecken.',
  ]);
});

test('Rezepttext ohne Überschriften: Mengenzeilen sind Zutaten, Sätze danach Schritte', () => {
  const r = leseRezeptText('Schnelles Müsli\n80 g Haferflocken\n1 Banane\n200 ml Milch\nAlles in eine Schale geben und fünf Minuten quellen lassen.\nMit der Banane servieren.');
  assert.equal(r.name, 'Schnelles Müsli');
  assert.equal(r.zutaten.length, 3);
  assert.equal(r.schritte.length, 2);
  assert.equal(r.portionen, null);
});

test('leerer und unbrauchbarer Text liefern ein leeres Rezept statt eines Fehlers', () => {
  assert.deepEqual(leseRezeptText(''), { name: '', portionen: null, zutaten: [], schritte: [] });
  assert.equal(leseRezeptText('Nur ein Satz ohne alles').zutaten.length, 0);
});

test('Schema.org: Rezept im @graph, Portionen, Zutaten, verschachtelte Schritte', () => {
  const r = leseSchemaOrg(lies('rezept-schema.html'));
  assert.equal(r.name, 'Haferbrei mit Apfel & Zimt');
  assert.equal(r.portionen, 2);
  assert.deepEqual(r.zutaten.map((z) => z.name), ['Haferflocken', 'Milch', 'Apfel', 'Zimt']);
  assert.deepEqual(r.schritte, ['Haferflocken mit Milch aufkochen.', 'Apfel würfeln und unterheben.']);
});

test('Schema.org: Seiten ohne Rezept und kaputtes JSON ergeben null', () => {
  assert.equal(leseSchemaOrg('<html><script type="application/ld+json">{"@type":"WebSite"}</script></html>'), null);
  assert.equal(leseSchemaOrg('<script type="application/ld+json">{kaputt</script>'), null);
  assert.equal(leseSchemaOrg('Ganz normaler Text'), null);
});

test('leseRezept wählt Schema.org, wenn vorhanden, sonst Text', () => {
  assert.equal(leseRezept(lies('rezept-schema.html')).quelle, 'schema');
  assert.equal(leseRezept(lies('rezept-text.txt')).quelle, 'text');
});

const ZUTATEN = [
  { id: 'basis:linsen', name: 'Linsen, rot (trocken)', je100: { kcal: 350 } },
  { id: 'basis:karotte', name: 'Karotte', je100: { kcal: 40 }, portionen: [{ name: 'Stück', gramm: 80 }] },
  { id: 'basis:zwiebel', name: 'Zwiebel', je100: { kcal: 40 }, portionen: [{ name: 'Stück', gramm: 100 }] },
  { id: 'basis:olivenoel', name: 'Olivenöl', je100: { kcal: 884 } },
];

test('ordneZu: Treffer über den Namen, Stück wird über die Portion zu Gramm', () => {
  const zeilen = leseRezeptText(lies('rezept-text.txt')).zutaten;
  const z = ordneZu(zeilen, ZUTATEN);
  assert.equal(z[0].treffer.id, 'basis:linsen'); // "rote Linsen" findet "Linsen, rot" über das letzte Wort
  assert.deepEqual([z[1].treffer.id, z[1].gramm, z[1].unsicher], ['basis:karotte', 160, true]);
  assert.deepEqual([z[2].treffer.id, z[2].gramm], ['basis:zwiebel', 100]);
  assert.deepEqual([z[3].treffer.id, z[3].gramm, z[3].unsicher], ['basis:olivenoel', 15, true]);
  assert.equal(z[4].treffer, null); // Wasser ist nicht in der Liste
  assert.equal(z[4].unsicher, true);
});

test('alsVorlage: nur zugeordnete Zutaten, Schritte vollständig, Portionen mit Startwert', () => {
  const rezept = leseRezeptText(lies('rezept-text.txt'));
  const vorlage = alsVorlage(rezept, ordneZu(rezept.zutaten, ZUTATEN));
  assert.equal(vorlage.name, 'Linsen-Eintopf');
  assert.equal(vorlage.portionen, 4);
  assert.deepEqual(vorlage.zutaten.map((z) => [z.zutatId, z.gramm]), [['basis:linsen', 250], ['basis:karotte', 160], ['basis:zwiebel', 100], ['basis:olivenoel', 15]]);
  assert.equal(vorlage.schritte.length, 3);
  assert.equal('id' in vorlage, false);
  assert.equal(alsVorlage({ name: 'x', portionen: null, zutaten: [], schritte: [] }, []).portionen, 4);
});

test('ordneZu findet die Einzahl zu Mehrzahl-Angaben', () => {
  const zutaten = [{ id: 'ei', name: 'Ei', je100: {}, portionen: [{ name: 'Stück', gramm: 60 }] }, { id: 'tomate', name: 'Tomate', je100: {} }, { id: 'apfel', name: 'Apfel', je100: {} }];
  const z = ordneZu(['3 Eier', '2 Tomaten', '4 Äpfel', '1 Einhorn'].map(leseZutatZeile), zutaten);
  assert.deepEqual(z.map((x) => x.treffer?.id ?? null), ['ei', 'tomate', 'apfel', null]);
  assert.equal(z[0].gramm, 180);
});

test('ordneZu nimmt nur ganze Wörter: Wasser ist keine Wassermelone, Reis keine Reiswaffel', () => {
  const zutaten = [
    { id: 'melone', name: 'Wassermelone', je100: {} }, { id: 'waffel', name: 'Reiswaffeln', je100: {} },
    { id: 'reis', name: 'Reis, Basmati (roh)', je100: {} }, { id: 'tomate', name: 'Tomaten, stückig (Dose)', je100: {} },
  ];
  const z = ordneZu(['1,5 l Wasser', '200 g Reis', '1 Dose Tomaten', '100 g Reiswaffeln'].map(leseZutatZeile), zutaten);
  assert.deepEqual(z.map((x) => x.treffer?.id ?? null), [null, 'reis', 'tomate', 'waffel']);
  assert.equal(z[0].unsicher, true);
});
