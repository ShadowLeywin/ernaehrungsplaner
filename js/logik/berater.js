// Ernährungsberater-Prompt (Léons Wunsch vom 23.11.2026): Ein Chat erstellt den Plan selbst, aus Elans Einstellungen,
// und antwortet im Importformat "elan-import". Reine Funktion; Elan schickt nichts, Léon kopiert den Text selbst.
// Enthalten sind nur Ziele und Vorlieben, keine Messwerte (Gewicht, Labor, Symptome).

import { WOCHENTAGE } from './datum.js';
import { SLOTS, ZIEL_FELDER } from './ziele.js';

const MAG_TEXT = { J: 'mag ich', R: 'nur roh', K: 'nur gekocht', N: 'mag ich nicht' };

/**
 * Prompt bauen. typen: [{ id, name }], ziele: { id: { kcal, protein, … } }, woche: 7 Kennungen (Mo–So),
 * slots: [{ id, name, anteil }], vorlieben: [{ name, mag }], rezepte: [Name], wunsch: freier Text.
 */
export function beraterPrompt({ von, bis, typen, ziele, woche, slots, vorlieben = [], rezepte = [], wunsch = '' }) {
  const typName = (id) => typen.find((t) => t.id === id)?.name ?? id;
  const zielZeile = (t) => `- ${t.name}: ${ZIEL_FELDER.map((f) => `${f.name} ${ziele[t.id]?.[f.id] ?? '?'} ${f.einheit}`).join(', ')}`;
  const nachMag = (code) => vorlieben.filter((v) => v.mag === code).map((v) => v.name);
  const magZeilen = Object.entries(MAG_TEXT).map(([code, text]) => [text, nachMag(code)]).filter(([, namen]) => namen.length)
    .map(([text, namen]) => `- ${text}: ${namen.join(', ')}`);
  return [
    '# ROLLE',
    'Du bist ein erfahrener Ernährungsberater. Du erstellst mir einen alltagstauglichen Essensplan. Du bist kein Arzt und stellst keine Diagnosen.',
    '',
    '# KONTEXT (aus meiner App „Elan“)',
    `Zeitraum: ${von} bis ${bis}.`,
    'Meine Tagestypen und Tagesziele:',
    ...typen.map(zielZeile),
    `Wochenplan: ${WOCHENTAGE.map((tag, i) => `${tag} ${typName(woche[i])}`).join(', ')}.`,
    `Mahlzeiten (Anteil am Tagesziel): ${slots.map((s) => `${s.id} = ${s.name} ${Math.round(s.anteil * 100)} %`).join(', ')}.`,
    ...(magZeilen.length ? ['Vorlieben bei Obst und Gemüse:', ...magZeilen] : []),
    ...(rezepte.length ? [`Rezepte, die ich schon habe (gern wiederverwenden, Name genau so schreiben): ${rezepte.join(', ')}.`] : []),
    `Meine Wünsche: ${String(wunsch).trim() || 'keine besonderen'}.`,
    '',
    '# AUFGABE',
    '1. Plane jeden Tag im Zeitraum nach seinem Tagestyp. Jeder Tag soll sein Energieziel auf etwa 10 % treffen und genug Eiweiß haben.',
    '2. Verteile die Mahlzeiten ungefähr nach den Anteilen. Snacks dürfen klein sein.',
    '3. Plane alltagstauglich: wenige verschiedene Rezepte, Reste und Vorkochen nutzen, an gleichen Tagestypen gern Gleiches.',
    '4. Lege jedes Gericht, das aus mehreren Zutaten besteht, als Rezept an und verweise im Plan darauf.',
    '',
    '# AUSGABE',
    'Antworte nur mit JSON im Format "elan-import" Version 1, ohne Text davor oder danach:',
    '{"format":"elan-import","version":1,"rezepte":[{"name","portionen","zutaten":[{"name","gramm"}],"schritte":[]}],"plan":[{"datum","mahlzeit","rezept","portionen"} oder {"datum","mahlzeit","zutat","gramm"}]}',
    '',
    '# REGELN',
    '- Keine Nährwerte und keine Kalorien ins JSON: Die App rechnet selbst mit ihren eigenen Werten.',
    '- Mengen in Gramm (roh). Zutaten mit einfachen deutschen Namen („Haferflocken“, „Hähnchenbrust“, „Reis“).',
    `- "mahlzeit" nur: ${SLOTS.map((s) => s.id).join(', ')}. "datum" als JJJJ-MM-TT.`,
    '- Was ich nicht mag, kommt nicht vor. Keine extremen Diäten, keine Nahrungsergänzung, keine Medikamente.',
    '- Wird der Plan für eine Antwort zu lang, plane die erste Hälfte und schreib nichts dazu; ich frage nach der zweiten.',
  ].join('\n');
}
