// Hell, dunkel oder wie das System. Gilt je Gerät (localStorage), gehört nicht ins Backup.
// Dieselbe Logik steht als kurzes Skript in index.html, damit beim Start nichts aufblitzt.

const SCHLUESSEL = 'elan.darstellung';
const dunkelFrage = matchMedia('(prefers-color-scheme: dark)');

export const MODI = [
  { id: 'system', name: 'Wie das Handy' },
  { id: 'hell', name: 'Hell' },
  { id: 'dunkel', name: 'Dunkel' },
];

export function leseDarstellung() {
  try {
    const wert = localStorage.getItem(SCHLUESSEL);
    return MODI.some((m) => m.id === wert) ? wert : 'system';
  } catch {
    return 'system'; // z. B. privates Fenster ohne Speicherzugriff
  }
}

function wendeAn(modus) {
  const dunkel = modus === 'dunkel' || (modus === 'system' && dunkelFrage.matches);
  document.documentElement.dataset.modus = dunkel ? 'dunkel' : 'hell';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dunkel ? '#0f1812' : '#f5f9ec');
}

export function setzeDarstellung(modus) {
  try { localStorage.setItem(SCHLUESSEL, modus); } catch { /* dann gilt es nur bis zum Neuladen */ }
  wendeAn(modus);
}

dunkelFrage.addEventListener('change', () => wendeAn(leseDarstellung()));
wendeAn(leseDarstellung());
