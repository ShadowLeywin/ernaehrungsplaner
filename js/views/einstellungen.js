// Profil & Einstellungen: Tagestypen mit Zielen, Wochenzuordnung, Mahlzeitenverteilung.
import { el, zahl, zahlFeld, textFeld } from '../ui.js';
import { holeProfil, speichereProfil } from '../state.js';
import { kcalAusMakros, skaliereMakros, summeAnteile } from '../logic/ziele.js';
import { WOCHENTAGE } from '../logic/profil.js';

export const einstellungen = {
  titel: 'Profil & Einstellungen',
  reiter: 'mehr',
  render() {
    const wurzel = el('div');
    holeProfil().then((profil) => zeichne(wurzel, profil, false));
    return wurzel;
  },
};

function zeichne(wurzel, profil, geaendert) {
  const status = el('p', { class: 'status', role: 'status' });
  const speichern = el('button', { class: 'knopf', type: 'button' }, 'Speichern');

  const pruefe = () => {
    const summe = summeAnteile(profil.mahlzeiten);
    speichern.disabled = summe !== 100;
    if (summe !== 100) status.textContent = `Die Mahlzeitenverteilung ergibt ${zahl(summe)} % statt 100 %.`;
    else status.textContent = geaendert ? 'Ungespeicherte Änderungen' : '';
  };
  const markiereGeaendert = () => { geaendert = true; pruefe(); };

  speichern.addEventListener('click', async () => {
    await speichereProfil(profil);
    geaendert = false;
    pruefe();
    status.textContent = 'Gespeichert ✓';
  });

  const neuZeichnen = () => zeichne(wurzel, profil, true);

  wurzel.replaceChildren(
    el('h2', { class: 'abschnitt' }, 'Tagestypen und Ziele'),
    ...profil.tagestypen.map((typ) => tagestypKarte(typ, profil, markiereGeaendert, neuZeichnen)),
    el('h2', { class: 'abschnitt' }, 'Wochenzuordnung'),
    wochenKarte(profil, markiereGeaendert),
    el('h2', { class: 'abschnitt' }, 'Verteilung auf die Mahlzeiten'),
    mahlzeitenKarte(profil, markiereGeaendert),
    el('div', { class: 'speicherleiste' }, status, speichern),
  );
  pruefe();
}

function tagestypKarte(typ, profil, markiereGeaendert, neuZeichnen) {
  const basis = profil.tagestypen.find((t) => t.basis) ?? profil.tagestypen[0];
  const kontrolle = el('p', { class: 'leise klein' });
  const vorschlagBereich = el('div');

  const aktualisiereKontrolle = () => {
    const ausMakros = kcalAusMakros(typ);
    const differenz = ausMakros - typ.kcal;
    kontrolle.textContent = `Makros ergeben ${zahl(ausMakros)} kcal`
      + (Math.abs(differenz) > 25 ? ` – ${differenz > 0 ? '+' : ''}${zahl(differenz)} kcal zum Ziel` : ' ✓');
    kontrolle.classList.toggle('warnung', Math.abs(differenz) > 25);
  };

  const feld = (beschriftung, schluessel, einheit) => zahlFeld(beschriftung, typ[schluessel], einheit, (wert) => {
    typ[schluessel] = wert;
    aktualisiereKontrolle();
    markiereGeaendert();
  });

  const zeigeVorschlag = () => {
    const vorschlag = skaliereMakros(basis, typ.kcal);
    vorschlagBereich.replaceChildren(el('div', { class: 'vorschlag' },
      el('p', {},
        el('strong', {}, 'Vorschlag: '),
        `Protein ${vorschlag.protein} g · KH ${vorschlag.kh} g · Fett ${vorschlag.fett} g`,
        el('br'),
        el('span', { class: 'leise klein' },
          `= ${zahl(kcalAusMakros(vorschlag))} kcal. Protein bleibt wie am ${basis.name}, KH und Fett im gleichen Verhältnis.`)),
      el('div', { class: 'knopfreihe' },
        el('button', {
          class: 'knopf',
          type: 'button',
          onclick: () => { Object.assign(typ, vorschlag); neuZeichnen(); },
        }, 'Übernehmen'),
        el('button', {
          class: 'knopf zweitrangig',
          type: 'button',
          onclick: () => vorschlagBereich.replaceChildren(),
        }, 'Verwerfen'))));
  };

  const karte = el('section', { class: 'karte' },
    el('div', { class: 'felder' },
      textFeld('Name', typ.name, (wert) => { typ.name = wert; markiereGeaendert(); }),
      feld('Kalorienziel', 'kcal', 'kcal'),
      feld('Protein', 'protein', 'g'),
      feld('Kohlenhydrate', 'kh', 'g'),
      feld('Fett', 'fett', 'g')),
    kontrolle,
    typ.basis
      ? el('p', { class: 'leise klein' }, 'Basistag – die anderen Tage werden aus ihm skaliert.')
      : el('button', { class: 'knopf zweitrangig', type: 'button', onclick: zeigeVorschlag },
        `Makros aus ${basis.name} vorschlagen`),
    vorschlagBereich,
    el('details', {},
      el('summary', {}, 'Weitere Tagesziele'),
      el('div', { class: 'felder' },
        feld('Gemüse', 'gemueseG', 'g'),
        feld('Obst', 'obstG', 'g'),
        feld('Ballaststoffe min.', 'ballaststoffeMinG', 'g'),
        feld('Ballaststoffe max.', 'ballaststoffeMaxG', 'g'),
        feld('Wasser bis Mittag', 'wasserBisMittagMl', 'ml'))));

  aktualisiereKontrolle();
  return karte;
}

function wochenKarte(profil, markiereGeaendert) {
  const zeilen = WOCHENTAGE.map((tag, i) => {
    const eintrag = profil.woche[i];
    const auswahl = el('select', {
      onchange: () => { eintrag.tagestyp = auswahl.value; markiereGeaendert(); },
    }, ...profil.tagestypen.map((t) => el('option', { value: t.id, selected: t.id === eintrag.tagestyp }, t.name)));
    const notiz = el('input', {
      type: 'text',
      value: eintrag.notiz,
      placeholder: 'Notiz',
      'aria-label': `Notiz ${tag}`,
      oninput: () => { eintrag.notiz = notiz.value; markiereGeaendert(); },
    });
    return el('div', { class: 'wochenzeile' }, el('span', { class: 'wochentag' }, tag.slice(0, 2)), auswahl, notiz);
  });
  return el('section', { class: 'karte' }, ...zeilen);
}

function mahlzeitenKarte(profil, markiereGeaendert) {
  const summe = el('p', { class: 'leise klein' });
  const aktualisiereSumme = () => {
    const s = summeAnteile(profil.mahlzeiten);
    summe.textContent = `Summe: ${zahl(s)} %${s === 100 ? ' ✓' : ' – muss 100 % ergeben'}`;
    summe.classList.toggle('warnung', s !== 100);
  };
  const felder = profil.mahlzeiten.map((m) => zahlFeld(m.name, m.anteil, '%', (wert) => {
    m.anteil = wert;
    aktualisiereSumme();
    markiereGeaendert();
  }));
  aktualisiereSumme();
  return el('section', { class: 'karte' },
    el('p', { class: 'leise klein' }, 'Morning Stack und Supplements werden vorher vom Tagesziel abgezogen.'),
    el('div', { class: 'felder' }, ...felder),
    summe);
}
