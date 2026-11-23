// Geteilte Inhalte aus TikTok, Instagram, YouTube und anderen Apps (P5). Reine Funktionen.
// Elan ruft keine dieser Seiten ab und lädt nichts herunter: Verarbeitet wird nur, was Android beim Teilen übergibt
// (Link und, je nach App, die Bildunterschrift).

const PLATTFORMEN = [
  { id: 'tiktok', name: 'TikTok', hosts: ['tiktok.com'] },
  { id: 'instagram', name: 'Instagram', hosts: ['instagram.com'] },
  { id: 'youtube', name: 'YouTube', hosts: ['youtube.com', 'youtu.be'] },
  { id: 'pinterest', name: 'Pinterest', hosts: ['pinterest.com', 'pinterest.de', 'pin.it'] },
  { id: 'facebook', name: 'Facebook', hosts: ['facebook.com', 'fb.watch'] },
];

const LINK = /https?:\/\/[^\s<>"]+/gi;

/** Plattform am Hostnamen erkennen ("vm.tiktok.com" → TikTok). Unbekannte Seiten: { id: 'andere' } */
export function plattformVon(url) {
  let host;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return null; }
  const treffer = PLATTFORMEN.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`)));
  return treffer ? { id: treffer.id, name: treffer.name } : { id: 'andere', name: host.replace(/^www\./, '') };
}

/**
 * Geteilten Inhalt zerlegen: erster Link, Plattform, übriger Text.
 * Liefert { link, plattform, text, nurLink } – nurLink heißt: außer dem Link steht (fast) nichts da, also wohl ein reines Video.
 */
export function ordneGeteiltesEin(roh) {
  const eingabe = String(roh ?? '').trim();
  const links = eingabe.match(LINK) ?? [];
  // Satzzeichen am Ende gehören nicht zum Link ("… hier: https://…/123.")
  const link = links[0]?.replace(/[).,;!?]+$/, '') ?? null;
  const text = eingabe.replace(LINK, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const nurLink = Boolean(link) && text.replace(/[^\p{L}\p{N}]/gu, '').length < 20;
  return { link, plattform: link ? plattformVon(link) : null, text, nurLink };
}

// Emojis und Aufzählungszeichen am Zeilenanfang ("🥣 2 EL Honig", "▪️ 200 g Mehl", "✅ Schritt 1")
const ZEILENANFANG = /^[\s\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}▪▫•◾◽▸►➡→✔✓☑️\-–*·]+/u;

/**
 * Bildunterschrift für den Rezept-Leser aufräumen: Hashtag-Zeilen und Hashtags am Zeilenende weg,
 * Emojis vor Zeilen weg, "Zutaten 👇" und "Zutaten (für 2 Personen):" als Überschrift "Zutaten".
 * Was nicht nach Rezept aussieht, bleibt stehen; der Leser entscheidet danach wie bei jedem Text.
 */
export function bereinigeBildunterschrift(text) {
  return String(text ?? '')
    .split('\n')
    .map((zeile) => zeile.replace(ZEILENANFANG, '').replace(/(\s#[\p{L}\p{N}_]+)+\s*$/u, '').replace(/[\p{Extended_Pictographic}\u{FE0F}]+/gu, ' ').replace(/\s{2,}/g, ' ').trim())
    .filter((zeile) => zeile && !/^(#[\p{L}\p{N}_]+\s*)+$/u.test(zeile))
    .map((zeile) => {
      if (/^(zutaten|du brauchst|das brauchst du|ingredients)\b[^:]*:?$/i.test(zeile)) return 'Zutaten';
      if (/^(zubereitung|so geht'?s|anleitung|steps|instructions)\b[^:]*:?$/i.test(zeile)) return 'Zubereitung';
      return zeile;
    })
    .join('\n');
}
