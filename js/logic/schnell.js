// Schnelleintrag: zuletzt gegessen, Favoriten, Mahlzeit kopieren, Mahlzeiten-Vorlagen (reine Funktionen).
// Gespeichert in einstellungen: zuletzt [{ id, gramm, zeit }], favoriten [id], mahlzeitVorlagen [{ id, name, posten }]

export const MAX_ZULETZT = 30;

/** Neues Lebensmittel vorn einreihen, Doppelte entfernen, Länge begrenzen. */
export function merkeZuletzt(liste, id, gramm, jetzt = new Date()) {
  return [{ id, gramm, zeit: jetzt.toISOString() }, ...(liste ?? []).filter((x) => x.id !== id)].slice(0, MAX_ZULETZT);
}

export function schalteFavorit(favoriten, id) {
  const menge = new Set(favoriten ?? []);
  if (menge.has(id)) menge.delete(id); else menge.add(id);
  return [...menge];
}

/** Einträge einer Mahlzeit als neue Einträge (z. B. von gestern), nur mit Menge. */
export function kopiereMahlzeit(quellTag, mahlzeitId, zielMahlzeitId, neueId, jetzt = new Date()) {
  return (quellTag?.eintraege ?? [])
    .filter((e) => e.mahlzeit === mahlzeitId && e.gramm > 0)
    .map((e) => ({ id: neueId(), mahlzeit: zielMahlzeitId, lebensmittelId: e.lebensmittelId, gramm: e.gramm, zeit: jetzt.toISOString() }));
}

/** Mahlzeit als Vorlage merken. */
export function vorlageAusMahlzeit(tag, mahlzeitId, id, name) {
  const posten = tag.eintraege.filter((e) => e.mahlzeit === mahlzeitId && e.gramm > 0).map((e) => ({ lebensmittelId: e.lebensmittelId, gramm: e.gramm }));
  return posten.length ? { id, name: name.trim().slice(0, 50) || 'Vorlage', posten } : null;
}

export function eintraegeAusVorlage(vorlage, mahlzeitId, neueId, jetzt = new Date()) {
  return vorlage.posten.map((p) => ({ id: neueId(), mahlzeit: mahlzeitId, lebensmittelId: p.lebensmittelId, gramm: p.gramm, zeit: jetzt.toISOString() }));
}
