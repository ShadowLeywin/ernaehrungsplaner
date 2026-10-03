// Dialog: Trainings-Vorlage anlegen oder bearbeiten – Name, Wochentage, Uhrzeit, Übungen mit Sätzen und Ziel.
import { el, setze } from '../ui.js';
import { icon } from '../icons.js';
import { WOCHENTAGE } from '../logic/profil.js';
import { oeffneUebungDialog } from './uebung-dialog.js';

/**
 * optionen: { vorlage (wird kopiert), verzeichnis, beiSpeichern(vorlage), beiLoeschen? }
 */
export function oeffneVorlageEditor(optionen) {
  const v = structuredClone(optionen.vorlage);
  const dialog = el('dialog', { class: 'dialog' });
  const schliessen = () => { dialog.close(); dialog.remove(); };
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); schliessen(); });
  document.body.append(dialog);
  const inhalt = el('div', { class: 'dialog-inhalt' });

  const zeichne = () => {
    const tage = el('div', { class: 'chips' }, ...WOCHENTAGE.map((name, i) => {
      const an = v.tage.includes(i);
      return el('button', {
        class: `chip${an ? ' an' : ''}`, type: 'button', 'aria-pressed': String(an),
        onclick: () => { v.tage = an ? v.tage.filter((t) => t !== i) : [...v.tage, i].sort(); zeichne(); },
      }, name.slice(0, 2));
    }));

    const zeilen = v.uebungen.map((e, index) => {
      const u = optionen.verzeichnis.get(e.uebungId);
      const zeitbasiert = u?.art === 'cardio' || u?.art === 'dauer';
      const zahl = (wert, beiAenderung, beschriftung) => el('input', {
        type: 'number', inputMode: 'numeric', min: 1, value: wert ?? '', 'aria-label': beschriftung,
        oninput: (ev) => beiAenderung(ev.target.value === '' ? undefined : ev.target.valueAsNumber),
      });
      const verschiebe = (richtung) => {
        const ziel = index + richtung;
        if (ziel < 0 || ziel >= v.uebungen.length) return;
        [v.uebungen[index], v.uebungen[ziel]] = [v.uebungen[ziel], v.uebungen[index]];
        zeichne();
      };
      return el('div', { class: 'vorlage-uebung' },
        el('div', { class: 'zeile' },
          el('strong', {}, u?.name ?? e.uebungId),
          el('div', {},
            el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Nach oben', onclick: () => verschiebe(-1) }, icon('hoch', 18)),
            el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Nach unten', onclick: () => verschiebe(1) }, icon('runter', 18)),
            el('button', {
              class: 'knopf-klein', type: 'button', 'aria-label': 'Entfernen',
              onclick: () => { v.uebungen.splice(index, 1); zeichne(); },
            }, icon('schliessen', 18)))),
        el('div', { class: 'felder' },
          zeitbasiert
            ? el('label', { class: 'feld' }, el('span', {}, 'Minuten'), zahl(e.minuten, (w) => { e.minuten = w; }, 'Minuten'))
            : el('label', { class: 'feld' }, el('span', {}, 'Sätze'), zahl(e.saetze, (w) => { e.saetze = w; }, 'Sätze')),
          el('label', { class: 'feld' }, el('span', {}, zeitbasiert ? 'Notiz' : 'Ziel (Wdh / Sek)'), el('input', {
            type: 'text',
            value: (zeitbasiert ? e.notiz : e.ziel) ?? '',
            placeholder: zeitbasiert ? '' : 'z. B. 8–12',
            oninput: (ev) => { if (zeitbasiert) e.notiz = ev.target.value; else e.ziel = ev.target.value; },
          }))));
    });

    setze(inhalt,
      el('label', { class: 'feld' }, el('span', {}, 'Name'), el('input', {
        type: 'text', value: v.name, placeholder: 'z. B. Push 1', oninput: (e) => { v.name = e.target.value; },
      })),
      el('div', { class: 'feld' }, el('span', {}, 'Wochentage'), tage),
      el('label', { class: 'feld' }, el('span', {}, 'Uhrzeit (optional)'), el('input', {
        type: 'time', value: v.uhrzeit ?? '', oninput: (e) => { v.uhrzeit = e.target.value; },
      })),
      el('h2', { class: 'abschnitt' }, `Übungen (${v.uebungen.length})`),
      ...zeilen,
      el('button', {
        class: 'knopf zweitrangig voll', type: 'button',
        onclick: () => oeffneUebungDialog({
          titel: 'Übung zur Vorlage',
          beiAuswahl: (u) => {
            v.uebungen.push(u.art === 'cardio' || u.art === 'dauer'
              ? { uebungId: u.id, minuten: 10 }
              : { uebungId: u.id, saetze: 3, ziel: u.art === 'halten' ? '30 s' : '8–12' });
            zeichne();
          },
        }),
      }, icon('plus', 18), 'Übung'),
      el('button', {
        class: 'knopf voll', type: 'button',
        onclick: () => { if (!v.name.trim()) v.name = 'Workout'; optionen.beiSpeichern(v); schliessen(); },
      }, 'Speichern'),
      optionen.beiLoeschen ? el('button', {
        class: 'knopf-text gefahr', type: 'button',
        onclick: () => { optionen.beiLoeschen(); schliessen(); },
      }, 'Vorlage löschen') : null);
  };

  setze(dialog,
    el('div', { class: 'dialog-kopf' },
      el('h2', {}, optionen.beiLoeschen ? 'Vorlage bearbeiten' : 'Neue Vorlage'),
      el('button', { class: 'knopf-klein', type: 'button', 'aria-label': 'Schließen', onclick: schliessen }, icon('schliessen'))),
    inhalt);
  zeichne();
  dialog.showModal();
}
