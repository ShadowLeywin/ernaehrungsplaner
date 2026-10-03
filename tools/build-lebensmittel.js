// Erzeugt data/lebensmittel.json aus den USDA-Rohdaten (SR Legacy) und tools/lebensmittel-liste.js.
// Voraussetzung: rohdaten/sr_legacy/… entpackt (siehe CLAUDE.md). Kein API-Key nötig.
// Aufruf: node tools/build-lebensmittel.js

import { createReadStream, readdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LISTE } from './lebensmittel-liste.js';
import { NAEHRSTOFFE, KATEGORIEN } from '../js/logic/naehrstoffe.js';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const SR_ORDNER = join(WURZEL, 'rohdaten', 'sr_legacy');
const SR = join(SR_ORDNER, readdirSync(SR_ORDNER).find((n) => n.startsWith('FoodData_Central_sr_legacy')));

// USDA-Nährstoff-IDs → unsere Schlüssel. Mehrere IDs = erste vorhandene gewinnt.
const ZUORDNUNG = {
  kcal: [1008, 2048, 2047],
  protein: [1003],
  khInklBallaststoffe: [1005],
  zucker: [2000, 1063],
  fett: [1004],
  ballaststoffe: [1079],
  gesFett: [1258],
  vitA: [1106],
  vitB1: [1165],
  vitB2: [1166],
  vitB3: [1167],
  vitB6: [1175],
  folat: [1190, 1177],
  vitB12: [1178],
  vitC: [1162],
  vitD: [1114],
  vitE: [1109],
  vitK: [1185],
  calcium: [1087],
  eisen: [1089],
  magnesium: [1090],
  zink: [1095],
  kalium: [1092],
  natrium: [1093],
  phosphor: [1091],
  jod: [1100],
  selen: [1103],
};
const ALA = [1404, 1270];
const EPA = 1278;
const DPA = 1280;
const DHA = 1272;

/** Eine CSV-Zeile mit Anführungszeichen zerlegen. */
function csvZeile(zeile) {
  const felder = [];
  let feld = '';
  let inAnfuehrung = false;
  for (let i = 0; i < zeile.length; i++) {
    const z = zeile[i];
    if (inAnfuehrung) {
      if (z === '"' && zeile[i + 1] === '"') { feld += '"'; i++; }
      else if (z === '"') inAnfuehrung = false;
      else feld += z;
    } else if (z === '"') inAnfuehrung = true;
    else if (z === ',') { felder.push(feld); feld = ''; }
    else feld += z;
  }
  felder.push(feld);
  return felder;
}

async function leseCsv(datei, beiZeile) {
  const zeilen = createInterface({ input: createReadStream(join(SR, datei)), crlfDelay: Infinity });
  let kopf;
  for await (const zeile of zeilen) {
    const felder = csvZeile(zeile);
    if (!kopf) { kopf = felder; continue; }
    beiZeile(Object.fromEntries(kopf.map((k, i) => [k, felder[i]])));
  }
}

function runde(wert) {
  if (wert >= 100) return Math.round(wert);
  if (wert >= 10) return Math.round(wert * 10) / 10;
  return Math.round(wert * 100) / 100;
}

function erste(werte, ids) {
  for (const id of ids) if (werte.has(id)) return werte.get(id);
  return undefined;
}

function je100gAusUsda(werte) {
  const ergebnis = {};
  for (const [schluessel, ids] of Object.entries(ZUORDNUNG)) {
    const wert = erste(werte, ids);
    if (wert !== undefined) ergebnis[schluessel] = wert;
  }
  // EU-Kennzeichnung: Kohlenhydrate ohne Ballaststoffe
  if (ergebnis.khInklBallaststoffe !== undefined) {
    ergebnis.kh = Math.max(0, ergebnis.khInklBallaststoffe - (ergebnis.ballaststoffe ?? 0));
    delete ergebnis.khInklBallaststoffe;
  }
  const ala = erste(werte, ALA);
  const epa = werte.get(EPA);
  const dpa = werte.get(DPA);
  const dha = werte.get(DHA);
  if ([ala, epa, dpa, dha].some((w) => w !== undefined)) {
    ergebnis.omega3 = (ala ?? 0) + (epa ?? 0) + (dpa ?? 0) + (dha ?? 0);
  }
  if (epa !== undefined || dha !== undefined) ergebnis.epaDha = ((epa ?? 0) + (dha ?? 0)) * 1000; // g → mg

  // Reihenfolge wie in NAEHRSTOFFE, gerundet
  return Object.fromEntries(Object.keys(NAEHRSTOFFE)
    .filter((k) => ergebnis[k] !== undefined)
    .map((k) => [k, runde(ergebnis[k])]));
}

async function main() {
  // 1) Beschreibungen → fdc_id
  const nachBeschreibung = new Map();
  await leseCsv('food.csv', (z) => {
    nachBeschreibung.set(z.description, Number(z.fdc_id));
    // Viele Einträge tragen diesen Zusatz – auch ohne ihn auffindbar machen
    const kurz = z.description.replace(" (Includes foods for USDA's Food Distribution Program)", '');
    if (!nachBeschreibung.has(kurz)) nachBeschreibung.set(kurz, Number(z.fdc_id));
  });

  const fehlend = [];
  const benoetigt = new Set();
  for (const eintrag of LISTE) {
    if (!KATEGORIEN[eintrag.kategorie]) throw new Error(`Unbekannte Kategorie bei ${eintrag.id}: ${eintrag.kategorie}`);
    if (!eintrag.usda) continue;
    const fdcId = nachBeschreibung.get(eintrag.usda);
    if (fdcId) benoetigt.add(fdcId);
    else fehlend.push(eintrag);
  }

  if (fehlend.length) {
    console.error(`Nicht gefunden (${fehlend.length}):`);
    const alle = [...nachBeschreibung.keys()];
    for (const e of fehlend) {
      const wort = e.usda.split(/[ ,(]/)[0].toLowerCase();
      const vorschlaege = alle.filter((b) => b.toLowerCase().startsWith(wort)).slice(0, 8);
      console.error(`- ${e.id}: "${e.usda}"\n    ${vorschlaege.join('\n    ')}`);
    }
    process.exit(1);
  }

  // 2) Nährwerte der benötigten Lebensmittel einsammeln
  const naehrwerte = new Map();
  await leseCsv('food_nutrient.csv', (z) => {
    const fdcId = Number(z.fdc_id);
    if (!benoetigt.has(fdcId)) return;
    if (!naehrwerte.has(fdcId)) naehrwerte.set(fdcId, new Map());
    naehrwerte.get(fdcId).set(Number(z.nutrient_id), Number(z.amount));
  });

  // 3) Ausgabe
  const lebensmittel = LISTE.map((e) => {
    const basis = { id: e.id, name: e.name, kategorie: e.kategorie };
    if (e.stueckG) basis.stueckG = e.stueckG;
    if (e.keinGemueseZiel) basis.keinGemueseZiel = true;
    if (e.eigen) return { ...basis, quelle: 'eigen', je100g: e.eigen };
    const fdcId = nachBeschreibung.get(e.usda);
    const je100g = je100gAusUsda(naehrwerte.get(fdcId));
    if (e.kcalAusMakros) {
      je100g.kcal = Math.round(4 * je100g.protein + 4 * je100g.kh + 9 * je100g.fett + 2 * (je100g.ballaststoffe ?? 0));
    }
    return { ...basis, quelle: 'usda_sr', fdcId, je100g };
  });

  const ids = new Set();
  for (const l of lebensmittel) {
    if (ids.has(l.id)) throw new Error(`Doppelte id: ${l.id}`);
    ids.add(l.id);
  }

  const kopf = {
    version: 1,
    erstelltAm: new Date().toISOString().slice(0, 10),
    quellen: {
      usda_sr: 'USDA FoodData Central, SR Legacy (April 2018). Kohlenhydrate ohne Ballaststoffe (EU-Kennzeichnung).',
      eigen: 'Richtwerte typischer Produkte aus dem deutschen Handel – mit der Packung abgleichen.',
    },
  };
  // Ein Lebensmittel pro Zeile: lesbare Git-Diffs, trotzdem kompakt
  const json = `{\n${Object.entries(kopf).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}\n`
    + `  "lebensmittel": [\n${lebensmittel.map((l) => `    ${JSON.stringify(l)}`).join(',\n')}\n  ]\n}\n`;
  writeFileSync(join(WURZEL, 'data', 'lebensmittel.json'), json);
  console.log(`data/lebensmittel.json geschrieben: ${lebensmittel.length} Lebensmittel `
    + `(${lebensmittel.filter((l) => l.quelle === 'usda_sr').length} USDA, ${lebensmittel.filter((l) => l.quelle === 'eigen').length} eigene Richtwerte)`);
}

main();
