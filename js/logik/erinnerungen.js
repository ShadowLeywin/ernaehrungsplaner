// Erinnerungen als lokale Benachrichtigungen (nur App). Reine Funktionen: Einstellung prüfen, Plan erzeugen.
// Kein Server: Android weckt die App zu festen Uhrzeiten. Ob das Ziel schon erreicht ist, kann die
// Benachrichtigung nicht wissen; der Text fragt deshalb nach, statt zu mahnen.

const UHRZEIT = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const STANDARD_ERINNERUNGEN = {
  wasser: { an: false, zeiten: ['10:00', '13:00', '16:00', '19:00'] },
  supplements: { an: false, zeit: '08:00' },
  checkin: { an: false, zeit: '21:00' },
};

/** Feste Kennungen je Erinnerung: Beim Neuplanen werden genau diese gelöscht und neu gesetzt. */
export const ERINNERUNG_IDS = { wasser: [1001, 1002, 1003, 1004, 1005, 1006], supplements: [1101], checkin: [1201] };
export const ALLE_IDS = Object.values(ERINNERUNG_IDS).flat();

const gueltigeZeit = (z, standard) => (typeof z === 'string' && UHRZEIT.test(z) ? z : standard);

/** Gespeicherte Einstellung prüfen; Unbekanntes fällt auf Startwerte, höchstens 6 Wasser-Zeiten, sortiert, ohne Doppelte. */
export function bereinigeErinnerungen(roh) {
  const s = STANDARD_ERINNERUNGEN;
  const zeiten = Array.isArray(roh?.wasser?.zeiten) ? roh.wasser.zeiten.filter((z) => UHRZEIT.test(z)) : s.wasser.zeiten;
  return {
    wasser: { an: roh?.wasser?.an === true, zeiten: [...new Set(zeiten)].sort().slice(0, 6) },
    supplements: { an: roh?.supplements?.an === true, zeit: gueltigeZeit(roh?.supplements?.zeit, s.supplements.zeit) },
    checkin: { an: roh?.checkin?.an === true, zeit: gueltigeZeit(roh?.checkin?.zeit, s.checkin.zeit) },
  };
}

const teile = (zeit) => { const [stunde, minute] = zeit.split(':').map(Number); return { stunde, minute }; };

/** Täglich wiederkehrende Benachrichtigungen: [{ id, titel, text, stunde, minute }] */
export function planeErinnerungen(einstellung) {
  const e = bereinigeErinnerungen(einstellung);
  const plan = [];
  if (e.wasser.an) e.wasser.zeiten.forEach((z, i) => plan.push({ id: ERINNERUNG_IDS.wasser[i], titel: 'Wasser', text: 'Schon etwas getrunken? Ein Tipp auf den Wasser-Ring reicht.', ...teile(z) }));
  if (e.supplements.an) plan.push({ id: ERINNERUNG_IDS.supplements[0], titel: 'Supplements', text: 'Zeit für deine Supplements. Abhaken geht auf „Heute“.', ...teile(e.supplements.zeit) });
  if (e.checkin.an) plan.push({ id: ERINNERUNG_IDS.checkin[0], titel: 'Wie war dein Tag?', text: 'Energie, Stimmung, Stress: drei Tipps auf „Heute“.', ...teile(e.checkin.zeit) });
  return plan;
}

/** "Wasser 4×, Supplements 08:00" oder "Aus" für die Zeile im Menü */
export function erinnerungenText(einstellung) {
  const e = bereinigeErinnerungen(einstellung);
  const teileText = [
    e.wasser.an ? `Wasser ${e.wasser.zeiten.length}×` : null,
    e.supplements.an ? `Supplements ${e.supplements.zeit}` : null,
    e.checkin.an ? `Check-in ${e.checkin.zeit}` : null,
  ].filter(Boolean);
  return teileText.length ? teileText.join(', ') : 'Aus';
}
