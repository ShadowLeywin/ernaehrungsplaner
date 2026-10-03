// Kalorienbedarf aus Körperdaten, Alltag, Sport und Gewichtsziel (reine Funktionen).
// Grundumsatz: Mifflin-St Jeor. Alltag: PAL-Werte ohne Sport (DGE-Einteilung).
// Sport wird mit den eigenen kcal-Angaben je Aktivität addiert.

export const KCAL_PRO_KG = 7700; // Energiegehalt von 1 kg Körpergewicht (Näherung)

export const ALLTAG = {
  sitzend: { name: 'Überwiegend sitzend (Büro, Schule, Studium)', pal: 1.4 },
  gemischt: { name: 'Sitzend mit Gehen und Stehen (z. B. Labor, Werkstatt)', pal: 1.6 },
  aktiv: { name: 'Überwiegend gehend oder stehend (Handwerk, Verkauf, Pflege)', pal: 1.8 },
};

export const ZIELARTEN = {
  aufbau: 'Muskelaufbau (zunehmen)',
  halten: 'Gewicht halten',
  abnehmen: 'Abnehmen',
};

export function koerperVollstaendig(k) {
  return Boolean(k && (k.geschlecht === 'm' || k.geschlecht === 'w')
    && k.alter > 0 && k.groesseCm > 0 && k.gewichtKg > 0);
}

/** Grundumsatz in kcal/Tag nach Mifflin-St Jeor. */
export function grundumsatz({ geschlecht, alter, groesseCm, gewichtKg }) {
  return 10 * gewichtKg + 6.25 * groesseCm - 5 * alter + (geschlecht === 'w' ? -161 : 5);
}

/** kcal pro Tag, die für das Gewichtsziel dazukommen (positiv) oder fehlen (negativ). */
export function zielZuschlag(ziel) {
  if (!ziel || ziel.art === 'halten') return 0;
  const proTag = (ziel.kgProWoche * KCAL_PRO_KG) / 7;
  return ziel.art === 'abnehmen' ? -proTag : proTag;
}

export function sportKcal(typ, aktivitaeten) {
  return (typ.aktivitaeten ?? []).reduce((summe, id) => summe + (aktivitaeten.find((a) => a.id === id)?.kcal ?? 0), 0);
}

const auf25 = (wert) => Math.round(wert / 25) * 25;

/**
 * Tagesbedarf für einen Tagestyp, aufgeschlüsselt. null, wenn Körperdaten fehlen.
 */
export function berechneTagesbedarf(profil, typ) {
  if (!koerperVollstaendig(profil.koerper)) return null;
  const gu = grundumsatz(profil.koerper);
  const pal = ALLTAG[profil.alltag]?.pal ?? ALLTAG.sitzend.pal;
  const alltag = gu * pal;
  const sport = sportKcal(typ, profil.aktivitaeten ?? []);
  const zuschlag = zielZuschlag(profil.ziel);
  return {
    grundumsatz: Math.round(gu),
    alltag: Math.round(alltag),
    sport,
    zuschlag: Math.round(zuschlag),
    kcal: auf25(alltag + sport + zuschlag),
  };
}

/** Makros: Protein g/kg (für alle Tage gleich), Fett als Anteil der kcal, Rest Kohlenhydrate. */
export function berechneMakros(kcal, gewichtKg, regeln) {
  const protein = Math.round(regeln.proteinGProKg * gewichtKg);
  const fett = Math.round((kcal * regeln.fettAnteil) / 9);
  const kh = Math.max(0, Math.round((kcal - protein * 4 - fett * 9) / 4));
  return { protein, kh, fett };
}

/** Hinweise zu einem Gewichtsziel (leere Liste = alles im üblichen Rahmen). */
export function pruefeZiel(ziel, gewichtKg) {
  const hinweise = [];
  if (!ziel || ziel.art === 'halten') return hinweise;
  const prozent = gewichtKg > 0 ? (ziel.kgProWoche / gewichtKg) * 100 : 0;
  if (ziel.art === 'aufbau' && prozent > 0.5) {
    hinweise.push('Mehr als ca. 0,5 % des Körpergewichts pro Woche führt beim Aufbau meist zu mehr Fett als Muskeln.');
  }
  if (ziel.art === 'abnehmen' && prozent > 1) {
    hinweise.push('Mehr als ca. 1 % des Körpergewichts pro Woche ist sehr schnell – Muskelverlust wird wahrscheinlicher.');
  }
  if (ziel.wochen > 0 && ziel.wochen < 4) hinweise.push('Unter 4 Wochen lässt sich der Fortschritt kaum sicher messen.');
  return hinweise;
}

/** Erwartetes Zielgewicht nach Ablauf des Plans. */
export function zielGewicht(startKg, ziel) {
  if (!ziel || ziel.art === 'halten') return startKg;
  const aenderung = ziel.kgProWoche * ziel.wochen;
  return Math.round((ziel.art === 'abnehmen' ? startKg - aenderung : startKg + aenderung) * 10) / 10;
}
