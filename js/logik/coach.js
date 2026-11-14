// Coach-Export: ein kompakter Wochenbericht als Text, den der Nutzer selbst in einen Chat kopiert.
// Reine Funktion. Die App sendet den Bericht nirgendwohin.

import { ausIso, formatTag } from './datum.js';
import { gewichtsTrend } from './gesundheit.js';
import { summeEintraege } from './naehrwerte.js';
import { TAGESTYPEN, tagestypFuer } from './ziele.js';

const z = (wert, stellen = 0) => wert.toLocaleString('de-DE', { maximumFractionDigits: stellen });
const KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const tagKurz = (datum, i) => `${KURZ[i]} ${datum.slice(8, 10)}.${datum.slice(5, 7)}.`;
const vorzeichen = (wert, stellen = 1) => `${wert > 0 ? '+' : wert < 0 ? '−' : '±'}${z(Math.abs(wert), stellen)}`;
const schnitt = (werte) => (werte.length ? werte.reduce((a, b) => a + b, 0) / werte.length : null);

/**
 * tage: sieben Daten Montag bis Sonntag. stichtag: letzter Tag, der schon vorbei ist (heute oder der Sonntag).
 * eintraege, messungen, symptome: Daten der Woche (messungen dürfen weiter zurückreichen, für den Gewichtstrend).
 * tagSaetze: Map datum → Satz aus dem Speicher tage. Liefert den Bericht als Text.
 */
export function coachBericht({ tage, stichtag, eintraege, ziele, wochenplan, tagSaetze, messungen, gesundheit, symptome, supplements }) {
  const zeilen = [`Wochenbericht ${formatTag(tage[0])} bis ${formatTag(tage[6])} ${ausIso(tage[6]).getFullYear()}`, ''];
  const jeTag = tage.map((datum) => {
    const liste = eintraege.filter((e) => e.datum === datum);
    const typ = tagestypFuer(datum, wochenplan, tagSaetze.get(datum));
    return { datum, typ, ziel: ziele[typ], liste, summe: summeEintraege(liste) };
  });
  const mitEintrag = jeTag.filter((t) => t.liste.length);

  /* Ernährung */
  zeilen.push('ERNÄHRUNG');
  if (!mitEintrag.length) {
    zeilen.push('Keine Einträge in dieser Woche.');
  } else {
    zeilen.push(`Schnitt je Tag aus ${mitEintrag.length} ${mitEintrag.length === 1 ? 'Tag' : 'Tagen'} mit Einträgen, in Klammern das Ziel dieser Tage:`);
    const felder = [['kcal', 'Energie', 'kcal'], ['protein', 'Eiweiß', 'g'], ['kh', 'Kohlenhydrate', 'g'], ['fett', 'Fett', 'g'], ['ballaststoffe', 'Ballaststoffe', 'g']];
    for (const [id, name, einheit] of felder) {
      zeilen.push(`- ${name}: ${z(schnitt(mitEintrag.map((t) => t.summe[id] ?? 0)))} ${einheit} (${z(schnitt(mitEintrag.map((t) => t.ziel[id])))})`);
    }
    zeilen.push('', 'Tage:');
    jeTag.forEach((t, i) => {
      const typName = TAGESTYPEN.find((x) => x.id === t.typ).name;
      zeilen.push(t.liste.length
        ? `- ${tagKurz(t.datum, i)} ${typName}: ${z(t.summe.kcal ?? 0)} von ${z(t.ziel.kcal)} kcal, Eiweiß ${z(t.summe.protein ?? 0)} von ${z(t.ziel.protein)} g`
        : `- ${tagKurz(t.datum, i)} ${typName}: kein Eintrag`);
    });
    const tageJeName = new Map();
    for (const e of eintraege) {
      if (!tageJeName.has(e.name)) tageJeName.set(e.name, new Set());
      tageJeName.get(e.name).add(e.datum);
    }
    const haeufig = [...tageJeName.entries()].map(([name, set]) => [name, set.size]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de')).slice(0, 6);
    zeilen.push('', `Am häufigsten gegessen: ${haeufig.map(([name, n]) => `${name} (${n} ${n === 1 ? 'Tag' : 'Tage'})`).join(', ')}`);
  }

  /* Gewicht */
  const trend = gewichtsTrend(messungen, stichtag, gesundheit.wochenzielKg);
  if (trend.schnitt !== null) {
    zeilen.push('', 'GEWICHT');
    zeilen.push(trend.status === 'zuWenigDaten'
      ? `- 7-Tage-Schnitt ${z(trend.schnitt, 1)} kg aus ${trend.anzahl} ${trend.anzahl === 1 ? 'Wert' : 'Werten'}; für einen Vergleich mit der Vorwoche fehlen Werte`
      : `- 7-Tage-Schnitt ${z(trend.schnitt, 1)} kg, ${vorzeichen(trend.aenderung)} kg zur Vorwoche, Wochenziel ${vorzeichen(gesundheit.wochenzielKg, 2)} kg`);
  }

  /* Schlaf, Wasser, Schritte */
  const inWoche = messungen.filter((m) => m.datum >= tage[0] && m.datum <= tage[6]);
  const alltag = [];
  const werte = (art) => inWoche.filter((m) => m.art === art).map((m) => m.wert);
  if (werte('schlaf').length) alltag.push(`- Schlaf: ${z(schnitt(werte('schlaf')), 1)} h im Schnitt aus ${werte('schlaf').length} Nächten (Ziel ${z(gesundheit.schlafZielH, 1)} h)`);
  const wasserTage = new Map();
  for (const m of inWoche.filter((x) => x.art === 'wasser')) wasserTage.set(m.datum, (wasserTage.get(m.datum) ?? 0) + m.wert);
  if (wasserTage.size) alltag.push(`- Wasser: ${z(schnitt([...wasserTage.values()]))} ml im Schnitt aus ${wasserTage.size} ${wasserTage.size === 1 ? 'Tag' : 'Tagen'} (Ziel ${z(gesundheit.wasserZielMl)} ml)`);
  if (werte('schritte').length) alltag.push(`- Schritte: ${z(schnitt(werte('schritte')))} im Schnitt aus ${werte('schritte').length} ${werte('schritte').length === 1 ? 'Tag' : 'Tagen'} (Ziel ${z(gesundheit.schritteZiel)})`);
  if (alltag.length) zeilen.push('', 'ALLTAG', ...alltag);

  /* Supplements */
  if (supplements.length) {
    zeilen.push('', 'SUPPLEMENTS');
    for (const s of [...supplements].sort((a, b) => a.name.localeCompare(b.name, 'de'))) {
      const n = tage.filter((datum) => tagSaetze.get(datum)?.supplements?.includes(s.id)).length;
      zeilen.push(`- ${s.name}${s.dosis ? ` (${s.dosis})` : ''}: an ${n} von 7 Tagen`);
    }
  }

  /* Symptome */
  const nachId = new Map(eintraege.map((e) => [e.id, e]));
  const wochenSymptome = symptome.filter((s) => s.datum >= tage[0] && s.datum <= tage[6]).sort((a, b) => `${a.datum} ${a.zeit ?? ''}`.localeCompare(`${b.datum} ${b.zeit ?? ''}`));
  if (wochenSymptome.length) {
    zeilen.push('', 'SYMPTOME');
    for (const s of wochenSymptome) {
      const davor = (s.eintragIds ?? []).map((id) => nachId.get(id)?.name).filter(Boolean);
      zeilen.push(`- ${tagKurz(s.datum, tage.indexOf(s.datum))}${s.zeit ? ` ${s.zeit}` : ''} ${s.art}, Stärke ${s.staerke} von 5${davor.length ? `; davor: ${davor.join(', ')}` : ''}${s.notiz ? `; ${s.notiz}` : ''}`);
    }
  }

  zeilen.push('', 'Alle Werte sind Selbstangaben aus der App Elan.');
  return zeilen.join('\n');
}
