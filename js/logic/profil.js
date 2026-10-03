// Profil: neutraler Standard für neue Nutzer, Erzeugung aus der Ersteinrichtung, Migration.
// Persönliche Werte gehören nicht in den Code, sondern ins Profil auf dem Gerät (und ins Backup).
import { berechneTagesbedarf, berechneMakros } from './bedarf.js';

export const PROFIL_VERSION = 2;

export const WOCHENTAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export const STANDARD_MAHLZEITEN = [
  { id: 'fruehstueck', name: 'Frühstück', anteil: 20 },
  { id: 'morgensnack', name: 'Morgensnack', anteil: 10 },
  { id: 'mittagessen', name: 'Mittagessen', anteil: 25 },
  { id: 'nachmittagssnack', name: 'Nachmittagssnack', anteil: 10 },
  { id: 'abendessen', name: 'Abendessen', anteil: 25 },
  { id: 'abendsnack', name: 'Abendsnack', anteil: 10 },
];

export function neuerTagestyp(id, name, werte = {}) {
  return {
    id,
    name,
    basis: false, // Basistag: aus ihm werden andere Tage auf Wunsch skaliert
    aktivitaeten: [], // ids aus profil.aktivitaeten
    kcal: 2200,
    protein: 130,
    kh: 260,
    fett: 70,
    gemueseG: 400,
    obstG: 250,
    ballaststoffeMinG: 30,
    ballaststoffeMaxG: 40,
    wasserBisMittagMl: 1500,
    ...werte,
  };
}

export function standardProfil() {
  return {
    version: PROFIL_VERSION,
    referenzgruppe: 'maenner_19_25', // wird bei der Einrichtung aus Geschlecht und Alter gesetzt
    koerper: { geschlecht: null, alter: null, groesseCm: null, gewichtKg: null },
    alltag: 'sitzend',
    aktivitaeten: [], // { id, name, kcal } – kcal pro Einheit, selbst geschätzt
    ziel: { art: 'halten', kgProWoche: 0, wochen: 12, startDatum: null },
    makroRegeln: { proteinGProKg: 1.8, fettAnteil: 0.25 },
    tagestypen: [neuerTagestyp('standard', 'Standardtag', { basis: true })],
    woche: WOCHENTAGE.map(() => ({ tagestyp: 'standard', notiz: '' })),
    wasser: {
      presetsMl: [250, 500, 800],
      mittagspause: '12:00', // Ziel „Wasser bis Mittag“ zählt Einträge vor dieser Uhrzeit
    },
    // Fester täglicher Eintrag (z. B. Shake am Morgen), als getrunken vorbelegt
    morningStack: { aktiv: false, name: 'Morning Stack', zutaten: [] },
    // Checkliste; Nährwerte zählen in die Tagesziele.
    // Entweder `zutaten` aus der Lebensmitteldatenbank oder `naehrwerte` pro Tagesportion.
    supplements: [],
    mahlzeiten: structuredClone(STANDARD_MAHLZEITEN),
  };
}

/** Referenzgruppe für Mikronährstoffe aus Geschlecht und Alter. */
export function referenzgruppeFuer({ geschlecht, alter }) {
  const prefix = geschlecht === 'w' ? 'frauen' : 'maenner';
  return `${prefix}_${alter < 25 ? '19_25' : '25_51'}`;
}

/**
 * Profil aus der Ersteinrichtung erzeugen.
 * eingaben: { koerper, alltag, aktivitaeten, wochenSport: [[aktivitaetIds] × 7], ziel, makroRegeln }
 * Tagestypen entstehen aus den unterschiedlichen Sport-Kombinationen der Woche.
 */
export function profilAusEinrichtung(eingaben) {
  const profil = standardProfil();
  Object.assign(profil, {
    koerper: { ...eingaben.koerper },
    alltag: eingaben.alltag,
    aktivitaeten: structuredClone(eingaben.aktivitaeten),
    ziel: { ...eingaben.ziel },
    makroRegeln: { ...eingaben.makroRegeln },
    referenzgruppe: referenzgruppeFuer(eingaben.koerper),
  });

  const nameVon = (id) => profil.aktivitaeten.find((a) => a.id === id)?.name ?? id;
  const typen = new Map();
  profil.woche = eingaben.wochenSport.map((ids) => {
    const sortiert = [...ids].sort();
    const id = sortiert.length ? sortiert.join('+') : 'ruhetag';
    if (!typen.has(id)) {
      typen.set(id, neuerTagestyp(id, sortiert.length ? sortiert.map(nameVon).join(' + ') : 'Ruhetag', { aktivitaeten: sortiert }));
    }
    return { tagestyp: id, notiz: '' };
  });

  profil.tagestypen = [...typen.values()];
  for (const typ of profil.tagestypen) {
    const bedarf = berechneTagesbedarf(profil, typ);
    if (bedarf) Object.assign(typ, { kcal: bedarf.kcal }, berechneMakros(bedarf.kcal, profil.koerper.gewichtKg, profil.makroRegeln));
  }
  // Basistag = der Tag mit dem höchsten Bedarf
  const basis = profil.tagestypen.reduce((a, b) => (b.kcal > a.kcal ? b : a));
  basis.basis = true;
  return profil;
}

/** Gespeichertes Profil um Felder ergänzen, die in neueren App-Versionen dazugekommen sind. */
export function vervollstaendigeProfil(gespeichert) {
  const standard = standardProfil();
  const profil = { ...standard, ...gespeichert, version: PROFIL_VERSION };
  profil.koerper = { ...standard.koerper, ...gespeichert.koerper };
  profil.ziel = { ...standard.ziel, ...gespeichert.ziel };
  profil.makroRegeln = { ...standard.makroRegeln, ...gespeichert.makroRegeln };
  profil.tagestypen = profil.tagestypen.map((t) => ({ aktivitaeten: [], ...t }));
  return profil;
}
