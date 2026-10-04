// Hilfen an der Hantel: Scheiben-Rechner, Aufwärmsätze, Satz-Typen, Erholung je Muskel (reine Funktionen).

export const SATZ_TYPEN = {
  normal: { kurz: '', name: 'Arbeitssatz' },
  aufwaermen: { kurz: 'A', name: 'Aufwärmen' },
  drop: { kurz: 'D', name: 'Drop-Satz' },
  versagen: { kurz: 'V', name: 'Bis zum Versagen' },
};

export const STANDARD_SCHEIBEN = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Scheiben pro Seite für ein Gesamtgewicht. Liefert { proSeite: [kg…], rest } (rest > 0 = nicht exakt machbar). */
export function scheiben(gesamtKg, stangeKg = 20, verfuegbar = STANDARD_SCHEIBEN) {
  let seite = (gesamtKg - stangeKg) / 2;
  if (seite <= 0) return { proSeite: [], rest: Math.max(0, gesamtKg - stangeKg) };
  const proSeite = [];
  for (const s of [...verfuegbar].sort((a, b) => b - a)) {
    while (seite >= s - 1e-9) { proSeite.push(s); seite = Math.round((seite - s) * 1000) / 1000; }
  }
  return { proSeite, rest: Math.round(seite * 2 * 100) / 100 };
}

const rundeAuf = (kg, schritt = 2.5) => Math.round(kg / schritt) * schritt;

/** Aufwärmsätze vor einem Arbeitsgewicht: leere Stange, ~40 %, ~60 %, ~80 % (bei leichten Gewichten weniger). */
export function aufwaermSaetze(arbeitsKg, stangeKg = 20) {
  if (!arbeitsKg || arbeitsKg <= stangeKg) return [];
  const plan = [[0, 10], [0.4, 8], [0.6, 5], [0.8, 3]];
  const saetze = [];
  for (const [anteil, wdh] of plan) {
    const kg = anteil ? rundeAuf(arbeitsKg * anteil) : stangeKg;
    if (kg < stangeKg || kg >= arbeitsKg) continue;
    if (saetze.some((s) => s.kg === kg)) continue;
    saetze.push({ kg, wdh, typ: 'aufwaermen', erledigt: false });
  }
  return saetze;
}

/**
 * Erholung je Muskel: Stunden seit dem letzten harten Training und benötigte Zeit (48 h, ab 8 Sätzen 72 h).
 * belastungen: [{ muskel, zeit (ISO), saetze }] → { muskel: { bereit, rest Stunden, anteil 0–1 } }
 */
export function erholung(belastungen, jetzt = new Date()) {
  const letzte = {};
  for (const b of belastungen) {
    if (!letzte[b.muskel] || b.zeit > letzte[b.muskel].zeit) letzte[b.muskel] = { zeit: b.zeit, saetze: 0 };
    if (letzte[b.muskel].zeit === b.zeit) letzte[b.muskel].saetze += b.saetze;
  }
  const ergebnis = {};
  for (const [muskel, { zeit, saetze }] of Object.entries(letzte)) {
    const noetig = saetze >= 8 ? 72 : saetze >= 3 ? 48 : 24;
    const vergangen = (jetzt - new Date(zeit)) / 36e5;
    ergebnis[muskel] = { bereit: vergangen >= noetig, rest: Math.max(0, Math.round(noetig - vergangen)), anteil: Math.min(1, vergangen / noetig) };
  }
  return ergebnis;
}

/** Belastungen aus Trainings (Hauptmuskel voll, Hilfsmuskeln halb), ohne Aufwärmsätze. */
export function belastungenAus(tage, verzeichnis) {
  const liste = [];
  for (const tag of tage) {
    for (const t of tag.trainings ?? []) {
      if (t.typ !== 'workout' || !t.ende) continue;
      for (const e of t.uebungen ?? []) {
        const u = verzeichnis.get(e.uebungId);
        const n = (e.saetze ?? []).filter((s) => s.erledigt && s.typ !== 'aufwaermen').length;
        if (!u || !n) continue;
        u.muskeln.forEach((m, i) => {
          if (m !== 'ausdauer' && m !== 'ganzkoerper') liste.push({ muskel: m, zeit: t.ende, saetze: i === 0 ? n : n / 2 });
        });
      }
    }
  }
  return liste;
}
