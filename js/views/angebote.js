// Angebote: Import (Datei oder gehostete Datei), Märkte ein-/ausschalten, Angebote mit Bezug zu deinen Lebensmitteln.
import { el, setze, schalter } from '../ui.js';
import { icon } from '../icons.js';
import { episch } from '../darstellung.js';
import { holeLebensmittel } from '../lebensmittel.js';
import { aktuelleAngebote, zugeordnetesLebensmittel, preisText, KATEGORIE_NAMEN } from '../logic/angebote.js';
import { datumSchluessel } from '../logic/ziele.js';
import {
  holeAngebotsDaten, speichereAngebotsEinstellungen, importiereAngebote, ladeAngeboteVonUrl,
} from '../angebote-speicher.js';

let nurPassende = false;

export const angebote = {
  get titel() { return episch('Marktschreier', 'Angebote'); },
  reiter: 'woche',
  render() {
    const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
    lade(wurzel);
    return wurzel;
  },
};

async function lade(wurzel) {
  const [{ daten, einstellungen }, lm] = await Promise.all([holeAngebotsDaten(), holeLebensmittel()]);
  const neu = () => lade(wurzel);
  const status = el('p', { class: 'klein', role: 'status' });

  const datei = el('input', {
    type: 'file', accept: '.json,application/json',
    onchange: async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const r = await importiereAngebote(await f.text());
      if (r.fehler) { status.textContent = r.fehler; status.className = 'warnung klein'; } else neu();
    },
  });
  const url = el('input', { type: 'url', value: einstellungen.url, placeholder: 'https://… /angebote.json', 'aria-label': 'Adresse der Angebotsdatei' });
  const abrufen = async () => {
    status.textContent = 'Lade …';
    einstellungen.url = url.value.trim();
    await speichereAngebotsEinstellungen(einstellungen);
    const r = await ladeAngeboteVonUrl(einstellungen.url);
    if (r.fehler) { status.textContent = r.fehler; status.className = 'warnung klein'; } else neu();
  };

  const importKarte = el('details', { class: 'karte', open: !daten },
    el('summary', {}, el('strong', {}, daten ? 'Neue Angebote laden' : 'Angebote laden')),
    el('p', { class: 'leise klein' }, 'Die angebote.json erzeugt dein Cowork-Agent. Lade sie als Datei oder hinterlege eine Adresse, unter der sie liegt. Dabei werden keine persönlichen Daten gesendet.'),
    el('label', { class: 'feld' }, el('span', {}, 'Datei'), datei),
    el('div', { class: 'manuell', style: 'margin-top:8px' }, url, el('button', { class: 'knopf zweitrangig', type: 'button', onclick: abrufen }, 'Abrufen')),
    status);

  if (!daten) {
    setze(wurzel, el('section', { class: 'karte willkommen' },
      el('div', { class: 'logo' }, icon('angebote', 34)),
      el('h2', {}, 'Noch keine Angebote'),
      el('p', { class: 'leise' }, 'Lade die Angebote der Woche, dann siehst du hier die besten Deals – und Hinweise direkt in Einkaufsliste und Wochenplan.')),
    importKarte);
    return;
  }

  const aktiv = einstellungen.aktiv ? new Set(einstellungen.aktiv) : null;
  const istAktiv = (id) => !aktiv || aktiv.has(id);
  const setzeMarkt = async (id, an) => {
    const menge = new Set(einstellungen.aktiv ?? daten.maerkte.map((m) => m.id));
    if (an) menge.add(id); else menge.delete(id);
    einstellungen.aktiv = [...menge];
    await speichereAngebotsEinstellungen(einstellungen);
    neu();
  };
  const liste = aktuelleAngebote(daten, { heute: datumSchluessel(new Date()), aktiv, nurEssbar: einstellungen.nurEssbar })
    .map((a) => ({ a, lm: zugeordnetesLebensmittel(a, lm.basis) }))
    .filter((x) => !nurPassende || x.lm);

  setze(wurzel,
    el('section', { class: 'karte' },
      el('div', { class: 'zeile' }, el('h2', {}, daten.kalenderwoche ? `Woche ${daten.kalenderwoche.split('-W')[1] ?? ''}` : 'Angebote'),
        el('span', { class: 'leise klein' }, `${liste.length} Angebote`)),
      daten.hinweis ? el('p', { class: 'leise klein' }, daten.hinweis) : null,
      el('details', {},
        el('summary', { class: 'klein' }, `Märkte (${daten.maerkte.filter((m) => istAktiv(m.id)).length} von ${daten.maerkte.length} aktiv)`),
        ...daten.maerkte.map((m) => schalter(istAktiv(m.id), (an) => setzeMarkt(m.id, an), `${m.haendler} ${m.ort}`))),
      schalter(einstellungen.nurEssbar, async (an) => { einstellungen.nurEssbar = an; await speichereAngebotsEinstellungen(einstellungen); neu(); }, 'Nur Lebensmittel und Getränke'),
      schalter(nurPassende, (an) => { nurPassende = an; neu(); }, 'Nur Angebote zu Lebensmitteln aus der Datenbank')),
    ...liste.map(({ a, lm: passend }) => el('div', { class: 'karte angebot' },
      el('div', { class: 'zeile' },
        el('strong', {}, a.produkt, a.marke ? el('span', { class: 'leise' }, ` · ${a.marke}`) : null),
        a.rabatt ? el('span', { class: 'marke' }, `−${a.rabatt} %`) : null),
      el('p', { class: 'klein' }, preisText(a)),
      el('p', { class: 'leise klein' }, `${a.markt}${a.bis ? ` · bis ${a.bis.slice(8, 10)}.${a.bis.slice(5, 7)}.` : ''}${ESSBAR_TEXT(a)}`),
      passend ? el('p', { class: 'klein' }, '↳ passt zu ', el('strong', {}, passend.name)) : null)),
    importKarte);
}

const ESSBAR_TEXT = (a) => (a.kategorie && a.kategorie !== 'lebensmittel' ? ` · ${KATEGORIE_NAMEN[a.kategorie] ?? a.kategorie}` : '');
