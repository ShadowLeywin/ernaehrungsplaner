// Aktuelles Profil: einmal aus IndexedDB laden, danach aus dem Speicher.
import { lese, schreibe } from './db.js';
import { standardProfil, vervollstaendigeProfil } from './logic/profil.js';

let profil;

/** Liefert eine Kopie, damit Ansichten das gespeicherte Profil nicht versehentlich verändern. */
export async function holeProfil() {
  if (!profil) {
    const gespeichert = await lese('einstellungen', 'profil');
    profil = gespeichert ? vervollstaendigeProfil(gespeichert) : standardProfil();
  }
  return structuredClone(profil);
}

export async function speichereProfil(neu) {
  await schreibe('einstellungen', 'profil', neu);
  profil = structuredClone(neu);
  eingerichtet = true;
}

// Gibt es schon ein gespeichertes Profil? Sonst startet die Ersteinrichtung.
let eingerichtet = false;
export async function pruefeEinrichtung() {
  eingerichtet = Boolean(await lese('einstellungen', 'profil'));
  return eingerichtet;
}
export const istEingerichtet = () => eingerichtet;

/** Tagesdaten; neue Tage starten mit getrunkenem Morning Stack und leerer Supplement-Checkliste. */
export async function holeTag(schluessel) {
  const neu = { datum: schluessel, morningStackGenommen: true, supplements: {}, wasser: [], eintraege: [], trainings: [] };
  return { ...neu, ...(await lese('tage', schluessel)) };
}

export const holeTage = (schluesselListe) => Promise.all(schluesselListe.map(holeTag));

// Beobachter, z. B. für die Erfolgsprüfung (main.js registriert sie – vermeidet zyklische Importe)
const beobachter = [];
export const beiTagGespeichert = (fn) => beobachter.push(fn);

export async function speichereTag(tag) {
  await schreibe('tage', tag.datum, tag);
  beobachter.forEach((fn) => fn(tag));
}
