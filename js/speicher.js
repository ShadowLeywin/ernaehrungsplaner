// Datenzugriff für die Ansichten. Hier steht, WAS gespeichert wird; js/db.js weiß nur, WIE.

import * as db from './db.js';
import { erstelleBackup } from './logik/backup.js';
import { bereinigeGesundheit, messungId } from './logik/gesundheit.js';
import { rezeptAlsZutat } from './logik/rezepte.js';
import { bereinigeWoche, bereinigeZiele, slotsMitAnteilen } from './logik/ziele.js';

/* ---------- Zutaten ---------- */

let basis;

/** Mitgelieferte Zutaten (data/zutaten-basis.json). Nur lesen, einmal laden. */
export function ladeBasis() {
  basis ??= fetch('./data/zutaten-basis.json')
    .then((antwort) => {
      if (!antwort.ok) throw new Error(`Basis-Zutaten nicht geladen (HTTP ${antwort.status})`);
      return antwort.json();
    })
    .then((datei) => datei.zutaten)
    .catch((fehler) => { basis = undefined; throw fehler; });
  return basis;
}

/** Eigene Zutaten zuerst, dann die mitgelieferten. */
export async function alleZutaten() {
  const [eigene, mitgeliefert] = await Promise.all([
    db.alle('zutaten'),
    ladeBasis().catch((fehler) => { console.warn(fehler); return []; }),
  ]);
  return [...eigene, ...mitgeliefert];
}

export async function holeZutat(id) {
  if (String(id).startsWith('basis:')) return (await ladeBasis()).find((z) => z.id === id) ?? null;
  if (String(id).startsWith('rezept:')) {
    const rezept = await db.hole('rezepte', String(id).slice(7));
    return rezept ? rezeptAlsZutat(rezept) : null;
  }
  return (await db.hole('zutaten', id)) ?? null;
}

export function speichereZutat(zutat) {
  return db.speichere('zutaten', {
    ...zutat,
    id: zutat.id ?? `eigen:${crypto.randomUUID()}`,
    geaendert: new Date().toISOString(),
  });
}

export const loescheZutat = (id) => db.loesche('zutaten', id);

/* ---------- Rezepte ---------- */

export const alleRezepte = () => db.alle('rezepte');
export const holeRezept = async (id) => (await db.hole('rezepte', id)) ?? null;

export function speichereRezept(rezept) {
  const jetzt = new Date().toISOString();
  return db.speichere('rezepte', { ...rezept, id: rezept.id ?? crypto.randomUUID(), erstellt: rezept.erstellt ?? jetzt, geaendert: jetzt });
}

export const loescheRezept = (id) => db.loesche('rezepte', id);

/* ---------- Tagebuch ---------- */

export const eintraegeAm = (datum) => db.nachIndex('eintraege', 'datum', datum);
export const eintraegeZwischen = (von, bis) => db.imBereich('eintraege', 'datum', von, bis);
export const alleEintraege = () => db.alle('eintraege');

/** Eintrag anlegen oder ändern. Die Nährwerte werden als Kopie mitgespeichert (siehe docs/DATENMODELL.md). */
export function speichereEintrag(eintrag) {
  return db.speichere('eintraege', {
    ...eintrag,
    id: eintrag.id ?? crypto.randomUUID(),
    erstellt: eintrag.erstellt ?? new Date().toISOString(),
  });
}

export const loescheEintrag = (id) => db.loesche('eintraege', id);

/* ---------- Wochenplan und Einkaufsliste ---------- */

export const planAm = (datum) => db.nachIndex('plan', 'datum', datum);
export const planZwischen = (von, bis) => db.imBereich('plan', 'datum', von, bis);
export const speicherePlan = (posten) => db.speichere('plan', { ...posten, id: posten.id ?? crypto.randomUUID(), erstellt: posten.erstellt ?? new Date().toISOString() });
export const loeschePlan = (id) => db.loesche('plan', id);

/** Häkchen und eigene Posten einer Woche; woche ist das Datum des Montags. */
export const einkaufDerWoche = (woche) => db.nachIndex('einkauf', 'woche', woche);
export const speichereEinkauf = (satz) => db.speichere('einkauf', { ...satz, id: satz.id ?? crypto.randomUUID() });
export const loescheEinkauf = (id) => db.loesche('einkauf', id);

/* ---------- Mag-Liste ---------- */

/** Alle Vorlieben als Map nach zutatId */
export const alleVorlieben = async () => new Map((await db.alle('vorlieben')).map((v) => [v.zutatId, v]));

/** mag: J, R, K, N, S oder leer (dann wird die Angabe entfernt) */
export function setzeVorliebe(zutatId, mag, notiz = '') {
  if (!mag) return db.loesche('vorlieben', zutatId);
  return db.speichere('vorlieben', { zutatId, mag, notiz: String(notiz).trim().slice(0, 120) });
}

/* ---------- Angebote ---------- */

export const alleAngebote = () => db.alle('angebote');
export const speichereAngebot = (a) => db.speichere('angebote', { ...a, id: a.id ?? crypto.randomUUID() });
export const loescheAngebot = (id) => db.loesche('angebote', id);

/** Angebote aus einer Datei ersetzen die der vorigen Datei; von Hand eingetragene bleiben stehen. */
export async function ersetzeDateiAngebote(neue) {
  for (const alt of (await db.alle('angebote')).filter((a) => a.quelle === 'datei')) await db.loesche('angebote', alt.id);
  for (const a of neue) await speichereAngebot(a);
}

/* ---------- Tage ---------- */

export const holeTag = (datum) => db.hole('tage', datum);

/** Tagestyp für einen Tag festlegen; null entfernt die Abweichung vom Wochenplan. */
export const setzeTagestyp = (datum, tagestyp) => aendereTag(datum, (tag) => {
  if (tagestyp) tag.tagestyp = tagestyp;
  else delete tag.tagestyp;
});

/** Ein Supplement für einen Tag abhaken oder das Häkchen entfernen */
export const setzeSupplementGenommen = (datum, id, genommen) => aendereTag(datum, (tag) => {
  const liste = new Set(tag.supplements ?? []);
  if (genommen) liste.add(id); else liste.delete(id);
  if (liste.size) tag.supplements = [...liste];
  else delete tag.supplements;
});

/** Tagessatz lesen, ändern, speichern. Steht außer dem Datum nichts mehr drin, wird er entfernt. */
async function aendereTag(datum, aendere) {
  const tag = (await db.hole('tage', datum)) ?? { datum };
  aendere(tag);
  if (Object.keys(tag).length === 1) return db.loesche('tage', datum);
  return db.speichere('tage', tag);
}

/* ---------- Health ---------- */

export const messungenZwischen = (von, bis) => db.imBereich('messungen', 'datum', von, bis);
export const speichereMessung = ({ art, datum, wert }) => db.speichere('messungen', { id: messungId(art, datum, crypto.randomUUID()), art, datum, wert });
export const loescheMessung = (id) => db.loesche('messungen', id);
export const alleSupplements = () => db.alle('supplements');
export const speichereSupplement = (s) => db.speichere('supplements', { ...s, id: s.id ?? crypto.randomUUID() });
export const loescheSupplement = (id) => db.loesche('supplements', id);
export const ladeGesundheit = async () => bereinigeGesundheit(await einstellung('gesundheit'));

export const alleLaborwerte = () => db.alle('labor');
export const speichereLaborwert = (w) => db.speichere('labor', { ...w, id: w.id ?? crypto.randomUUID() });
export const loescheLaborwert = (id) => db.loesche('labor', id);
export const symptomeZwischen = (von, bis) => db.imBereich('symptome', 'datum', von, bis);
export const speichereSymptom = (s) => db.speichere('symptome', { ...s, id: s.id ?? crypto.randomUUID() });
export const loescheSymptom = (id) => db.loesche('symptome', id);

/* ---------- Einstellungen ---------- */

export async function einstellung(schluessel, standard = null) {
  return (await db.hole('einstellungen', schluessel))?.wert ?? standard;
}

export const setzeEinstellung = (schluessel, wert) => db.speichere('einstellungen', { schluessel, wert });

export const ladeZiele = async () => bereinigeZiele(await einstellung('ziele'));
export const ladeWoche = async () => bereinigeWoche(await einstellung('woche'));
/** Die sechs Slots mit den eingestellten Anteilen am Tagesziel */
export const ladeSlots = async () => slotsMitAnteilen(await einstellung('slotAnteile'));

/* ---------- Backup ---------- */

export const exportiere = async () => erstelleBackup(await db.allesLesen());
export const importiere = (daten) => db.allesErsetzen(daten);

/* ---------- Speicher des Browsers ---------- */

/** Ist der Speicher vor dem automatischen Aufräumen des Browsers geschützt? */
export async function speicherStatus() {
  if (!navigator.storage?.persisted) return { bekannt: false };
  const [dauerhaft, schaetzung] = await Promise.all([navigator.storage.persisted(), navigator.storage.estimate?.() ?? {}]);
  return { bekannt: true, dauerhaft, belegt: schaetzung.usage ?? null };
}

export const sichereSpeicher = async () => (navigator.storage?.persist ? navigator.storage.persist() : false);
