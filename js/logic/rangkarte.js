// Rangkarte zum Teilen mit Freunden – ohne Server: Die Karte steckt kodiert im Link (#/freunde/karte/<code>).
// Der Teil nach „#“ wird nie an einen Server geschickt. Enthält nur Spielwerte, keine Gesundheitsdaten
// (kein Gewicht, keine Ernährung, keine Einträge). Fremde Karten werden streng geprüft (reine Funktionen).
import { RAENGE, GRUPPEN } from './raenge.js';
import { WERTE } from './charakter.js';
import { FAMILIEN } from './spielstand.js';
import { istAktiv } from './feuer.js';

/** Werte des laufenden Monats für das Duell: [monat, workouts, tonnen×10, klimmzüge, aktive Tage] */
export function monatsDuell(stand, monat) {
  const tage = (stand.tage ?? []).filter((t) => t.datum.startsWith(monat));
  const k = (stand.kennzahlen ?? []).filter((x) => x.datum.startsWith(monat));
  let klimmzuege = 0;
  for (const tag of tage) {
    for (const t of tag.trainings ?? []) {
      if (t.typ !== 'workout' || !t.ende) continue;
      for (const e of t.uebungen ?? []) {
        if (!FAMILIEN.klimmzug.includes(e.uebungId)) continue;
        klimmzuege += (e.saetze ?? []).filter((x) => x.erledigt && x.typ !== 'aufwaermen').reduce((sum, x) => sum + (x.wdh ?? 0), 0);
      }
    }
  }
  return [
    monat,
    k.reduce((sum, x) => sum + x.workouts, 0),
    Math.round(k.reduce((sum, x) => sum + x.volumenKg, 0) / 100),
    klimmzuege,
    tage.filter(istAktiv).length,
  ];
}

export const KARTEN_VERSION = 1;
const RANG_IDS = RAENGE.map((r) => r.id);

/** Kompakte Karte aus dem Spielstand. name: frei wählbar (Standard: Profilname). */
export function erstelleKarte(stand, name, heute = new Date()) {
  const r = (x) => (x ? [RANG_IDS.indexOf(x.rang.id), x.stufe ?? 0] : null);
  return {
    v: KARTEN_VERSION,
    n: String(name ?? '').slice(0, 30),
    l: stand.level.level,
    k: stand.klasse.id,
    g: r(stand.raenge.gesamt),
    m: Object.fromEntries(Object.keys(GRUPPEN).map((g) => [g, r(stand.raenge.gruppen[g])])),
    w: Object.keys(WERTE).map((id) => stand.werte[id]),
    e: stand.bewertungen.filter((b) => b.stufe >= 0).length,
    d: heute.toISOString().slice(0, 10),
    h: monatsDuell(stand, heute.toISOString().slice(0, 7)),
    t: stand.lager?.titel?.aktiv ?? null,
  };
}

function zuBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binaer = '';
  for (const b of bytes) binaer += String.fromCharCode(b);
  return btoa(binaer).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function ausBase64Url(code) {
  const binaer = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(binaer, (c) => c.charCodeAt(0)));
}

export const kodiereKarte = (karte) => zuBase64Url(JSON.stringify(karte));

const ganzzahl = (x, min, max) => (Number.isInteger(x) && x >= min && x <= max ? x : null);

/** Rang-Paar [index, stufe] prüfen und in { rangId, stufe } umwandeln. */
function pruefeRang(paar) {
  if (paar == null) return null;
  if (!Array.isArray(paar) || paar.length !== 2) throw new Error('Rang');
  const index = ganzzahl(paar[0], 0, RANG_IDS.length - 1);
  const stufe = ganzzahl(paar[1], 0, 3);
  if (index == null || stufe == null) throw new Error('Rang');
  return { rangId: RANG_IDS[index], stufe: stufe || null };
}

/** Code aus einem Link prüfen. Liefert die Karte oder null, wenn sie ungültig ist. */
export function dekodiereKarte(code) {
  try {
    if (typeof code !== 'string' || code.length > 2000) return null;
    const roh = JSON.parse(ausBase64Url(code));
    if (roh?.v !== KARTEN_VERSION) return null;
    const level = ganzzahl(roh.l, 1, 999);
    const erfolge = ganzzahl(roh.e, 0, 999);
    if (level == null || erfolge == null) return null;
    if (!Array.isArray(roh.w) || roh.w.length !== Object.keys(WERTE).length) return null;
    const werte = roh.w.map((x) => ganzzahl(x, 0, 100));
    if (werte.includes(null)) return null;
    const gruppen = {};
    for (const g of Object.keys(GRUPPEN)) gruppen[g] = pruefeRang(roh.m?.[g] ?? null);
    // Monats-Duell (optional)
    let duell = null;
    if (Array.isArray(roh.h) && roh.h.length === 5 && /^\d{4}-\d{2}$/.test(roh.h[0])) {
      const z = roh.h.slice(1).map((x) => ganzzahl(x, 0, 100000));
      if (!z.includes(null)) duell = { monat: roh.h[0], workouts: z[0], tonnen: z[1] / 10, klimmzuege: z[2], aktiveTage: z[3] };
    }
    return {
      duell,
      titel: typeof roh.t === 'string' ? roh.t.slice(0, 40) : null,
      name: typeof roh.n === 'string' ? roh.n.slice(0, 30) : '',
      level,
      klasse: typeof roh.k === 'string' ? roh.k.slice(0, 40) : '',
      gesamt: pruefeRang(roh.g ?? null),
      gruppen,
      werte: Object.fromEntries(Object.keys(WERTE).map((id, i) => [id, werte[i]])),
      erfolge,
      datum: /^\d{4}-\d{2}-\d{2}$/.test(roh.d) ? roh.d : null,
    };
  } catch {
    return null;
  }
}

/** Code aus einem eingefügten Link oder reinem Code herauslösen. */
export function codeAusLink(text) {
  const t = String(text ?? '').trim();
  const treffer = t.match(/#\/freunde\/karte\/([A-Za-z0-9_-]+)/);
  if (treffer) return treffer[1];
  return /^[A-Za-z0-9_-]+$/.test(t) ? t : null;
}
