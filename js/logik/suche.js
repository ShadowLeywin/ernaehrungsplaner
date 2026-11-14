// Suche in der Zutatenliste. Reine Funktionen.

/** Text vergleichbar machen: klein, ohne Umlaut-Unterschiede ("Käse" = "kaese" = "kase"). */
export function normalisiere(text) {
  return String(text ?? '')
    .toLowerCase()
    .replaceAll('ß', 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Zutaten nach einem Suchbegriff filtern und sortieren.
 * Jedes Wort des Begriffs muss in Name oder Marke vorkommen.
 * Reihenfolge: Name beginnt mit dem Begriff, dann ein Wort beginnt damit, dann der Rest.
 */
export function sucheZutaten(zutaten, begriff, limit = 60) {
  const frage = normalisiere(begriff);
  const alphabetisch = (a, b) => a.name.localeCompare(b.name, 'de');
  if (!frage) return [...zutaten].sort(alphabetisch).slice(0, limit);

  const woerter = frage.split(' ');
  const treffer = [];
  for (const zutat of zutaten) {
    const name = normalisiere(zutat.name);
    const alles = zutat.marke ? `${name} ${normalisiere(zutat.marke)}` : name;
    if (!woerter.every((w) => alles.includes(w))) continue;
    let rang = 2;
    if (name.startsWith(frage)) rang = 0;
    else if (name.split(' ').some((w) => w.startsWith(woerter[0]))) rang = 1;
    treffer.push({ zutat, rang, laenge: name.length });
  }
  treffer.sort((a, b) => a.rang - b.rang || a.laenge - b.laenge || alphabetisch(a.zutat, b.zutat));
  return treffer.slice(0, limit).map((t) => t.zutat);
}

/** Die zuletzt eingetragenen Zutaten, jede nur einmal, neueste zuerst. */
export function zuletztVerwendet(eintraege, limit = 8) {
  const gesehen = new Set();
  const ids = [];
  const sortiert = [...eintraege].sort((a, b) => String(b.erstellt).localeCompare(String(a.erstellt)));
  for (const e of sortiert) {
    if (!e.zutatId || gesehen.has(e.zutatId)) continue;
    gesehen.add(e.zutatId);
    ids.push(e.zutatId);
    if (ids.length >= limit) break;
  }
  return ids;
}
