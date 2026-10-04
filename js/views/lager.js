// Lager: Startseite als Hub. Lagerfeuer-Szene, darunter Kacheln mit dem Wichtigsten des Tages.
import { el, setze, zahl } from '../ui.js';
import { icon } from '../icons.js';
import { episch } from '../darstellung.js';
import { holeProfil, holeTag, speichereTag } from '../state.js';
import { lese, anzahl } from '../db.js';
import { holeLebensmittel } from '../lebensmittel.js';
import { datumSchluessel, tagestypFuerDatum } from '../logic/ziele.js';
import { tagesNaehrwerte } from '../logic/tag.js';
import { wasserSumme } from '../logic/wasser.js';
import { UEBUNGEN } from '../daten/uebungen.js';
import { uebungsVerzeichnis, zusatzKcal, zielMitZusatz } from '../logic/training.js';
import { vorlagenFuerTag, erledigteVorlagen } from '../logic/vorlagen.js';
import { holeGewichtsReihe } from './gewicht.js';
import { ladeSpielstand } from '../spiel.js';
import { feuerSerie, feuerStufe, istAktiv } from '../logic/feuer.js';
import { szeneFuerLevel } from '../logic/szene.js';
import { impulsFuerDatum } from '../logic/impulse.js';
import { backupErinnerungFaellig } from '../logic/backup.js';
import { zeigeBildSzene } from './lager-szene.js';
import { rangName } from '../logic/raenge.js';
import { rangEmblem } from './emblem.js';
import { bromMarkup, bromAn } from './brom.js';

const verzeichnis = uebungsVerzeichnis(UEBUNGEN);
const datumFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

export const lager = {
  titel: 'Lager',
  kopf: () => el('span', { class: 'wortmarke', 'aria-label': 'FORGEBORN' },
    icon('flamme-voll', 30),
    el('span', { class: 'wortmarke-text' }, 'FORGEBORN')),
  render() {
    const wurzel = el('div');
    lade(wurzel);
    return wurzel;
  },
};

async function lade(wurzel) {
  const jetzt = new Date();
  const [profil, daten, tag, vorlagen, gewichte] = await Promise.all([
    holeProfil(), holeLebensmittel(), holeTag(datumSchluessel(jetzt)), lese('einstellungen', 'vorlagen'), holeGewichtsReihe(),
  ]);
  const { typ: planTyp, notiz } = tagestypFuerDatum(profil, jetzt);
  const gewichtKg = gewichte.at(-1)?.kg ?? profil.koerper.gewichtKg ?? 75;
  const typ = zielMitZusatz(planTyp, zusatzKcal(tag, verzeichnis, gewichtKg));
  const ist = tagesNaehrwerte(tag, profil, daten.lebensmittel);

  const heldPlatz = el('div');
  const feuerKarte = lagerfeuer(profil, typ, notiz, jetzt, bromSpruch(vorlagenFuerTag(vorlagen ?? [], jetzt).filter((v) => !erledigteVorlagen(tag).has(v.id)), ist, typ, jetzt, profil, tag));
  ladeSpielstand().then((spiel) => {
    setze(heldPlatz, heldKachel(spiel), ausbauKachel(spiel));
    // Feuer wächst mit der Serie aktiver Tage (heute schon mitgezählt, falls etwas eingetragen ist); Glutschilde zählen mit
    const aktive = [...spiel.tage.filter(istAktiv).map((t) => t.datum), ...(spiel.lager.schildTage ?? [])];
    if (istAktiv(tag)) aktive.push(tag.datum);
    const serie = feuerSerie(aktive);
    zeigeFeuerStufe(feuerKarte, serie);
    // Ort nach Level (KI-Bilder, falls vorhanden), Feuer nach Serie
    const szene = szeneFuerLevel(spiel.level.level);
    zeigeBildSzene(feuerKarte.querySelector('.feuer-buehne'), {
      szeneNr: szene.nr,
      feuerIndex: feuerStufe(serie).index,
      mitBrom: bromAn() && document.documentElement.dataset.stil !== 'schlicht',
    }).then((mitBild) => {
      if (!mitBild) return;
      feuerKarte.classList.add('mit-bild');
      feuerKarte.querySelector('.feuer-serie')?.append(el('span', { class: 'leise klein szene-ort' },
        ` · ${episch(szene.episch, szene.name)}${szene.naechste ? ` (ab Lvl ${szene.naechste.ab}: ${szene.naechste.name})` : ''}`));
    });
  }).catch(() => {});

  const backupPlatz = el('div');
  Promise.all([lese('einstellungen', 'letztesBackup'), anzahl('tage')]).then(([letztes, n]) => {
    if (backupErinnerungFaellig(letztes, n > 0)) {
      setze(backupPlatz, el('a', { class: 'karte hinweis-karte', href: '#/backup' }, icon('backup'),
        el('span', {}, episch('Brom mahnt: Sichere deine Chronik – das letzte Backup ist über eine Woche alt.', 'Backup fällig – letztes Backup über eine Woche alt.'))));
    }
  });

  setze(wurzel,
    feuerKarte,
    backupPlatz,
    heldPlatz,
    el('div', { class: 'hub-kacheln' },
      ernaehrungsKachel(typ, ist),
      trainingsKachel(vorlagen ?? [], tag, jetzt),
      wasserKachel(profil, typ, tag),
      gewichtsKachel(tag, gewichte)),
    el('p', { class: 'tagesimpuls' }, el('span', { class: 'leise klein' }, episch('Weisheit des Tages', 'Tagesimpuls')), el('br'), impulsFuerDatum(datumSchluessel(jetzt))));
}

function begruessung(profil) {
  const stunde = new Date().getHours();
  const name = profil.name ? `, ${profil.name}` : '';
  if (stunde < 5 || stunde >= 22) return episch(`Die Glut wacht${name}. Zeit zu ruhen.`, `Gute Nacht${name}`);
  if (stunde < 11) return episch(`Ein neuer Tag am Feuer${name}.`, `Guten Morgen${name}`);
  if (stunde < 17) return episch(`Willkommen zurück am Feuer${name}.`, `Hallo${name}`);
  return episch(`Das Feuer brennt noch${name}.`, `Guten Abend${name}`);
}

/** Lagerfeuer als animiertes SVG: Holzscheite, drei Flammenschichten, aufsteigende Funken, Glühen. */
/** Ein kurzer, respektvoller Satz von Brom – nie drängend. */
function bromSpruch(offen, ist, typ, jetzt, profil = null, tag = null) {
  const stunde = jetzt.getHours();
  const fehlendeSupps = profil && tag ? profil.supplements.filter((s) => s.aktiv && !tag.supplements?.[s.id]) : [];
  if (stunde >= 12 && fehlendeSupps.length && fehlendeSupps.length <= 3) return `Die Kräuter warten: ${fehlendeSupps.map((s) => s.name).join(', ')} noch nicht genommen.`;
  if (offen.length) return `„${offen[0].name}“ steht heute an. Der Amboss ist heiß, wenn du es bist.`;
  if (stunde >= 17 && (ist.protein ?? 0) < typ.protein * 0.7) return 'Ein Schmied ohne Protein ist wie Eisen ohne Glut. Noch etwas Eiweiß heute?';
  if (stunde < 11) return 'Guten Morgen. Ein Schluck Wasser zuerst – dann sehen wir weiter.';
  return 'Ruhe gehört zur Arbeit. Die Glut hält auch ohne dich.';
}

/** Größe des Feuers und Serien-Anzeige setzen. */
function zeigeFeuerStufe(karte, serie) {
  const stufe = feuerStufe(serie);
  karte.querySelector('.feuer-szene')?.setAttribute('data-stufe', String(stufe.index));
  const platz = karte.querySelector('.feuer-serie');
  if (!platz) return;
  setze(platz,
    el('span', { class: 'marke feuer-marke' }, `🔥 ${serie} ${serie === 1 ? 'Tag' : 'Tage'} · ${episch(stufe.episch, stufe.name)}`),
    el('span', { class: 'leise klein' }, stufe.naechste
      ? ` noch ${stufe.naechste.ab - serie} bis ${episch(stufe.naechste.episch, stufe.naechste.name)}`
      : ` ${stufe.text}`));
}

/** Vorräte, Aufträge der Woche und Monats-Boss auf einen Blick. */
function ausbauKachel(spiel) {
  const fertig = spiel.auftraege.filter((a) => a.fertig).length;
  return el('a', { class: 'karte ausbau-kachel', href: '#/ausbau' },
    el('div', { class: 'ausbau-vorrat' },
      el('span', {}, '⛏ ', el('strong', {}, zahl(Math.floor(spiel.konto.erz)))),
      el('span', {}, '🔥 ', el('strong', {}, zahl(Math.floor(spiel.konto.glut)))),
      spiel.lager.schilde ? el('span', {}, '🛡 ', el('strong', {}, String(spiel.lager.schilde))) : null),
    el('div', { class: 'ausbau-info' },
      el('span', { class: 'klein' }, `${episch('Aufträge', 'Aufträge')} ${fertig}/${spiel.auftraege.length}`),
      el('span', { class: 'klein' }, spiel.boss.besiegt ? `✓ ${spiel.boss.boss.name}` : spiel.boss.boss.name),
      el('div', { class: 'boss-leben mini' }, el('div', { style: `width:${Math.round((1 - spiel.boss.anteil) * 100)}%` }))),
    el('span', { class: 'leise klein' }, episch('Lager ausbauen →', 'Ausbau →')));
}

function heldKachel(spiel) {
  return el('a', { class: 'karte held-kachel', href: '#/held' },
    el('div', { class: 'level-kreis klein' }, el('span', {}, 'Lvl'), el('strong', {}, String(spiel.level.level))),
    el('div', { class: 'held-kachel-text' },
      el('strong', {}, episch(spiel.klasse.episch, spiel.klasse.schlicht)),
      el('div', { class: 'balken mini' }, el('div', { style: `width:${Math.round(spiel.level.anteil * 100)}%;background:var(--verlauf)` })),
      el('span', { class: 'leise klein' }, spiel.raenge.gesamt ? `Rang: ${rangName(spiel.raenge.gesamt)}` : `${spiel.bewertungen.filter((b) => b.stufe >= 0).length} Erfolge`)),
    rangEmblem(spiel.raenge.gesamt, 40));
}

function lagerfeuer(profil, typ, notiz, jetzt, spruch) {
  const mitBrom = bromAn() && document.documentElement.dataset.stil !== 'schlicht';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 360 190');
  svg.setAttribute('class', 'feuer-szene');
  svg.setAttribute('data-stufe', '3');
  svg.setAttribute('aria-hidden', 'true');
  const funken = Array.from({ length: 10 }, (_, i) => {
    const x = 165 + ((i * 37) % 32);
    return `<circle class="funke" cx="${x}" cy="128" r="${1.2 + (i % 3) * 0.6}" style="animation-delay:${(i * 0.37).toFixed(2)}s;--drift:${((i % 5) - 2) * 9}px"/>`;
  }).join('');
  svg.innerHTML = `
    <defs>
      <radialGradient id="glut-schein" cx="50%" cy="75%" r="50%">
        <stop offset="0" style="stop-color: var(--akzent); stop-opacity:.55"/>
        <stop offset="1" style="stop-color: var(--akzent); stop-opacity:0"/>
      </radialGradient>
      <linearGradient id="flamme-aussen" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" style="stop-color: var(--akzent-2)"/><stop offset="1" style="stop-color: var(--akzent)"/>
      </linearGradient>
    </defs>
    <ellipse class="glut-schein" cx="180" cy="140" rx="150" ry="70" fill="url(#glut-schein)"/>
    <ellipse cx="180" cy="168" rx="92" ry="12" class="boden"/>
    <g class="steine">
      ${[[112, 160], [128, 166], [148, 170], [212, 170], [232, 166], [248, 160]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="11" ry="7"/>`).join('')}
    </g>
    <g class="scheite">
      <rect x="128" y="146" width="108" height="14" rx="7" transform="rotate(-14 182 153)"/>
      <rect x="124" y="146" width="108" height="14" rx="7" transform="rotate(14 178 153)"/>
    </g>
    <g class="flammen">
      <path class="flamme f1" d="M180 152c-26 0-38-16-33-35 4-15 17-22 20-37 6 10 9 15 11 20 1-15 7-30 16-39 2 19 19 31 23 51 4 22-9 40-37 40Z" fill="url(#flamme-aussen)"/>
      <path class="flamme f2" d="M180 152c-17 0-25-11-21-24 3-10 12-15 15-26 5 11 13 17 16 26 2-7 5-11 9-15 3 14 3 39-19 39Z"/>
      <path class="flamme f3" d="M180 152c-9 0-13-6-11-13 2-6 7-9 9-15 4 7 11 11 12 18 1 6-3 10-10 10Z"/>
    </g>
    <g class="funken">${funken}</g>
    ${mitBrom ? `<g class="brom-im-lager" transform="translate(226 40) scale(0.6)">${bromMarkup('lagerbrom')}</g>` : ''}`;

  return el('section', { class: 'karte lagerfeuer' },
    el('div', { class: 'feuer-buehne' }, svg),
    mitBrom ? el('p', { class: 'brom-spruch' }, el('strong', {}, 'Brom: '), spruch) : null,
    el('div', { class: 'lager-text' },
      el('p', { class: 'lager-gruss' }, begruessung(profil)),
      el('p', { class: 'leise klein' }, datumFormat.format(jetzt)),
      el('div', { class: 'chips' },
        el('span', { class: 'marke' }, typ.name),
        notiz ? el('span', { class: 'marke' }, notiz) : null,
        typ.extraKcal ? el('span', { class: 'marke' }, `+${zahl(typ.extraKcal)} kcal Training`) : null),
      el('p', { class: 'feuer-serie' })));
}

function kachel(href, iconName, titel, ...inhalt) {
  return el('a', { class: 'hub-kachel', href },
    el('div', { class: 'hub-kachel-kopf' }, el('span', { class: 'kachel-icon klein' }, icon(iconName, 18)), el('strong', {}, titel)),
    ...inhalt);
}

function miniRing(anteil) {
  const r = 22;
  const u = 2 * Math.PI * r;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 56 56');
  svg.setAttribute('class', 'mini-ring');
  svg.innerHTML = `<circle cx="28" cy="28" r="${r}" class="ring-spur" style="stroke-width:7"/>
    <circle cx="28" cy="28" r="${r}" style="fill:none;stroke:var(--akzent);stroke-width:7;stroke-linecap:round"
      stroke-dasharray="${u}" stroke-dashoffset="${u * (1 - Math.min(1, anteil))}" transform="rotate(-90 28 28)"/>`;
  return svg;
}

function ernaehrungsKachel(typ, ist) {
  const kcal = ist.kcal ?? 0;
  const uebrig = Math.round(typ.kcal - kcal);
  return kachel('#/heute', 'lebensmittel', episch('Tafel', 'Ernährung'),
    el('div', { class: 'hub-zeile' },
      miniRing(typ.kcal ? kcal / typ.kcal : 0),
      el('div', {},
        el('strong', { class: 'hub-zahl' }, zahl(Math.abs(uebrig))),
        el('span', { class: 'leise klein' }, uebrig >= 0 ? ' kcal übrig' : ' kcal drüber'),
        el('p', { class: 'leise klein' }, `Protein ${zahl(Math.round(ist.protein ?? 0))} / ${zahl(typ.protein)} g`))));
}

function trainingsKachel(vorlagen, tag, jetzt) {
  const geplant = vorlagenFuerTag(vorlagen, jetzt);
  const erledigt = erledigteVorlagen(tag);
  const offen = geplant.filter((v) => !erledigt.has(v.id));
  const fertig = (tag.trainings ?? []).filter((t) => t.ende || t.typ === 'aktivitaet').length;
  return kachel('#/training', 'hantel', episch('Übungsplatz', 'Training'),
    offen.length
      ? el('p', {}, el('strong', {}, offen[0].name), offen[0].uhrzeit ? el('span', { class: 'leise klein' }, ` · ${offen[0].uhrzeit}`) : null)
      : el('p', {}, el('strong', {}, geplant.length ? '✓ Alles erledigt' : episch('Ruhetag – sammle Kraft', 'Ruhetag'))),
    el('p', { class: 'leise klein' },
      offen.length > 1 ? `danach: ${offen.slice(1).map((v) => v.name).join(', ')}` : `${fertig} Einheit${fertig === 1 ? '' : 'en'} heute`));
}

function wasserKachel(profil, typ, tag) {
  const k = el('div', { class: 'hub-kachel' });
  const ml = profil.wasser.presetsMl[0] ?? 250;
  const zeichne = () => {
    const gesamt = wasserSumme(tag.wasser);
    setze(k,
      el('div', { class: 'hub-kachel-kopf' }, el('span', { class: 'kachel-icon klein' }, icon('wasser', 18)), el('strong', {}, episch('Quelle', 'Wasser'))),
      el('p', {}, el('strong', { class: 'hub-zahl' }, zahl(gesamt / 1000)), el('span', { class: 'leise klein' }, ` / ${zahl(typ.wasserBisMittagMl / 1000)} l`)),
      el('button', {
        class: 'knopf zweitrangig', type: 'button',
        onclick: async () => { tag.wasser.push({ ml, zeit: new Date().toISOString() }); await speichereTag(tag); zeichne(); },
      }, `+${zahl(ml)} ml`));
  };
  zeichne();
  return k;
}

function gewichtsKachel(tag, gewichte) {
  const letzte = gewichte.at(-1);
  return kachel('#/heute', 'gewicht', 'Gewicht',
    tag.gewichtKg
      ? el('p', {}, el('strong', { class: 'hub-zahl' }, zahl(tag.gewichtKg)), el('span', { class: 'leise klein' }, ' kg heute'))
      : el('p', {}, el('strong', {}, episch('Noch nicht gewogen', 'Noch nicht gewogen'))),
    el('p', { class: 'leise klein' }, letzte && !tag.gewichtKg ? `zuletzt ${zahl(letzte.kg)} kg` : 'Eintragen unter Ernährung'));
}
