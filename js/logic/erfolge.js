// Erfolge: Stufen Bronze → Silber → Gold → Platin → Obsidian → Legendär, dazu geheime Erfolge (reine Funktionen).
// Jeder Erfolg misst eine Zahl aus dem Spielstand (siehe spielstand.js) und hat sechs Schwellen.

export const STUFEN = [
  { id: 'bronze', name: 'Bronze', farbe: '#c07a45', xp: 50 },
  { id: 'silber', name: 'Silber', farbe: '#c9d1dc', xp: 100 },
  { id: 'gold', name: 'Gold', farbe: '#f2c14e', xp: 200 },
  { id: 'platin', name: 'Platin', farbe: '#5fd4c4', xp: 400 },
  { id: 'obsidian', name: 'Obsidian', farbe: '#7a5cff', xp: 800 },
  { id: 'legendaer', name: 'Legendär', farbe: '#ff7a2f', xp: 1600 },
];

export const BEREICHE = {
  gym: { name: 'Gym', episch: 'Schmiede' },
  cardio: { name: 'Cardio', episch: 'Pfade' },
  cali: { name: 'Calisthenics', episch: 'Akrobatik' },
  ernaehrung: { name: 'Ernährung', episch: 'Tafel' },
  disziplin: { name: 'Disziplin', episch: 'Beständigkeit' },
  geheim: { name: 'Geheim', episch: 'Verborgenes' },
};

const tonnen = (st) => st.volumenKg / 1000;
const stunden = (st) => st.cardioMin / 60;

// { id, bereich, name (episch), schlicht, text (Beschreibung mit {n}), einheit, wert(st), schwellen[6] }
export const ERFOLGE = [
  // ---------- Gym
  { id: 'eisenbieger', bereich: 'gym', name: 'Eisenbieger', schlicht: 'Workouts', text: '{n} Workouts abgeschlossen', wert: (st) => st.workouts, schwellen: [1, 10, 50, 100, 250, 500] },
  { id: 'tonnenschmied', bereich: 'gym', name: 'Tonnenschmied', schlicht: 'Bewegtes Gewicht', text: '{n} t insgesamt bewegt', wert: tonnen, schwellen: [1, 10, 50, 200, 500, 1000] },
  { id: 'saetze', bereich: 'gym', name: 'Satz um Satz', schlicht: 'Sätze', text: '{n} Sätze erledigt', wert: (st) => st.saetze, schwellen: [25, 250, 1000, 2500, 5000, 10000] },
  { id: 'bankmeister', bereich: 'gym', name: 'Herr der Bank', schlicht: 'Bankdrücken', text: 'Bankdrücken mit {n} × Körpergewicht (1RM)', wert: (st) => st.verhaeltnis.bank, schwellen: [0.5, 0.75, 1, 1.25, 1.5, 1.75], dezimal: true },
  { id: 'fundament', bereich: 'gym', name: 'Fundament aus Stein', schlicht: 'Kniebeuge', text: 'Kniebeuge mit {n} × Körpergewicht (1RM)', wert: (st) => st.verhaeltnis.kniebeuge, schwellen: [0.75, 1, 1.25, 1.5, 2, 2.5], dezimal: true },
  { id: 'zugkraft', bereich: 'gym', name: 'Bergheber', schlicht: 'Kreuzheben', text: 'Kreuzheben mit {n} × Körpergewicht (1RM)', wert: (st) => st.verhaeltnis.kreuzheben, schwellen: [1, 1.25, 1.5, 2, 2.5, 3], dezimal: true },
  { id: 'rekordjaeger', bereich: 'gym', name: 'Rekordjäger', schlicht: 'Rekorde', text: '{n} persönliche Rekorde', wert: (st) => st.rekorde, schwellen: [1, 5, 20, 50, 100, 250] },
  // ---------- Cardio
  { id: 'wanderer', bereich: 'cardio', name: 'Weitgereist', schlicht: 'Strecke', text: '{n} km zurückgelegt', wert: (st) => st.km, schwellen: [10, 50, 150, 500, 1000, 2500] },
  { id: 'langer_atem', bereich: 'cardio', name: 'Langer Atem', schlicht: 'Ausdauerzeit', text: '{n} Stunden Ausdauer', wert: stunden, schwellen: [1, 10, 25, 50, 100, 250] },
  { id: 'windlaeufer', bereich: 'cardio', name: 'Windläufer', schlicht: 'Lauftempo', text: 'Lauf mit {n} km/h im Schnitt', wert: (st) => st.maxLaufKmh, schwellen: [8, 10, 12, 13.5, 15, 17], dezimal: true },
  { id: 'aktiv', bereich: 'cardio', name: 'Immer in Bewegung', schlicht: 'Aktivitäten', text: '{n} Aktivitäten eingetragen', wert: (st) => st.aktivitaeten, schwellen: [1, 10, 50, 150, 300, 600] },
  // ---------- Calisthenics
  { id: 'klimmzugkoenig', bereich: 'cali', name: 'Klimmzugkönig', schlicht: 'Klimmzüge', text: '{n} Klimmzüge insgesamt', wert: (st) => st.familien.klimmzug, schwellen: [50, 250, 1000, 2500, 5000, 10000] },
  { id: 'liegestuetz', bereich: 'cali', name: 'Legion der Liegestütze', schlicht: 'Liegestütze', text: '{n} Liegestütze insgesamt', wert: (st) => st.familien.liegestuetz, schwellen: [100, 500, 2000, 5000, 10000, 25000] },
  { id: 'dips', bereich: 'cali', name: 'Barrenbezwinger', schlicht: 'Dips', text: '{n} Dips insgesamt', wert: (st) => st.familien.dip, schwellen: [50, 250, 1000, 2500, 5000, 10000] },
  { id: 'statue', bereich: 'cali', name: 'Steinerne Statue', schlicht: 'Plank', text: 'Plank {n} Sekunden gehalten', wert: (st) => st.maxSek.plank ?? 0, schwellen: [30, 60, 120, 180, 300, 600] },
  { id: 'kopfueber', bereich: 'cali', name: 'Die Welt steht kopf', schlicht: 'Handstand', text: 'Handstand {n} Sekunden gehalten', wert: (st) => st.maxSek.handstand ?? 0, schwellen: [5, 15, 30, 60, 90, 120] },
  { id: 'schwebe', bereich: 'cali', name: 'Schwerelos', schlicht: 'Front Lever', text: 'Front Lever {n} Sekunden gehalten', wert: (st) => st.maxSek.front_lever ?? 0, schwellen: [1, 3, 5, 10, 20, 30] },
  // ---------- Ernährung
  { id: 'tafelrunde', bereich: 'ernaehrung', name: 'Tafelrunde', schlicht: 'Tage erfasst', text: '{n} Tage Ernährung erfasst', wert: (st) => st.logTage.length, schwellen: [1, 7, 30, 90, 180, 365] },
  { id: 'proteinpakt', bereich: 'ernaehrung', name: 'Proteinpakt', schlicht: 'Proteinziel', text: '{n} Tage Proteinziel erreicht', wert: (st) => st.proteinTage, schwellen: [1, 7, 30, 90, 180, 365] },
  { id: 'kalorienkunst', bereich: 'ernaehrung', name: 'Maß und Mitte', schlicht: 'Kalorienziel', text: '{n} Tage Kalorienziel ±10 % getroffen', wert: (st) => st.kcalTage, schwellen: [1, 7, 30, 90, 180, 365] },
  { id: 'gruener_daumen', bereich: 'ernaehrung', name: 'Grüner Daumen', schlicht: 'Gemüseziel', text: '{n} Tage Gemüseziel erreicht', wert: (st) => st.gemueseTage, schwellen: [1, 7, 30, 90, 180, 365] },
  { id: 'obstgarten', bereich: 'ernaehrung', name: 'Obstgarten', schlicht: 'Obstziel', text: '{n} Tage Obstziel erreicht', wert: (st) => st.obstTage, schwellen: [1, 7, 30, 90, 180, 365] },
  { id: 'quellhueter', bereich: 'ernaehrung', name: 'Hüter der Quelle', schlicht: 'Wasserziel', text: '{n} Tage Wasserziel bis Mittag erreicht', wert: (st) => st.wasserTage, schwellen: [1, 7, 30, 90, 180, 365] },
  // ---------- Disziplin
  { id: 'flamme', bereich: 'disziplin', name: 'Ewige Flamme', schlicht: 'Serie', text: '{n} Tage am Stück erfasst', wert: (st) => st.laengsteLogFolge, schwellen: [3, 7, 14, 30, 60, 100] },
  { id: 'wochenwerk', bereich: 'disziplin', name: 'Wochenwerk', schlicht: 'Starke Wochen', text: '{n} Wochen mit mindestens 3 Trainingstagen', wert: (st) => st.starkeWochen, schwellen: [1, 4, 12, 26, 52, 104] },
  { id: 'waage', bereich: 'disziplin', name: 'Die Waage lügt nicht', schlicht: 'Wiegen', text: '{n} Mal gewogen', wert: (st) => st.gewichtTage, schwellen: [1, 7, 30, 90, 180, 365] },
  { id: 'kraeuterkundig', bereich: 'disziplin', name: 'Kräuterkundig', schlicht: 'Supplements', text: '{n} Tage alle Supplements genommen', wert: (st) => st.supplementTage, schwellen: [1, 7, 30, 90, 180, 365] },
  { id: 'chronist', bereich: 'disziplin', name: 'Chronist', schlicht: 'Tagebuch', text: '{n} Tagebucheinträge', wert: (st) => st.tagebuchTage, schwellen: [1, 7, 30, 90, 180, 365] },
  // ---------- Geheim (eine Stufe, erst nach dem Freischalten sichtbar)
  { id: 'fruehaufsteher', bereich: 'geheim', geheim: true, name: 'Vor dem Hahnenschrei', schlicht: 'Frühaufsteher', text: 'Training vor 6 Uhr begonnen', wert: (st) => +st.geheim.frueh },
  { id: 'nachteule', bereich: 'geheim', geheim: true, name: 'Nachteule', schlicht: 'Nachteule', text: 'Training nach 22 Uhr begonnen', wert: (st) => +st.geheim.spaet },
  { id: 'reiseimer', bereich: 'geheim', geheim: true, name: 'Ritter vom Reiseimer', schlicht: 'Reiseimer', text: 'Reiseimer-Wühlen absolviert', wert: (st) => +st.geheim.reiseimer },
  { id: 'festtag', bereich: 'geheim', geheim: true, name: 'Festtagsschmied', schlicht: 'Feiertagstraining', text: 'An Weihnachten oder Neujahr trainiert', wert: (st) => +st.geheim.festtag },
  { id: 'doppelschicht', bereich: 'geheim', geheim: true, name: 'Doppelschicht', schlicht: 'Zwei Workouts', text: 'Zwei Workouts an einem Tag', wert: (st) => +st.geheim.doppelschicht },
  { id: 'comeback', bereich: 'geheim', geheim: true, name: 'Aus der Asche', schlicht: 'Comeback', text: 'Nach mindestens zwei Wochen Pause zurückgekehrt', wert: (st) => +st.geheim.comeback },
  { id: 'perfekt', bereich: 'geheim', geheim: true, name: 'Der perfekte Tag', schlicht: 'Perfekter Tag', text: 'Kalorien ±5 %, Protein, Gemüse und Wasser an einem Tag', wert: (st) => +st.geheim.perfekt },
  { id: 'mitternacht', bereich: 'geheim', geheim: true, name: 'Mitternachtsmahl', schlicht: 'Mitternachtssnack', text: 'Zwischen 0 und 4 Uhr etwas gegessen', wert: (st) => +st.geheim.mitternacht },
];

/** Erreichte Stufe (−1 = keine) und Fortschritt zur nächsten. */
export function bewerteErfolg(erfolg, st) {
  const wert = erfolg.wert(st) ?? 0;
  const schwellen = erfolg.schwellen ?? [1];
  let stufe = -1;
  while (stufe + 1 < schwellen.length && wert >= schwellen[stufe + 1]) stufe += 1;
  const naechste = schwellen[stufe + 1] ?? null;
  const vorige = stufe >= 0 ? schwellen[stufe] : 0;
  const fortschritt = naechste == null ? 1 : Math.max(0, Math.min(1, (wert - vorige) / (naechste - vorige)));
  // Geheime Erfolge haben nur eine Stufe: Legendär-Glanz, aber als „geheim“ markiert
  const stufenInfo = erfolg.geheim ? (stufe >= 0 ? STUFEN[2] : null) : STUFEN[stufe] ?? null;
  return { erfolg, wert, stufe, stufenInfo, naechste, fortschritt };
}

export function bewerteAlle(st) {
  return ERFOLGE.map((e) => bewerteErfolg(e, st));
}

/** XP aus Erfolgen: Summe der XP aller erreichten Stufen. */
export function erfolgsXp(bewertungen) {
  return bewertungen.reduce((summe, b) => {
    if (b.stufe < 0) return summe;
    if (b.erfolg.geheim) return summe + 300;
    return summe + STUFEN.slice(0, b.stufe + 1).reduce((s, x) => s + x.xp, 0);
  }, 0);
}

/** Neu erreichte Stufen gegenüber dem gespeicherten Stand { erfolgId: stufe }. */
export function neueErfolge(bewertungen, gesehen = {}) {
  return bewertungen.filter((b) => b.stufe >= 0 && b.stufe > (gesehen[b.erfolg.id] ?? -1));
}

export function stufenStand(bewertungen) {
  return Object.fromEntries(bewertungen.filter((b) => b.stufe >= 0).map((b) => [b.erfolg.id, b.stufe]));
}

/** Text mit eingesetzter Zahl (Schwelle der nächsten bzw. erreichten Stufe). */
export function erfolgsText(erfolg, n) {
  const zahl = new Intl.NumberFormat('de-DE', { maximumFractionDigits: erfolg.dezimal ? 2 : 0 }).format(n);
  return erfolg.text.replace('{n}', zahl);
}
