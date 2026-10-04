// Rangkarte zum Teilen mit Freunden – ohne Server: Die Karte steckt kodiert im Link (#/freunde/karte/<code>).
// Der Teil nach „#“ wird nie an einen Server geschickt. Enthält nur Spielwerte, keine Gesundheitsdaten
// (kein Gewicht, keine Ernährung, keine Einträge). Fremde Karten werden streng geprüft (reine Funktionen).
import { RAENGE, GRUPPEN } from './raenge.js';
import { WERTE } from './charakter.js';

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
    return {
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
