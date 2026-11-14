// Prüft Dinge, die leicht vergessen werden: Dateiliste des Service Workers, Schema und mitgelieferte Daten.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { MIGRATIONEN } from '../js/db.js';
import { NAEHRSTOFFE, kcalAusMakros } from '../js/logik/naehrwerte.js';
import { APP_VERSION, SCHEMA_VERSION, STORES } from '../js/logik/schema.js';
import { KATEGORIEN } from '../js/logik/zutat.js';

const wurzel = new URL('../', import.meta.url);
const lies = (pfad) => readFileSync(new URL(pfad, wurzel), 'utf8');

function dateienUnter(ordner) {
  const basis = fileURLToPath(wurzel);
  return readdirSync(path.join(basis, ordner), { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile())
    .map((e) => `./${path.relative(basis, path.join(e.parentPath ?? e.path, e.name)).split(path.sep).join('/')}`);
}

test('Service Worker: jede gelistete Datei existiert', () => {
  const liste = [...lies('sw.js').matchAll(/^\s*'(\.\/[^']*)',$/gm)].map((m) => m[1]);
  assert.ok(liste.length > 10);
  for (const pfad of liste) assert.ok(pfad === './' || existsSync(new URL(pfad, wurzel)), `fehlt: ${pfad}`);
});

test('Service Worker: jede App-Datei steht in der Liste', () => {
  const liste = new Set([...lies('sw.js').matchAll(/^\s*'(\.\/[^']*)',$/gm)].map((m) => m[1]));
  const noetig = [...dateienUnter('js'), ...dateienUnter('css'), ...dateienUnter('data'), ...dateienUnter('icons')];
  assert.deepEqual(noetig.filter((pfad) => !liste.has(pfad)), []);
});

test('Schema: eine Migration je Version, jeder Speicher hat ein Schlüsselfeld', () => {
  assert.equal(MIGRATIONEN.length, SCHEMA_VERSION);
  for (const [store, schluessel] of Object.entries(STORES)) assert.ok(store && schluessel);
});

test('Version steht in package.json und schema.js gleich', () => {
  assert.equal(JSON.parse(lies('package.json')).version, APP_VERSION);
});

test('Manifest: Pflichtfelder und vorhandene Icons', () => {
  const m = JSON.parse(lies('manifest.webmanifest'));
  assert.ok(m.name && m.short_name && m.start_url && m.display === 'standalone');
  assert.ok(m.icons.some((i) => i.sizes === '192x192') && m.icons.some((i) => i.sizes === '512x512'));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
  for (const icon of m.icons) assert.ok(existsSync(new URL(icon.src, wurzel)), icon.src);
});

test('Basis-Zutaten: eindeutige ids, bekannte Kategorien und Nährstoffe, plausible Werte', () => {
  const { zutaten, schemaVersion } = JSON.parse(lies('data/zutaten-basis.json'));
  assert.equal(schemaVersion, 1);
  assert.ok(zutaten.length >= 150);
  const ids = new Set();
  const bekannt = new Set(NAEHRSTOFFE.map((n) => n.id));
  const kategorien = new Set(KATEGORIEN.map((k) => k.id));
  for (const z of zutaten) {
    assert.ok(z.id.startsWith('basis:') && !ids.has(z.id), z.id);
    ids.add(z.id);
    assert.ok(z.name && kategorien.has(z.kategorie), z.id);
    assert.ok(typeof z.je100.kcal === 'number' && z.je100.kcal >= 0 && z.je100.kcal <= 900, z.id);
    for (const [id, wert] of Object.entries(z.je100)) assert.ok(bekannt.has(id) && typeof wert === 'number' && wert >= 0, `${z.id}: ${id}`);
    for (const p of z.portionen ?? []) assert.ok(p.name && p.gramm > 0, z.id);
  }
});

test('Basis-Zutaten: Energie passt grob zu den Makros', () => {
  // Alkohol, Zuckeralkohole und Rundung erklären Abweichungen; grobe Fehler (Faktor 10, vertauschte Felder) fallen auf.
  const { zutaten } = JSON.parse(lies('data/zutaten-basis.json'));
  const auffaellig = zutaten.filter((z) => {
    const erwartet = kcalAusMakros(z.je100);
    return Math.abs(erwartet - z.je100.kcal) > Math.max(40, z.je100.kcal * 0.25);
  }).map((z) => `${z.name}: ${z.je100.kcal} kcal, aus Makros ${Math.round(kcalAusMakros(z.je100))}`);
  assert.deepEqual(auffaellig, []);
});
