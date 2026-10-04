// Übungs- und Aktivitätsdatenbank.
// MET-Werte (leicht / mittel / hart) nach: Herrmann et al., 2024 Adult Compendium of Physical Activities
// (pacompendium.com), auf ganze Aktivitätsklassen gerundet. Krafttraining wird pro Einheit über die
// Dauer berechnet (siehe EINHEIT_MET), nicht pro Übung.
//
// art: 'kraft' (Sätze × Wdh × kg) · 'koerpergewicht' (Sätze × Wdh, optional Zusatzgewicht)
//      'halten' (Sätze × Sekunden) · 'cardio' (Dauer, optional Distanz) · 'dauer' (nur Dauer)

export const KATEGORIEN = {
  gym: 'Gym',
  calisthenics: 'Calisthenics',
  cardio: 'Cardio',
  sport: 'Sport',
  mobility: 'Mobility',
  alltag: 'Alltag',
};

export const MUSKELN = {
  brust: 'Brust', ruecken: 'Rücken', lat: 'Latissimus', schultern: 'Schultern', nacken: 'Nacken',
  bizeps: 'Bizeps', trizeps: 'Trizeps', unterarme: 'Unterarme', bauch: 'Bauch', unterer_ruecken: 'Unterer Rücken',
  quadrizeps: 'Quadrizeps', beinbizeps: 'Beinbizeps', gesaess: 'Gesäß', waden: 'Waden', adduktoren: 'Adduktoren',
  schienbein: 'Schienbein', hueftbeuger: 'Hüftbeuger', ganzkoerper: 'Ganzkörper', ausdauer: 'Ausdauer',
};

export const EQUIPMENT = {
  langhantel: 'Langhantel', kurzhantel: 'Kurzhantel', sz: 'SZ-Stange', maschine: 'Maschine', kabel: 'Kabelzug',
  kettlebell: 'Kettlebell', smith: 'Multipresse', koerpergewicht: 'Körpergewicht', stange: 'Klimmzugstange',
  barren: 'Barren', ringe: 'Ringe', band: 'Widerstandsband', sonstiges: 'Sonstiges',
};

export const INTENSITAETEN = { leicht: 'Locker', mittel: 'Normal', hart: 'Hart' };

/** MET für eine ganze Kraft-Einheit (Pausen eingerechnet) nach Intensität. */
export const EINHEIT_MET = {
  gym: { leicht: 3.5, mittel: 5.0, hart: 6.0 },
  calisthenics: { leicht: 3.8, mittel: 5.0, hart: 8.0 },
};

const kraft = (id, name, muskeln, equipment) => ({ id, name, kategorie: 'gym', art: 'kraft', muskeln, equipment });
const cali = (id, name, muskeln, equipment = 'koerpergewicht', art = 'koerpergewicht') => ({ id, name, kategorie: 'calisthenics', art, muskeln, equipment });
const halten = (id, name, muskeln, equipment = 'koerpergewicht') => cali(id, name, muskeln, equipment, 'halten');
const aktiv = (kategorie, art) => (id, name, met, distanz = false) => ({
  id, name, kategorie, art, met: { leicht: met[0], mittel: met[1], hart: met[2] }, distanz, muskeln: ['ausdauer'], equipment: 'sonstiges',
});
// Skill-Primer: zeitbasiert innerhalb eines Workouts, mit eigenem MET
const skill = (id, name, muskeln, met) => ({
  id, name, kategorie: 'calisthenics', art: 'dauer', met: { leicht: met[0], mittel: met[1], hart: met[2] }, distanz: false, muskeln, equipment: 'koerpergewicht',
});
// Dehnung/Prehab: Sätze × Sekunden (je Seite)
const dehnung = (id, name, muskeln) => ({ id, name, kategorie: 'mobility', art: 'halten', muskeln, equipment: 'koerpergewicht' });
const cardio = aktiv('cardio', 'cardio');
const sport = aktiv('sport', 'dauer');
const mobility = aktiv('mobility', 'dauer');
const alltag = aktiv('alltag', 'dauer');

export const UEBUNGEN = [
  // ---------- Gym: Brust ----------
  kraft('bankdruecken_lh', 'Bankdrücken (Langhantel)', ['brust', 'trizeps', 'schultern'], 'langhantel'),
  kraft('schraegbank_lh', 'Schrägbankdrücken (Langhantel)', ['brust', 'schultern', 'trizeps'], 'langhantel'),
  kraft('negativbank_lh', 'Negativbankdrücken (Langhantel)', ['brust', 'trizeps'], 'langhantel'),
  kraft('bankdruecken_kh', 'Bankdrücken (Kurzhantel)', ['brust', 'trizeps', 'schultern'], 'kurzhantel'),
  kraft('schraegbank_kh', 'Schrägbankdrücken (Kurzhantel)', ['brust', 'schultern', 'trizeps'], 'kurzhantel'),
  kraft('bankdruecken_smith', 'Bankdrücken (Multipresse)', ['brust', 'trizeps'], 'smith'),
  kraft('schraegbank_smith', 'Schrägbankdrücken (Multipresse)', ['brust', 'schultern'], 'smith'),
  kraft('brustpresse', 'Brustpresse', ['brust', 'trizeps'], 'maschine'),
  kraft('schraegbank_maschine', 'Schrägbankpresse (Maschine)', ['brust', 'schultern'], 'maschine'),
  kraft('flys_kh', 'Fliegende (Kurzhantel)', ['brust'], 'kurzhantel'),
  kraft('schraeg_flys_kh', 'Schräge Fliegende (Kurzhantel)', ['brust', 'schultern'], 'kurzhantel'),
  kraft('butterfly', 'Butterfly', ['brust'], 'maschine'),
  kraft('cable_crossover', 'Cable Crossover', ['brust'], 'kabel'),
  kraft('kabel_flys_tief', 'Kabel-Flys von unten', ['brust', 'schultern'], 'kabel'),
  kraft('pullover_kh', 'Pullover (Kurzhantel)', ['brust', 'lat'], 'kurzhantel'),
  kraft('landmine_press', 'Landmine Press', ['brust', 'schultern'], 'langhantel'),
  kraft('dips_maschine', 'Dips (Maschine / unterstützt)', ['brust', 'trizeps'], 'maschine'),

  // ---------- Gym: Rücken ----------
  kraft('kreuzheben', 'Kreuzheben', ['unterer_ruecken', 'gesaess', 'beinbizeps', 'ruecken'], 'langhantel'),
  kraft('sumo_kreuzheben', 'Sumo-Kreuzheben', ['gesaess', 'quadrizeps', 'adduktoren', 'unterer_ruecken'], 'langhantel'),
  kraft('rumaenisches_kh', 'Rumänisches Kreuzheben (Langhantel)', ['beinbizeps', 'gesaess', 'unterer_ruecken'], 'langhantel'),
  kraft('rumaenisches_kurzhantel', 'Rumänisches Kreuzheben (Kurzhantel)', ['beinbizeps', 'gesaess'], 'kurzhantel'),
  kraft('rack_pulls', 'Rack Pulls', ['ruecken', 'unterer_ruecken', 'nacken'], 'langhantel'),
  kraft('rudern_lh', 'Langhantelrudern', ['ruecken', 'lat', 'bizeps'], 'langhantel'),
  kraft('pendlay_rudern', 'Pendlay-Rudern', ['ruecken', 'lat'], 'langhantel'),
  kraft('rudern_kh', 'Einarmiges Kurzhantelrudern', ['lat', 'ruecken', 'bizeps'], 'kurzhantel'),
  kraft('t_bar_rudern', 'T-Bar-Rudern', ['ruecken', 'lat'], 'langhantel'),
  kraft('seal_row', 'Seal Row', ['ruecken', 'lat'], 'langhantel'),
  kraft('chest_supported_row', 'Brustgestütztes Rudern', ['ruecken', 'lat'], 'kurzhantel'),
  kraft('meadows_row', 'Meadows Row', ['lat', 'ruecken'], 'langhantel'),
  kraft('kabelrudern', 'Kabelrudern sitzend', ['ruecken', 'lat', 'bizeps'], 'kabel'),
  kraft('kabelrudern_stange', 'Rudern mit Stangengriff (Kabel)', ['ruecken', 'lat', 'bizeps'], 'kabel'),
  kraft('kabelrudern_weit', 'Weites Rudern (Kabel)', ['ruecken', 'schultern'], 'kabel'),
  kraft('rudermaschine_kraft', 'Rudern an der Maschine', ['ruecken', 'lat'], 'maschine'),
  kraft('latzug_breit', 'Latzug breit', ['lat', 'bizeps'], 'kabel'),
  kraft('latzug_eng', 'Latzug eng (V-Griff)', ['lat', 'ruecken', 'bizeps'], 'kabel'),
  kraft('latzug_untergriff', 'Latzug Untergriff', ['lat', 'bizeps'], 'kabel'),
  kraft('latzug_einarmig', 'Einarmiger Latzug', ['lat'], 'kabel'),
  kraft('straight_arm_pulldown', 'Straight-Arm Pulldown', ['lat'], 'kabel'),
  kraft('klimmzug_maschine', 'Klimmzüge (unterstützt)', ['lat', 'bizeps'], 'maschine'),
  kraft('face_pulls', 'Face Pulls', ['schultern', 'ruecken'], 'kabel'),
  kraft('shrugs_lh', 'Shrugs (Langhantel)', ['nacken'], 'langhantel'),
  kraft('shrugs_kh', 'Shrugs (Kurzhantel)', ['nacken'], 'kurzhantel'),
  kraft('hyperextensions', 'Hyperextensions', ['unterer_ruecken', 'gesaess'], 'maschine'),
  kraft('good_mornings', 'Good Mornings', ['beinbizeps', 'unterer_ruecken'], 'langhantel'),

  // ---------- Gym: Schultern ----------
  kraft('military_press', 'Schulterdrücken stehend (Langhantel)', ['schultern', 'trizeps'], 'langhantel'),
  kraft('schulterdruecken_kh', 'Schulterdrücken (Kurzhantel)', ['schultern', 'trizeps'], 'kurzhantel'),
  kraft('arnold_press', 'Arnold Press', ['schultern', 'trizeps'], 'kurzhantel'),
  kraft('schulterpresse', 'Schulterpresse (Maschine)', ['schultern', 'trizeps'], 'maschine'),
  kraft('schulterdruecken_smith', 'Schulterdrücken (Multipresse)', ['schultern', 'trizeps'], 'smith'),
  kraft('push_press', 'Push Press', ['schultern', 'trizeps', 'quadrizeps'], 'langhantel'),
  kraft('seitheben_kh', 'Seitheben (Kurzhantel)', ['schultern'], 'kurzhantel'),
  kraft('seitheben_kabel', 'Seitheben (Kabel)', ['schultern'], 'kabel'),
  kraft('seitheben_maschine', 'Seitheben (Maschine)', ['schultern'], 'maschine'),
  kraft('frontheben', 'Frontheben', ['schultern'], 'kurzhantel'),
  kraft('reverse_flys', 'Reverse Flys (Kurzhantel)', ['schultern', 'ruecken'], 'kurzhantel'),
  kraft('reverse_butterfly', 'Reverse Butterfly', ['schultern', 'ruecken'], 'maschine'),
  kraft('reverse_flys_kabel', 'Einarmige Reverse Flys (Kabel)', ['schultern', 'ruecken'], 'kabel'),
  kraft('aufrechtes_rudern', 'Aufrechtes Rudern', ['schultern', 'nacken'], 'sz'),

  // ---------- Gym: Arme ----------
  kraft('curls_lh', 'Bizepscurls (Langhantel)', ['bizeps'], 'langhantel'),
  kraft('curls_sz', 'Bizepscurls (SZ-Stange)', ['bizeps'], 'sz'),
  kraft('curls_kh', 'Bizepscurls (Kurzhantel)', ['bizeps'], 'kurzhantel'),
  kraft('hammer_curls', 'Hammer Curls', ['bizeps', 'unterarme'], 'kurzhantel'),
  kraft('schraegbank_curls', 'Schrägbank-Curls', ['bizeps'], 'kurzhantel'),
  kraft('konzentrationscurls', 'Konzentrationscurls', ['bizeps'], 'kurzhantel'),
  kraft('scott_curls', 'Scottcurls (Preacher Curls)', ['bizeps'], 'sz'),
  kraft('spider_curls', 'Spider Curls', ['bizeps'], 'kurzhantel'),
  kraft('kabel_curls', 'Bizepscurls (Kabel)', ['bizeps'], 'kabel'),
  kraft('kabel_curls_seil', 'Bizepscurls am Seil', ['bizeps', 'unterarme'], 'kabel'),
  kraft('kabel_curls_obergriff', 'Bizepscurls Obergriff (Kabel)', ['unterarme', 'bizeps'], 'kabel'),
  kraft('bayesian_curls', 'Curl hinter dem Rücken (Bayesian Curl)', ['bizeps'], 'kabel'),
  kraft('bizeps_maschine', 'Bizepsmaschine', ['bizeps'], 'maschine'),
  kraft('pushdown_seil', 'Trizepsdrücken am Seil', ['trizeps'], 'kabel'),
  kraft('pushdown_stange', 'Trizepsdrücken an der Stange', ['trizeps'], 'kabel'),
  kraft('skull_crusher', 'French Press / Skull Crusher', ['trizeps'], 'sz'),
  kraft('overhead_trizeps_kh', 'Überkopf-Trizepsdrücken (Kurzhantel)', ['trizeps'], 'kurzhantel'),
  kraft('overhead_trizeps_kabel', 'Überkopf-Trizepsdrücken (Kabel)', ['trizeps'], 'kabel'),
  kraft('enges_bankdruecken', 'Enges Bankdrücken', ['trizeps', 'brust'], 'langhantel'),
  kraft('kickbacks', 'Trizeps-Kickbacks', ['trizeps'], 'kurzhantel'),
  kraft('trizeps_maschine', 'Trizepsmaschine', ['trizeps'], 'maschine'),
  kraft('handgelenk_curls', 'Handgelenk-Curls', ['unterarme'], 'kurzhantel'),
  kraft('handgelenk_strecken', 'Handgelenkstrecken (Reverse Wrist Curls)', ['unterarme'], 'kurzhantel'),
  kraft('reverse_curls', 'Reverse Curls', ['unterarme', 'bizeps'], 'sz'),
  // Reiseimer: Hände im Reis wühlen, greifen, drehen – Sätze nach Zeit
  { id: 'reiseimer', name: 'Reiseimer-Wühlen', kategorie: 'gym', art: 'halten', muskeln: ['unterarme'], equipment: 'sonstiges' },
  kraft('farmers_walk', 'Farmer’s Walk', ['unterarme', 'nacken', 'ganzkoerper'], 'kurzhantel'),

  // ---------- Gym: Beine ----------
  kraft('kniebeuge_lh', 'Kniebeuge (Langhantel)', ['quadrizeps', 'gesaess', 'unterer_ruecken'], 'langhantel'),
  kraft('frontkniebeuge', 'Frontkniebeuge', ['quadrizeps', 'gesaess', 'bauch'], 'langhantel'),
  kraft('kniebeuge_smith', 'Kniebeuge (Multipresse)', ['quadrizeps', 'gesaess'], 'smith'),
  kraft('goblet_squat', 'Goblet Squat', ['quadrizeps', 'gesaess'], 'kurzhantel'),
  kraft('hackenschmidt', 'Hackenschmidt', ['quadrizeps', 'gesaess'], 'maschine'),
  kraft('pendulum_squat', 'Pendulum Squat', ['quadrizeps', 'gesaess'], 'maschine'),
  kraft('beinpresse', 'Beinpresse', ['quadrizeps', 'gesaess'], 'maschine'),
  kraft('bulgarian_split_squat', 'Bulgarische Split Squats', ['quadrizeps', 'gesaess'], 'kurzhantel'),
  kraft('ausfallschritte_kh', 'Ausfallschritte (Kurzhantel)', ['quadrizeps', 'gesaess'], 'kurzhantel'),
  kraft('walking_lunges', 'Walking Lunges', ['quadrizeps', 'gesaess'], 'kurzhantel'),
  kraft('step_ups', 'Step-ups', ['quadrizeps', 'gesaess'], 'kurzhantel'),
  kraft('beinstrecker', 'Beinstrecker', ['quadrizeps'], 'maschine'),
  kraft('beinbeuger_liegend', 'Beinbeuger liegend', ['beinbizeps'], 'maschine'),
  kraft('beinbeuger_sitzend', 'Beinbeuger sitzend', ['beinbizeps'], 'maschine'),
  kraft('hip_thrust', 'Hip Thrust (Langhantel)', ['gesaess', 'beinbizeps'], 'langhantel'),
  kraft('hip_thrust_maschine', 'Hip Thrust (Maschine)', ['gesaess'], 'maschine'),
  kraft('kabel_kickbacks', 'Kabel-Kickbacks (Gesäß)', ['gesaess'], 'kabel'),
  kraft('abduktoren', 'Abduktorenmaschine', ['gesaess'], 'maschine'),
  kraft('adduktoren', 'Adduktorenmaschine', ['adduktoren'], 'maschine'),
  kraft('wadenheben_stehend', 'Wadenheben stehend', ['waden'], 'maschine'),
  kraft('wadenheben_sitzend', 'Wadenheben sitzend', ['waden'], 'maschine'),
  kraft('wadenheben_beinpresse', 'Wadenheben an der Beinpresse', ['waden'], 'maschine'),

  // ---------- Gym: Bauch und Ganzkörper ----------
  kraft('kabel_crunch', 'Kabel-Crunch', ['bauch'], 'kabel'),
  kraft('bauchmaschine', 'Bauchmaschine', ['bauch'], 'maschine'),
  kraft('ab_wheel', 'Ab Wheel / Bauchroller', ['bauch'], 'sonstiges'),
  kraft('russian_twist', 'Russian Twist', ['bauch'], 'kurzhantel'),
  kraft('woodchopper', 'Holzhacker (Kabel)', ['bauch'], 'kabel'),
  kraft('pallof_press', 'Pallof Press', ['bauch'], 'kabel'),
  kraft('kabelrotation', 'Kabelrotation', ['bauch'], 'kabel'),
  kraft('kettlebell_swing', 'Kettlebell Swing', ['gesaess', 'beinbizeps', 'ganzkoerper'], 'kettlebell'),
  kraft('thrusters', 'Thrusters', ['quadrizeps', 'schultern', 'ganzkoerper'], 'langhantel'),
  kraft('power_clean', 'Power Clean', ['ganzkoerper'], 'langhantel'),
  kraft('turkish_getup', 'Turkish Get-up', ['ganzkoerper', 'schultern', 'bauch'], 'kettlebell'),
  kraft('schlitten', 'Schlitten schieben (Sled Push)', ['quadrizeps', 'gesaess', 'ganzkoerper'], 'sonstiges'),

  // ---------- Calisthenics: Drücken ----------
  cali('liegestuetze', 'Liegestütze', ['brust', 'trizeps', 'schultern']),
  cali('liegestuetze_eng', 'Diamond-Liegestütze', ['trizeps', 'brust']),
  cali('liegestuetze_breit', 'Breite Liegestütze', ['brust']),
  cali('liegestuetze_erhoeht', 'Erhöhte Liegestütze (Füße oben)', ['brust', 'schultern']),
  cali('archer_pushups', 'Archer-Liegestütze', ['brust', 'trizeps']),
  cali('pseudo_planche_pushups', 'Pseudo-Planche-Liegestütze', ['schultern', 'brust', 'trizeps']),
  cali('pike_pushups', 'Pike Push-ups', ['schultern', 'trizeps']),
  cali('handstand_pushups', 'Handstand-Liegestütze', ['schultern', 'trizeps']),
  cali('dips', 'Dips (Barren)', ['brust', 'trizeps', 'schultern'], 'barren'),
  cali('ring_dips', 'Ring Dips', ['brust', 'trizeps'], 'ringe'),
  cali('bankdips', 'Bank-Dips', ['trizeps'], 'koerpergewicht'),
  cali('korean_dips', 'Korean Dips', ['schultern', 'trizeps'], 'barren'),

  // ---------- Calisthenics: Ziehen ----------
  cali('klimmzuege', 'Klimmzüge', ['lat', 'bizeps', 'ruecken'], 'stange'),
  cali('chin_ups', 'Chin-ups (Untergriff)', ['lat', 'bizeps'], 'stange'),
  cali('klimmzuege_breit', 'Breite Klimmzüge', ['lat'], 'stange'),
  cali('klimmzuege_negativ', 'Negative Klimmzüge', ['lat', 'bizeps'], 'stange'),
  cali('archer_pullups', 'Archer-Klimmzüge', ['lat', 'bizeps'], 'stange'),
  cali('typewriter_pullups', 'Typewriter-Klimmzüge', ['lat', 'bizeps'], 'stange'),
  cali('l_sit_pullups', 'L-Sit-Klimmzüge', ['lat', 'bauch'], 'stange'),
  cali('explosive_pullups', 'Explosive Klimmzüge', ['lat', 'ruecken'], 'stange'),
  cali('muscle_up', 'Muscle-up', ['lat', 'brust', 'trizeps'], 'stange'),
  cali('ring_muscle_up', 'Ring Muscle-up', ['lat', 'brust', 'trizeps'], 'ringe'),
  cali('australian_pullups', 'Australian Pull-ups (Rudern)', ['ruecken', 'bizeps'], 'stange'),
  cali('ring_rows', 'Ring Rows', ['ruecken', 'bizeps'], 'ringe'),
  cali('front_lever_raises', 'Front Lever Raises', ['lat', 'bauch'], 'stange'),
  cali('skin_the_cat', 'Skin the Cat', ['schultern', 'lat', 'bauch'], 'ringe'),

  // ---------- Calisthenics: Statik / Skills ----------
  halten('front_lever', 'Front Lever', ['lat', 'bauch'], 'stange'),
  halten('tuck_front_lever', 'Tuck Front Lever', ['lat', 'bauch'], 'stange'),
  halten('back_lever', 'Back Lever', ['schultern', 'brust', 'ruecken'], 'ringe'),
  halten('planche', 'Planche', ['schultern', 'brust', 'bauch']),
  halten('tuck_planche', 'Tuck Planche', ['schultern', 'brust']),
  halten('planche_lean', 'Planche Lean', ['schultern']),
  halten('handstand', 'Handstand', ['schultern', 'bauch']),
  halten('l_sit', 'L-Sit', ['bauch', 'trizeps'], 'barren'),
  halten('v_sit', 'V-Sit', ['bauch']),
  halten('human_flag', 'Human Flag', ['schultern', 'bauch', 'lat'], 'stange'),
  halten('ring_support', 'Ring Support Hold', ['schultern', 'trizeps'], 'ringe'),
  halten('dead_hang', 'Dead Hang', ['unterarme', 'lat'], 'stange'),
  halten('plank', 'Unterarmstütz (Plank)', ['bauch']),
  halten('seitstuetz', 'Seitstütz', ['bauch']),
  halten('hollow_body', 'Hollow Body Hold', ['bauch']),
  halten('rkc_plank', 'RKC Plank', ['bauch', 'gesaess']),
  halten('kraehe', 'Krähe (Crow Pose)', ['schultern', 'bauch', 'unterarme']),
  skill('handstand_primer', 'Handstand-Primer', ['schultern', 'bauch'], [3.0, 3.8, 5.0]),
  skill('l_sit_primer', 'L-Sit-Primer', ['bauch', 'hueftbeuger', 'trizeps'], [3.0, 3.8, 5.0]),
  skill('skill_session', 'Skill-Session (frei)', ['ganzkoerper'], [3.0, 3.8, 5.0]),

  // ---------- Calisthenics: Bauch und Beine ----------
  cali('beinheben_haengend', 'Hängendes Beinheben', ['bauch'], 'stange'),
  cali('knieheben_haengend', 'Hängendes Knieheben', ['bauch'], 'stange'),
  cali('toes_to_bar', 'Toes to Bar', ['bauch', 'lat'], 'stange'),
  cali('windshield_wipers', 'Windshield Wipers', ['bauch'], 'stange'),
  cali('dragon_flag', 'Dragon Flag', ['bauch']),
  cali('crunches', 'Crunches', ['bauch']),
  cali('sit_ups', 'Sit-ups', ['bauch']),
  cali('mountain_climbers', 'Mountain Climbers', ['bauch', 'ausdauer']),
  cali('superman', 'Superman', ['unterer_ruecken']),
  cali('kniebeugen', 'Kniebeugen (Körpergewicht)', ['quadrizeps', 'gesaess']),
  cali('jump_squats', 'Jump Squats', ['quadrizeps', 'gesaess']),
  cali('pistol_squats', 'Pistol Squats', ['quadrizeps', 'gesaess']),
  cali('shrimp_squats', 'Shrimp Squats', ['quadrizeps', 'gesaess']),
  cali('sissy_squats', 'Sissy Squats', ['quadrizeps']),
  cali('ausfallschritte', 'Ausfallschritte (Körpergewicht)', ['quadrizeps', 'gesaess']),
  cali('nordic_curls', 'Nordic Curls', ['beinbizeps']),
  cali('glute_bridge', 'Glute Bridge', ['gesaess']),
  cali('wadenheben', 'Wadenheben (Körpergewicht)', ['waden']),
  cali('tibialis_wand', 'Tibialis-Raises an der Wand', ['schienbein']),
  cali('chin_tucks', 'Chin Tucks', ['nacken']),
  cali('burpees', 'Burpees', ['ganzkoerper', 'ausdauer']),

  // ---------- Cardio ----------
  cardio('laufen', 'Laufen', [8.0, 9.8, 11.5], true),
  cardio('laufband', 'Laufband', [7.0, 9.0, 11.0], true),
  cardio('intervalllauf', 'Intervalllauf / Sprints', [9.0, 11.0, 13.5], true),
  cardio('gehen', 'Gehen', [3.0, 3.5, 4.3], true),
  cardio('nordic_walking', 'Nordic Walking', [4.8, 5.5, 6.8], true),
  cardio('wandern', 'Wandern', [5.3, 6.0, 7.8], true),
  cardio('radfahren', 'Radfahren', [5.8, 7.5, 10.0], true),
  cardio('ebike', 'E-Bike', [3.5, 4.0, 5.0], true),
  cardio('mountainbike', 'Mountainbike', [7.0, 8.5, 10.0], true),
  cardio('ergometer', 'Fahrradergometer', [4.8, 6.8, 8.8]),
  cardio('spinning', 'Spinning / Indoor Cycling', [7.0, 8.5, 10.0]),
  cardio('rudergeraet', 'Rudergerät', [4.8, 7.0, 8.5], true),
  cardio('crosstrainer', 'Crosstrainer', [4.6, 5.0, 6.8]),
  cardio('stepper', 'Stepper / Treppensteiger', [6.5, 9.0, 10.0]),
  cardio('seilspringen', 'Seilspringen', [8.8, 11.8, 12.3]),
  cardio('schwimmen_kraul', 'Schwimmen (Kraul)', [5.8, 8.3, 9.8], true),
  cardio('schwimmen_brust', 'Schwimmen (Brust)', [5.3, 6.0, 10.3], true),
  cardio('aquajogging', 'Aquajogging', [4.8, 6.8, 9.8]),
  cardio('hiit', 'HIIT / Zirkeltraining', [6.0, 8.0, 10.0]),
  cardio('inlineskaten', 'Inlineskaten', [6.0, 7.5, 9.8], true),
  cardio('skilanglauf', 'Skilanglauf', [6.8, 9.0, 12.5], true),
  cardio('sandsack', 'Sandsack / Boxtraining', [5.5, 7.8, 9.0]),

  // ---------- Sport ----------
  sport('fussball', 'Fußball', [7.0, 8.0, 10.0]),
  sport('basketball', 'Basketball', [4.5, 6.5, 8.0]),
  sport('volleyball', 'Volleyball', [3.0, 4.0, 6.0]),
  sport('beachvolleyball', 'Beachvolleyball', [6.0, 8.0, 8.0]),
  sport('handball', 'Handball', [6.0, 8.0, 10.0]),
  sport('eishockey', 'Eishockey', [7.8, 8.0, 10.0]),
  sport('hockey', 'Hockey', [7.8, 7.8, 10.0]),
  sport('tennis', 'Tennis', [5.0, 7.3, 8.0]),
  sport('badminton', 'Badminton', [5.5, 5.5, 7.0]),
  sport('tischtennis', 'Tischtennis', [4.0, 4.0, 5.0]),
  sport('squash', 'Squash', [7.3, 9.0, 12.0]),
  sport('padel', 'Padel', [5.0, 6.0, 7.3]),
  sport('bouldern', 'Bouldern', [5.8, 5.8, 7.5]),
  sport('klettern', 'Klettern', [5.8, 8.0, 9.5]),
  sport('kampfsport', 'Kampfsport (Judo, Karate, BJJ …)', [5.3, 7.8, 10.3]),
  sport('boxen', 'Boxen (Sparring)', [6.0, 7.8, 12.8]),
  sport('skifahren', 'Skifahren', [4.3, 5.3, 8.0]),
  sport('snowboarden', 'Snowboarden', [4.3, 5.3, 8.0]),
  sport('golf', 'Golf', [3.5, 4.8, 4.8]),
  sport('tanzen', 'Tanzen', [4.5, 5.0, 7.8]),
  sport('surfen', 'Surfen', [3.0, 5.0, 7.0]),
  sport('reiten', 'Reiten', [3.8, 5.5, 7.3]),
  sport('kanu', 'Kanu / Kajak / SUP', [3.5, 5.8, 12.0]),

  // ---------- Mobility ----------
  mobility('yoga', 'Yoga', [2.5, 3.0, 4.0]),
  mobility('pilates', 'Pilates', [3.0, 3.0, 3.8]),
  mobility('dehnen', 'Dehnen / Stretching', [2.3, 2.3, 2.8]),
  mobility('mobility', 'Mobility-Training', [2.3, 2.5, 3.0]),
  mobility('faszienrolle', 'Faszienrolle', [2.0, 2.3, 2.5]),
  mobility('tai_chi', 'Tai Chi', [3.0, 3.0, 4.0]),
  dehnung('couch_stretch', 'Couch Stretch', ['hueftbeuger', 'quadrizeps']),
  dehnung('hip_90_90', '90/90 Hip Flow', ['gesaess', 'hueftbeuger']),
  dehnung('bws_strecken', 'Brustwirbelsäule strecken', ['ruecken']),
  dehnung('combat_stretch', 'Combat Stretch', ['hueftbeuger', 'adduktoren']),
  dehnung('frog_stretch', 'Frog Stretch', ['adduktoren', 'gesaess']),
  dehnung('pancake', 'Pancake', ['adduktoren', 'beinbizeps']),
  dehnung('half_split', 'Half Split', ['beinbizeps']),
  dehnung('front_split', 'Front Split', ['beinbizeps', 'hueftbeuger']),
  dehnung('brustdehnung', 'Brustdehnung (Türrahmen)', ['brust', 'schultern']),
  dehnung('lat_dehnung', 'Lat-Dehnung', ['lat']),

  // ---------- Alltag ----------
  alltag('treppensteigen', 'Treppensteigen', [4.0, 8.8, 8.8]),
  alltag('spazieren', 'Spazieren (auch mit Hund)', [3.0, 3.5, 4.0]),
  alltag('gartenarbeit', 'Gartenarbeit', [3.5, 4.0, 5.0]),
  alltag('rasenmaehen', 'Rasenmähen', [5.0, 5.5, 6.0]),
  alltag('hausarbeit', 'Hausarbeit / Putzen', [2.5, 3.3, 3.8]),
  alltag('tragen', 'Schweres Tragen / Umzug', [5.0, 6.5, 7.5]),
  alltag('schneeschippen', 'Schnee schippen', [5.0, 5.3, 7.5]),
];
