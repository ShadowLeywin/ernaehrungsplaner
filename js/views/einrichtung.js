// Ersteinrichtung: führt neue Nutzer durch Körperdaten, Sport, Wochenplan und Ziel
// und erzeugt daraus das Profil. Alternativ: Backup wiederherstellen.
import { el, setze, zahl } from '../ui.js';
import { speichereProfil } from '../state.js';
import { WOCHENTAGE, profilAusEinrichtung } from '../logic/profil.js';
import { koerperVollstaendig, pruefeZiel } from '../logic/bedarf.js';
import { datumSchluessel } from '../logic/ziele.js';
import { koerperFelder, alltagFeld, aktivitaetenListe, zielFelder, makroRegelFelder } from './profil-bausteine.js';
import { icon } from '../icons.js';

const VORLAGEN = [
  ['Krafttraining', 300], ['Calisthenics', 250], ['Laufen', 350], ['Radfahren / E-Bike', 200],
  ['Fußball', 450], ['Schwimmen', 300], ['Spazieren / Gehen', 150],
];

const SCHRITTE = ['Willkommen', 'Über dich', 'Sport', 'Woche', 'Ziel', 'Ergebnis'];

let entwurf = null;
let schritt = 0;

function neuerEntwurf() {
  return {
    name: '',
    koerper: { geschlecht: null, alter: null, groesseCm: null, gewichtKg: null },
    alltag: 'sitzend',
    aktivitaeten: [],
    tagestypen: [], // nur für die gemeinsamen Bausteine
    wochenSport: WOCHENTAGE.map(() => []),
    ziel: { art: 'halten', kgProWoche: 0, wochen: 12, startDatum: datumSchluessel(new Date()) },
    makroRegeln: { proteinGProKg: 1.8, fettAnteil: 0.25 },
  };
}

export const einrichtung = {
  titel: 'Einrichtung',
  render() {
    entwurf ??= neuerEntwurf();
    const wurzel = el('div');
    zeichne(wurzel);
    return wurzel;
  },
};

function zeichne(wurzel) {
  const neu = () => zeichne(wurzel);
  const geh = (ziel) => { schritt = ziel; zeichne(wurzel); window.scrollTo(0, 0); };
  const weiter = el('button', { class: 'knopf', type: 'button', onclick: () => geh(schritt + 1) }, 'Weiter');
  const pruefeWeiter = () => { weiter.disabled = !schrittGueltig(); };

  const inhalt = [
    () => willkommen(geh),
    () => [
      el('p', { class: 'leise' }, 'Daraus berechnet die App deinen Grundumsatz. Die Daten bleiben nur auf deinem Gerät.'),
      el('section', { class: 'karte' }, koerperFelder(entwurf, pruefeWeiter), alltagFeld(entwurf, pruefeWeiter)),
    ],
    () => sportSchritt(neu, pruefeWeiter),
    () => wochenSchritt(neu),
    () => [
      el('section', { class: 'karte' }, el('h2', {}, 'Gewichtsziel'), zielFelder(entwurf, () => {})),
      el('section', { class: 'karte' },
        el('h2', {}, 'Makro-Regeln'),
        makroRegelFelder(entwurf, () => {}),
        el('p', { class: 'leise klein' }, 'Üblich: 1,6–2,2 g Protein pro kg, 25–35 % der Kalorien aus Fett.')),
    ],
    () => ergebnisSchritt(wurzel),
  ][schritt]();

  setze(wurzel, ...[
    schritt > 0 ? el('div', { class: 'schritt-punkte', 'aria-hidden': 'true' },
      ...SCHRITTE.slice(1).map((_, i) => el('i', { class: i < schritt ? 'an' : '' }))) : null,
    schritt > 0 ? el('p', { class: 'abschnitt' }, `Schritt ${schritt} von ${SCHRITTE.length - 1} · ${SCHRITTE[schritt]}`) : null,
    ...[].concat(inhalt),
    schritt > 0 && schritt < SCHRITTE.length - 1
      ? el('div', { class: 'knopfreihe schrittleiste' },
        el('button', { class: 'knopf zweitrangig', type: 'button', onclick: () => geh(schritt - 1) }, 'Zurück'),
        weiter)
      : null,
  ].filter(Boolean));
  pruefeWeiter();
}

function schrittGueltig() {
  if (schritt === 1) return koerperVollstaendig(entwurf.koerper);
  if (schritt === 2) return entwurf.aktivitaeten.every((a) => a.name.trim());
  return true;
}

function willkommen(geh) {
  return [
    el('section', { class: 'karte willkommen hero' },
      el('div', { class: 'logo' }, icon('flamme-voll', 44)),
      el('h2', { class: 'wortmarke-text gross' }, 'FORGE'),
      el('p', { class: 'slogan' }, 'Fuel. Train. Grow.'),
      el('p', {}, 'Ernährung und Training nach deinen Zielen – offline, alle Daten bleiben auf deinem Handy.'),
      el('p', { class: 'leise klein' }, 'Die Einrichtung dauert ca. 2 Minuten. Alles lässt sich später in den Einstellungen ändern.'),
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf', type: 'button', onclick: () => geh(1) }, 'Neu einrichten'),
        el('a', { class: 'knopf zweitrangig', href: '#/backup' }, 'Backup wiederherstellen'))),
  ];
}

function sportSchritt(neu, pruefeWeiter) {
  const vorhanden = (name) => entwurf.aktivitaeten.some((a) => a.name === name);
  return [
    el('p', { class: 'leise' }, 'Welchen Sport machst du regelmäßig? Trage ein, wie viele kcal eine Einheit ungefähr verbraucht.'),
    el('section', { class: 'karte' },
      el('div', { class: 'chips' }, ...VORLAGEN.filter(([name]) => !vorhanden(name)).map(([name, kcal]) => el('button', {
        class: 'chip',
        type: 'button',
        onclick: () => { entwurf.aktivitaeten.push({ id: `a${Date.now().toString(36)}${entwurf.aktivitaeten.length}`, name, kcal }); neu(); },
      }, `+ ${name}`)))),
    el('section', { class: 'karte' }, aktivitaetenListe(entwurf, pruefeWeiter, neu)),
  ];
}

function wochenSchritt(neu) {
  if (!entwurf.aktivitaeten.length) {
    return [el('section', { class: 'karte' }, el('p', {}, 'Du hast keinen Sport eingetragen – alle Tage werden Ruhetage. Das kannst du später ändern.'))];
  }
  return [
    el('p', { class: 'leise' }, 'Was machst du an welchem Tag? Tage ohne Auswahl sind Ruhetage. Aus den Kombinationen entstehen deine Tagestypen.'),
    el('section', { class: 'karte' }, ...WOCHENTAGE.map((tag, i) => el('div', { class: 'wochensport' },
      el('strong', {}, tag),
      el('div', { class: 'chips' }, ...entwurf.aktivitaeten.map((a) => {
        const an = entwurf.wochenSport[i].includes(a.id);
        return el('button', {
          class: `chip${an ? ' an' : ''}`,
          type: 'button',
          'aria-pressed': String(an),
          onclick: () => {
            entwurf.wochenSport[i] = an ? entwurf.wochenSport[i].filter((id) => id !== a.id) : [...entwurf.wochenSport[i], a.id];
            neu();
          },
        }, a.name);
      }))))),
  ];
}

function ergebnisSchritt(wurzel) {
  // Gelöschte Aktivitäten aus dem Wochenplan entfernen
  const ids = new Set(entwurf.aktivitaeten.map((a) => a.id));
  entwurf.wochenSport = entwurf.wochenSport.map((tag) => tag.filter((id) => ids.has(id)));
  const profil = profilAusEinrichtung(entwurf);
  const hinweise = pruefeZiel(entwurf.ziel, entwurf.koerper.gewichtKg);

  const fertig = async () => {
    await speichereProfil(profil);
    entwurf = null;
    schritt = 0;
    location.hash = '#/heute';
  };

  return [
    el('p', { class: 'leise' }, 'Dein Vorschlag. Du kannst alles später unter Mehr → Profil & Einstellungen anpassen.'),
    ...profil.tagestypen.map((t) => el('section', { class: 'karte' },
      el('h2', {}, t.name),
      el('p', { class: 'grosszahl' }, `${zahl(t.kcal)} kcal`),
      el('p', {}, `Protein ${t.protein} g · KH ${t.kh} g · Fett ${t.fett} g`),
      el('p', { class: 'leise klein' },
        WOCHENTAGE.filter((_, i) => profil.woche[i].tagestyp === t.id).map((tag) => tag.slice(0, 2)).join(', ')))),
    ...hinweise.map((h) => el('p', { class: 'warnung klein' }, h)),
    el('div', { class: 'knopfreihe schrittleiste' },
      el('button', { class: 'knopf zweitrangig', type: 'button', onclick: () => { schritt -= 1; zeichne(wurzel); } }, 'Zurück'),
      el('button', { class: 'knopf', type: 'button', onclick: fertig }, 'Fertig – los geht’s')),
  ];
}
