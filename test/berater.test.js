import assert from 'node:assert/strict';
import test from 'node:test';
import { beraterPrompt } from '../js/logik/berater.js';
import { STANDARD_TAGESTYPEN, STANDARD_WOCHE, STANDARD_ZIELE, slotsMitAnteilen } from '../js/logik/ziele.js';

test('Berater-Prompt enthält Ziele, Wochenplan, Mahlzeiten, Vorlieben und das Importformat', () => {
  const p = beraterPrompt({
    von: '2026-12-01', bis: '2026-12-31', typen: STANDARD_TAGESTYPEN, ziele: STANDARD_ZIELE, woche: STANDARD_WOCHE, slots: slotsMitAnteilen(null),
    vorlieben: [{ name: 'Brokkoli', mag: 'J' }, { name: 'Rosenkohl', mag: 'N' }, { name: 'Möhre', mag: 'R' }],
    rezepte: ['Testbrei'], wunsch: 'unter der Woche wenig kochen',
  });
  assert.match(p, /Zeitraum: 2026-12-01 bis 2026-12-31/);
  assert.match(p, /- Gym: Energie 2700 kcal, Eiweiß 150 g/);
  assert.match(p, /Montag Gym, Dienstag Calisthenics/);
  assert.match(p, /fruehstueck = Frühstück 25 %/);
  assert.match(p, /- mag ich: Brokkoli/);
  assert.match(p, /- mag ich nicht: Rosenkohl/);
  assert.match(p, /- nur roh: Möhre/);
  assert.match(p, /Testbrei/);
  assert.match(p, /unter der Woche wenig kochen/);
  assert.match(p, /"format":"elan-import"/);
  assert.match(p, /Keine Nährwerte/);
});

test('Ohne Vorlieben und Rezepte keine leeren Abschnitte', () => {
  const p = beraterPrompt({ von: 'a', bis: 'b', typen: STANDARD_TAGESTYPEN, ziele: STANDARD_ZIELE, woche: STANDARD_WOCHE, slots: slotsMitAnteilen(null) });
  assert.doesNotMatch(p, /Vorlieben bei Obst/);
  assert.doesNotMatch(p, /Rezepte, die ich schon habe/);
  assert.match(p, /Meine Wünsche: keine besonderen/);
});
