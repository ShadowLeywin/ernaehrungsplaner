// Körper und Gesundheit. Zwei Rollen, wie in guten Tracking-Apps getrennt:
// - Eintragen gehört auf „Heute“: tageswerteKarte (Gewicht, Schlaf, Schritte, Wasser) und supplementKarte.
// - „Fortschritt“ zeigt die Entwicklung: Gewichtstrend, Körpermaße als Kacheln, Verläufe, Laborwerte, Symptome.
// Alles bleibt auf dem Gerät.

import { formatKurz, isoDatum, verschiebe } from '../logik/datum.js';
import {
  ARTEN, WAEHLBARE_MASSE, artVon, bereinigeMasseAuswahl, gewichtsTrend, linienPunkte, messungId, pruefeGesundheit, pruefeMesswert, pruefeWasserMengen, sichtbareMasse, standUndAenderung,
  tagesSumme, tagesWert, trendRichtung, verlauf, verlaufJeTag,
} from '../logik/gesundheit.js';
import { QUELLE_HC } from '../logik/healthconnect.js';
import { aenderung, wertTrend, wochenRueckblick } from '../logik/rueckblick.js';
import { APP_NAME } from '../logik/schema.js';
import { tippGefuehl } from '../plattform.js';
import { neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { blatt, el, gruppe, haenge, hinweis, icon, mitBild, svg, zahl, zeileFeld, zeileSchalter } from '../ui.js';
import { zeigeLabor, zeigeSymptome } from './befunde.js';

const alsText = (wert) => (typeof wert === 'number' ? String(wert).replace('.', ',') : '');
const mitVorzeichen = (wert, stellen = 1) => `${wert > 0 ? '+' : wert < 0 ? '−' : '±'}${zahl(Math.abs(wert), stellen)}`;

// Was getippt, aber noch nicht gespeichert ist, überlebt ein Neuzeichnen (z. B. nach „+250 ml“)
let entwurf = { datum: null, werte: {} };

/** Wert eines Felds: erst der ungespeicherte Entwurf, sonst der gespeicherte Wert des Tages */
const feldWert = (artId, messungen, datum) => entwurf.werte[artId] ?? alsText(tagesWert(messungen, artId, datum));

/** Mehrere Arten auf einmal speichern; ein geleertes Feld entfernt den Wert des Tages. */
async function speichereArten(artIds, messungen, datum) {
  const fehler = {};
  const arbeit = [];
  for (const artId of artIds) {
    const text = feldWert(artId, messungen, datum).trim();
    if (!text) {
      if (tagesWert(messungen, artId, datum) !== null) arbeit.push(() => speicher.loescheMessung(`${artId}|${datum}`));
      continue;
    }
    const pruefung = pruefeMesswert(artId, text);
    if (pruefung.ok) arbeit.push(() => speicher.speichereMessung({ art: artId, datum, wert: pruefung.wert }));
    else fehler[artId] = pruefung.fehler;
  }
  if (Object.keys(fehler).length) return fehler;
  for (const schritt of arbeit) await schritt();
  for (const artId of artIds) delete entwurf.werte[artId];
  return null;
}

/** Zeile für einen Tageswert; „aus Health Connect“ steht klein dabei, wenn der Wert von dort kommt. */
function messZeile(artId, messungen, datum, fehler, zusatz = {}) {
  const art = artVon(artId);
  const aus = messungen.find((m) => m.art === artId && m.datum === datum)?.quelle === QUELLE_HC;
  return zeileFeld({
    name: artId.replace(':', '-'), beschriftung: aus ? [art.name, el('small', {}, 'aus Health Connect')] : art.name, einheit: art.einheit,
    inputmode: 'decimal', fehler: fehler?.[artId],
    value: feldWert(artId, messungen, datum), oninput: (e) => { entwurf.werte[artId] = e.target.value; }, ...zusatz,
  });
}

/* ---------- Für „Heute“: Tageswerte und Wasser ---------- */

/**
 * Karte mit Gewicht, Schlaf, Schritte und Wasser des Tages.
 * messungen: Messungen dieses Tages; mengen: die drei eigenen Wasser-Mengen.
 */
export function tageswerteKarte({ datum, messungen, ziele, mengen }) {
  if (entwurf.datum !== datum) entwurf = { datum, werte: {} };
  const karte = el('section', { class: 'karte tageswerte', 'aria-label': 'Tageswerte' });
  const zeichne = (fehler = null) => {
    const schlaf = tagesWert(messungen, 'schlaf', datum);
    const schritte = tagesWert(messungen, 'schritte', datum);
    const stand = [
      schlaf !== null ? `Schlaf ${zahl(schlaf, 1)} von ${zahl(ziele.schlafZielH, 1)} h` : null,
      schritte !== null ? `Schritte ${zahl(schritte)} von ${zahl(ziele.schritteZiel)}` : null,
    ].filter(Boolean).join(' · ');
    karte.replaceChildren(
      el('h2', { class: 'kartentitel' }, 'Tageswerte'),
      el('form', {
        novalidate: true,
        onsubmit: async (e) => {
          e.preventDefault();
          const probleme = await speichereArten(['gewicht', 'schlaf', 'schritte'], messungen, datum);
          if (probleme) { zeichne(probleme); karte.querySelector('[aria-invalid="true"]')?.focus(); return; }
          tippGefuehl('erfolg');
          hinweis('Tageswerte gespeichert.');
          neuZeichnen();
        },
      },
      el('div', { class: 'eliste' },
        messZeile('gewicht', messungen, datum, fehler),
        messZeile('schlaf', messungen, datum, fehler),
        messZeile('schritte', messungen, datum, fehler, { inputmode: 'numeric' })),
      stand ? el('p', { class: 'klein tageswerte-stand' }, stand) : null,
      el('div', { class: 'einstell-knoepfe' }, el('button', { type: 'submit', class: 'knopf leise' }, 'Tageswerte speichern'))),
      wasserBereich(datum, messungen, ziele, mengen));
  };
  zeichne();
  return karte;
}

/**
 * Wasser mit drei eigenen Mengen. Die Knöpfe zeichnen neu (Ring und Zahl auf „Heute“ passen dann zusammen;
 * Getipptes hält der Entwurf). Tippt man auf den Wasser-Ring, ruft „Heute“ zeige() auf: dann ändert sich nur die Zeile.
 */
function wasserBereich(datum, messungen, ziele, mengen) {
  // Nach Eingabezeit sortiert, damit „Letzten Schluck zurücknehmen“ wirklich den letzten trifft (ältere Einträge ohne Zeit zuerst)
  const nachZeit = (liste) => [...liste].sort((a, b) => String(a.erstellt ?? '').localeCompare(String(b.erstellt ?? '')));
  let eintraege = nachZeit(messungen.filter((m) => m.art === 'wasser' && m.datum === datum));
  const stand = el('span', { id: 'wasser-stand', class: 'wasser-stand' });
  const fuellung = el('span', { class: 'balken-voll' });
  const zurueck = el('button', {
    type: 'button', class: 'textlink',
    onclick: async () => {
      const letzter = eintraege.at(-1);
      if (!letzter) return;
      await speicher.loescheMessung(letzter.id);
      neuZeichnen();
    },
  }, 'Letzten Schluck zurücknehmen');
  const zeige = (neu = eintraege) => {
    eintraege = nachZeit(neu);
    const summe = tagesSumme(eintraege, 'wasser', datum);
    stand.textContent = `${zahl(summe)} von ${zahl(ziele.wasserZielMl)} ml`;
    fuellung.style.width = `${Math.min(100, (summe / ziele.wasserZielMl) * 100).toFixed(1)}%`;
    zurueck.hidden = eintraege.length === 0;
  };
  const trinke = async (ml) => {
    tippGefuehl();
    await speicher.speichereMessung({ art: 'wasser', datum, wert: ml });
    neuZeichnen();
  };
  zeige();
  const bereich = el('div', { class: 'wasser-bereich makro-wasser' },
    el('div', { class: 'wasser-kopf' }, el('h3', { class: 'titel-mit-bild' }, mitBild('💧', 'wasser', 'Wasser')), stand),
    el('span', { class: 'balken' }, fuellung),
    el('div', { class: 'chips wasser-knoepfe' }, mengen.map((ml) => el('button', { type: 'button', class: 'chip', onclick: () => trinke(ml) }, `+ ${zahl(ml)} ml`))),
    zurueck);
  bereich.zeige = zeige;
  return bereich;
}

/* ---------- Für „Heute“: Supplements ---------- */

export function supplementKarte(datum, supplements, tag) {
  const genommen = new Set(tag?.supplements ?? []);
  const sortiert = [...supplements].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const stand = el('span', { class: 'klein', id: 'supplement-stand' });
  const zeigeStand = () => { stand.textContent = sortiert.length ? `${sortiert.filter((s) => genommen.has(s.id)).length} von ${sortiert.length}` : ''; };
  const nameFeld = el('input', { id: 'f-supplement-name', 'aria-label': 'Name des Supplements', placeholder: 'Neues Supplement', maxlength: 60, autocomplete: 'off' });
  const dosisFeld = el('input', { id: 'f-supplement-dosis', 'aria-label': 'Dosis', placeholder: 'Dosis', maxlength: 40, autocomplete: 'off' });
  zeigeStand();
  return el('section', { class: 'karte supplemente', 'aria-label': 'Supplements' },
    el('div', { class: 'wasser-kopf' }, el('h2', { class: 'kartentitel' }, 'Supplements'), stand),
    sortiert.length ? el('ul', { class: 'zeilen' }, sortiert.map((s) => el('li', { class: genommen.has(s.id) ? 'haken erledigt' : 'haken' },
      el('label', {},
        el('input', {
          type: 'checkbox', checked: genommen.has(s.id) ? true : null,
          onchange: async (e) => {
            if (e.target.checked) tippGefuehl();
            if (e.target.checked) genommen.add(s.id); else genommen.delete(s.id);
            e.target.closest('.haken').classList.toggle('erledigt', e.target.checked);
            await speicher.setzeSupplementGenommen(datum, s.id, e.target.checked);
            zeigeStand();
          },
        }),
        el('span', { class: 'zeile-name' }, s.name, s.dosis ? el('small', {}, s.dosis) : null)),
      el('button', {
        type: 'button', class: 'rund', 'aria-label': `${s.name} aus der Liste entfernen`,
        onclick: async () => {
          await speicher.loescheSupplement(s.id);
          hinweis(`${s.name} entfernt.`, { aktion: 'Rückgängig', beiAktion: async () => { await speicher.speichereSupplement(s); neuZeichnen(); } });
          neuZeichnen();
        },
      }, icon('zu', 20))))) : el('p', { class: 'leer' }, 'Lege an, was du täglich nimmst. Dann hakst du es hier ab.'),
    el('form', {
      class: 'zusatz zweifach',
      onsubmit: async (e) => {
        e.preventDefault();
        const name = nameFeld.value.trim();
        if (!name) { nameFeld.focus(); return; }
        await speicher.speichereSupplement({ name, dosis: dosisFeld.value.trim() });
        neuZeichnen();
      },
    }, nameFeld, dosisFeld, el('button', { type: 'submit', class: 'knopf leise' }, 'Dazu')));
}

/* ---------- Für „Heute“: Check-in ---------- */

// Die Enden der Skala in Worten, damit 1 und 5 nicht geraten werden müssen
const CHECKIN = [
  { id: 'energie', leise: 'müde', laut: 'voller Energie' },
  { id: 'stimmung', leise: 'schlecht', laut: 'sehr gut' },
  { id: 'stress', leise: 'entspannt', laut: 'sehr gestresst' },
];

/**
 * Drei Fragen mit je fünf Stufen, ein Tipp je Frage. Speichert sofort und ändert nur die Knöpfe
 * (kein Neuzeichnen der Seite). Nochmal auf die gewählte Stufe tippen nimmt den Wert zurück.
 * Die App deutet die Werte nicht; „Fortschritt“ zeigt nur den Schnitt der Woche.
 */
export function checkinKarte(datum, messungen) {
  const reihe = ({ id, leise, laut }) => {
    const art = artVon(id);
    let gewaehlt = tagesWert(messungen, id, datum);
    const knoepfe = [1, 2, 3, 4, 5].map((stufe) => el('button', {
      type: 'button', class: 'wahl-knopf', 'aria-pressed': String(gewaehlt === stufe), 'aria-label': `${art.name} ${stufe} von 5`,
      onclick: async () => {
        const neu = gewaehlt === stufe ? null : stufe;
        if (neu === null) await speicher.loescheMessung(messungId(id, datum));
        else await speicher.speichereMessung({ art: id, datum, wert: neu });
        gewaehlt = neu;
        if (neu !== null) tippGefuehl();
        knoepfe.forEach((k, i) => k.setAttribute('aria-pressed', String(i + 1 === neu)));
      },
    }, String(stufe)));
    return el('div', { class: 'checkin-reihe' },
      el('h3', { class: 'checkin-frage', id: `checkin-${id}` }, art.name),
      el('div', { class: 'wahl checkin-wahl', role: 'group', 'aria-labelledby': `checkin-${id}` }, knoepfe),
      el('div', { class: 'checkin-pole klein', 'aria-hidden': 'true' }, el('span', {}, leise), el('span', {}, laut)));
  };
  return el('section', { class: 'karte checkin', 'aria-label': 'Check-in' },
    el('h2', { class: 'kartentitel' }, 'Wie geht es dir heute?'),
    CHECKIN.map(reihe));
}

/* ---------- Seite „Fortschritt“ ---------- */

export async function zeigeFortschritt(wurzel, [parameter]) {
  if (parameter === 'labor') return zeigeLabor(wurzel);
  if (parameter === 'symptome') return zeigeSymptome(wurzel);
  const heute = isoDatum();
  const [messungen, ziele, massNamen, masseAuswahl, eintraege, tagSaetze] = await Promise.all([
    speicher.messungenZwischen(verschiebe(heute, -400), heute), speicher.ladeGesundheit(), speicher.einstellung('massNamen', {}),
    speicher.einstellung('masseSichtbar').then(bereinigeMasseAuswahl),
    speicher.eintraegeZwischen(verschiebe(heute, -13), heute),
    Promise.all(Array.from({ length: 14 }, (_, i) => speicher.holeTag(verschiebe(heute, -i)))).then((t) => t.filter(Boolean)),
  ]);
  document.title = `Fortschritt – ${APP_NAME}`;
  haenge(wurzel,
    el('header', { class: 'seitenkopf' }, el('h1', {}, 'Fortschritt')),
    rueckblickKarte(wochenRueckblick({ datum: heute, eintraege, messungen, tagSaetze })),
    gewichtKarte(heute, messungen, ziele),
    koerperwerteBereich(heute, messungen),
    masseBereich(heute, messungen, massNamen ?? {}, masseAuswahl),
    verlaufBereich(heute, messungen),
    gruppe({ titel: 'Gesundheit' },
      el('a', { class: 'ezeile', href: '#/fortschritt/labor' }, el('span', { class: 'ezeile-text' }, 'Laborwerte'), icon('vor', 18)),
      el('a', { class: 'ezeile', href: '#/fortschritt/symptome' }, el('span', { class: 'ezeile-text' }, 'Symptome'), icon('vor', 18)),
      el('a', { class: 'ezeile', href: '#/mehr/koerper' }, el('span', { class: 'ezeile-text' }, 'Ziele für Körper und Wasser'), icon('vor', 18))));
}

/**
 * Die letzten 7 Tage auf einen Blick, mit Änderung zur Woche davor. Kein Urteil, nur Zahlen:
 * Ob mehr Schritte oder weniger kcal gut sind, hängt von deinem Ziel ab.
 */
function rueckblickKarte({ von, jetzt, davor }) {
  const kennzahl = (titel, wert, alt, stellen, einheit) => {
    const diff = aenderung(wert, alt);
    const pfeil = diff === null ? '' : { hoch: '↑', runter: '↓', gleich: '→' }[trendRichtung(diff, 10 ** -stellen / 2)];
    return el('div', { class: 'rueckblick-wert' },
      el('span', { class: 'kartentitel' }, titel),
      el('strong', {}, wert === null ? '–' : zahl(wert, stellen), wert === null ? null : el('span', {}, ` ${einheit}`)),
      el('small', {}, diff === null ? 'keine Vorwoche' : `${pfeil} ${mitVorzeichen(diff, stellen)} zur Vorwoche`));
  };
  const hatTrainings = jetzt.trainings > 0 || davor.trainings > 0;
  return el('section', { class: 'karte rueckblick', 'aria-label': 'Letzte 7 Tage' },
    el('div', { class: 'gewicht-kopf' },
      el('h2', { class: 'kartentitel' }, 'Letzte 7 Tage'),
      el('span', { class: 'klein' }, `seit ${formatKurz(von).slice(0, 6)}`)),
    el('div', { class: 'rueckblick-raster' },
      kennzahl('Kalorien Ø', jetzt.kcal, davor.kcal, 0, 'kcal'),
      kennzahl('Eiweiß Ø', jetzt.protein, davor.protein, 0, 'g'),
      kennzahl('Schlaf Ø', jetzt.schlaf, davor.schlaf, 1, 'h'),
      kennzahl('Schritte Ø', jetzt.schritte, davor.schritte, 0, ''),
      kennzahl('Wasser Ø', jetzt.wasser, davor.wasser, 0, 'ml'),
      hatTrainings ? kennzahl('Trainings', jetzt.trainings, davor.trainings, 0, '') : null,
      // Nur zeigen, was es gibt: wer nie eincheckt oder keine HRV misst, sieht keine leeren Kacheln
      ...[['hrv', 'HRV Ø', 0, 'ms'], ['energie', 'Energie Ø', 1, 'von 5'], ['stimmung', 'Stimmung Ø', 1, 'von 5'], ['stress', 'Stress Ø', 1, 'von 5']]
        .filter(([id]) => jetzt[id] !== null || davor[id] !== null)
        .map(([id, titel, stellen, einheit]) => kennzahl(titel, jetzt[id], davor[id], stellen, einheit))),
    el('p', { class: 'klein' }, jetzt.tageMitEssen
      ? `Schnitte über die Tage mit Werten; gegessen an ${jetzt.tageMitEssen} von 7 Tagen.`
      : 'Noch kein Essen eingetragen in den letzten 7 Tagen.'));
}

/**
 * Gewicht auf einen Blick, wie die Kalorien-Karte auf „Heute“: großer 7-Tage-Schnitt, Pfeil zur Vorwoche,
 * Stand gegen das Wochenziel, Verlauf. Die App bewertet nicht, sie vergleicht nur mit deinem Ziel.
 */
function gewichtKarte(datum, messungen, ziele) {
  const trend = gewichtsTrend(messungen, datum, ziele.wochenzielKg);
  const punkte = verlauf(messungen, 'gewicht', datum, 30);
  const richtung = trendRichtung(trend.aenderung);
  const pfeil = { hoch: '↑', runter: '↓', gleich: '→' }[richtung];
  const stand = { imZiel: 'im Ziel', darueber: 'über Plan', darunter: 'unter Plan' }[trend.status];
  return el('section', { class: 'karte gewicht-karte', 'aria-label': 'Gewicht' },
    el('div', { class: 'gewicht-kopf' },
      el('span', { class: 'kartentitel' }, 'Gewicht · Schnitt 7 Tage'),
      stand ? el('span', { class: `trend-pille ${trend.status}` }, stand) : null),
    el('div', { class: 'gewicht-zeile' },
      el('strong', { class: 'gewicht-zahl' }, trend.schnitt !== null ? zahl(trend.schnitt, 1) : '–', el('span', {}, ' kg')),
      trend.aenderung !== null ? el('span', { class: `gewicht-aenderung ${richtung}`, 'aria-label': `${mitVorzeichen(trend.aenderung)} kg zur Vorwoche` },
        `${pfeil} ${mitVorzeichen(trend.aenderung)} kg`) : null),
    punkte.length >= 2 ? verlaufslinie(punkte) : null,
    el('p', { class: 'klein', id: 'gewicht-trend' }, trendText(trend, ziele.wochenzielKg)));
}

function trendText(trend, ziel) {
  if (trend.status === 'zuWenigDaten') {
    const stand = trend.schnitt !== null ? `Schnitt der letzten 7 Tage: ${zahl(trend.schnitt, 1)} kg aus ${trend.anzahl} ${trend.anzahl === 1 ? 'Wert' : 'Werten'}. ` : '';
    return `${stand}Für den Vergleich mit dem Wochenziel braucht es je 3 Werte in dieser und in der Vorwoche (bisher ${trend.anzahl} und ${trend.anzahlDavor}). Gewicht trägst du auf „Heute“ ein.`;
  }
  const urteil = { imZiel: 'Das liegt im Ziel.', darueber: `Das sind ${zahl(Math.abs(trend.abweichung), 1)} kg mehr als geplant.`, darunter: `Das sind ${zahl(Math.abs(trend.abweichung), 1)} kg weniger als geplant.` }[trend.status];
  return `7-Tage-Schnitt ${zahl(trend.schnitt, 1)} kg, ${mitVorzeichen(trend.aenderung)} kg zur Vorwoche. Dein Wochenziel: ${mitVorzeichen(ziel, 2)} kg. ${urteil}`;
}

function verlaufslinie(punkte) {
  const werte = punkte.map((p) => p.wert);
  return el('figure', { class: 'verlauf' },
    svg('svg', { viewBox: '0 0 300 64', role: 'img', 'aria-label': `Gewicht der letzten 30 Tage, von ${zahl(Math.min(...werte), 1)} bis ${zahl(Math.max(...werte), 1)} kg`, preserveAspectRatio: 'none' },
      svg('polyline', { points: linienPunkte(werte, 300, 64, 6), fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })),
    el('figcaption', { class: 'klein' }, `${punkte.length} Werte seit ${formatKurz(punkte[0].datum)}, von ${zahl(Math.min(...werte), 1)} bis ${zahl(Math.max(...werte), 1)} kg`));
}

/* ---------- Körpermaße: Kacheln wie beim Maßband, Eintragen im Blatt ---------- */

const massName = (art, namen) => (art.eigen && namen[art.id]) || art.name;
const kurzName = (name) => {
  const seite = / (links|rechts)$/.exec(name);
  return seite ? [name.slice(0, seite.index), el('span', { class: 'mass-seite' }, seite[1] === 'links' ? 'L' : 'R')] : [name];
};

/** Eine Kachel für einen Messwert (Maß oder Körperwert); Tippen öffnet das Eintragen. */
function messKachel(art, name, messungen, datum, namen, zusatz = null) {
  const stand = standUndAenderung(messungen, art.id, datum);
  const einheit = art.einheit;
  return el('button', {
    type: 'button', class: stand ? 'mass-kachel' : 'mass-kachel leer', id: `mass-${art.id.replace('mass:', '')}`,
    'aria-label': `${name}: ${stand ? `${zahl(stand.wert, art.stellen)} ${einheit}` : 'noch kein Wert'}. Tippen zum Eintragen`,
    onclick: () => oeffneMass(art, name, messungen, datum, namen),
  },
  // „Handgelenk rechts“ passt nicht in eine halbe Zeile: Seite als kleines L/R hinter dem Namen
  el('span', { class: 'mass-name' }, ...kurzName(name)),
  el('span', { class: 'mass-wert' }, el('strong', {}, stand ? zahl(stand.wert, art.stellen) : '–'), ` ${einheit}`),
  zusatz ? el('span', { class: 'mass-aenderung' }, zusatz)
    : stand?.aenderung ? el('span', { class: 'mass-aenderung' }, `${mitVorzeichen(stand.aenderung, art.stellen)} seit ${formatKurz(stand.datum).slice(0, 6)}`) : null);
}

/** Ruhepuls und HRV: Schnitt der letzten 7 Tage und Änderung zur Vorwoche, wie beim Gewicht (ein Einzelwert schwankt stark). */
function trendZusatz(messungen, artId, datum) {
  const trend = wertTrend(messungen, artId, datum);
  if (!trend) return null;
  return `Ø 7 Tage ${zahl(trend.schnitt)}${trend.aenderung === null ? '' : ` · ${mitVorzeichen(trend.aenderung, 0)}`}`;
}

/** Ruhepuls, Körperfett und HRV: meist aus Health Connect, auch von Hand. HRV misst niemand von Hand: Kachel erst, wenn ein Wert da ist. */
function koerperwerteBereich(datum, messungen) {
  return el('section', { class: 'egruppe masse', 'aria-label': 'Körperwerte' },
    el('h2', { class: 'egruppe-titel' }, 'Körperwerte'),
    el('div', { class: 'mass-kacheln' }, ARTEN.filter((a) => a.gruppe === 'koerper' && (a.id !== 'hrv' || messungen.some((m) => m.art === 'hrv'))).map((art) => messKachel(art, art.name, messungen, datum, {}, ['ruhepuls', 'hrv'].includes(art.id) ? trendZusatz(messungen, art.id, datum) : null))));
}

function masseBereich(datum, messungen, namen, auswahl) {
  return el('section', { class: 'egruppe masse', 'aria-label': 'Körpermaße' },
    el('div', { class: 'masse-kopf' },
      el('h2', { class: 'egruppe-titel' }, 'Körpermaße'),
      el('button', { type: 'button', class: 'textlink', onclick: () => waehleMasse(auswahl, namen) }, 'Maße wählen')),
    el('div', { class: 'mass-kacheln' }, sichtbareMasse(messungen, auswahl).map((art) => messKachel(art, massName(art, namen), messungen, datum, namen))),
    el('div', { class: 'egruppe-fuss' }, 'Immer an derselben Stelle und zur selben Tageszeit messen, sonst sind die Werte nicht vergleichbar.'));
}

/** Welche Maße als Kachel erscheinen. Schalter speichern sofort; beim Schließen wird die Seite neu gezeichnet. */
function waehleMasse(auswahl, namen) {
  const an = new Set(auswahl);
  blatt({
    titel: 'Maße wählen',
    beiSchliessen: () => neuZeichnen(),
    inhalt: () => el('div', { class: 'stapel' },
      el('p', { class: 'klein' }, 'Blende aus, was du nicht misst. Gespeicherte Werte bleiben erhalten.'),
      el('div', { class: 'eliste' }, WAEHLBARE_MASSE.map((id) => zeileSchalter({
        id: `f-zeige-${id.slice(5)}`, beschriftung: massName(artVon(id), namen), an: an.has(id),
        onchange: async (e) => {
          if (e.target.checked) an.add(id); else an.delete(id);
          await speicher.setzeEinstellung('masseSichtbar', WAEHLBARE_MASSE.filter((x) => an.has(x)));
        },
      })))),
  });
}

/** Kleine Linie aller Werte eines Maßes, alt nach neu. */
function massLinie(art, werteNachDatum) {
  const werte = werteNachDatum.map((m) => m.wert);
  return el('figure', { class: 'verlauf mass-linie' },
    svg('svg', { viewBox: '0 0 300 56', role: 'img', 'aria-label': `Verlauf ${art.name}: ${werte.length} Werte von ${zahl(Math.min(...werte), art.stellen)} bis ${zahl(Math.max(...werte), art.stellen)} ${art.einheit}`, preserveAspectRatio: 'none' },
      svg('polyline', { points: linienPunkte(werte, 300, 56, 6), fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })),
    el('figcaption', { class: 'klein' }, `${werte.length} Werte seit ${formatKurz(werteNachDatum[0].datum)}, von ${zahl(Math.min(...werte), art.stellen)} bis ${zahl(Math.max(...werte), art.stellen)} ${art.einheit}`));
}

function oeffneMass(art, name, messungen, datum, namen) {
  const alle = messungen.filter((m) => m.art === art.id).sort((a, b) => a.datum.localeCompare(b.datum));
  const frueher = [...alle].reverse().slice(0, 6);
  let text = alsText(tagesWert(messungen, art.id, datum));
  let neuerName = name;
  blatt({
    titel: name,
    inhalt: (b) => {
      const fehler = el('p', { class: 'fehlertext', role: 'alert' });
      return el('form', {
        class: 'stapel', novalidate: true,
        onsubmit: async (e) => {
          e.preventDefault();
          const pruefung = pruefeMesswert(art.id, text);
          if (!pruefung.ok) { fehler.textContent = pruefung.fehler; return; }
          if (art.eigen && neuerName.trim() && neuerName.trim() !== name) await speicher.setzeEinstellung('massNamen', { ...namen, [art.id]: neuerName.trim().slice(0, 30) });
          await speicher.speichereMessung({ art: art.id, datum, wert: pruefung.wert });
          b.schliessen();
          tippGefuehl('erfolg');
          hinweis(`${neuerName.trim() || name}: ${zahl(pruefung.wert, art.stellen)} ${art.einheit} gespeichert.`);
          neuZeichnen();
        },
      },
      el('div', { class: 'eliste' },
        art.eigen ? zeileFeld({ name: 'mass-name', beschriftung: 'Name', value: name, maxlength: 30, oninput: (e) => { neuerName = e.target.value; } }) : null,
        zeileFeld({ name: 'mass-wert', beschriftung: 'Heute', einheit: art.einheit, inputmode: 'decimal', value: text, oninput: (e) => { text = e.target.value; } })),
      fehler,
      // Verlauf direkt im Blatt: Entwicklung sehen, ohne die Seite zu wechseln
      alle.length >= 2 ? massLinie(art, alle) : null,
      frueher.length ? el('ul', { class: 'zeilen mass-verlauf' }, frueher.map((m) => el('li', { class: 'zeile' },
        el('span', { class: 'zeile-name' }, formatKurz(m.datum), m.quelle === QUELLE_HC ? el('small', {}, 'aus Health Connect') : null),
        el('span', { class: 'zeile-wert' }, `${zahl(m.wert, art.stellen)} ${art.einheit}`)))) : null,
      el('div', { class: 'einstell-knoepfe' }, el('button', { type: 'submit', class: 'knopf' }, 'Speichern')));
    },
  });
  requestAnimationFrame(() => document.getElementById('f-mass-wert')?.focus());
}

/* ---------- Verläufe ---------- */

function verlaufBereich(datum, messungen) {
  // Tageswerte über 30 Tage, Körpermaße über ein halbes Jahr (sie ändern sich langsam)
  const reihen = ARTEN.filter((a) => a.id !== 'gewicht').map((art) => ({ art, tage: art.gruppe === 'mass' ? 180 : 30 }))
    .map(({ art, tage }) => ({ art, tage, punkte: verlaufJeTag(messungen, art.id, datum, tage) }))
    .filter((r) => r.punkte.length >= 2);
  return el('section', { class: 'bereich', id: 'verlaeufe', 'aria-label': 'Verläufe' },
    el('h2', { class: 'titel-mit-bild' }, mitBild('📈', 'avocado', 'Verläufe')),
    reihen.length === 0 ? el('p', { class: 'leer' }, 'Sobald es von einem Wert zwei Einträge gibt, erscheint hier seine Linie.') : null,
    reihen.map(({ art, tage, punkte }) => {
      const werte = punkte.map((p) => p.wert);
      const einheit = art.einheit ? ` ${art.einheit}` : '';
      return el('figure', { class: 'verlauf' },
        el('figcaption', {}, el('strong', {}, art.name), ` ${punkte.length} Werte in ${tage} Tagen, von ${zahl(Math.min(...werte), art.stellen)} bis ${zahl(Math.max(...werte), art.stellen)}${einheit}, zuletzt ${zahl(werte.at(-1), art.stellen)}${einheit}`),
        svg('svg', { viewBox: '0 0 300 48', role: 'img', 'aria-label': `Verlauf ${art.name}`, preserveAspectRatio: 'none' },
          svg('polyline', { points: linienPunkte(werte, 300, 48, 6, art.gruppe === 'checkin' ? { min: art.min, max: art.max } : null), fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })));
    }));
}

/* ---------- Für „Mehr“: Ziele für Körper und Wasser ---------- */

export function koerperZielBereich(ziele, mengen) {
  const eingabe = Object.fromEntries(Object.entries(ziele).map(([id, wert]) => [id, alsText(wert)]));
  const mengenText = mengen.map(String);
  const bereich = el('div', { class: 'einstellungen' });
  const zeile = (id, beschriftung, einheit, fehler) => zeileFeld({
    name: `ziel-${id}`, beschriftung, einheit, inputmode: 'decimal', value: eingabe[id], fehler: fehler[id], oninput: (e) => { eingabe[id] = e.target.value; },
  });
  const zeichne = (fehler = {}, mengenFehler = []) => {
    bereich.replaceChildren(el('form', {
      novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        const pruefung = pruefeGesundheit(eingabe);
        const knoepfe = pruefeWasserMengen(mengenText);
        if (!pruefung.ok || !knoepfe.ok) { zeichne(pruefung.fehler, knoepfe.fehler); bereich.querySelector('[aria-invalid="true"]')?.focus(); return; }
        await speicher.setzeEinstellung('gesundheit', pruefung.ziele);
        await speicher.setzeEinstellung('wasserMengen', knoepfe.mengen);
        hinweis('Ziele gespeichert.');
      },
    },
    gruppe({ titel: 'Ziele', fuss: 'Gewicht je Woche: plus zum Zunehmen, minus zum Abnehmen, 0 zum Halten. Die Startwerte sind Platzhalter, keine Empfehlung.' },
      zeile('wochenzielKg', 'Gewicht je Woche', 'kg', fehler),
      zeile('wasserZielMl', 'Wasser am Tag', 'ml', fehler),
      zeile('schlafZielH', 'Schlaf', 'h', fehler),
      zeile('schritteZiel', 'Schritte am Tag', '', fehler)),
    gruppe({ titel: 'Wasser-Knöpfe', fuss: 'Drei Mengen für „Heute“, z. B. Glas, Flasche, große Flasche. Der Wasser-Ring nimmt die erste.' },
      [0, 1, 2].map((i) => zeileFeld({
        name: `wasser-menge-${i}`, beschriftung: `Knopf ${i + 1}`, einheit: 'ml', inputmode: 'numeric', value: mengenText[i],
        fehler: mengenFehler[i], oninput: (e) => { mengenText[i] = e.target.value; },
      }))),
    el('div', { class: 'einstell-knoepfe' }, el('button', { type: 'submit', class: 'knopf' }, 'Ziele speichern'))));
  };
  zeichne();
  return bereich;
}
