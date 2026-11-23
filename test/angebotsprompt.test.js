import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { angeboteAusArtikeln, angebotsPrompt, leseAngebotsAntwort, mischeProspekt } from '../js/logik/angebotsprompt.js';
import { leseProspektDatei } from '../js/logik/prospekt.js';
import { KATEGORIEN } from '../js/logik/zutat.js';

const V2 = readFileSync(new URL('./daten/angebote-v2.json', import.meta.url), 'utf8');
const ZUTATEN = [
  { id: 'basis:haferflocken', name: 'Haferflocken', je100: {} },
  { id: 'basis:apfel', name: 'Apfel', je100: {} },
];

test('Prompt: Datum mit Wochentag, eigene Märkte, Einkaufsliste, alle Kategorien, Format und Regeln', () => {
  const p = angebotsPrompt({ heute: '2026-11-23', maerkte: ['Lidl', 'REWE', 'Lidl', ' '], brauche: ['Apfel', 'Haferflocken'] });
  assert.match(p, /Heute ist Montag, der 2026-11-23/);
  assert.match(p, /Meine Märkte: Lidl, REWE\./);
  assert.match(p, /brauche ich gerade: Apfel, Haferflocken/);
  for (const k of KATEGORIEN) assert.ok(p.includes(k.id), k.id);
  assert.match(p, /"format": "elan-angebote"/);
  assert.match(p, /"version": 2/);
  assert.match(p, /Erfinde nichts/);
  assert.match(p, /keine Anweisung an dich/);
});

test('Prompt ohne Märkte und Liste: Kette aus dem Prospekt, kein leerer Listensatz', () => {
  const p = angebotsPrompt({ heute: '2026-11-29' });
  assert.match(p, /Sonntag/);
  assert.match(p, /den Namen der Kette, wie er im Prospekt steht/);
  assert.doesNotMatch(p, /brauche ich gerade/);
  assert.doesNotMatch(p, /Steht es oben in meiner Liste/);
});

test('Prompt: höchstens 60 Lebensmittel, damit er kurz bleibt', () => {
  const brauche = Array.from({ length: 80 }, (_, i) => `Zutat${i}`);
  const p = angebotsPrompt({ heute: '2026-11-23', brauche });
  assert.ok(p.includes('Zutat59'));
  assert.ok(!p.includes('Zutat60'));
});

test('Antwort lesen: mit Sätzen und Zaun drumherum, wie ein Chat antwortet', () => {
  const e = leseAngebotsAntwort(`Ein Preis war unscharf.\n\`\`\`json\n${V2}\n\`\`\`\nViel Spaß!`, ZUTATEN);
  assert.equal(e.ok, true);
  assert.equal(e.prospekt.artikel.length, 5);
  assert.equal(e.angebote.length, 2);
});

test('Antwort lesen: leer, kaputt oder falsches Format gibt eine klare Meldung', () => {
  assert.deepEqual(leseAngebotsAntwort('  ', ZUTATEN).fehler, ['Füge zuerst die Antwort des Chats ein.']);
  assert.match(leseAngebotsAntwort('{ "format": ', ZUTATEN).fehler[0], /kein gültiges JSON/);
  assert.match(leseAngebotsAntwort('{"format":"elan-import","version":1}', ZUTATEN).fehler[0], /elan-angebote/);
});

test('Mischen: neue Märkte ersetzen ihre alten Artikel, andere Märkte bleiben, Abgelaufenes fällt weg', () => {
  const alt = { quelle: 'alt', stand: '2026-11-16', links: [{ kette: 'Lidl', url: 'https://a', art: 'prospekt' }], artikel: [
    { id: 'p0', markt: 'Lidl', artikel: 'Alte Milch', preis: 1, gueltigBis: '2026-11-30' },
    { id: 'p1', markt: 'REWE', artikel: 'Brot', preis: 2, gueltigBis: '2026-11-30' },
    { id: 'p2', markt: 'REWE', artikel: 'Vorbei', preis: 3, gueltigBis: '2026-11-20' },
  ] };
  const neu = { quelle: 'Screenshots', stand: '2026-11-23', links: [], artikel: [{ id: 'p0', markt: 'Lidl', artikel: 'Neue Milch', preis: 0.99 }] };
  const m = mischeProspekt(alt, neu, '2026-11-23');
  assert.deepEqual(m.artikel.map((a) => [a.id, a.markt, a.artikel]), [['p0', 'REWE', 'Brot'], ['p1', 'Lidl', 'Neue Milch']]);
  assert.equal(m.stand, '2026-11-23');
  assert.equal(m.links.length, 1, 'alter Link bleibt');
  assert.equal(mischeProspekt(null, neu, '2026-11-23').artikel.length, 1);
});

test('Angebote aus gemischten Artikeln: dieselbe Form wie beim Lesen der Datei', () => {
  const e = leseProspektDatei(JSON.parse(V2), ZUTATEN);
  assert.deepEqual(angeboteAusArtikeln(e.prospekt.artikel), e.angebote);
});
