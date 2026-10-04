// Steigerungsvorschlag (doppelte Progression) und Stillstands-Erkennung (reine Funktionen).
// Regel: Wurden in allen Sätzen die oberen Ziel-Wiederholungen geschafft, beim nächsten Mal mehr Gewicht.
// Ohne Ziel gilt 12 Wiederholungen als Obergrenze. Körpergewicht: erst mehr Wiederholungen, ab 15 Zusatzgewicht.
import { uebungsVerlauf } from './fortschritt.js';

/** „8–12“ → { min: 8, max: 12 }, „10“ → { min: 10, max: 10 }, sonst null. */
export function zielBereich(ziel) {
  const zahlen = String(ziel ?? '').match(/\d+/g)?.map(Number) ?? [];
  if (!zahlen.length) return null;
  return { min: zahlen[0], max: zahlen[1] ?? zahlen[0] };
}

/** Gewichtssprung je Ausrüstung (kg). */
export function schritt(u) {
  if (['kurzhantel', 'kettlebell'].includes(u?.equipment)) return 2;
  if (['kabel', 'maschine'].includes(u?.equipment)) return 2.5;
  if (u?.muskeln?.[0] && ['quadrizeps', 'gesaess', 'beinbizeps', 'unterer_ruecken'].includes(u.muskeln[0]) && u.equipment === 'langhantel') return 5;
  return 2.5;
}

/**
 * Vorschlag für das nächste Mal aus den letzten erledigten Sätzen.
 * Liefert { art: 'mehrGewicht'|'mehrWdh'|'zusatzgewicht'|'halten'|'laenger', kg?, wdh?, sek?, text } oder null.
 */
export function steigerung(u, letzteSaetze, ziel) {
  const saetze = (letzteSaetze ?? []).filter((s) => s.erledigt !== false);
  if (!u || !saetze.length) return null;
  const bereich = zielBereich(ziel);
  if (u.art === 'halten') {
    const sek = Math.min(...saetze.map((s) => s.sek ?? 0));
    const obergrenze = bereich?.max ?? Infinity;
    if (sek >= obergrenze || !bereich) return { art: 'laenger', sek: sek + 5, text: `Alle Sätze gehalten – nächstes Mal ${sek + 5} s` };
    return null;
  }
  const minWdh = Math.min(...saetze.map((s) => s.wdh ?? 0));
  const obergrenze = bereich?.max ?? 12;
  const kg = Math.max(...saetze.map((s) => s.kg ?? 0));
  if (u.art === 'kraft') {
    if (minWdh >= obergrenze) {
      const neu = Math.round((kg + schritt(u)) * 4) / 4;
      return { art: 'mehrGewicht', kg: neu, wdh: bereich?.min, text: `Alle Sätze mit ${obergrenze}+ Wdh geschafft – nächstes Mal ${String(neu).replace('.', ',')} kg${bereich ? ` × ${bereich.min}` : ''}` };
    }
    return { art: 'mehrWdh', kg, wdh: minWdh + 1, text: `Gleiches Gewicht, Ziel: ${minWdh + 1}+ Wdh in jedem Satz` };
  }
  if (u.art === 'koerpergewicht') {
    const grenze = bereich?.max ?? 15;
    if (minWdh >= grenze) {
      const neu = kg + 2.5;
      return { art: 'zusatzgewicht', kg: neu, wdh: bereich?.min, text: `Stark! Zeit für Zusatzgewicht: +${String(neu).replace('.', ',')} kg` };
    }
    return { art: 'mehrWdh', kg, wdh: minWdh + 1, text: `Ziel: ${minWdh + 1}+ Wdh in jedem Satz` };
  }
  return null;
}

/** Stillstand: in den letzten `n` Einheiten kein neues geschätztes Maximum (mind. 1 % besser). */
export function stillstand(uebungId, tage, verzeichnis, n = 4) {
  const verlauf = uebungsVerlauf(uebungId, tage, verzeichnis);
  if (verlauf.length < n + 1) return false;
  const vorher = Math.max(...verlauf.slice(0, -n).map((v) => v.e1RM || v.wdh));
  const zuletzt = Math.max(...verlauf.slice(-n).map((v) => v.e1RM || v.wdh));
  return zuletzt <= vorher * 1.01;
}
