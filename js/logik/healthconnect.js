// Werte aus Health Connect (Android) in Elans Messungen umrechnen. Reine Funktionen.
// Gelesen werden nur Schritte, Gewicht und Schlaf. Eigene Eingaben in Elan haben immer Vorrang:
// Ein Wert aus Health Connect ersetzt nur einen leeren Tag oder einen früheren Wert aus Health Connect.

/** Gelesene Arten und ihre Namen in Health Connect (Plugin @capgo/capacitor-health). */
export const HC_ARTEN = [
  { hc: 'steps', art: 'schritte', name: 'Schritte' },
  { hc: 'weight', art: 'gewicht', name: 'Gewicht' },
  { hc: 'sleep', art: 'schlaf', name: 'Schlaf' },
];

export const QUELLE_HC = 'healthconnect';

const zwei = (n) => String(n).padStart(2, '0');
/** Kalendertag in der Zeitzone des Geräts: "2026-11-15" */
export const lokalerTag = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`; };

const gerundet = (wert, stellen) => Math.round(wert * 10 ** stellen) / 10 ** stellen;

/** Schritte: Tagessummen (aggregiert) → je Tag ein Wert. Tage mit 0 Schritten fallen weg (meist nur „kein Gerät“). */
export function schritteJeTag(tagesSummen) {
  const jeTag = new Map();
  for (const s of tagesSummen ?? []) {
    if (!(s?.value > 0)) continue;
    const tag = lokalerTag(s.startDate);
    jeTag.set(tag, (jeTag.get(tag) ?? 0) + s.value);
  }
  return [...jeTag].map(([datum, wert]) => ({ art: 'schritte', datum, wert: Math.round(wert) }));
}

/** Gewicht: je Tag die letzte Messung, in kg mit einer Stelle. */
export function gewichtJeTag(proben) {
  const jeTag = new Map();
  for (const p of proben ?? []) {
    if (!(p?.value > 0)) continue;
    const kg = p.unit === 'gram' ? p.value / 1000 : p.value;
    const tag = lokalerTag(p.startDate);
    const alt = jeTag.get(tag);
    if (!alt || p.startDate > alt.zeit) jeTag.set(tag, { zeit: p.startDate, kg });
  }
  return [...jeTag].map(([datum, { kg }]) => ({ art: 'gewicht', datum, wert: gerundet(kg, 1) }));
}

/**
 * Schlaf: Dauer der Schlafphasen je Nacht, dem Tag des Aufwachens zugeordnet, in Stunden mit einer Stelle.
 * „Wach“ und „im Bett“ zählen nicht. Die Dauer kommt aus Start und Ende, nicht aus value (Einheit je Gerät verschieden).
 */
export function schlafJeNacht(proben) {
  const jeTag = new Map();
  for (const p of proben ?? []) {
    if (p?.sleepState === 'awake' || p?.sleepState === 'inBed') continue;
    const minuten = (new Date(p.endDate) - new Date(p.startDate)) / 60000;
    if (!(minuten > 0)) continue;
    const tag = lokalerTag(p.endDate);
    jeTag.set(tag, (jeTag.get(tag) ?? 0) + minuten);
  }
  return [...jeTag].map(([datum, minuten]) => ({ art: 'schlaf', datum, wert: gerundet(minuten / 60, 1) }));
}

/**
 * Welche gelesenen Werte gespeichert werden: nur Tage ohne eigenen Wert, und nur wenn sich etwas ändert.
 * vorhandene: Messungen aus Elan ({ art, datum, wert, quelle? }). Liefert die zu speichernden Werte mit quelle.
 */
export function zuUebernehmen(vorhandene, gelesene) {
  const schon = new Map((vorhandene ?? []).map((m) => [`${m.art}|${m.datum}`, m]));
  return (gelesene ?? []).filter((g) => {
    const alt = schon.get(`${g.art}|${g.datum}`);
    if (!alt) return true;
    return alt.quelle === QUELLE_HC && alt.wert !== g.wert;
  }).map((g) => ({ ...g, quelle: QUELLE_HC }));
}
