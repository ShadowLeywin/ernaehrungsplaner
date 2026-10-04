// Maße & Fotos: Körpermaße eintragen und verfolgen, Gewichts-Prognose, Bulk-Bericht, Fortschrittsfotos (nur lokal).
import { el, setze, zahl } from '../ui.js';
import { icon } from '../icons.js';
import { episch } from '../darstellung.js';
import { alleEintraege } from '../db.js';
import { holeProfil, holeTag, speichereTag } from '../state.js';
import { datumSchluessel } from '../logic/ziele.js';
import { gewichtsReihe, durchschnitt } from '../logic/gewicht.js';
import { zielGewicht } from '../logic/bedarf.js';
import { MASSE, massReihe, aenderung, prognose, bulkBericht } from '../logic/koerpermasse.js';
import { verzeichnis } from '../spiel.js';
import { linienDiagramm } from './fortschritt.js';
import { speichereFoto, holeFotos, loescheFoto } from '../fotos.js';

const datumKurz = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'numeric', year: '2-digit' });
const kurz = (d) => datumKurz.format(new Date(`${d}T12:00:00`));
const vz = (x) => `${x > 0 ? '+' : x < 0 ? '−' : '±'}${zahl(Math.abs(x))}`;
let gewaehltesMass = 'arm';

export const masse = {
  titel: 'Maße & Fotos',
  reiter: 'mehr',
  render() {
    const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
    lade(wurzel);
    return wurzel;
  },
};

async function lade(wurzel) {
  const [eintraege, profil, heute, fotos] = await Promise.all([
    alleEintraege('tage'), holeProfil(), holeTag(datumSchluessel(new Date())), holeFotos().catch(() => []),
  ]);
  const tage = eintraege.map(([, t]) => t);
  const reihe = gewichtsReihe(tage);
  const neu = () => lade(wurzel);
  setze(wurzel,
    prognoseKarte(profil, reihe),
    bulkKarte(profil, tage, reihe),
    eingabeKarte(heute, neu),
    verlaufKarte(tage, neu),
    fotoKarte(fotos, neu));
}

function prognoseKarte(profil, reihe) {
  const ziel = profil.ziel;
  const start = ziel.startDatum ? reihe.filter((m) => m.datum >= ziel.startDatum) : [];
  const startKg = start.length ? durchschnitt(start, start[Math.min(6, start.length - 1)].datum, 7, 1) : reihe[0]?.kg;
  const zielKg = startKg != null && ziel.art !== 'halten' ? zielGewicht(startKg, ziel) : null;
  const p = prognose(reihe, zielKg);
  if (!p) {
    return el('section', { class: 'karte' }, el('h2', {}, '🔮 Prognose'),
      el('p', { class: 'leise klein' }, 'Ab etwa 6 Wiegungen in den letzten 4 Wochen siehst du hier, wohin die Reise geht.'));
  }
  return el('section', { class: 'karte hero' },
    el('h2', {}, episch('🔮 Blick in die Glut', '🔮 Prognose')),
    el('div', { class: 'statistik' },
      el('div', { class: 'stat' }, el('strong', {}, `${zahl(p.jetztKg)}`), el('span', {}, 'kg Trend heute')),
      el('div', { class: 'stat' }, el('strong', {}, `${vz(p.rateProWoche)}`), el('span', {}, 'kg pro Woche')),
      el('div', { class: 'stat' }, el('strong', {}, zielKg ? zahl(zielKg) : '–'), el('span', {}, 'kg Ziel'))),
    el('p', { class: 'klein' }, p.datum
      ? `Bei diesem Tempo erreichst du ${zahl(zielKg)} kg etwa am ${kurz(p.datum)} (in ${p.tageBis} Tagen).`
      : zielKg ? 'Der Trend zeigt gerade nicht Richtung Ziel – schau in die Kalorien-Anpassung unter Gewicht.' : 'Kein Gewichtsziel gesetzt.'),
    el('p', { class: 'leise klein' }, 'Trend aus den letzten 4 Wochen (Ausgleichsgerade), Schwankungen durch Wasser sind normal.'));
}

function bulkKarte(profil, tage, reihe) {
  const b = bulkBericht(tage, reihe, profil.ziel.startDatum, verzeichnis);
  if (!b) return null;
  const text = { sauber: 'Sauberer Aufbau – die Taille wächst kaum mit.', ok: 'Im Rahmen – etwas Fett kommt mit, das ist normal.', zu_schnell: 'Die Taille wächst schnell mit – evtl. Überschuss etwas senken.' };
  return el('section', { class: 'karte' },
    el('h2', {}, episch('📜 Bericht der Phase', '📜 Phasen-Bericht')),
    el('p', { class: 'leise klein' }, `Seit ${kurz(profil.ziel.startDatum)}`),
    el('ul', { class: 'liste-einfach' },
      el('li', {}, `Gewicht: ${vz(b.kgDiff)} kg`),
      b.taille ? el('li', {}, `Taille: ${vz(b.taille.diff)} cm`) : null,
      b.arm ? el('li', {}, `Oberarm: ${vz(b.arm.diff)} cm`) : null,
      ...b.kraft.map((k) => el('li', {}, `${verzeichnis.get(k.uebungId)?.name}: ${zahl(k.von)} → ${zahl(k.bis)}${k.uebungId === 'klimmzuege' ? ' Wdh' : ' kg (1RM)'}`))),
    b.bewertung ? el('p', { class: 'klein' }, el('strong', {}, `${zahl(b.cmJeKg)} cm Taille je kg: `), text[b.bewertung]) : null,
    el('p', { class: 'leise klein' }, 'Grobe Faustregel, keine Messung von Fett und Muskel. Am aussagekräftigsten zusammen mit Fotos.'));
}

function eingabeKarte(heute, neu) {
  heute.masse ??= {};
  const status = el('span', { class: 'leise klein', role: 'status' });
  let timer;
  return el('section', { class: 'karte' },
    el('div', { class: 'zeile' }, el('h2', {}, '📏 Heute messen'), status),
    el('p', { class: 'leise klein' }, 'Morgens, entspannt, Maßband waagerecht. Einmal pro Woche reicht.'),
    el('div', { class: 'felder' }, ...Object.entries(MASSE).map(([id, m]) => el('label', { class: 'feld' }, el('span', {}, `${m.name} (cm)`),
      el('input', {
        type: 'number', inputMode: 'decimal', min: 0, step: 0.1, value: heute.masse[id] ?? '',
        oninput: (e) => {
          if (e.target.value === '') delete heute.masse[id]; else heute.masse[id] = e.target.valueAsNumber;
          status.textContent = 'speichert …';
          clearTimeout(timer);
          timer = setTimeout(async () => { await speichereTag(heute); status.textContent = '✓ gespeichert'; }, 700);
        },
        onchange: () => setTimeout(neu, 900),
      })))));
}

function verlaufKarte(tage, neu) {
  const r = massReihe(tage, gewaehltesMass);
  const vor4 = datumSchluessel(new Date(Date.now() - 28 * 864e5));
  return el('section', { class: 'karte' },
    el('h2', {}, 'Verlauf'),
    el('div', { class: 'chips scroll' }, ...Object.entries(MASSE).map(([id, m]) => el('button', {
      class: `chip${gewaehltesMass === id ? ' an' : ''}`, type: 'button', onclick: () => { gewaehltesMass = id; neu(); },
    }, m.name.split(' ')[0]))),
    r.length >= 2 ? linienDiagramm(r.map((m) => ({ x: m.datum, y: m.cm })), 'cm') : el('p', { class: 'leise klein' }, 'Ab zwei Messungen erscheint hier der Verlauf.'),
    r.length ? el('p', { class: 'klein' }, `Zuletzt ${zahl(r.at(-1).cm)} cm (${kurz(r.at(-1).datum)})`,
      aenderung(r, vor4) ? ` · 4 Wochen: ${vz(aenderung(r, vor4).diff)} cm` : '',
      aenderung(r) ? ` · gesamt: ${vz(aenderung(r).diff)} cm` : '') : null);
}

function fotoKarte(fotos, neu) {
  let pose = 'vorn';
  const status = el('p', { class: 'leise klein', role: 'status' });
  // Zwei Eingaben: Kamera (capture) und Galerie (ohne capture – sonst öffnet Android nur die Kamera)
  const eingabe = (kamera) => el('input', {
    type: 'file', accept: 'image/*', hidden: true, ...(kamera ? { capture: 'environment' } : {}),
    onchange: async (e) => {
      const datei = e.target.files?.[0];
      if (!datei) return;
      status.textContent = 'Speichere …';
      // Aus der Galerie: Aufnahmedatum der Datei übernehmen (ältere Fotos landen am richtigen Tag)
      const datum = kamera || !datei.lastModified ? new Date() : new Date(datei.lastModified);
      await speichereFoto(datei, datumSchluessel(datum), pose);
      neu();
    },
  });
  const kamera = eingabe(true);
  const galerie = eingabe(false);
  const posen = el('div', { class: 'umschalter', role: 'group', 'aria-label': 'Pose' });
  const zeichnePosen = () => setze(posen, ...[['vorn', 'Vorn'], ['seite', 'Seite'], ['hinten', 'Hinten']].map(([id, text]) => el('button', {
    class: pose === id ? 'aktiv' : '', type: 'button', 'aria-pressed': String(pose === id),
    onclick: () => { pose = id; zeichnePosen(); },
  }, text)));
  zeichnePosen();
  const urls = new Map(fotos.map((f) => [f.id, URL.createObjectURL(f.blob)]));
  const vergleich = vergleichsAnsicht(fotos, urls);
  return el('section', { class: 'karte' },
    el('h2', {}, '📸 Fortschrittsfotos'),
    el('p', { class: 'leise klein' }, 'Bleiben nur auf diesem Handy (nicht im Backup, nie im Internet). Gleiches Licht, gleiche Pose, gleiche Uhrzeit – dann siehst du echten Fortschritt.'),
    posen,
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf', type: 'button', onclick: () => kamera.click() }, icon('kamera', 18), 'Foto aufnehmen'),
      el('button', { class: 'knopf zweitrangig', type: 'button', onclick: () => galerie.click() }, icon('liste', 18), 'Aus Galerie')),
    kamera, galerie,
    status,
    vergleich,
    fotos.length ? el('div', { class: 'foto-raster' }, ...fotos.map((f) => el('figure', { class: 'foto' },
      el('img', { src: urls.get(f.id), alt: `Foto ${f.pose} vom ${kurz(f.datum)}`, loading: 'lazy' }),
      el('figcaption', { class: 'klein' }, `${kurz(f.datum)} · ${f.pose}`,
        el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Foto löschen', onclick: async () => { await loescheFoto(f.id); neu(); } }, icon('muell', 14)))))) : null);
}

/** Vorher/Nachher mit Schieberegler: ältestes und neuestes Foto derselben Pose. */
function vergleichsAnsicht(fotos, urls) {
  const pose = ['vorn', 'seite', 'hinten'].find((p) => fotos.filter((f) => f.pose === p).length >= 2);
  if (!pose) return null;
  const liste = fotos.filter((f) => f.pose === pose);
  const neu = liste[0];
  const alt = liste.at(-1);
  const oben = el('img', { class: 'vergleich-oben', src: urls.get(neu.id), alt: 'Nachher' });
  const setze50 = (v) => { oben.style.clipPath = `inset(0 ${100 - v}% 0 0)`; };
  const regler = el('input', {
    type: 'range', min: 0, max: 100, value: 50, 'aria-label': 'Vorher/Nachher',
    oninput: (e) => setze50(Number(e.target.value)),
  });
  setze50(50);
  return el('div', { class: 'vergleich' },
    el('div', { class: 'vergleich-bild' }, el('img', { src: urls.get(alt.id), alt: 'Vorher' }), oben),
    regler,
    el('p', { class: 'leise klein zeile' }, el('span', {}, `Vorher ${kurz(alt.datum)}`), el('span', {}, `Nachher ${kurz(neu.datum)}`)));
}
