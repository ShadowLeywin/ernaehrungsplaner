import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verschluessele, entschluessele, istVerschluesselt } from '../js/logic/verschluesselung.js';

test('Ver- und Entschlüsseln, falsches Passwort', async () => {
  const klar = JSON.stringify({ daten: 'Skyr 250 g – Größe ✓' });
  const huelle = await verschluessele(klar, 'geheim123', 'ernaehrungsplaner');
  assert.equal(istVerschluesselt(huelle), true);
  assert.ok(!huelle.daten.includes('Skyr'));
  assert.equal(await entschluessele(huelle, 'geheim123'), klar);
  await assert.rejects(entschluessele(huelle, 'falsch'), /Falsches Passwort/);
});

test('Große Daten (über 1 MB)', async () => {
  const gross = 'x'.repeat(1_200_000);
  const huelle = await verschluessele(gross, 'pw', 'app');
  assert.equal((await entschluessele(huelle, 'pw')).length, 1_200_000);
});
