// Rückblick für einen Zeitraum (Monat, Jahr): „Dein Jahr in der Schmiede“ (reine Funktionen).
import { alleTrainings, eintragsLeistung } from './fortschritt.js';
import { dauerMin } from './training.js';
import { laengsteFolge } from './spielstand.js';
import { istAktiv } from './feuer.js';

/**
 * tage, kennzahlen (tagesKennzahlen je Tag), von/bis als Datumsschlüssel (inklusive).
 * Liefert Kennzahlen, Lieblinge und Highlights; null, wenn nichts im Zeitraum liegt.
 */
export function rueckblick({ tage, kennzahlen, von, bis, verzeichnis, lebensmittel }) {
  const imZeitraum = (d) => d >= von && d <= bis;
  const t = tage.filter((x) => imZeitraum(x.datum));
  const k = kennzahlen.filter((x) => imZeitraum(x.datum));
  if (!t.some(istAktiv)) return null;
  const trainings = alleTrainings(t);
  let tonnen = 0;
  let saetze = 0;
  const uebungZaehler = new Map();
  for (const { t: tr } of trainings) {
    for (const e of tr.uebungen ?? []) {
      const l = eintragsLeistung(e, verzeichnis.get(e.uebungId));
      if (!l) continue;
      saetze += l.saetze;
      tonnen += l.volumen / 1000;
      uebungZaehler.set(e.uebungId, (uebungZaehler.get(e.uebungId) ?? 0) + 1);
    }
  }
  const essenZaehler = new Map();
  for (const tag of t) {
    for (const e of tag.eintraege ?? []) if (e.gramm > 0) essenZaehler.set(e.lebensmittelId, (essenZaehler.get(e.lebensmittelId) ?? 0) + 1);
  }
  const top = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  const gewichte = t.filter((x) => x.gewichtKg).sort((a, b) => a.datum.localeCompare(b.datum));
  const nachId = new Map(lebensmittel.map((l) => [l.id, l]));
  return {
    aktiveTage: t.filter(istAktiv).length,
    laengsteSerie: laengsteFolge(t.filter(istAktiv).map((x) => x.datum)),
    workouts: trainings.filter((x) => x.t.typ === 'workout').length,
    aktivitaeten: trainings.filter((x) => x.t.typ === 'aktivitaet').length,
    trainingsStunden: Math.round(trainings.reduce((s, x) => s + dauerMin(x.t), 0) / 6) / 10,
    saetze,
    tonnen: Math.round(tonnen * 10) / 10,
    rekorde: trainings.reduce((s, x) => s + (x.t.rekorde?.length ?? 0), 0),
    km: Math.round(trainings.reduce((s, x) => s + (x.t.km ?? 0), 0) * 10) / 10,
    erfassteTage: k.filter((x) => x.geloggt).length,
    proteinTage: k.filter((x) => x.protein).length,
    wasserTage: k.filter((x) => x.wasser).length,
    gewicht: gewichte.length >= 2 ? { von: gewichte[0].gewichtKg, bis: gewichte.at(-1).gewichtKg } : null,
    lieblingsUebungen: top(uebungZaehler, 3).map(([id, n]) => ({ name: verzeichnis.get(id)?.name ?? id, anzahl: n })),
    lieblingsEssen: top(essenZaehler, 5).map(([id, n]) => ({ name: nachId.get(id)?.name ?? id, anzahl: n })),
  };
}
