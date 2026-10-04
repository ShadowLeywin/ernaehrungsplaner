// Mengen-Memo: alle Einträge des Tages auf einen Blick mit Mengenfeldern, dazu ein Memo-Feld
// (tippen oder diktieren), das Mengen für vorhandene Einträge setzt und neue Lebensmittel vorschlägt.
import { el, setze, zahl } from '../ui.js';
import { icon } from '../icons.js';
import { naehrwerteFuerMenge } from '../logic/naehrstoffe.js';
import { werteMemoAus } from '../logic/memo.js';
import { neueEintragsId } from '../logic/tag.js';
import { spracheVerfuegbar, spracheErlaubt, diktiere } from '../sprache.js';
import { episch } from '../darstellung.js';

/** Mahlzeit, die zur aktuellen Uhrzeit passt (Frühstück … Abendsnack). */
export function mahlzeitNachUhrzeit(mahlzeiten, jetzt = new Date()) {
  const stunde = jetzt.getHours() + jetzt.getMinutes() / 60;
  const grenzen = [9.5, 11.5, 14.5, 17.5, 20.5];
  const index = grenzen.filter((g) => stunde >= g).length;
  return mahlzeiten[Math.min(index, mahlzeiten.length - 1)]?.id ?? mahlzeiten[0]?.id;
}

/** optionen: { tag, profil, lebensmittel, beiSpeichern() } */
export function oeffneMemoDialog({ tag, profil, lebensmittel, beiSpeichern }) {
  const dialog = el('dialog', { class: 'dialog' });
  let geaendert = false;
  const schliessen = () => {
    dialog.close();
    dialog.remove();
    if (geaendert) beiSpeichern();
  };
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); schliessen(); });
  document.body.append(dialog);

  const nachId = new Map(lebensmittel.map((l) => [l.id, l]));
  const kcalText = (lmId, g) => {
    const lm = nachId.get(lmId);
    return lm && g ? `${zahl(Math.round(naehrwerteFuerMenge(lm.je100g, g).kcal ?? 0))} kcal` : '';
  };

  const listenBereich = el('div');
  const vorschauBereich = el('div');
  const memo = el('textarea', {
    rows: 3,
    class: 'memo-feld',
    placeholder: 'z. B. Skyr 250, Haferflocken 80 g, 2 Äpfel, 1 EL Olivenöl',
    'aria-label': 'Memo mit Mengen',
  });
  const status = el('p', { class: 'leise klein', role: 'status' });

  // ---------- Einträge des Tages mit Mengenfeldern
  const zeichneListe = () => {
    const gruppen = profil.mahlzeiten
      .map((m) => ({ m, eintraege: tag.eintraege.filter((e) => e.mahlzeit === m.id) }))
      .filter((g) => g.eintraege.length);
    const offen = tag.eintraege.filter((e) => e.offen || !e.gramm).length;
    setze(listenBereich,
      el('h3', { class: 'zeile' }, 'Einträge heute', offen ? el('span', { class: 'marke warn' }, `${offen} ohne Menge`) : null),
      gruppen.length ? null : el('p', { class: 'leise klein' }, 'Noch nichts eingetragen. Schreib oder sprich oben, was du gegessen hast.'),
      ...gruppen.map(({ m, eintraege }) => el('div', { class: 'memo-gruppe' },
        el('p', { class: 'leise klein' }, m.name),
        ...eintraege.map((e) => {
          const kcal = el('span', { class: 'leise klein memo-kcal' }, kcalText(e.lebensmittelId, e.gramm));
          const feld = el('input', {
            type: 'number', inputMode: 'decimal', min: 0, step: 'any', value: e.gramm || '', placeholder: 'g',
            class: e.offen || !e.gramm ? 'offen' : '',
            'aria-label': `Menge ${nachId.get(e.lebensmittelId)?.name ?? ''} in Gramm`,
            oninput: () => {
              const g = Number.isFinite(feld.valueAsNumber) ? feld.valueAsNumber : 0;
              e.gramm = g;
              if (g > 0) delete e.offen; else e.offen = true;
              feld.classList.toggle('offen', !g);
              kcal.textContent = kcalText(e.lebensmittelId, g);
              geaendert = true;
            },
          });
          return el('div', { class: 'memo-zeile' },
            el('span', { class: 'memo-name' }, nachId.get(e.lebensmittelId)?.name ?? e.lebensmittelId),
            el('span', { class: 'memo-menge' }, feld, el('span', { class: 'leise' }, 'g')),
            kcal);
        }))));
  };

  // ---------- Memo auswerten
  const werteAus = () => {
    const ergebnis = werteMemoAus(memo.value, lebensmittel, tag.eintraege.filter((e) => e.offen || !e.gramm)
      .concat(tag.eintraege.filter((e) => e.gramm && !e.offen)));
    if (!ergebnis.length) { setze(vorschauBereich, el('p', { class: 'leise klein' }, 'Nichts erkannt. Schreib z. B. „Skyr 250“.')); return; }
    const standardMahlzeit = mahlzeitNachUhrzeit(profil.mahlzeiten);
    const zeilen = ergebnis.map((r) => ({ ...r, an: Boolean(r.lebensmittel && r.gramm), mahlzeit: standardMahlzeit }));
    const uebernehmen = el('button', { class: 'knopf', type: 'button' }, icon('haken', 18), 'Übernehmen');
    uebernehmen.addEventListener('click', () => {
      for (const z of zeilen.filter((x) => x.an && x.lebensmittel && x.gramm > 0)) {
        const vorhanden = z.eintragId ? tag.eintraege.find((e) => e.id === z.eintragId) : null;
        if (vorhanden) { vorhanden.gramm = z.gramm; delete vorhanden.offen; } else {
          tag.eintraege.push({ id: neueEintragsId(), mahlzeit: z.mahlzeit, lebensmittelId: z.lebensmittel.id, gramm: z.gramm, zeit: new Date().toISOString() });
        }
      }
      geaendert = true;
      memo.value = '';
      setze(vorschauBereich);
      status.textContent = episch('Eingetragen. Brom nickt zufrieden.', 'Übernommen.');
      zeichneListe();
    });
    setze(vorschauBereich,
      el('h3', {}, 'Erkannt'),
      ...zeilen.map((z) => {
        const feld = el('input', {
          type: 'number', inputMode: 'decimal', min: 0, step: 'any', value: z.gramm ?? '', placeholder: 'g',
          'aria-label': 'Menge in Gramm',
          oninput: () => { z.gramm = Number.isFinite(feld.valueAsNumber) ? feld.valueAsNumber : 0; },
        });
        const haken = el('input', { type: 'checkbox', checked: z.an, disabled: !z.lebensmittel, onchange: (e) => { z.an = e.target.checked; } });
        return el('div', { class: `memo-zeile${z.lebensmittel ? '' : ' unbekannt'}` },
          el('label', { class: 'memo-name' }, haken,
            z.lebensmittel
              ? el('span', {}, z.lebensmittel.name, el('br'), el('span', { class: 'leise klein' }, z.eintragId ? 'Menge für vorhandenen Eintrag' : `neu: „${z.text}“`))
              : el('span', { class: 'warnung' }, `„${z.text}“ nicht gefunden`)),
          el('span', { class: 'memo-menge' }, feld, el('span', { class: 'leise' }, 'g')),
          z.lebensmittel && !z.eintragId
            ? el('select', { 'aria-label': 'Mahlzeit', onchange: (e) => { z.mahlzeit = e.target.value; } },
              ...profil.mahlzeiten.map((m) => el('option', { value: m.id, selected: m.id === z.mahlzeit }, m.name)))
            : null);
      }),
      el('div', { class: 'knopfreihe' }, uebernehmen));
  };

  // ---------- Diktat (nur wenn erlaubt)
  let stoppe = null;
  const mikro = spracheVerfuegbar() && spracheErlaubt()
    ? el('button', { class: 'knopf zweitrangig', type: 'button' }, '🎤 Diktieren')
    : null;
  mikro?.addEventListener('click', () => {
    if (stoppe) { stoppe(); return; }
    const vorher = memo.value ? `${memo.value.trim()}, ` : '';
    mikro.textContent = '⏹ Stopp';
    mikro.classList.add('aufnahme');
    status.textContent = 'Ich höre zu …';
    stoppe = diktiere(
      (text) => { memo.value = vorher + text; },
      () => { stoppe = null; mikro.textContent = '🎤 Diktieren'; mikro.classList.remove('aufnahme'); status.textContent = ''; werteAus(); },
      (meldung) => { status.textContent = meldung; },
    );
  });

  setze(dialog,
    el('div', { class: 'dialog-kopf' },
      el('h2', {}, episch('Mengen-Memo des Schreibers', 'Mengen-Memo')),
      el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Schließen', onclick: schliessen }, icon('schliessen'))),
    el('div', { class: 'dialog-inhalt' },
      el('p', { class: 'leise klein' }, 'Trag erst alles ohne Menge ein und gib die Mengen hier gesammelt an – direkt in den Feldern oder als Memo.'),
      memo,
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf', type: 'button', onclick: werteAus }, 'Auswerten'),
        mikro),
      !mikro && spracheVerfuegbar()
        ? el('p', { class: 'leise klein' }, 'Diktieren lässt sich im Zahnrad der Ernährungsseite einschalten.')
        : null,
      status,
      vorschauBereich,
      listenBereich,
      el('div', { class: 'knopfreihe', style: 'margin-top:12px' },
        el('button', { class: 'knopf zweitrangig', type: 'button', onclick: schliessen }, 'Fertig'))));
  zeichneListe();
  dialog.showModal();
}
