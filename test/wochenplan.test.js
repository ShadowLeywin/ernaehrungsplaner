import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  leererPlan, planTagNaehrwerte, planAlsEintraege, einkaufsliste, einkaufsMenge, pruefePraeferenzen, exportierePraeferenzen, obstGemueseVorschlaege,
} from '../js/logic/wochenplan.js';

const rezept = { id: 'chili', portionen: 2, gewichtGekochtG: 1000, zutaten: [{ lebensmittelId: 'bohnen', gramm: 400 }, { lebensmittelId: 'reis', gramm: 200 }] };
const LM = [
  { id: 'apfel', kategorie: 'obst', stueckG: 170, je100g: { kcal: 52 } },
  { id: 'brokkoli', kategorie: 'gemuese', je100g: { kcal: 34 } },
  { id: 'kartoffel', kategorie: 'gemuese', keinGemueseZiel: true, je100g: { kcal: 77 } },
  { id: 'rezept:chili', kategorie: 'rezept', je100g: { kcal: 120 } },
];

function plan() {
  const p = leererPlan();
  p.tage[0] = { mittagessen: [{ id: 'rezept:chili', gramm: 500 }], fruehstueck: [{ id: 'apfel', gramm: 170 }] };
  p.tage[1] = { mittagessen: [{ id: 'rezept:chili', gramm: 500 }] };
  return p;
}

test('Nährwerte und Einträge aus dem Plan', () => {
  assert.equal(Math.round(planTagNaehrwerte(plan().tage[0], LM).kcal), 600 + 88);
  let n = 0;
  const eintraege = planAlsEintraege(plan().tage[0], () => `e${n += 1}`);
  assert.equal(eintraege.length, 2);
  assert.equal(eintraege[0].geplant, true);
});

test('Einkaufsliste löst Rezepte auf', () => {
  const liste = einkaufsliste(plan(), [rezept]);
  // 2 × 500 g von 1000 g fertigem Chili = das ganze Rezept
  assert.deepEqual(liste, [{ lebensmittelId: 'bohnen', gramm: 400 }, { lebensmittelId: 'reis', gramm: 200 }, { lebensmittelId: 'apfel', gramm: 170 }]);
});

test('Einkaufsmengen', () => {
  assert.equal(einkaufsMenge(400, LM[0]).text, '3 Stück');
  assert.equal(einkaufsMenge(1250, LM[1]).text, '1,3 kg');
  assert.equal(einkaufsMenge(234, LM[1]).text, '230 g');
});

test('Vorlieben: Import prüfen, Export, Vorschläge', () => {
  const ids = new Set(['apfel', 'brokkoli']);
  assert.ok(pruefePraeferenzen('nix', ids).fehler);
  const ok = pruefePraeferenzen(JSON.stringify({ schema_version: 1, bewertungen: { apfel: 9, brokkoli: 0, fremd: 5, kaputt: 99 } }), ids);
  assert.deepEqual(ok.bewertungen, { apfel: 9, brokkoli: 0 });
  assert.equal(exportierePraeferenzen({ apfel: 9 }).schema_version, 1);
  const v = obstGemueseVorschlaege(LM, { apfel: 9, brokkoli: 0 });
  assert.deepEqual(v.map((x) => x.lm.id), ['apfel']);
  const mitAngebot = obstGemueseVorschlaege(LM, { apfel: 6, brokkoli: 5 }, new Set(['brokkoli']));
  assert.equal(mitAngebot[0].lm.id, 'brokkoli');
});
