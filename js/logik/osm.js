// Märkte aus OpenStreetMap über Overpass. Reine Funktionen: Abfrage bauen, Antwort lesen.
// Abgefragt wird nur auf Knopfdruck und nur mit dem eingegebenen Ort; Elan kennt keinen Standort (Léons Entscheidung E3.1).
// Daten © OpenStreetMap-Mitwirkende, ODbL: Die Ansicht zeigt den Hinweis mit Link.

export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
/**
 * Öffentliche Overpass-Server in der Reihenfolge, in der Elan sie fragt. Der zweite springt ein, wenn der erste
 * nicht antwortet oder ausgelastet ist [vermutet: beide als öffentliche Instanzen im OSM-Wiki gelistet, 23.11.2026].
 */
export const OVERPASS_SERVER = [OVERPASS_URL, 'https://overpass.private.coffee/api/interpreter'];
export const OSM_HINWEIS = '© OpenStreetMap-Mitwirkende';
export const OSM_LIZENZ_URL = 'https://www.openstreetmap.org/copyright';
export const MAX_TREFFER = 100;

/** Läden, in denen man Lebensmittel oder Drogerieartikel kauft */
const LADEN_ARTEN = { supermarket: 'Supermarkt', convenience: 'Laden', chemist: 'Drogerie', greengrocer: 'Obst und Gemüse', butcher: 'Metzgerei', bakery: 'Bäckerei', organic: 'Bioladen' };

/** Eingabe prüfen: Postleitzahl (fünf Ziffern) oder Ortsname. Liefert { ok, fehler, ort: { art, wert } }. */
export function pruefeOrt(text) {
  const wert = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (/^\d{5}$/.test(wert)) return { ok: true, fehler: '', ort: { art: 'plz', wert } };
  if (/^\d+$/.test(wert)) return { ok: false, fehler: 'Eine Postleitzahl hat fünf Ziffern.' };
  if (wert.length < 2) return { ok: false, fehler: 'Ort oder Postleitzahl eingeben.' };
  if (wert.length > 60) return { ok: false, fehler: 'Höchstens 60 Zeichen.' };
  return { ok: true, fehler: '', ort: { art: 'name', wert } };
}

// In Overpass-QL stehen Werte in doppelten Anführungszeichen; Backslash und Anführungszeichen müssen maskiert werden
const ql = (text) => text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Overpass-Abfrage: PLZ-Gebiet oder deutsche Gemeinde (nach Name), darin alle Lebensmittelläden.
 * Gesucht wird direkt über die Merkmale der Grenze, nicht „innerhalb Deutschlands“: Das Gebiet ganz Deutschland
 * ist so groß, dass die Abfrage am Handy zu lange brauchte (Léons Test am 23.11.2026: keine Antwort).
 * Deutsche Gemeinden erkennt man am amtlichen Gemeindeschlüssel; so fällt ein gleichnamiger Ort in Österreich weg.
 * "out center" liefert für Gebäude (ways) einen Mittelpunkt, damit jeder Treffer Koordinaten hat.
 */
export function overpassAbfrage(ort) {
  const gebiet = ort.art === 'plz'
    ? `rel["boundary"="postal_code"]["postal_code"="${ql(ort.wert)}"]`
    : `rel["boundary"="administrative"]["name"="${ql(ort.wert)}"]["de:amtlicher_gemeindeschluessel"]`;
  return [
    '[out:json][timeout:25];',
    `${gebiet};`,
    'map_to_area->.ort;',
    `nwr["shop"~"^(${Object.keys(LADEN_ARTEN).join('|')})$"](area.ort);`,
    `out center tags ${MAX_TREFFER};`,
  ].join('\n');
}

export const overpassUrl = (ort, server = OVERPASS_URL) => `${server}?data=${encodeURIComponent(overpassAbfrage(ort))}`;

/**
 * Antwort eines Overpass-Servers deuten: { ok, daten } oder { ok: false, weiter, grund }.
 * weiter = true heißt: Der nächste Server darf es versuchen (ausgelastet, Zeitüberschreitung, Fehlerseite).
 * Overpass meldet Laufzeitfehler auch mit Status 200 im Feld "remark"; das zählt als Fehler.
 */
export function deuteOverpassAntwort(status, text) {
  const kurz = String(text ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (status === 429) return { ok: false, weiter: true, grund: 'Server ausgelastet (429)' };
  if (status === 504 || status === 503) return { ok: false, weiter: true, grund: `Server überlastet (${status})` };
  if (status < 200 || status >= 300) return { ok: false, weiter: true, grund: `Fehler ${status}${kurz ? `: ${kurz}` : ''}` };
  let daten;
  try { daten = JSON.parse(text); } catch { return { ok: false, weiter: true, grund: `keine gültige Antwort: ${kurz || 'leer'}` }; }
  if (typeof daten?.remark === 'string' && /error|timed out|runtime/i.test(daten.remark)) return { ok: false, weiter: true, grund: `Abfrage abgebrochen: ${daten.remark.slice(0, 120)}` };
  return { ok: true, daten };
}

/**
 * Antwort von Overpass in Märkte umwandeln: { id: 'osm:node/123', name, marke, art, strasse, plz, ort, lat, lon, quelle: 'osm' }.
 * Läden ohne Namen und ohne Kette werden übersprungen: "Supermarkt" allein hilft bei der Auswahl nicht.
 * Sortiert nach Ort, dann Name.
 */
export function leseOverpass(antwort) {
  const elemente = Array.isArray(antwort?.elements) ? antwort.elements : [];
  const gesehen = new Set();
  const maerkte = [];
  for (const e of elemente) {
    const t = e?.tags ?? {};
    const name = String(t.name ?? t.brand ?? '').trim();
    if (!name || !['node', 'way', 'relation'].includes(e.type) || !Number.isFinite(e.id)) continue;
    const id = `osm:${e.type}/${e.id}`;
    if (gesehen.has(id)) continue;
    gesehen.add(id);
    const lat = e.lat ?? e.center?.lat;
    const lon = e.lon ?? e.center?.lon;
    const markt = { id, name: name.slice(0, 60), art: LADEN_ARTEN[t.shop] ?? 'Laden', quelle: 'osm' };
    if (t.brand) markt.marke = String(t.brand).slice(0, 40);
    const strasse = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
    if (strasse) markt.strasse = strasse.slice(0, 80);
    if (t['addr:postcode']) markt.plz = String(t['addr:postcode']).slice(0, 10);
    if (t['addr:city']) markt.ort = String(t['addr:city']).slice(0, 60);
    if (Number.isFinite(lat) && Number.isFinite(lon)) Object.assign(markt, { lat, lon });
    maerkte.push(markt);
  }
  return maerkte
    .sort((a, b) => String(a.ort ?? '').localeCompare(String(b.ort ?? ''), 'de') || a.name.localeCompare(b.name, 'de'))
    .slice(0, MAX_TREFFER);
}

/** Eigener Markt von Hand: { name, ort }. Liefert { ok, fehler, markt } (ohne id). */
export function pruefeEigenerMarkt(eingabe) {
  const fehler = {};
  const name = String(eingabe.name ?? '').trim();
  if (!name) fehler.name = 'Wie heißt der Markt?';
  else if (name.length > 60) fehler.name = 'Höchstens 60 Zeichen.';
  const ort = String(eingabe.ort ?? '').trim().slice(0, 60);
  if (Object.keys(fehler).length) return { ok: false, fehler, markt: null };
  // Steht die Kette am Anfang ("Lidl Burgau"), passt ein Angebot "Lidl" später von selbst
  return { ok: true, fehler, markt: { name, marke: name.split(' ')[0], quelle: 'eigen', ...(ort ? { ort } : {}) } };
}

/** "Hauptstraße 5, 89331 Burgau" */
export function adresseText(m) {
  return [m.strasse, [m.plz, m.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}
