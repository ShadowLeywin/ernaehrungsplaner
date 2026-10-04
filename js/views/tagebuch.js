// Tagebuch: heutiger Eintrag (Stimmung, Energie, Schlaf, Text) und Chronik vergangener Tage – episch oder schlicht.
import { el, setze, zahl } from '../ui.js';
import { icon } from '../icons.js';
import { episch } from '../darstellung.js';
import { alleEintraege } from '../db.js';
import { holeProfil, holeTag, speichereTag } from '../state.js';
import { holeLebensmittel } from '../lebensmittel.js';
import { datumSchluessel } from '../logic/ziele.js';
import { chronik, tagHatInhalt, STIMMUNGEN } from '../logic/chronik.js';
import { verzeichnis } from '../spiel.js';

const datumLang = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
const alsDatum = (s) => new Date(`${s}T12:00:00`);

export const tagebuch = {
  get titel() { return episch('Chronik', 'Tagebuch'); },
  reiter: 'mehr',
  render() {
    const wurzel = el('div', {}, el('p', { class: 'leise' }, 'Lade …'));
    lade(wurzel);
    return wurzel;
  },
};

async function lade(wurzel) {
  const [profil, daten, eintraege, heute] = await Promise.all([
    holeProfil(), holeLebensmittel(), alleEintraege('tage'), holeTag(datumSchluessel(new Date())),
  ]);
  const kontext = { profil, lebensmittel: daten.lebensmittel, verzeichnis };
  const stil = document.documentElement.dataset.stil === 'schlicht' ? 'schlicht' : 'episch';
  const vergangen = eintraege.map(([, t]) => t)
    .filter((t) => t.datum < heute.datum && tagHatInhalt(t))
    .sort((a, b) => b.datum.localeCompare(a.datum))
    .slice(0, 60);

  setze(wurzel,
    heuteKarte(heute, kontext, stil),
    vergangen.length ? el('h2', { class: 'abschnitt' }, episch('Frühere Kapitel', 'Frühere Tage')) : null,
    ...vergangen.map((t) => el('details', { class: 'karte chronik-tag' },
      el('summary', {},
        el('span', {}, el('strong', {}, datumLang.format(alsDatum(t.datum))),
          t.tagebuch?.stimmung ? el('span', { class: 'chronik-stimmung' }, ` ${STIMMUNGEN[t.tagebuch.stimmung - 1]}`) : null),
        t.tagebuch?.text ? el('p', { class: 'leise klein chronik-vorschau' }, t.tagebuch.text.slice(0, 90) + (t.tagebuch.text.length > 90 ? ' …' : '')) : null),
      t.tagebuch?.text ? el('p', { class: 'chronik-text' }, t.tagebuch.text) : null,
      metaZeile(t.tagebuch),
      el('ul', { class: 'liste-einfach chronik-liste' }, ...chronik(t, kontext, stil).map((satz) => el('li', {}, satz))))),
    vergangen.length ? null : el('p', { class: 'leise klein', style: 'text-align:center' }, 'Vergangene Tage erscheinen hier automatisch als Chronik.'));
}

function metaZeile(tb) {
  if (!tb) return null;
  const teile = [
    tb.energie ? `Energie ${tb.energie}/5` : null,
    tb.schlafH ? `Schlaf ${zahl(tb.schlafH)} h` : null,
  ].filter(Boolean);
  return teile.length ? el('p', { class: 'leise klein' }, teile.join(' · ')) : null;
}

function heuteKarte(tag, kontext, stil) {
  tag.tagebuch ??= {};
  const tb = tag.tagebuch;
  const status = el('span', { class: 'leise klein', role: 'status' });
  let timer = null;
  const speichern = () => {
    clearTimeout(timer);
    status.textContent = 'speichert …';
    timer = setTimeout(async () => { await speichereTag(tag); status.textContent = '✓ gespeichert'; }, 600);
  };
  const skala = (wert, setzen, symbole) => {
    const reihe = el('div', { class: 'chips skala' });
    const zeichne = () => setze(reihe, ...symbole.map((s, i) => el('button', {
      type: 'button', class: `chip${wert() === i + 1 ? ' an' : ''}`, 'aria-pressed': String(wert() === i + 1),
      onclick: () => { setzen(wert() === i + 1 ? undefined : i + 1); zeichne(); speichern(); },
    }, s)));
    zeichne();
    return reihe;
  };
  const text = el('textarea', {
    class: 'memo-feld', rows: 6, value: tb.text ?? '',
    placeholder: episch('Was hat der Tag gebracht? Kämpfe, Siege, Gedanken …', 'Notizen zum Tag …'),
    oninput: (e) => { tb.text = e.target.value; speichern(); },
  });
  const schlaf = el('input', {
    type: 'number', inputMode: 'decimal', min: 0, max: 24, step: 0.5, value: tb.schlafH ?? '', placeholder: 'h',
    oninput: (e) => { tb.schlafH = e.target.value === '' ? undefined : e.target.valueAsNumber; speichern(); },
  });
  return el('section', { class: 'karte' },
    el('div', { class: 'zeile' }, el('h2', {}, icon('buch', 20), episch('Heutiges Kapitel', 'Heute')), status),
    el('p', { class: 'leise klein' }, datumLang.format(new Date())),
    el('div', { class: 'feld' }, el('span', {}, 'Stimmung'), skala(() => tb.stimmung, (w) => { tb.stimmung = w; }, STIMMUNGEN)),
    el('div', { class: 'feld' }, el('span', {}, 'Energie'), skala(() => tb.energie, (w) => { tb.energie = w; }, ['1', '2', '3', '4', '5'])),
    el('label', { class: 'feld' }, el('span', {}, 'Schlaf (Stunden)'), schlaf),
    el('label', { class: 'feld', style: 'margin-top:8px' }, el('span', {}, episch('Deine Worte', 'Notiz')), text),
    el('h3', { class: 'abschnitt' }, episch('Was die Chronik festhält', 'Automatische Zusammenfassung')),
    el('ul', { class: 'liste-einfach chronik-liste' }, ...chronik(tag, kontext, stil).map((s) => el('li', {}, s))));
}
