import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { backupDateiname, erstelleBackup, pruefeBackup } from '../js/logik/backup.js';
import { SCHEMA_VERSION, STORES } from '../js/logik/schema.js';

const DATEN = {
  zutaten: [{ id: 'eigen:1', name: 'Testriegel', je100: { kcal: 400 } }],
  eintraege: [{ id: 'e1', datum: '2026-11-13', slot: 'mittag', gramm: 50, je100: { kcal: 400 } }],
  tage: [{ datum: '2026-11-13', tagestyp: 'rest' }],
  einstellungen: [{ schluessel: 'woche', wert: ['gym'] }],
  rezepte: [{ id: 'r1', name: 'Testeintopf', portionen: 2, zutaten: [], schritte: [] }],
  plan: [{ id: 'p1', datum: '2026-11-14', slot: 'abend', gramm: 100, je100: { kcal: 400 } }],
  einkauf: [{ id: '2026-11-09|eigen:1', woche: '2026-11-09', erledigt: true }],
  vorlieben: [{ zutatId: 'basis:apfel', mag: 'R', notiz: '' }],
};

test('Backup enthält Kennung, Schema-Version, Zeitpunkt und alle Speicher', () => {
  const b = erstelleBackup({ zutaten: DATEN.zutaten }, new Date('2026-11-13T10:00:00Z'));
  assert.equal(b.app, 'elan');
  assert.equal(b.schemaVersion, SCHEMA_VERSION);
  assert.equal(b.erstelltAm, '2026-11-13T10:00:00.000Z');
  assert.deepEqual(Object.keys(b.daten), Object.keys(STORES));
  assert.deepEqual(b.daten.eintraege, []);
});

test('Hin und zurück: ein erstelltes Backup besteht die Prüfung unverändert', () => {
  // Erwartung aus der Liste der Speicher ableiten: so bleibt der Test richtig, wenn ein Speicher dazukommt
  const erwartet = Object.fromEntries(Object.keys(STORES).map((store) => [store, DATEN[store] ?? []]));
  const kopie = JSON.parse(JSON.stringify(erstelleBackup(DATEN)));
  const p = pruefeBackup(kopie);
  assert.equal(p.ok, true);
  assert.deepEqual(p.daten, erwartet);
  assert.deepEqual(p.anzahl, Object.fromEntries(Object.entries(erwartet).map(([store, liste]) => [store, liste.length])));
  assert.equal(p.anzahl.eintraege, 1);
});

test('fremde und kaputte Dateien werden abgelehnt', () => {
  assert.equal(pruefeBackup(null).ok, false);
  assert.equal(pruefeBackup([]).ok, false);
  assert.equal(pruefeBackup({ app: 'andere', schemaVersion: 1, daten: {} }).ok, false);
  assert.equal(pruefeBackup({ app: 'elan', daten: {} }).ok, false);
  assert.equal(pruefeBackup({ app: 'elan', schemaVersion: 1 }).ok, false);
  assert.equal(pruefeBackup({ app: 'elan', schemaVersion: 1, daten: { zutaten: 'x' } }).ok, false);
});

test('ein Backup aus einer neueren Version wird nicht eingespielt', () => {
  const p = pruefeBackup({ app: 'elan', schemaVersion: SCHEMA_VERSION + 1, daten: {} });
  assert.equal(p.ok, false);
  assert.match(p.fehler[0], /neueren/);
});

test('Sätze ohne Schlüsselfeld machen das Backup ungültig', () => {
  const p = pruefeBackup({ app: 'elan', schemaVersion: 1, daten: { eintraege: [{ datum: '2026-11-13' }] } });
  assert.equal(p.ok, false);
  assert.match(p.fehler[0], /eintraege/);
});

test('fehlende Bereiche gelten als leer', () => {
  const p = pruefeBackup({ app: 'elan', schemaVersion: 1, daten: {} });
  assert.equal(p.ok, true);
  assert.deepEqual(p.daten.zutaten, []);
});

test('Dateiname trägt das Datum', () => {
  assert.equal(backupDateiname(new Date(2026, 10, 3)), 'elan-backup-2026-11-03.json');
});

test('ein Backup aus Schema-Version 1 wird angehoben: Rezepte kommen leer dazu, der Rest bleibt', () => {
  const alt = JSON.parse(readFileSync(new URL('./daten/backup-v1.json', import.meta.url), 'utf8'));
  const p = pruefeBackup(alt);
  assert.equal(p.ok, true);
  assert.deepEqual(p.daten.rezepte, []);
  assert.deepEqual(p.daten.plan, []);
  assert.deepEqual(p.daten.einkauf, []);
  assert.deepEqual(p.daten.eintraege, alt.daten.eintraege);
  assert.equal(p.anzahl.zutaten, 1);
});

test('für jede ältere Schema-Version gibt es eine Backup-Migration', async () => {
  const { BACKUP_MIGRATIONEN } = await import('../js/logik/backup.js');
  for (let v = 1; v < SCHEMA_VERSION; v += 1) assert.equal(typeof BACKUP_MIGRATIONEN[v], 'function', `Version ${v}`);
});

test('ein Backup aus Schema-Version 2 behält seine Rezepte und bekommt einen leeren Plan', () => {
  const p = pruefeBackup({ app: 'elan', schemaVersion: 2, daten: { rezepte: [{ id: 'r1', name: 'Testeintopf' }] } });
  assert.equal(p.ok, true);
  assert.equal(p.daten.rezepte.length, 1);
  assert.deepEqual(p.daten.plan, []);
});

test('backupFaellig: erst ab fünf Einträgen, dann ohne Backup oder nach mehr als 14 Tagen', async () => {
  const { backupFaellig } = await import('../js/logik/backup.js');
  assert.deepEqual(backupFaellig(null, '2026-11-14', 4), { faellig: false, tage: null });
  assert.deepEqual(backupFaellig(null, '2026-11-14', 5), { faellig: true, tage: null });
  assert.deepEqual(backupFaellig('2026-10-25', '2026-11-14', 50), { faellig: true, tage: 20 });
  assert.deepEqual(backupFaellig('2026-10-31', '2026-11-14', 50), { faellig: false, tage: 14 });
  assert.deepEqual(backupFaellig('2026-11-14', '2026-11-14', 50), { faellig: false, tage: 0 });
});
