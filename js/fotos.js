// Fortschrittsfotos: nur lokal in IndexedDB (Speicher „fotos“), verkleinert auf max. 1080 px als JPEG.
// Bewusst NICHT im normalen Backup (Größe) – eigener Export über „Fotos sichern“.
import { schreibe, alleEintraege, loesche } from './db.js';

const MAX_KANTE = 1080;

/** Bilddatei verkleinern und als JPEG-Blob liefern. */
export async function verkleinere(datei) {
  const bild = await createImageBitmap(datei);
  const faktor = Math.min(1, MAX_KANTE / Math.max(bild.width, bild.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bild.width * faktor);
  canvas.height = Math.round(bild.height * faktor);
  canvas.getContext('2d').drawImage(bild, 0, 0, canvas.width, canvas.height);
  return new Promise((aufloesen) => canvas.toBlob(aufloesen, 'image/jpeg', 0.82));
}

export async function speichereFoto(datei, datum, pose) {
  const blob = await verkleinere(datei);
  const id = `${datum}-${pose}-${Date.now().toString(36)}`;
  await schreibe('fotos', id, { id, datum, pose, blob });
  return id;
}

/** Alle Fotos, neueste zuerst. */
export async function holeFotos() {
  return (await alleEintraege('fotos')).map(([, f]) => f).sort((a, b) => b.datum.localeCompare(a.datum));
}

export const loescheFoto = (id) => loesche('fotos', id);
