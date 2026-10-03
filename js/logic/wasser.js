// Wasser-Tracker (reine Funktionen). Einträge: [{ ml, zeit: ISO-Zeitstempel }]

export const MAX_ML_PRO_EINTRAG = 3000;

export function wasserSumme(eintraege) {
  return eintraege.reduce((summe, e) => summe + e.ml, 0);
}

/** Summe der Einträge vor einer Uhrzeit ("12:00") am Tag des Eintrags. */
export function wasserBisUhrzeit(eintraege, uhrzeit) {
  const [stunde, minute] = uhrzeit.split(':').map(Number);
  const grenze = stunde * 60 + minute;
  return wasserSumme(eintraege.filter((e) => {
    const zeit = new Date(e.zeit);
    return zeit.getHours() * 60 + zeit.getMinutes() < grenze;
  }));
}

/** Manuelle Eingabe prüfen; liefert ml als Zahl oder eine Fehlermeldung. */
export function pruefeWassermenge(eingabe) {
  const ml = Math.round(Number(String(eingabe).replace(',', '.')));
  if (!Number.isFinite(ml) || ml <= 0) return { fehler: 'Bitte eine Menge in ml eingeben.' };
  if (ml > MAX_ML_PRO_EINTRAG) return { fehler: `Höchstens ${MAX_ML_PRO_EINTRAG} ml pro Eintrag.` };
  return { ml };
}
