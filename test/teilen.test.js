import assert from 'node:assert/strict';
import test from 'node:test';
import { leseRezeptText } from '../js/logik/import.js';
import { bereinigeBildunterschrift, ordneGeteiltesEin, plattformVon } from '../js/logik/teilen.js';

// Beispieltexte nachempfunden, nicht kopiert; Namen und Links erfunden
const TIKTOK = `Proteinreiche Overnight Oats 🥣🔥
Zutaten 👇
🥣 80 g Haferflocken
🥛 200 g Skyr
🍓 100 g Erdbeeren #frühstück
Zubereitung:
✅ Alles in ein Glas schichten
✅ Über Nacht in den Kühlschrank
#mealprep #protein #fyp
https://vm.tiktok.com/ZMabc123/`;

test('Plattform am Hostnamen, auch Kurzlinks', () => {
  assert.equal(plattformVon('https://vm.tiktok.com/ZMabc/').id, 'tiktok');
  assert.equal(plattformVon('https://www.instagram.com/reel/Cxyz/').id, 'instagram');
  assert.equal(plattformVon('https://youtu.be/abc').id, 'youtube');
  assert.equal(plattformVon('https://m.youtube.com/shorts/abc').id, 'youtube');
  assert.deepEqual(plattformVon('https://www.chefkoch.de/rezepte/1'), { id: 'andere', name: 'chefkoch.de' });
  assert.equal(plattformVon('kein link'), null);
  assert.equal(plattformVon('https://nichttiktok.com/x').id, 'andere'); // nur ganze Hostnamen
});

test('Geteiltes zerlegen: Link, Text, reines Video', () => {
  const t = ordneGeteiltesEin(TIKTOK);
  assert.equal(t.link, 'https://vm.tiktok.com/ZMabc123/');
  assert.equal(t.plattform.id, 'tiktok');
  assert.equal(t.nurLink, false);
  assert.ok(!t.text.includes('https://'));
  const video = ordneGeteiltesEin('Schau mal! https://www.youtube.com/shorts/xyz.');
  assert.deepEqual([video.link, video.nurLink], ['https://www.youtube.com/shorts/xyz', true]);
  assert.equal(ordneGeteiltesEin('Nur Text ohne Link').link, null);
});

test('Bildunterschrift aufgeräumt: Hashtags und Emojis weg, Überschriften erkannt', () => {
  const sauber = bereinigeBildunterschrift(ordneGeteiltesEin(TIKTOK).text);
  assert.equal(sauber, ['Proteinreiche Overnight Oats', 'Zutaten', '80 g Haferflocken', '200 g Skyr', '100 g Erdbeeren', 'Zubereitung', 'Alles in ein Glas schichten', 'Über Nacht in den Kühlschrank'].join('\n'));
});

test('Danach versteht der Rezept-Leser die Bildunterschrift', () => {
  const r = leseRezeptText(bereinigeBildunterschrift(ordneGeteiltesEin(TIKTOK).text));
  assert.equal(r.name, 'Proteinreiche Overnight Oats');
  assert.deepEqual(r.zutaten.map((z) => [z.name, z.gramm]), [['Haferflocken', 80], ['Skyr', 200], ['Erdbeeren', 100]]);
  assert.equal(r.schritte.length, 2);
});
