// Import im Format "elan-import" (docs/IMPORT-FORMAT.md): Monatsplan aus einem Chat (P2) und Rezepte aus Social Media (P5).
// Reine Funktionen: prüfen, zuordnen, Übernahme vorbereiten. Gespeichert wird erst nach „Übernehmen“ in der Ansicht.
// Nährwerte kommen nie aus der Datei, sondern aus Elans Zutaten; was sich nicht zuordnen lässt, bleibt sichtbar „unbekannt“.

import { istGueltig, tageZwischen } from './datum.js';
import { findeZutat, leseZutatZeile, ordneZu } from './import.js';
import { rezeptAlsZutat } from './rezepte.js';
import { normalisiere } from './suche.js';
import { SLOTS } from './ziele.js';

export const FORMAT = 'elan-import';
export const VERSION = 1;
export const MAX_TAGE = 62;

const zahl = (x) => (typeof x === 'number' ? x : Number(String(x ?? '').replace(',', '.')));
const text = (x, max) => String(x ?? '').trim().slice(0, max);

/** Chats setzen JSON gern in einen Codeblock (```json … ```): Zäune und Text drumherum entfernen */
export function entferneZaeune(roh) {
  const t = String(roh ?? '').trim();
  const block = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  if (block) return block[1].trim();
  const anfang = t.indexOf('{');
  const ende = t.lastIndexOf('}');
  return anfang >= 0 && ende > anfang ? t.slice(anfang, ende + 1) : t;
}

/**
 * Eine Importdatei lesen und prüfen.
 * zutaten: alle bekannten Zutaten (Basis und eigene), rezepte: vorhandene Rezepte in Elan.
 * Liefert { ok, fehler: [satz], rezepte, plan, abgelehnt: [{ wo, grund }], quelle }.
 * rezepte: [{ name, portionen, schritte, zutaten: [{ name, gramm, unsicher, treffer }], vorhanden }]
 * plan: [{ datum, slot, art: 'rezept' | 'zutat', rezeptName, portionen, zutatName, gramm, treffer }]
 */
export function lesePlanImport(roh, { zutaten = [], rezepte: vorhandene = [] } = {}) {
  let daten;
  try {
    daten = JSON.parse(entferneZaeune(roh));
  } catch {
    return { ok: false, fehler: ['Das ist kein gültiges JSON. Kopiere die Antwort des Chats vollständig, ohne etwas wegzulassen.'] };
  }
  if (!daten || typeof daten !== 'object' || Array.isArray(daten)) return { ok: false, fehler: ['Die Datei enthält kein Objekt im Format „elan-import“.'] };
  if (daten.format !== FORMAT) return { ok: false, fehler: [`Erwartet wird "format": "${FORMAT}".`] };
  if (daten.version !== VERSION) return { ok: false, fehler: [`Erwartet wird "version": ${VERSION}.`] };
  const rohRezepte = Array.isArray(daten.rezepte) ? daten.rezepte : [];
  const rohPlan = Array.isArray(daten.plan) ? daten.plan : [];
  if (!rohRezepte.length && !rohPlan.length) return { ok: false, fehler: ['Die Datei enthält weder Rezepte noch Plan-Einträge.'] };

  const abgelehnt = [];
  const vorhandenNach = new Map(vorhandene.map((r) => [normalisiere(r.name), r]));

  // Rezepte
  const rezepte = [];
  const namen = new Set();
  rohRezepte.forEach((r, i) => {
    const wo = `Rezept ${i + 1}`;
    const name = text(r?.name, 80);
    if (!name) { abgelehnt.push({ wo, grund: 'Name fehlt.' }); return; }
    if (namen.has(normalisiere(name))) { abgelehnt.push({ wo: `${wo} („${name}“)`, grund: 'Der Name kommt doppelt vor.' }); return; }
    const portionen = zahl(r.portionen);
    if (!Number.isInteger(portionen) || portionen < 1 || portionen > 20) { abgelehnt.push({ wo: `${wo} („${name}“)`, grund: 'Portionen müssen eine ganze Zahl von 1 bis 20 sein.' }); return; }
    const rohZutaten = Array.isArray(r.zutaten) ? r.zutaten : [];
    const zeilen = rohZutaten.map((z) => {
      const zName = text(z?.name, 80);
      if (!zName) return null;
      const g = zahl(z.gramm);
      if (g > 0) return { roh: zName, menge: g, einheit: 'g', name: zName, gramm: Math.round(g * 10) / 10, unsicher: false };
      // Ohne Gramm: Menge als Text wie im Rezept-Import ("2 EL", "1 Stück")
      return { ...leseZutatZeile(`${text(z.menge, 30)} ${zName}`), name: zName };
    }).filter(Boolean);
    if (!zeilen.length) { abgelehnt.push({ wo: `${wo} („${name}“)`, grund: 'Mindestens eine Zutat mit Namen nötig.' }); return; }
    namen.add(normalisiere(name));
    const schritte = (Array.isArray(r.schritte) ? r.schritte : []).map((s) => text(s, 500)).filter(Boolean);
    rezepte.push({ name, portionen, schritte, zutaten: ordneZu(zeilen, zutaten).map(({ name: n, menge, gramm, unsicher, treffer }) => ({ name: n, menge, gramm, unsicher, treffer })), vorhanden: vorhandenNach.get(normalisiere(name)) ?? null });
  });
  const ausDatei = new Map(rezepte.map((r) => [normalisiere(r.name), r]));

  // Plan
  const plan = [];
  const slots = new Set(SLOTS.map((s) => s.id));
  const gueltigeDaten = rohPlan.map((p) => p?.datum).filter(istGueltig).sort();
  const erstes = gueltigeDaten[0];
  rohPlan.forEach((p, i) => {
    const wo = `Plan ${i + 1}${istGueltig(p?.datum) ? ` (${p.datum})` : ''}`;
    if (!istGueltig(p?.datum)) { abgelehnt.push({ wo, grund: 'Datum fehlt oder ist ungültig (JJJJ-MM-TT).' }); return; }
    if (tageZwischen(erstes, p.datum) >= MAX_TAGE) { abgelehnt.push({ wo, grund: `Mehr als ${MAX_TAGE} Tage nach dem ersten Tag der Datei.` }); return; }
    if (!slots.has(p.mahlzeit)) { abgelehnt.push({ wo, grund: `Unbekannte Mahlzeit „${text(p.mahlzeit, 30)}“. Erlaubt: ${[...slots].join(', ')}.` }); return; }
    if (p.rezept) {
      const rezeptName = text(p.rezept, 80);
      if (!ausDatei.has(normalisiere(rezeptName)) && !vorhandenNach.has(normalisiere(rezeptName))) { abgelehnt.push({ wo, grund: `Rezept „${rezeptName}“ steht weder in der Datei noch in Elan.` }); return; }
      const portionen = p.portionen === undefined ? 1 : zahl(p.portionen);
      if (!(portionen > 0 && portionen <= 20)) { abgelehnt.push({ wo, grund: 'Portionen müssen größer als 0 sein.' }); return; }
      plan.push({ datum: p.datum, slot: p.mahlzeit, art: 'rezept', rezeptName, portionen });
    } else if (p.zutat) {
      const zutatName = text(p.zutat, 80);
      const gramm = zahl(p.gramm);
      if (!(gramm > 0 && gramm <= 5000)) { abgelehnt.push({ wo, grund: `Bei „${zutatName}“ fehlt die Menge in Gramm.` }); return; }
      plan.push({ datum: p.datum, slot: p.mahlzeit, art: 'zutat', zutatName, gramm: Math.round(gramm * 10) / 10, treffer: findeZutat(zutatName, zutaten) });
    } else {
      abgelehnt.push({ wo, grund: 'Weder „rezept“ noch „zutat“ angegeben.' });
    }
  });

  const quelle = daten.quelle && typeof daten.quelle === 'object'
    ? Object.fromEntries(Object.entries({ art: text(daten.quelle.art, 20), link: text(daten.quelle.link, 500), notiz: text(daten.quelle.notiz, 200) }).filter(([, v]) => v))
    : null;
  return { ok: true, fehler: [], rezepte, plan: plan.sort((a, b) => a.datum.localeCompare(b.datum)), abgelehnt, quelle };
}

/** Namen aller Zutaten, die sich nicht zuordnen ließen (für die Auswahl in der Vorschau), ohne Doppelte */
export function offeneZutaten(ergebnis) {
  const namen = [
    ...ergebnis.rezepte.filter((r) => !r.vorhanden).flatMap((r) => r.zutaten.filter((z) => !z.treffer).map((z) => z.name)),
    ...ergebnis.plan.filter((p) => p.art === 'zutat' && !p.treffer).map((p) => p.zutatName),
  ];
  const gesehen = new Map();
  for (const n of namen) if (!gesehen.has(normalisiere(n))) gesehen.set(normalisiere(n), n);
  return [...gesehen.values()];
}

/**
 * Aus dem geprüften Ergebnis die Sätze für die Datenbank bauen.
 * wahl: Map normalisierter Name → Zutat, die der Nutzer für eine offene Zutat gewählt hat.
 * vorhandene: Rezepte, die schon in Elan sind. neueId: Funktion für Kennungen (im Test fest, in der App crypto.randomUUID).
 * Zutaten ohne Zuordnung oder ohne Menge werden nicht übernommen und in "ausgelassen" genannt: lieber eine Lücke als ein falscher Nährwert.
 * Neue Rezepte bekommen bei Namensgleichheit mit einem vorhandenen nicht dessen Platz: Vorhandene werden genutzt, nicht überschrieben.
 * Liefert { rezepte: [neue Rezepte], plan: [Plan-Posten], ausgelassen: [satz] }.
 */
export function baueUebernahme(ergebnis, { wahl = new Map(), vorhandene = [], neueId, jetzt = new Date().toISOString() }) {
  const zuordnung = (name, treffer) => treffer ?? wahl.get(normalisiere(name)) ?? null;
  const ausgelassen = [];
  const neue = [];
  // Vorhandene Rezepte zuerst, damit der Plan sie auch ohne Eintrag in der Datei findet
  const rezeptNach = new Map(vorhandene.map((r) => [normalisiere(r.name), r]));
  for (const r of ergebnis.rezepte) {
    if (r.vorhanden) { rezeptNach.set(normalisiere(r.name), r.vorhanden); continue; }
    const teile = [];
    for (const z of r.zutaten) {
      const zutat = zuordnung(z.name, z.treffer);
      if (!zutat) { ausgelassen.push(`${r.name}: „${z.name}“ ohne passende Zutat`); continue; }
      let { gramm } = z;
      if (gramm === null) {
        // "1 Stück" lässt sich erst mit der gewählten Zutat umrechnen
        const stueck = zutat.portionen?.find((x) => x.name === 'Stück');
        gramm = stueck && z.menge ? Math.round(z.menge * stueck.gramm) : null;
      }
      if (!(gramm > 0)) { ausgelassen.push(`${r.name}: „${z.name}“ ohne Menge`); continue; }
      teile.push({ zutatId: zutat.id, name: zutat.name, marke: zutat.marke ?? '', gramm, je100: zutat.je100 });
    }
    const rezept = { id: neueId(), name: r.name, portionen: r.portionen, zutaten: teile, schritte: r.schritte.map((t) => ({ text: t })), erstellt: jetzt, geaendert: jetzt };
    if (ergebnis.quelle?.link) rezept.quelle = ergebnis.quelle.link;
    neue.push(rezept);
    rezeptNach.set(normalisiere(r.name), rezept);
  }
  const plan = [];
  for (const p of ergebnis.plan) {
    if (p.art === 'rezept') {
      const rezept = rezeptNach.get(normalisiere(p.rezeptName));
      if (!rezept) { ausgelassen.push(`${p.datum}: Rezept „${p.rezeptName}“ fehlt`); continue; }
      const alsZutat = rezeptAlsZutat(rezept);
      const portionGramm = alsZutat.portionen[0]?.gramm ?? 0;
      if (!(portionGramm > 0)) { ausgelassen.push(`${p.datum}: Rezept „${p.rezeptName}“ hat keine Zutaten mit Menge`); continue; }
      plan.push({ id: neueId(), datum: p.datum, slot: p.slot, zutatId: alsZutat.id, rezeptId: rezept.id, name: rezept.name, marke: '', gramm: Math.round(p.portionen * portionGramm), je100: alsZutat.je100, erstellt: jetzt });
    } else {
      const zutat = zuordnung(p.zutatName, p.treffer);
      if (!zutat) { ausgelassen.push(`${p.datum}: „${p.zutatName}“ ohne passende Zutat`); continue; }
      plan.push({ id: neueId(), datum: p.datum, slot: p.slot, zutatId: zutat.id, name: zutat.name, marke: zutat.marke ?? '', gramm: p.gramm, je100: zutat.je100, erstellt: jetzt });
    }
  }
  return { rezepte: neue, plan, ausgelassen };
}

/** Prompt-Vorlage für einen Chat (docs/IMPORT-FORMAT.md). Elan fügt Zeitraum und Text ein; nichts davon verlässt das Gerät ohne Léon. */
export function promptVorlage({ von, bis, inhalt = '' }) {
  return [
    'Gib mir den folgenden Ernährungsplan (oder das Rezept) als JSON im Format "elan-import" Version 1 aus.',
    'Regeln:',
    '- Nur JSON, keine Erklärung davor oder danach.',
    '- Keine Nährwerte, keine Kalorien.',
    '- Mengen in Gramm, wenn möglich; sonst "menge" als Text, z. B. "2 EL".',
    `- Mahlzeiten nur: ${SLOTS.map((s) => s.id).join(', ')}.`,
    `- Datum als JJJJ-MM-TT.${von && bis ? ` Zeitraum: ${von} bis ${bis}.` : ''}`,
    '- Zutaten mit einfachen deutschen Namen ("Haferflocken", nicht "Kernige Bio-Haferflocken").',
    '- Wenn eine Angabe fehlt, lass das Feld weg statt zu raten.',
    'Aufbau: {"format":"elan-import","version":1,"rezepte":[{"name","portionen","zutaten":[{"name","gramm"}],"schritte":[]}],"plan":[{"datum","mahlzeit","rezept","portionen"} oder {"datum","mahlzeit","zutat","gramm"}]}',
    'Hier der Plan / das Rezept:',
    inhalt || '(hier einfügen)',
  ].join('\n');
}
