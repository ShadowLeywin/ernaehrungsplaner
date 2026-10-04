// Lager ausbauen: Vorräte (Erz, Glut), Brom's Wochen-Aufträge, Monats-Boss, Bauwerke und Glutschilde.
import { el, setze, zahl } from '../ui.js';
import { icon } from '../icons.js';
import { episch } from '../darstellung.js';
import { schreibe } from '../db.js';
import { findeBild, bauBild, istFleischlos, kopfBild } from '../bilder.js';
import { ladeSpielstand } from '../spiel.js';
import { BAUTEN, STUFEN_NAMEN, kosten, baueAus, kaufeSchild, setzeSchild, SCHILD_PREIS, MAX_SCHILDE } from '../logic/lagerbau.js';
import { BOSS_BELOHNUNG, XP_JE_AUFTRAG } from '../logic/auftraege.js';
import { istAktiv } from '../logic/feuer.js';
import { datumSchluessel } from '../logic/ziele.js';
import { bauwerkSvg } from './bauten-figur.js';
import { bromPortraet } from './brom.js';

export const ausbau = {
  get titel() { return episch('Lager ausbauen', 'Ausbau & Aufträge'); },
  reiter: 'lager',
  render() {
    const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
    lade(wurzel);
    return wurzel;
  },
};

const erzText = (n) => `${zahl(Math.max(0, Math.floor(n)))} Erz`;
const glutText = (n) => `${zahl(Math.max(0, Math.floor(n)))} Glut`;

async function lade(wurzel) {
  const s = await ladeSpielstand();
  const speichern = async (lager) => { await schreibe('einstellungen', 'lager', lager); lade(wurzel); };
  setze(wurzel,
    kopfBild('esse', 'Lager ausbauen'),
    vorratKarte(s),
    auftragKarte(s),
    bossKarte(s),
    el('h2', { class: 'abschnitt' }, episch('Bauwerke deines Lagers', 'Bauwerke')),
    el('div', { class: 'bauten-raster' }, ...BAUTEN.map((b) => bauKarte(s, b, speichern))),
    schildKarte(s, speichern));
}

function vorratKarte(s) {
  return el('section', { class: 'karte hero vorrat' },
    el('div', { class: 'vorrat-zahlen' },
      el('div', { class: 'vorrat erz' }, el('span', { class: 'vorrat-symbol' }, '⛏'), el('strong', {}, zahl(Math.floor(s.konto.erz))), el('span', {}, 'Erz')),
      el('div', { class: 'vorrat glut' }, el('span', { class: 'vorrat-symbol' }, '🔥'), el('strong', {}, zahl(Math.floor(s.konto.glut))), el('span', {}, 'Glut'))),
    el('details', {},
      el('summary', { class: 'klein' }, 'So verdienst du Erz und Glut'),
      el('p', { class: 'leise klein' }, 'Erz kommt vom Übungsplatz: 20 je Workout, 1 je Satz, 1 je 3 Minuten Ausdauer, 5 je Aktivität, 10 je Rekord.'),
      el('p', { class: 'leise klein' }, 'Glut kommt aus der Disziplin: 10 je erfasstem Tag, 5 Proteinziel, 5 Wasserziel, 3 Gemüseziel, 3 Supplements, 2 Wiegen, 3 Tagebuch.'),
      el('p', { class: 'leise klein' }, 'Dazu Belohnungen aus Aufträgen und besiegten Bossen. Alles wird aus deinen Daten berechnet – nichts geht verloren.')));
}

function auftragKarte(s) {
  return el('section', { class: 'karte' },
    el('div', { class: 'auftrag-kopf' },
      bromPortraet(52),
      el('div', {},
        el('h2', {}, episch('Brom’s Aufträge dieser Woche', 'Wochen-Aufträge')),
        el('p', { class: 'leise klein' }, `Je Auftrag ${XP_JE_AUFTRAG} XP. Neue Aufträge jeden Montag.`))),
    ...s.auftraege.map((a) => el('div', { class: `auftrag${a.fertig ? ' fertig' : ''}` },
      el('div', { class: 'zeile' },
        el('span', {}, a.fertig ? '✓ ' : '', a.text),
        el('span', { class: 'leise klein' }, `${zahl(Math.min(a.wert, a.ziel))} / ${zahl(a.ziel)}`)),
      el('div', { class: 'balken mini' }, el('div', { style: `width:${Math.min(100, (a.wert / a.ziel) * 100)}%;background:${a.fertig ? 'var(--erreicht, #22c55e)' : 'var(--verlauf)'}` })),
      el('p', { class: 'leise klein' }, 'Belohnung: ', [a.belohnung.erz ? erzText(a.belohnung.erz) : null, a.belohnung.glut ? glutText(a.belohnung.glut) : null].filter(Boolean).join(' + ')))));
}

function bossKarte(s) {
  const { boss, leben, schaden, besiegt, anteil } = s.boss;
  const bild = el('div', { class: 'boss-bild' }, icon('schild', 40));
  findeBild(`bosse/${boss.id}`).then((url) => { if (url) setze(bild, el('img', { src: url, alt: boss.name })); });
  const rest = Math.max(0, leben - schaden);
  return el('section', { class: `karte boss-karte${besiegt ? ' besiegt' : ''}` },
    bild,
    el('div', { class: 'boss-text' },
      el('p', { class: 'leise klein' }, episch('Der Boss dieses Monats', 'Monats-Ziel')),
      el('h2', {}, boss.name),
      el('p', { class: 'klein' }, `${boss.text}: ${zahl(leben)} ${boss.einheit}`),
      el('div', { class: 'boss-leben' }, el('div', { style: `width:${Math.round((1 - anteil) * 100)}%` })),
      el('p', { class: 'klein' }, besiegt
        ? el('strong', {}, episch(`Besiegt! ${erzText(BOSS_BELOHNUNG.erz)}, ${glutText(BOSS_BELOHNUNG.glut)} und ${BOSS_BELOHNUNG.xp} XP gehören dir.`, `Geschafft – Belohnung erhalten.`))
        : `Noch ${zahl(Math.round(rest * 10) / 10)} ${boss.einheit} · Schaden bisher ${zahl(schaden)}`)));
}

function bauKarte(s, bau, speichern) {
  const stufe = s.lager.bauten[bau.id] ?? 0;
  const gesperrt = s.level.level < bau.ab;
  const naechste = stufe < STUFEN_NAMEN.length ? kosten(bau, stufe + 1) : null;
  const leistbar = naechste && s.konto.erz >= naechste.erz && s.konto.glut >= naechste.glut;
  const bild = el('div', { class: 'bau-bild' }, bauwerkSvg(bau.id, gesperrt ? 0 : stufe, 72));
  if (stufe) bauBild(bau.id, stufe, istFleischlos(s.profil)).then((url) => { if (url) setze(bild, el('img', { src: url, alt: bau.name })); });
  const fehler = el('p', { class: 'warnung klein', role: 'alert' });
  return el('div', { class: `karte bau-karte${gesperrt ? ' gesperrt' : ''}${stufe === 5 ? ' legendaer' : ''}` },
    bild,
    el('strong', {}, bau.name),
    el('span', { class: 'leise klein' }, stufe ? STUFEN_NAMEN[stufe - 1] : gesperrt ? `ab Level ${bau.ab}` : 'noch nicht gebaut'),
    el('p', { class: 'leise klein bau-text' }, bau.text),
    naechste && !gesperrt ? el('button', {
      class: `knopf${leistbar ? '' : ' zweitrangig'}`, type: 'button', disabled: !leistbar,
      onclick: () => {
        const r = baueAus(s.lager, bau.id, s.konto, s.level.level);
        if (r.fehler) { fehler.textContent = r.fehler; return; }
        speichern(r.lager);
      },
    }, `${stufe ? 'Ausbauen' : 'Bauen'}: ${[naechste.erz ? `${zahl(naechste.erz)} ⛏` : null, naechste.glut ? `${zahl(naechste.glut)} 🔥` : null].filter(Boolean).join(' ')}`) : null,
    stufe === 5 ? el('span', { class: 'marke' }, 'Legendär') : null,
    fehler);
}

function schildKarte(s, speichern) {
  const gestern = new Date();
  gestern.setDate(gestern.getDate() - 1);
  const gesternS = datumSchluessel(gestern);
  const gesternAktiv = s.tage.some((t) => t.datum === gesternS && istAktiv(t)) || s.lager.schildTage.includes(gesternS);
  const meldung = el('p', { class: 'warnung klein', role: 'alert' });
  return el('section', { class: 'karte' },
    el('h2', {}, '🛡 Glutschild'),
    el('p', { class: 'leise klein' }, 'Ein Glutschild hält dein Lagerfeuer einen Tag am Leben – für Krankheit, Reise oder einen Tag ohne Handy. Der verpasste Tag zählt dann für die Serie.'),
    el('p', {}, `Vorrat: ${s.lager.schilde} von ${MAX_SCHILDE}`),
    el('div', { class: 'knopfreihe' },
      el('button', {
        class: 'knopf zweitrangig', type: 'button', disabled: s.lager.schilde >= MAX_SCHILDE || s.konto.glut < SCHILD_PREIS.glut,
        onclick: () => { const r = kaufeSchild(s.lager, s.konto); if (r.fehler) meldung.textContent = r.fehler; else speichern(r.lager); },
      }, `Schild schmieden (${SCHILD_PREIS.glut} 🔥)`),
      !gesternAktiv && s.lager.schilde > 0 ? el('button', {
        class: 'knopf', type: 'button',
        onclick: () => { const r = setzeSchild(s.lager, gesternS); if (r.fehler) meldung.textContent = r.fehler; else speichern(r.lager); },
      }, 'Auf gestern legen') : null),
    meldung);
}
