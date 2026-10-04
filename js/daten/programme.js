// Fertige Trainingsprogramme als Vorlagen-Sätze. Tage: 0 = Montag … 6 = Sonntag. Ziele „8–12“ = Wiederholungsbereich.

const u = (uebungId, saetze, ziel, notiz = '') => ({ uebungId, saetze, ziel, notiz });

export const PROGRAMME = [
  {
    id: 'ppl',
    name: 'Push / Pull / Beine (6 Tage)',
    text: 'Klassischer Muskelaufbau-Split, jede Muskelgruppe 2× pro Woche. Für Fortgeschrittene mit Gym-Zugang.',
    vorlagen: [
      { name: 'Push A', tage: [0], uebungen: [u('bankdruecken_lh', 4, '6–8'), u('schulterdruecken_kh', 3, '8–10'), u('schraegbank_kh', 3, '8–12'), u('seitheben_kh', 4, '12–15'), u('pushdown_seil', 3, '10–12')] },
      { name: 'Pull A', tage: [1], uebungen: [u('kreuzheben', 3, '5'), u('klimmzuege', 4, '6–10'), u('rudern_lh', 3, '8–10'), u('face_pulls', 3, '12–15'), u('curls_sz', 3, '8–12')] },
      { name: 'Beine A', tage: [2], uebungen: [u('kniebeuge_lh', 4, '6–8'), u('rumaenisches_kh', 3, '8–10'), u('beinpresse', 3, '10–12'), u('beinbeuger_sitzend', 3, '10–12'), u('wadenheben_stehend', 4, '10–15')] },
      { name: 'Push B', tage: [3], uebungen: [u('military_press', 4, '6–8'), u('bankdruecken_kh', 3, '8–10'), u('dips', 3, '8–12'), u('seitheben_kabel', 3, '12–15'), u('skull_crusher', 3, '10–12')] },
      { name: 'Pull B', tage: [4], uebungen: [u('latzug_breit', 4, '8–10'), u('kabelrudern', 3, '10–12'), u('rudern_kh', 3, '8–10'), u('reverse_flys', 3, '12–15'), u('hammer_curls', 3, '10–12')] },
      { name: 'Beine B', tage: [5], uebungen: [u('frontkniebeuge', 3, '6–8'), u('hip_thrust', 3, '8–10'), u('bulgarian_split_squat', 3, '8–10'), u('beinstrecker', 3, '12–15'), u('wadenheben_sitzend', 4, '12–15')] },
    ],
  },
  {
    id: 'ganzkoerper',
    name: 'Ganzkörper (3 Tage)',
    text: 'Ideal für Einsteiger und wenig Zeit: Mo, Mi, Fr jeweils der ganze Körper mit den Grundübungen.',
    vorlagen: [
      { name: 'Ganzkörper A', tage: [0, 4], uebungen: [u('kniebeuge_lh', 3, '6–8'), u('bankdruecken_lh', 3, '6–8'), u('rudern_lh', 3, '8–10'), u('seitheben_kh', 2, '12–15'), u('plank', 2, '45–60 s')] },
      { name: 'Ganzkörper B', tage: [2], uebungen: [u('kreuzheben', 3, '5'), u('military_press', 3, '6–8'), u('klimmzuege', 3, '6–10'), u('ausfallschritte_kh', 2, '10'), u('hammer_curls', 2, '10–12')] },
    ],
  },
  {
    id: 'calisthenics',
    name: 'Calisthenics Grundlagen (3 Tage)',
    text: 'Nur mit Körpergewicht, Stange und Barren: Zug, Druck, Beine und Core – mit Skill-Vorstufen.',
    vorlagen: [
      { name: 'Cali Zug & Core', tage: [0], uebungen: [u('klimmzuege', 4, '5–10'), u('australian_pullups', 3, '10–15'), u('tuck_front_lever', 3, '10–20 s'), u('beinheben_haengend', 3, '8–12'), u('dead_hang', 2, '30–60 s')] },
      { name: 'Cali Druck & Handstand', tage: [2], uebungen: [u('dips', 4, '6–12'), u('liegestuetze', 3, '12–20'), u('pike_pushups', 3, '8–12'), u('handstand', 4, '20–40 s', 'an der Wand'), u('l_sit', 3, '10–20 s')] },
      { name: 'Cali Beine & Ganzkörper', tage: [4], uebungen: [u('pistol_squats', 3, '5–8', 'ggf. mit Halt'), u('bulgarian_split_squat', 3, '10–12'), u('nordic_curls', 3, '4–8'), u('chin_ups', 3, '6–10'), u('hollow_body', 3, '20–40 s')] },
    ],
  },
];
