// Thema (Glut oder Zitrus) und Modus (hell, dunkel, wie das Handy). Gilt je Gerät (localStorage), gehört nicht ins Backup.
// Dieselbe Logik steht als kurzes Skript in index.html, damit beim Start nichts aufblitzt.

import { setzeSystemleisten } from './plattform.js';

const SCHLUESSEL_MODUS = 'elan.darstellung';
const SCHLUESSEL_THEMA = 'elan.thema';
const dunkelFrage = matchMedia('(prefers-color-scheme: dark)');

export const THEMEN = [
  { id: 'glut', name: 'Glut' },
  { id: 'zitrus', name: 'Zitrus' },
];

export const MODI = [
  { id: 'dunkel', name: 'Dunkel' },
  { id: 'hell', name: 'Hell' },
  { id: 'system', name: 'Wie das Handy' },
];

// Glut ist als dunkles Design gedacht; wer nie etwas gewählt hat, sieht es dunkel.
const STANDARD = { thema: 'glut', modus: 'dunkel' };

// Farbe der Statusleiste je Thema und Modus, passend zum Seitengrund in css/app.css
const STATUSFARBE = {
  glut: { hell: '#f2f2f7', dunkel: '#000000' },
  zitrus: { hell: '#f5f9ec', dunkel: '#0f1812' },
};

function lies(schluessel, erlaubt, standard) {
  try {
    const wert = localStorage.getItem(schluessel);
    return erlaubt.some((x) => x.id === wert) ? wert : standard;
  } catch {
    return standard; // z. B. privates Fenster ohne Speicherzugriff
  }
}

export const leseDarstellung = () => lies(SCHLUESSEL_MODUS, MODI, STANDARD.modus);
export const leseThema = () => lies(SCHLUESSEL_THEMA, THEMEN, STANDARD.thema);

function wendeAn() {
  const modus = leseDarstellung();
  const thema = leseThema();
  const dunkel = modus === 'dunkel' || (modus === 'system' && dunkelFrage.matches);
  const wurzel = document.documentElement;
  wurzel.dataset.thema = thema;
  wurzel.dataset.modus = dunkel ? 'dunkel' : 'hell';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', STATUSFARBE[thema][dunkel ? 'dunkel' : 'hell']);
  setzeSystemleisten(dunkel);
}

function merke(schluessel, wert) {
  try { localStorage.setItem(schluessel, wert); } catch { /* dann gilt es nur bis zum Neuladen */ }
  wendeAn();
}

export const setzeDarstellung = (modus) => merke(SCHLUESSEL_MODUS, modus);
export const setzeThema = (thema) => merke(SCHLUESSEL_THEMA, thema);

dunkelFrage.addEventListener('change', wendeAn);
wendeAn();
