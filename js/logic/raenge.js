// Ränge: Schlacke → Eisen → Bronze → Silber → Gold → Platin → Diamant → Titan → Legende, je mit Stufen III–I.
// Grundlage ist die Bestleistung der letzten 12 Wochen, bezogen aufs Körpergewicht (reine Funktionen).
//
// Wertung je Übung: Anteil (0–1+) an einer „Elite“-Leistung.
//  Kraft: geschätztes 1RM ÷ Körpergewicht ÷ Elite-Faktor (z. B. Bankdrücken 2,0 × KG)
//  Körpergewicht: Wiederholungen ÷ Elite-Wdh oder (KG + Zusatz) als 1RM ÷ Elite-Last – das Bessere zählt
//  Halten: Sekunden ÷ Elite-Sekunden
// Grobe Orientierung an verbreiteten Kraftstandards (Anfänger ≈ 0,5 × KG Bankdrücken, Fortgeschritten ≈ 1,5 ×).
import { einRM } from './training.js';
import { alleTrainings } from './fortschritt.js';

export const RAENGE = [
  { id: 'schlacke', name: 'Schlacke', ab: 0, farbe: '#6b5d57' },
  { id: 'eisen', name: 'Eisen', ab: 0.2, farbe: '#8a8f98' },
  { id: 'bronze', name: 'Bronze', ab: 0.3, farbe: '#c07a45' },
  { id: 'silber', name: 'Silber', ab: 0.4, farbe: '#c9d1dc' },
  { id: 'gold', name: 'Gold', ab: 0.5, farbe: '#f2c14e' },
  { id: 'platin', name: 'Platin', ab: 0.6, farbe: '#5fd4c4' },
  { id: 'diamant', name: 'Diamant', ab: 0.7, farbe: '#7cb7ff' },
  { id: 'titan', name: 'Titan', ab: 0.8, farbe: '#b18cff' },
  { id: 'legende', name: 'Legende', ab: 0.95, farbe: '#ff7a2f' },
];

export const GRUPPEN = {
  brust: { name: 'Brust', muskeln: ['brust'] },
  ruecken: { name: 'Rücken', muskeln: ['ruecken', 'lat', 'unterer_ruecken', 'nacken'] },
  schultern: { name: 'Schultern', muskeln: ['schultern'] },
  arme: { name: 'Arme', muskeln: ['bizeps', 'trizeps', 'unterarme'] },
  beine: { name: 'Beine', muskeln: ['quadrizeps', 'beinbizeps', 'gesaess', 'waden', 'adduktoren'] },
  rumpf: { name: 'Rumpf', muskeln: ['bauch', 'hueftbeuger'] },
};

// Elite-Faktoren (1RM ÷ Körpergewicht) für Männer; Frauen siehe GESCHLECHT_FAKTOR
const ELITE_KRAFT = {
  bankdruecken_lh: 2.0, schraegbank_lh: 1.7, negativbank_lh: 2.1, bankdruecken_kh: 0.8, schraegbank_kh: 0.7,
  bankdruecken_smith: 2.0, brustpresse: 2.2, enges_bankdruecken: 1.7,
  kniebeuge_lh: 2.75, frontkniebeuge: 2.2, kniebeuge_smith: 2.6, beinpresse: 5.0, hackenschmidt: 3.2, goblet_squat: 0.9,
  kreuzheben: 3.25, sumo_kreuzheben: 3.25, rumaenisches_kh: 2.4, rack_pulls: 3.5, hip_thrust: 3.5,
  military_press: 1.35, schulterdruecken_kh: 0.55, schulterpresse: 1.5, push_press: 1.7, schulterdruecken_smith: 1.4,
  rudern_lh: 1.75, pendlay_rudern: 1.6, rudern_kh: 0.9, t_bar_rudern: 1.8, kabelrudern: 1.8, latzug_breit: 1.5, latzug_eng: 1.5,
  curls_lh: 1.0, curls_sz: 1.0, curls_kh: 0.45, hammer_curls: 0.5, pushdown_stange: 1.1, pushdown_seil: 0.9, skull_crusher: 0.9,
  power_clean: 1.75, thrusters: 1.3, beinstrecker: 1.8, beinbeuger_liegend: 1.2, beinbeuger_sitzend: 1.3,
  wadenheben_stehend: 2.5, shrugs_lh: 2.5, seitheben_kh: 0.3, butterfly: 1.4, kabel_crunch: 1.4,
};
// Standard nach Ausrüstung, wenn keine eigene Zahl hinterlegt ist
const ELITE_AUSRUESTUNG = {
  langhantel: 1.6, kurzhantel: 0.6, sz: 0.9, maschine: 1.8, kabel: 1.0, kettlebell: 0.7, smith: 1.8, koerpergewicht: 1.0, sonstiges: 1.0,
};
// Körpergewichtsübungen: Elite-Wiederholungen und Elite-Last (KG + Zusatz) als 1RM-Faktor
const ELITE_WDH = {
  klimmzuege: 25, chin_ups: 28, klimmzuege_breit: 20, liegestuetze: 80, dips: 40, ring_dips: 30, muscle_up: 15, ring_muscle_up: 10,
  pistol_squats: 25, handstand_pushups: 20, archer_pullups: 12, archer_pushups: 25, nordic_curls: 15, beinheben_haengend: 25,
  toes_to_bar: 25, dragon_flag: 15, kniebeugen: 100, australian_pullups: 40, pike_pushups: 30, bankdips: 50,
};
const ELITE_LAST = { klimmzuege: 1.9, chin_ups: 2.0, dips: 2.1, ring_dips: 1.8, muscle_up: 1.5 };
const ELITE_SEK = {
  front_lever: 30, tuck_front_lever: 60, back_lever: 45, planche: 20, tuck_planche: 45, planche_lean: 60, handstand: 120,
  l_sit: 60, v_sit: 30, human_flag: 20, plank: 300, seitstuetz: 180, hollow_body: 120, dead_hang: 180, ring_support: 90,
  kraehe: 90, rkc_plank: 120,
};
// Frauen: niedrigere Elite-Werte (Ober- bzw. Unterkörper)
const FRAUEN_OBEN = 0.62;
const FRAUEN_UNTEN = 0.75;
const UNTERKOERPER = new Set(['quadrizeps', 'beinbizeps', 'gesaess', 'waden', 'adduktoren', 'unterer_ruecken']);

function geschlechtsFaktor(u, geschlecht) {
  if (geschlecht !== 'w') return 1;
  return UNTERKOERPER.has(u.muskeln[0]) ? FRAUEN_UNTEN : FRAUEN_OBEN;
}

/** Anteil an der Elite-Leistung für einen Satz (0 … >1). */
export function satzWertung(u, s, kgKoerper, geschlecht = 'm') {
  if (!u || !kgKoerper) return 0;
  const g = geschlechtsFaktor(u, geschlecht);
  if (u.art === 'kraft') {
    const isolation = u.muskeln.length === 1 && !ELITE_KRAFT[u.id];
    const elite = (ELITE_KRAFT[u.id] ?? (ELITE_AUSRUESTUNG[u.equipment] ?? 1) * (isolation ? 0.55 : 1)) * g;
    return einRM(s.kg ?? 0, s.wdh ?? 0) / kgKoerper / elite;
  }
  if (u.art === 'koerpergewicht') {
    const nachWdh = (s.wdh ?? 0) / ((ELITE_WDH[u.id] ?? 40) * g);
    const nachLast = s.kg ? einRM(kgKoerper + s.kg, s.wdh ?? 0) / kgKoerper / ((ELITE_LAST[u.id] ?? 1.8) * g) : 0;
    return Math.max(nachWdh, nachLast);
  }
  if (u.art === 'halten' && u.kategorie !== 'mobility') return (s.sek ?? 0) / ((ELITE_SEK[u.id] ?? 120) * g);
  return 0;
}

/** Rang aus einer Wertung: { rang, stufe (3/2/1 oder null bei Legende), fortschritt in der Stufe 0–1, wertung } */
export function rangAus(wertung) {
  let i = RAENGE.length - 1;
  while (i > 0 && wertung < RAENGE[i].ab) i -= 1;
  const rang = RAENGE[i];
  if (rang.id === 'legende') return { rang, stufe: null, fortschritt: 1, wertung };
  const breite = RAENGE[i + 1].ab - rang.ab;
  const innen = Math.max(0, (wertung - rang.ab) / breite);
  const stufe = innen < 1 / 3 ? 3 : innen < 2 / 3 ? 2 : 1;
  const fortschritt = (innen * 3) % 1;
  return { rang, stufe, fortschritt, wertung };
}

export const STUFEN_TEXT = { 3: 'III', 2: 'II', 1: 'I' };
export const rangName = (r) => (r.stufe ? `${r.rang.name} ${STUFEN_TEXT[r.stufe]}` : r.rang.name);

/**
 * Ränge je Muskelgruppe und gesamt aus den letzten `tageZurueck` Tagen.
 * Liefert { gruppen: { brust: { wertung, rang, uebungId } | null, … }, gesamt | null }
 */
export function berechneRaenge(tage, verzeichnis, kgKoerper, geschlecht = 'm', heute = new Date(), tageZurueck = 84) {
  const grenze = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() - tageZurueck);
  const grenzSchluessel = `${grenze.getFullYear()}-${String(grenze.getMonth() + 1).padStart(2, '0')}-${String(grenze.getDate()).padStart(2, '0')}`;
  const besteJeGruppe = {};
  for (const { datum, t } of alleTrainings(tage)) {
    if (datum < grenzSchluessel || t.typ !== 'workout') continue;
    for (const e of t.uebungen ?? []) {
      const u = verzeichnis.get(e.uebungId);
      if (!u) continue;
      const gruppe = Object.entries(GRUPPEN).find(([, g]) => g.muskeln.includes(u.muskeln[0]))?.[0];
      if (!gruppe) continue;
      for (const s of e.saetze ?? []) {
        if (!s.erledigt) continue;
        const wertung = satzWertung(u, s, kgKoerper, geschlecht);
        if (wertung > (besteJeGruppe[gruppe]?.wertung ?? 0)) besteJeGruppe[gruppe] = { wertung, uebungId: u.id, datum };
      }
    }
  }
  const gruppen = Object.fromEntries(Object.keys(GRUPPEN).map((g) => [g, besteJeGruppe[g] ? { ...besteJeGruppe[g], ...rangAus(besteJeGruppe[g].wertung) } : null]));
  const gewertet = Object.values(gruppen).filter(Boolean);
  // Gesamtrang ab drei gewerteten Gruppen; nicht trainierte Gruppen ziehen den Schnitt nicht herunter
  const gesamt = gewertet.length >= 3 ? rangAus(gewertet.reduce((s, g) => s + Math.min(g.wertung, 1.2), 0) / gewertet.length) : null;
  return { gruppen, gesamt };
}
