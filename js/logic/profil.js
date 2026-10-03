// Standardprofil und Profil-Migration. Alle Werte sind in der App änderbar.

export const PROFIL_VERSION = 1;

export const WOCHENTAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

function tagestyp(id, name, kcal, makros, obstG, basis = false) {
  return {
    id,
    name,
    basis, // Basistag: aus ihm werden die anderen Tage skaliert
    kcal,
    ...makros,
    gemueseG: 500,
    obstG,
    ballaststoffeMinG: 35,
    ballaststoffeMaxG: 40,
    wasserBisMittagMl: 2500,
  };
}

export function standardProfil() {
  return {
    version: PROFIL_VERSION,
    tagestypen: [
      tagestyp('training', 'Trainingstag', 2875, { protein: 175, kh: 375, fett: 75 }, 300, true),
      tagestyp('calisthenics', 'Calisthenics-Tag', 2600, { protein: 175, kh: 328, fett: 65 }, 200),
      tagestyp('rest', 'Rest Day', 2400, { protein: 175, kh: 293, fett: 59 }, 200),
    ],
    woche: [
      { tagestyp: 'training', notiz: '' },
      { tagestyp: 'training', notiz: '' },
      { tagestyp: 'training', notiz: 'Beine' },
      { tagestyp: 'training', notiz: '' },
      { tagestyp: 'training', notiz: '' },
      { tagestyp: 'calisthenics', notiz: '' },
      { tagestyp: 'rest', notiz: '' },
    ],
    mahlzeiten: [
      { id: 'fruehstueck', name: 'Frühstück', anteil: 20 },
      { id: 'morgensnack', name: 'Morgensnack', anteil: 10 },
      { id: 'mittagessen', name: 'Mittagessen', anteil: 25 },
      { id: 'nachmittagssnack', name: 'Nachmittagssnack', anteil: 10 },
      { id: 'abendessen', name: 'Abendessen', anteil: 25 },
      { id: 'abendsnack', name: 'Abendsnack', anteil: 10 },
    ],
  };
}

/** Gespeichertes Profil um Felder ergänzen, die in neueren App-Versionen dazugekommen sind. */
export function vervollstaendigeProfil(gespeichert) {
  const standard = standardProfil();
  return { ...standard, ...gespeichert, version: PROFIL_VERSION };
}
