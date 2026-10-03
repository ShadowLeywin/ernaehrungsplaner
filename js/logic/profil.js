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
    referenzgruppe: 'maenner_19_25', // für Mikronährstoff-Referenzwerte (DGE)
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
    wasser: {
      presetsMl: [250, 500, 800],
      mittagspause: '12:00', // Ziel „Wasser bis Mittag“ zählt Einträge vor dieser Uhrzeit
    },
    // Täglich nüchtern, wird jeden Tag als getrunken vorbelegt
    morningStack: {
      aktiv: true,
      name: 'Morning Stack',
      zutaten: [
        { lebensmittelId: 'rote_bete_saft', gramm: 250 },
        { lebensmittelId: 'manuka_honig', gramm: 8 }, // 1 TL
        { lebensmittelId: 'schwarzkuemmeloel', gramm: 4.5 }, // 1 TL
        { lebensmittelId: 'ingwer', gramm: 5 },
      ],
    },
    // Checkliste; Nährwerte zählen in die Tagesziele.
    // Entweder `zutaten` aus der Lebensmitteldatenbank oder `naehrwerte` pro Tagesportion.
    supplements: [
      {
        id: 'athlete_stack',
        name: 'ESN Athlete Stack Men',
        dosis: '1 Tagesportion (Kapseln)',
        aktiv: true,
        hinweis: 'Werte laut Online-Shop, mit der Packung abgleichen. Folsäure 250 µg = 425 µg Folat-Äquivalent.',
        naehrwerte: {
          vitA: 800, vitB1: 3.5, vitB2: 3.4, vitB3: 32, vitB6: 4.8, folat: 425, vitB12: 3.7,
          vitC: 200, vitD: 25, vitE: 12, vitK: 35,
          calcium: 420, eisen: 18, magnesium: 210, zink: 20, kalium: 300, jod: 150, selen: 82,
        },
      },
      {
        id: 'omega3',
        name: 'ESN Omega-3',
        dosis: '1 Tagesportion',
        aktiv: true,
        hinweis: '1.200 mg EPA + 900 mg DHA. Fett und kcal geschätzt (ca. 3 g Fischöl).',
        naehrwerte: { kcal: 27, fett: 3, omega3: 2.1, epaDha: 2100 },
      },
      {
        id: 'kreatin',
        name: 'Kreatin-Monohydrat',
        dosis: '5 g',
        aktiv: true,
        zutaten: [{ lebensmittelId: 'kreatin', gramm: 5 }],
      },
      {
        id: 'flohsamen',
        name: 'Flohsamenschalen',
        dosis: '5 g',
        aktiv: true,
        zutaten: [{ lebensmittelId: 'flohsamenschalen', gramm: 5 }],
      },
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
