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
}

/** Tagesdaten; neue Tage starten mit getrunkenem Morning Stack und leerer Supplement-Checkliste. */
export async function holeTag(schluessel) {
  const neu = { datum: schluessel, morningStackGenommen: true, supplements: {}, wasser: [] };
  return { ...neu, ...(await lese('tage', schluessel)) };
}

export const speichereTag = (tag) => schreibe('tage', tag.datum, tag);
