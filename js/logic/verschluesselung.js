// Backup mit Passwort verschlüsseln: AES-GCM 256, Schlüssel per PBKDF2-SHA256 aus dem Passwort.
// Läuft komplett lokal (Web Crypto, auch in Node verfügbar). Ohne Passwort ist die Datei nicht lesbar –
// ein vergessenes Passwort kann niemand wiederherstellen.

export const ITERATIONEN = 310000;
const text = new TextEncoder();
const zuText = new TextDecoder();

// In Blöcken umwandeln – bei großen Backups würde String.fromCharCode(...alles) den Stack sprengen
function zuBase64(bytes) {
  const b = new Uint8Array(bytes);
  let binaer = '';
  for (let i = 0; i < b.length; i += 0x8000) binaer += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(binaer);
}
const ausBase64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function schluessel(passwort, salt, iterationen) {
  const roh = await crypto.subtle.importKey('raw', text.encode(passwort), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iterationen },
    roh, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

/** Klartext → Hülle { app, verschluesselt: true, kdf, iterationen, salt, iv, daten } */
export async function verschluessele(klartext, passwort, app) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await schluessel(passwort, salt, ITERATIONEN);
  const daten = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, text.encode(klartext));
  return { app, verschluesselt: true, kdf: 'PBKDF2-SHA256', iterationen: ITERATIONEN, salt: zuBase64(salt), iv: zuBase64(iv), daten: zuBase64(daten) };
}

export const istVerschluesselt = (obj) => obj?.verschluesselt === true && typeof obj.daten === 'string';

/** Hülle → Klartext. Wirft bei falschem Passwort einen Fehler. */
export async function entschluessele(huelle, passwort) {
  const k = await schluessel(passwort, ausBase64(huelle.salt), huelle.iterationen ?? ITERATIONEN);
  try {
    const klar = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ausBase64(huelle.iv) }, k, ausBase64(huelle.daten));
    return zuText.decode(klar);
  } catch {
    throw new Error('Falsches Passwort oder beschädigte Datei.');
  }
}
