// Wochen-Aufträge von Brom und der Monats-Boss (reine Funktionen, alles aus den Tageskennzahlen berechnet).
import { datumSchluessel } from './ziele.js';

const summe = (liste, f) => liste.reduce((s, k) => s + f(k), 0);
const zaehle = (liste, f) => liste.filter(f).length;

export const AUFTRAEGE = [
  { id: 'workouts', text: (n) => `${n} Workouts abschließen`, wert: (w) => summe(w, (k) => k.workouts), belohnung: { erz: 40, glut: 0 } },
  { id: 'protein', text: (n) => `An ${n} Tagen das Proteinziel treffen`, ziel: 5, wert: (w) => zaehle(w, (k) => k.protein), belohnung: { erz: 0, glut: 30 } },
  { id: 'wasser', text: (n) => `An ${n} Tagen das Wasserziel schaffen`, ziel: 5, wert: (w) => zaehle(w, (k) => k.wasser), belohnung: { erz: 0, glut: 25 } },
  { id: 'erfassen', text: (n) => `An ${n} Tagen dein Essen erfassen`, ziel: 6, wert: (w) => zaehle(w, (k) => k.geloggt), belohnung: { erz: 0, glut: 30 } },
  { id: 'ausdauer', text: (n) => `${n} Minuten Ausdauer`, ziel: 90, wert: (w) => summe(w, (k) => k.ausdauerMin), belohnung: { erz: 30, glut: 0 } },
  { id: 'saetze', text: (n) => `${n} Sätze bewältigen`, ziel: 60, wert: (w) => summe(w, (k) => k.saetze), belohnung: { erz: 35, glut: 0 } },
  { id: 'gemuese', text: (n) => `An ${n} Tagen das Gemüseziel erreichen`, ziel: 4, wert: (w) => zaehle(w, (k) => k.gemuese), belohnung: { erz: 0, glut: 25 } },
  { id: 'wiegen', text: (n) => `${n}× morgens wiegen`, ziel: 5, wert: (w) => zaehle(w, (k) => k.gewicht), belohnung: { erz: 0, glut: 15 } },
  { id: 'rekord', text: () => 'Einen neuen Rekord aufstellen', ziel: 1, wert: (w) => summe(w, (k) => k.rekorde), belohnung: { erz: 25, glut: 0 } },
  { id: 'tagebuch', text: (n) => `${n} Tagebucheinträge schreiben`, ziel: 3, wert: (w) => zaehle(w, (k) => k.tagebuch), belohnung: { erz: 0, glut: 15 } },
];
export const XP_JE_AUFTRAG = 75;

/** Geplante Trainingstage pro Woche laut Profil (2–6). */
export function geplanteTrainingstage(profil) {
  const n = (profil.woche ?? []).filter((w) => profil.tagestypen.find((t) => t.id === w.tagestyp)?.aktivitaeten?.length).length;
  return Math.max(2, Math.min(6, n || 3));
}

function hash(text) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Drei Aufträge pro Woche: immer Workouts, dazu zwei wechselnde (fest je Woche). */
export function auftraegeDerWoche(montag, profil) {
  const pool = AUFTRAEGE.filter((a) => a.id !== 'workouts' && (a.id !== 'supplements'));
  const h = hash(montag);
  const erste = pool[h % pool.length];
  const rest = pool.filter((a) => a !== erste);
  const zweite = rest[(h >>> 8) % rest.length];
  const workouts = AUFTRAEGE[0];
  return [
    { ...workouts, ziel: geplanteTrainingstage(profil) },
    erste,
    zweite,
  ];
}

/** Stand der Aufträge einer Woche. wocheKennzahlen: Kennzahlen Mo–So. */
export function auftragsStand(montag, profil, wocheKennzahlen) {
  return auftraegeDerWoche(montag, profil).map((a) => {
    const wert = a.wert(wocheKennzahlen);
    return { id: a.id, text: a.text(a.ziel), ziel: a.ziel, wert, fertig: wert >= a.ziel, belohnung: a.belohnung };
  });
}

const montagVon = (schluessel) => {
  const d = new Date(`${schluessel}T12:00:00`);
  return datumSchluessel(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)));
};

/** Kennzahlen nach Woche (Montag) und Monat gruppieren. */
export function gruppiere(kennzahlen) {
  const wochen = new Map();
  const monate = new Map();
  for (const k of kennzahlen) {
    const m = montagVon(k.datum);
    wochen.set(m, [...(wochen.get(m) ?? []), k]);
    const monat = k.datum.slice(0, 7);
    monate.set(monat, [...(monate.get(monat) ?? []), k]);
  }
  return { wochen, monate };
}

// ---------------------------------------------------------------- Monats-Boss

export const BOSSE = [
  { id: 'golem', name: 'Der Eisengolem', text: 'Bewege Tonnen an Gewicht', einheit: 't', basis: 15, wert: (m) => summe(m, (k) => k.volumenKg) / 1000 },
  { id: 'drache', name: 'Der Glutdrache', text: 'Bezwinge ihn mit Sätzen', einheit: 'Sätze', basis: 120, wert: (m) => summe(m, (k) => k.saetze) },
  { id: 'troll', name: 'Der Sumpftroll', text: 'Laufe, radle, schwimme ihn nieder', einheit: 'min', basis: 300, wert: (m) => summe(m, (k) => k.ausdauerMin) },
  { id: 'lich', name: 'Der Hungerlich', text: 'Nur wer isst, wie er plant, besiegt ihn', einheit: 'Tage', basis: 18, wert: (m) => zaehle(m, (k) => k.geloggt) },
  { id: 'wyrm', name: 'Der Frostwyrm', text: 'Jeder Tag mit Proteinziel ist ein Treffer', einheit: 'Tage', basis: 15, wert: (m) => zaehle(m, (k) => k.protein) },
];
export const BOSS_BELOHNUNG = { erz: 150, glut: 100, xp: 400 };

export function bossDesMonats(monat) {
  const [j, m] = monat.split('-').map(Number);
  return BOSSE[(j * 12 + m) % BOSSE.length];
}

/** Lebenspunkte: wächst mit deiner Leistung im Vormonat (gleiche Art), aber nie unter 60 % der Basis. */
export function bossLeben(boss, vormonatKennzahlen) {
  const vorher = vormonatKennzahlen?.length ? boss.wert(vormonatKennzahlen) : 0;
  const lp = vorher > 0 ? Math.max(boss.basis * 0.6, vorher * 1.1) : boss.basis;
  return Math.round(lp * 10) / 10;
}

export function vormonat(monat) {
  const [j, m] = monat.split('-').map(Number);
  return m === 1 ? `${j - 1}-12` : `${j}-${String(m - 1).padStart(2, '0')}`;
}

export function bossStand(monat, monate) {
  const boss = bossDesMonats(monat);
  const leben = bossLeben(boss, monate.get(vormonat(monat)));
  const schaden = Math.round(boss.wert(monate.get(monat) ?? []) * 10) / 10;
  return { boss, leben, schaden, besiegt: schaden >= leben, anteil: Math.min(1, schaden / leben) };
}

/** Alle Belohnungen aus erledigten Aufträgen und besiegten Bossen bis heute. */
export function alleBelohnungen(kennzahlen, profil) {
  const { wochen, monate } = gruppiere(kennzahlen);
  const b = { erz: 0, glut: 0, xp: 0, auftraege: 0, bosse: 0 };
  for (const [montag, liste] of wochen) {
    for (const a of auftragsStand(montag, profil, liste)) {
      if (!a.fertig) continue;
      b.erz += a.belohnung.erz;
      b.glut += a.belohnung.glut;
      b.xp += XP_JE_AUFTRAG;
      b.auftraege += 1;
    }
  }
  for (const monat of monate.keys()) {
    if (!bossStand(monat, monate).besiegt) continue;
    b.erz += BOSS_BELOHNUNG.erz;
    b.glut += BOSS_BELOHNUNG.glut;
    b.xp += BOSS_BELOHNUNG.xp;
    b.bosse += 1;
  }
  return b;
}
