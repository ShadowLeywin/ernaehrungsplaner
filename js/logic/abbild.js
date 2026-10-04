// Abbild des Nutzers: Körperbau-Proportionen aus Größe, Gewicht, Maßen und Rängen (reine Funktionen).
// Ergebnis sind halbe Breiten in SVG-Einheiten (Figur 200 breit, Mitte x = 100) plus Muskel-Definition 0–1.

const begrenze = (x, min, max) => Math.min(max, Math.max(min, x));

/**
 * @param {object} p
 * @param {'m'|'w'|null} p.geschlecht
 * @param {number|null} p.groesseCm
 * @param {number|null} p.gewichtKg
 * @param {object|null} p.masse  letzte Maße { brust, taille, huefte, arm, oberschenkel, wade } in cm
 * @param {number} p.rangAnteil  Gesamtrang 0 (keiner) bis 1 (Legende)
 */
export function koerperbau({ geschlecht = 'm', groesseCm = null, gewichtKg = null, masse = null, rangAnteil = 0 }) {
  const frau = geschlecht === 'w';
  const m = groesseCm ? groesseCm / 100 : null;
  const bmi = m && gewichtKg ? gewichtKg / (m * m) : 22;
  const muskel = begrenze(rangAnteil, 0, 1);

  // Fettanteil grob: Taille/Größe (WHtR) wenn gemessen, sonst aus BMI und Muskeln geschätzt
  const whtr = masse?.taille && groesseCm ? masse.taille / groesseCm : begrenze(0.42 + (bmi - 21) * 0.012 - muskel * 0.04, 0.38, 0.7);
  const fett = begrenze((whtr - 0.4) / 0.25, 0, 1);

  // Schulterbreite: Brust/Taille-Verhältnis (V-Form) wenn gemessen, sonst aus Muskeln
  const vForm = masse?.brust && masse?.taille ? begrenze((masse.brust / masse.taille - 1) / 0.45, 0, 1) : muskel * 0.8;
  const masseFaktor = begrenze((bmi - 18) / 12, 0, 1);

  const schulter = (frau ? 38 : 44) + vForm * 14 + masseFaktor * 4;
  const taille = (frau ? 24 : 28) + fett * 16 + masseFaktor * 2;
  const huefte = (frau ? 36 : 30) + fett * 8 + masseFaktor * 3;
  const armMass = masse?.arm && groesseCm ? begrenze((masse.arm / groesseCm - 0.15) / 0.08, 0, 1) : muskel * 0.7 + masseFaktor * 0.3;
  const arm = 7 + armMass * 6 + fett * 1.5;
  const beinMass = masse?.oberschenkel && groesseCm ? begrenze((masse.oberschenkel / groesseCm - 0.28) / 0.12, 0, 1) : muskel * 0.6 + masseFaktor * 0.4;
  const bein = 13 + beinMass * 6 + fett * 3;

  return {
    schulter: rund(schulter), taille: rund(taille), huefte: rund(huefte), arm: rund(arm), bein: rund(bein),
    bauch: rund(fett), definition: rund(begrenze(muskel * 1.2 - fett * 0.8, 0, 1)), frau,
    bmi: rund(bmi), schaetzung: !(masse?.taille && masse?.brust),
  };
}

const rund = (x) => Math.round(x * 10) / 10;

/** Neueste Messung je Maß aus den Tagen (jedes Maß einzeln, falls nicht alle am selben Tag gemessen). */
export function letzteMasse(tage) {
  const ergebnis = {};
  for (const t of [...tage].sort((a, b) => a.datum.localeCompare(b.datum))) {
    for (const [k, v] of Object.entries(t.masse ?? {})) if (v > 0) ergebnis[k] = v;
  }
  return Object.keys(ergebnis).length ? ergebnis : null;
}

/** Neuestes Körpergewicht aus den Tagen, sonst aus dem Profil. */
export function letztesGewicht(tage, profilKg = null) {
  const mit = tage.filter((t) => t.gewichtKg > 0).sort((a, b) => a.datum.localeCompare(b.datum));
  return mit.at(-1)?.gewichtKg ?? profilKg;
}
