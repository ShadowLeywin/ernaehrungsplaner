// Meine Mahlzeiten: eine Mahlzeit (z. B. das übliche Frühstück) als Vorlage merken und später mit einem Tipp
// eintragen. Reine Funktionen. Gespeichert als Einstellung „vorlagen“ (keine neue Schema-Version, im Backup dabei).

import { summeEintraege } from './naehrwerte.js';

export const MAX_VORLAGEN = 50;
const MAX_TEILE = 30;

const text = (wert, max) => String(wert ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
const istZahl = (wert) => typeof wert === 'number' && Number.isFinite(wert);

/** Ein Teil der Vorlage: nur, was zum Wiedereintragen nötig ist (kein Datum, keine Mahlzeit, keine Kennung) */
function teil(e) {
  if (!e || !text(e.name, 80) || !istZahl(e.gramm) || e.gramm <= 0 || !e.je100 || !istZahl(e.je100.kcal)) return null;
  const t = { name: text(e.name, 80), marke: text(e.marke, 60), gramm: e.gramm, je100: { ...e.je100 } };
  if (e.zutatId) t.zutatId = e.zutatId;
  if (e.rezeptId) t.rezeptId = e.rezeptId;
  if (e.schnell) t.schnell = true;
  return t;
}

/** Name prüfen: nicht leer, nicht doppelt (ohne Groß- und Kleinschreibung). Ergebnis { ok, name } oder { ok: false, fehler } */
export function pruefeVorlagenName(name, vorlagen, eigeneId = null) {
  const sauber = text(name, 40);
  if (!sauber) return { ok: false, fehler: 'Gib der Mahlzeit einen Namen.' };
  if (vorlagen.some((v) => v.id !== eigeneId && v.name.toLocaleLowerCase('de') === sauber.toLocaleLowerCase('de'))) return { ok: false, fehler: `„${sauber}“ gibt es schon.` };
  return { ok: true, name: sauber };
}

/** Vorlage aus den Einträgen einer Mahlzeit. id kommt von außen (Zufall), damit die Funktion rein bleibt */
export function vorlageAus(eintraege, name, id) {
  const teile = eintraege.map(teil).filter(Boolean).slice(0, MAX_TEILE);
  return teile.length ? { id, name: text(name, 40), teile } : null;
}

/** Gespeicherte Liste prüfen: Unbrauchbares fällt weg, höchstens MAX_VORLAGEN, Reihenfolge bleibt (neueste zuerst) */
export function bereinigeVorlagen(roh) {
  return (Array.isArray(roh) ? roh : [])
    .map((v) => (v && text(v.id, 60) && text(v.name, 40) ? { id: text(v.id, 60), name: text(v.name, 40), teile: (Array.isArray(v.teile) ? v.teile : []).map(teil).filter(Boolean).slice(0, MAX_TEILE) } : null))
    .filter((v) => v && v.teile.length)
    .slice(0, MAX_VORLAGEN);
}

/** Vorlage als neue Einträge für Tag und Mahlzeit */
export const vorlageEintraege = (vorlage, datum, slot) => vorlage.teile.map((t) => ({ ...t, je100: { ...t.je100 }, datum, slot }));

/** Für die Zeile im Blatt: „3 Teile, 520 kcal“ */
export function vorlageText(vorlage) {
  const kcal = Math.round(summeEintraege(vorlage.teile).kcal ?? 0);
  const n = vorlage.teile.length;
  return `${n} ${n === 1 ? 'Teil' : 'Teile'}, ${kcal.toLocaleString('de-DE')} kcal`;
}

/** Im Wochenplan nur Vorlagen ohne Schnell-Einträge: Posten ohne Zutat passen nicht auf die Einkaufsliste */
export const fuerPlanGeeignet = (vorlage) => vorlage.teile.every((t) => !t.schnell && t.zutatId);
