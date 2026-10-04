// Spiel-Ebene zur Laufzeit: lädt alle Daten, berechnet Spielstand, Ränge, Werte, Level und Erfolge
// und lässt Brom neue Erfolge verkünden. Rechenlogik liegt in js/logic/ (getestet).
import { alleEintraege, lese, schreibe } from './db.js';
import { holeProfil } from './state.js';
import { holeLebensmittel } from './lebensmittel.js';
import { UEBUNGEN } from './daten/uebungen.js';
import { uebungsVerzeichnis } from './logic/training.js';
import { gewichtsReihe } from './logic/gewicht.js';
import { sammleStatistik } from './logic/spielstand.js';
import { berechneRaenge } from './logic/raenge.js';
import { bewerteAlle, erfolgsXp, neueErfolge, stufenStand, STUFEN } from './logic/erfolge.js';
import { berechneWerte, berechneXp, levelAus, bestimmeKlasse } from './logic/charakter.js';
import { zeigeHerold, heroldSatz } from './views/brom.js';
import { tagesKennzahlen } from './logic/tageswerte.js';
import { verdient, kontostand, leeresLager, bauXp } from './logic/lagerbau.js';
import { alleBelohnungen, auftragsStand, bossStand, gruppiere } from './logic/auftraege.js';
import { datumSchluessel } from './logic/ziele.js';
import { montagVon } from './logic/fortschritt.js';
import { episch } from './darstellung.js';

export const verzeichnis = uebungsVerzeichnis(UEBUNGEN);

export async function ladeSpielstand() {
  const [eintraege, profil, daten, gespeichertesLager] = await Promise.all([alleEintraege('tage'), holeProfil(), holeLebensmittel(), lese('einstellungen', 'lager')]);
  const lager = { ...leeresLager(), ...gespeichertesLager };
  const tage = eintraege.map(([, t]) => t);
  const reihe = gewichtsReihe(tage);
  const kgKoerper = reihe.at(-1)?.kg ?? profil.koerper.gewichtKg ?? 75;
  const geschlecht = profil.koerper.geschlecht ?? 'm';
  const st = sammleStatistik({ tage, profil, lebensmittel: daten.lebensmittel, verzeichnis, kgKoerper });
  const raenge = berechneRaenge(tage, verzeichnis, kgKoerper, geschlecht);
  const bewertungen = bewerteAlle(st);
  const werte = berechneWerte(st, raenge);
  // Wirtschaft: Erz und Glut aus den Tagen, Belohnungen aus Aufträgen und Bossen, abzüglich Ausgaben
  const kennzahlen = tage.map((t) => tagesKennzahlen(t, { profil, lebensmittel: daten.lebensmittel }));
  const belohnungen = alleBelohnungen(kennzahlen, profil);
  const konto = kontostand(verdient(kennzahlen), belohnungen, lager);
  const { wochen, monate } = gruppiere(kennzahlen);
  const montag = datumSchluessel(montagVon(new Date()));
  const monat = datumSchluessel(new Date()).slice(0, 7);
  const xp = berechneXp(st, erfolgsXp(bewertungen) + belohnungen.xp + bauXp(lager));
  return {
    profil, tage, kgKoerper, geschlecht, st, raenge, bewertungen, werte, xp, lager, konto, belohnungen, kennzahlen,
    auftraege: auftragsStand(montag, profil, wochen.get(montag) ?? []),
    boss: bossStand(monat, monate),
    level: levelAus(xp),
    klasse: bestimmeKlasse(werte),
  };
}

let pruefTimer = null;

/** Nach Änderungen aufrufen: prüft (verzögert) auf neue Erfolge und Level und verkündet sie. */
export function pruefeSpaeter(ms = 1200) {
  clearTimeout(pruefTimer);
  pruefTimer = setTimeout(() => pruefeErfolge().catch((f) => console.warn('Erfolgsprüfung:', f)), ms);
}

export async function pruefeErfolge() {
  const stand = await ladeSpielstand();
  const gesehen = await lese('einstellungen', 'erfolgeGesehen');
  const aktuell = stufenStand(stand.bewertungen);
  if (!gesehen) {
    // Erster Start der Erfolge: Vergangenes nicht einzeln ausrufen, nur zusammenfassen
    await schreibe('einstellungen', 'erfolgeGesehen', { stufen: aktuell, level: stand.level.level });
    const anzahl = Object.keys(aktuell).length;
    if (anzahl) {
      zeigeHerold([{ text: episch(`Willkommen in der Halle der Taten! ${anzahl} Erfolge aus deiner Vergangenheit sind verzeichnet. Du stehst auf Stufe ${stand.level.level}.`, `${anzahl} Erfolge aus deinen bisherigen Daten freigeschaltet.`) }]);
    }
    return;
  }
  const neu = neueErfolge(stand.bewertungen, gesehen.stufen ?? {});
  const meldungen = neu.map((b, i) => ({
    text: heroldSatz(episch(b.erfolg.name, b.erfolg.schlicht), b.erfolg.geheim ? 'Geheim' : STUFEN[b.stufe].name, i),
    farbe: b.erfolg.geheim ? '#b18cff' : STUFEN[b.stufe].farbe,
  }));
  if (stand.level.level > (gesehen.level ?? 1)) {
    meldungen.unshift({ text: episch(`Bei Bart und Amboss – du bist nun Stufe ${stand.level.level}!`, `Level ${stand.level.level} erreicht.`), farbe: 'var(--akzent)' });
  }
  if (meldungen.length) {
    await schreibe('einstellungen', 'erfolgeGesehen', { stufen: { ...gesehen.stufen, ...aktuell }, level: Math.max(stand.level.level, gesehen.level ?? 1) });
    zeigeHerold(meldungen);
  }
}
