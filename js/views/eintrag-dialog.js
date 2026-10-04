// Dialog: Lebensmittel suchen und Menge festlegen – zum Hinzufügen und Bearbeiten von Einträgen.
import { el, setze, zahl } from '../ui.js';
import { icon } from '../icons.js';
import { sucheLebensmittel } from '../lebensmittel.js';
import { naehrwerteFuerMenge, KATEGORIEN } from '../logic/naehrstoffe.js';
import { pruefeLebensmittel } from '../logic/ernaehrungsweise.js';
import { oeffneScanner } from './scanner.js';

/**
 * optionen: { lebensmittel, titel, eintrag?, beiSpeichern(lebensmittelId, gramm), beiLoeschen?,
 *             beiOhneMenge?(lebensmittelId) – „+“ in der Liste: ohne Menge eintragen, Dialog bleibt offen (Mengen-Memo),
 *             einstellung? – Ernährungsweise/Unverträglichkeiten: Unpassendes wird markiert und nach hinten sortiert }
 * Mit `eintrag` startet der Dialog direkt bei der Mengenauswahl.
 */
export function oeffneEintragDialog(optionen) {
  const dialog = el('dialog', { class: 'dialog' });
  const schliessen = () => { dialog.close(); dialog.remove(); };
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); schliessen(); });
  document.body.append(dialog);

  const kopf = (titel, zurueck) => el('div', { class: 'dialog-kopf' },
    zurueck
      ? el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Zurück', onclick: zurueck }, icon('zurueck'))
      : null,
    el('h2', {}, titel),
    el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Schließen', onclick: schliessen }, icon('schliessen')));

  let nurPassende = true;
  const zeigeAuswahl = () => {
    const liste = el('ul', { class: 'liste auswahl' });
    const suche = el('input', {
      type: 'search',
      placeholder: 'Lebensmittel suchen …',
      'aria-label': 'Lebensmittel suchen',
      oninput: () => zeigeTreffer(),
    });
    const zeigeTreffer = () => {
      const pruefung = (lm) => pruefeLebensmittel(lm, optionen.einstellung);
      const treffer = sucheLebensmittel(optionen.lebensmittel, suche.value)
        .map((lm) => ({ lm, p: pruefung(lm) }))
        .filter(({ p }) => p.passt || !nurPassende)
        .sort((a, b) => Number(b.p.passt) - Number(a.p.passt))
        .slice(0, 60);
      setze(liste, ...treffer.map(({ lm, p }) => el('li', { class: `${optionen.beiOhneMenge ? 'mit-plus' : ''}${p.passt ? '' : ' unpassend'}` },
        el('button', { type: 'button', class: 'auswahl-eintrag', onclick: () => zeigeMenge(lm, lm.stueckG ?? 100) },
          el('span', {}, lm.name, lm.marke ? el('span', { class: 'leise' }, ` · ${lm.marke}`) : null,
            ...[...p.gruende, ...p.hinweise].map((g) => el('span', { class: `marke${p.gruende.includes(g) ? ' warn' : ''}`, style: 'margin-left:6px' }, g))),
          el('span', { class: 'leise klein' }, `${KATEGORIEN[lm.kategorie] ?? 'Eigenes'} · ${zahl(lm.je100g.kcal)} kcal/100 g`)),
        optionen.beiOhneMenge ? el('button', {
          type: 'button', class: 'knopf-klein plus-schnell', 'aria-label': `${lm.name} ohne Menge eintragen`,
          onclick: (e) => {
            optionen.beiOhneMenge(lm.id);
            const knopf = e.currentTarget;
            setze(knopf, icon('haken', 18));
            knopf.classList.add('an');
            hinweis.textContent = `${lm.name} eingetragen – Menge später im Mengen-Memo.`;
          },
        }, icon('plus', 18)) : null)));
    };
    const eingeschraenkt = (optionen.einstellung?.weise ?? 'alles') !== 'alles' || optionen.einstellung?.unvertraeglich?.length;
    const filterKnopf = eingeschraenkt ? el('button', {
      type: 'button', class: `chip${nurPassende ? ' an' : ''}`, 'aria-pressed': String(nurPassende),
      onclick: () => { nurPassende = !nurPassende; filterKnopf.classList.toggle('an', nurPassende); filterKnopf.setAttribute('aria-pressed', String(nurPassende)); zeigeTreffer(); },
    }, 'Nur passende') : null;
    const hinweis = el('p', { class: 'leise klein', role: 'status' },
      optionen.beiOhneMenge ? 'Tipp: „+“ trägt ohne Menge ein – Mengen dann gesammelt im Mengen-Memo.' : '');
    // Neues Lebensmittel von außen: gespeichert, in die Liste übernommen und direkt zur Mengenwahl
    const vonAussen = (modus) => oeffneScanner(modus, (lm) => {
      optionen.lebensmittel = [...optionen.lebensmittel.filter((l) => l.id !== lm.id), lm];
      zeigeMenge(lm, lm.stueckG ?? 100);
    });
    const extern = el('div', { class: 'chips' },
      el('button', { class: 'chip', type: 'button', onclick: () => vonAussen('barcode') }, icon('barcode', 16), 'Barcode'),
      el('button', { class: 'chip', type: 'button', onclick: () => vonAussen('suche') }, '🌐 Online / Marke'),
      el('button', { class: 'chip', type: 'button', onclick: () => vonAussen('eigen') }, icon('stift', 16), 'Selbst anlegen'),
      filterKnopf);
    setze(dialog, kopf(optionen.titel), el('div', { class: 'dialog-inhalt' }, suche, extern, hinweis, liste));
    zeigeTreffer();
    suche.focus();
  };

  const zeigeMenge = (lm, startGramm) => {
    const vorschau = el('p', { class: 'vorschau' });
    const menge = el('input', {
      type: 'number',
      inputMode: 'decimal',
      min: 1,
      step: 'any',
      value: startGramm,
      'aria-label': 'Menge in Gramm',
      oninput: () => aktualisiere(),
    });
    const gramm = () => (Number.isFinite(menge.valueAsNumber) ? menge.valueAsNumber : 0);
    const speichern = el('button', { class: 'knopf', type: 'button' }, optionen.eintrag ? 'Speichern' : 'Hinzufügen');
    const aktualisiere = () => {
      const w = naehrwerteFuerMenge(lm.je100g, gramm());
      vorschau.textContent = `${zahl(Math.round(w.kcal))} kcal · P ${zahl(w.protein)} g · KH ${zahl(w.kh)} g · F ${zahl(w.fett)} g`;
      speichern.disabled = gramm() <= 0;
    };
    speichern.addEventListener('click', () => {
      if (gramm() <= 0) return;
      optionen.beiSpeichern(lm.id, gramm());
      schliessen();
    });
    menge.addEventListener('keydown', (e) => { if (e.key === 'Enter') speichern.click(); });

    const schnell = [
      ...(lm.stueckG ? [[`1 Stück (${lm.stueckG} g)`, lm.stueckG], [`2 Stück`, lm.stueckG * 2]] : []),
      ...[50, 100, 150, 200, 250].map((g) => [`${g} g`, g]),
    ];

    setze(dialog,
      kopf(lm.name, optionen.eintrag ? null : zeigeAuswahl),
      el('div', { class: 'dialog-inhalt' },
        el('label', { class: 'feld' }, el('span', {}, 'Menge (g)'), menge),
        el('div', { class: 'chips' }, ...schnell.map(([text, g]) => el('button', {
          class: 'chip',
          type: 'button',
          onclick: () => { menge.value = g; aktualisiere(); },
        }, text))),
        vorschau,
        el('div', { class: 'knopfreihe' },
          speichern,
          optionen.eintrag && optionen.beiLoeschen
            ? el('button', {
              class: 'knopf zweitrangig gefahr',
              type: 'button',
              onclick: () => { optionen.beiLoeschen(); schliessen(); },
            }, 'Löschen')
            : null)),
    );
    aktualisiere();
    menge.select();
  };

  dialog.showModal();
  if (optionen.eintrag) {
    const lm = optionen.lebensmittel.find((l) => l.id === optionen.eintrag.lebensmittelId);
    if (lm) zeigeMenge(lm, optionen.eintrag.gramm);
    else zeigeAuswahl();
  } else {
    zeigeAuswahl();
  }
}
