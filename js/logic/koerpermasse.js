// Körpermaße, Gewichts-Prognose und Bulk-Bericht (reine Funktionen).
// Maße im Tagesdatensatz: tag.masse = { hals, brust, arm, taille, huefte, oberschenkel, wade } in cm.
import { datumSchluessel } from './ziele.js';
import { uebungsVerlauf } from './fortschritt.js';

export const MASSE = {
  arm: { name: 'Oberarm (angespannt)' },
  brust: { name: 'Brust' },
  taille: { name: 'Taille (Bauchnabel)' },
  huefte: { name: 'Hüfte' },
  oberschenkel: { name: 'Oberschenkel' },
  wade: { name: 'Wade' },
  hals: { name: 'Hals' },
};

/** Messreihe eines Maßes: [{ datum, cm }] älteste zuerst. */
export function massReihe(tage, feld) {
  return tage.filter((t) => t.masse?.[feld] > 0)
    .map((t) => ({ datum: t.datum, cm: t.masse[feld] }))
    .sort((a, b) => a.datum.localeCompare(b.datum));
}

/** Änderung zwischen erster Messung ab `seit` und letzter Messung. */
export function aenderung(reihe, seit = null) {
  const ab = seit ? reihe.filter((m) => m.datum >= seit) : reihe;
  if (ab.length < 2) return null;
  return { von: ab[0], bis: ab.at(-1), diff: Math.round((ab.at(-1).cm - ab[0].cm) * 10) / 10 };
}

/**
 * Prognose: Wann wird das Zielgewicht erreicht? Lineare Regression über die letzten `tage` Tage.
 * Liefert { rateProWoche, datum (Schlüssel) | null, tageBis } oder null bei zu wenig Daten.
 */
export function prognose(gewichtsReihe, zielKg, heute = new Date(), tage = 28) {
  const grenze = datumSchluessel(new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() - tage));
  const punkte = gewichtsReihe.filter((m) => m.datum >= grenze);
  if (punkte.length < 6) return null;
  const t0 = new Date(`${punkte[0].datum}T12:00:00`).getTime();
  const xs = punkte.map((p) => (new Date(`${p.datum}T12:00:00`).getTime() - t0) / 864e5);
  const ys = punkte.map((p) => p.kg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const steigung = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / Math.max(1e-9, xs.reduce((s, x) => s + (x - mx) ** 2, 0));
  const rateProWoche = Math.round(steigung * 7 * 100) / 100;
  const jetztX = (heute.getTime() - t0) / 864e5;
  const jetztKg = my + steigung * (jetztX - mx);
  if (!zielKg || Math.abs(steigung) < 1e-4 || Math.sign(zielKg - jetztKg) !== Math.sign(steigung)) {
    return { rateProWoche, datum: null, tageBis: null, jetztKg: Math.round(jetztKg * 10) / 10 };
  }
  const tageBis = Math.max(0, Math.round((zielKg - jetztKg) / steigung));
  const ziel = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() + tageBis);
  return { rateProWoche, datum: datumSchluessel(ziel), tageBis, jetztKg: Math.round(jetztKg * 10) / 10 };
}

/**
 * Bulk-Bericht seit Start der Phase: Gewicht, Taille, Arm, Kraft der Hauptübungen.
 * Faustregel (Schätzung!): Taille wächst bei sauberem Aufbau um weniger als ca. 1 cm je kg Zunahme.
 */
export function bulkBericht(tage, gewichtsReihe, startDatum, verzeichnis) {
  if (!startDatum) return null;
  const gewicht = gewichtsReihe.filter((m) => m.datum >= startDatum);
  if (gewicht.length < 2) return null;
  // Wochenmittel am Anfang und am Ende (Messungen innerhalb von 7 Tagen nach dem ersten bzw. vor dem letzten Wert)
  const mittel = (liste) => liste.reduce((s, m) => s + m.kg, 0) / liste.length;
  const tag = (d) => new Date(`${d}T12:00:00`).getTime() / 864e5;
  const anfang = gewicht.filter((m) => tag(m.datum) - tag(gewicht[0].datum) < 7);
  const ende = gewicht.filter((m) => tag(gewicht.at(-1).datum) - tag(m.datum) < 7);
  const kgDiff = Math.round((mittel(ende) - mittel(anfang)) * 10) / 10;
  const taille = aenderung(massReihe(tage, 'taille'), startDatum);
  const arm = aenderung(massReihe(tage, 'arm'), startDatum);
  const kraft = ['bankdruecken_lh', 'kniebeuge_lh', 'kreuzheben', 'klimmzuege'].map((id) => {
    const v = uebungsVerlauf(id, tage, verzeichnis).filter((p) => p.datum >= startDatum);
    if (v.length < 2) return null;
    const wert = (p) => p.e1RM || p.wdh;
    return { uebungId: id, von: Math.round(wert(v[0]) * 10) / 10, bis: Math.round(wert(v.at(-1)) * 10) / 10 };
  }).filter(Boolean);
  const cmJeKg = taille && kgDiff > 0.3 ? Math.round((taille.diff / kgDiff) * 10) / 10 : null;
  const bewertung = cmJeKg == null ? null : cmJeKg <= 1 ? 'sauber' : cmJeKg <= 1.5 ? 'ok' : 'zu_schnell';
  return { kgDiff, taille, arm, kraft, cmJeKg, bewertung };
}
