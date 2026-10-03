// Backup: alle Daten als JSON-Datei exportieren (teilen/herunterladen) und wieder importieren.
import { el, zahl } from '../ui.js';
import { lese, schreibe, anzahl, alleEintraege, ersetzeAlles } from '../db.js';
import { BACKUP_STORES, erstelleBackup, backupDateiname, pruefeBackup } from '../logic/backup.js';

const datumZeitFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
const datumFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' });
const alsDatum = (schluessel) => datumFormat.format(new Date(`${schluessel}T12:00:00`));

export const backup = {
  titel: 'Backup',
  reiter: 'mehr',
  render() {
    const wurzel = el('div');
    zeichne(wurzel);
    return wurzel;
  },
};

async function zeichne(wurzel) {
  const [letztes, tage, dauerhaft] = await Promise.all([
    lese('einstellungen', 'letztesBackup'),
    anzahl('tage'),
    navigator.storage?.persisted?.() ?? Promise.resolve(false),
  ]);

  wurzel.replaceChildren(
    el('section', { class: 'karte' },
      el('h2', {}, '💾 Status'),
      el('p', { class: 'klein' }, `Letztes Backup: ${letztes ? datumZeitFormat.format(new Date(letztes)) : 'noch nie'}`),
      el('p', { class: 'klein' }, `Gespeicherte Tage: ${zahl(tage)}`),
      el('p', { class: `klein${dauerhaft ? '' : ' warnung'}` },
        dauerhaft
          ? 'Speicher ist als dauerhaft markiert – der Browser löscht ihn nicht automatisch.'
          : 'Speicher ist nicht als dauerhaft markiert. Tipp: App installieren (Zum Startbildschirm hinzufügen).'),
      el('p', { class: 'leise klein' },
        'Alle Daten liegen nur auf diesem Gerät. Wenn der Browser-Speicher gelöscht wird oder du das Handy wechselst, '
        + 'hilft nur ein Backup. Lege die Datei z. B. in Google Drive ab.')),
    exportKarte(wurzel),
    importKarte(wurzel),
  );
}

function exportKarte(wurzel) {
  const status = el('p', { class: 'klein', role: 'status' });

  const erzeugeDatei = async () => {
    const daten = {};
    for (const store of BACKUP_STORES) daten[store] = await alleEintraege(store);
    const json = JSON.stringify(erstelleBackup(daten), null, 1);
    return new File([json], backupDateiname(), { type: 'application/json' });
  };
  const merkeBackup = async () => {
    await schreibe('einstellungen', 'letztesBackup', new Date().toISOString());
    zeichne(wurzel);
  };

  const teilen = async () => {
    try {
      const datei = await erzeugeDatei();
      await navigator.share({ files: [datei], title: 'Backup Ernährungsplaner' });
      await merkeBackup();
    } catch (fehler) {
      if (fehler.name !== 'AbortError') status.textContent = `Teilen fehlgeschlagen: ${fehler.message}`;
    }
  };
  const herunterladen = async () => {
    const datei = await erzeugeDatei();
    const url = URL.createObjectURL(datei);
    const link = el('a', { href: url, download: datei.name });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    await merkeBackup();
  };

  const kannTeilen = Boolean(navigator.canShare?.({ files: [new File(['{}'], 'test.json', { type: 'application/json' })] }));

  return el('section', { class: 'karte' },
    el('h2', {}, 'Backup erstellen'),
    el('p', { class: 'leise klein' }, 'Speichert Profil, Einstellungen und alle Tage in eine JSON-Datei.'),
    el('div', { class: 'knopfreihe' },
      kannTeilen ? el('button', { class: 'knopf', type: 'button', onclick: teilen }, 'Teilen / in Drive speichern') : null,
      el('button', { class: `knopf${kannTeilen ? ' zweitrangig' : ''}`, type: 'button', onclick: herunterladen }, 'Datei herunterladen')),
    status);
}

function importKarte(wurzel) {
  const bereich = el('div');
  const auswahl = el('input', {
    type: 'file',
    accept: '.json,application/json',
    'aria-label': 'Backup-Datei auswählen',
    onchange: async () => {
      const datei = auswahl.files[0];
      if (!datei) return;
      const ergebnis = pruefeBackup(await datei.text());
      if (ergebnis.fehler) {
        bereich.replaceChildren(el('p', { class: 'warnung' }, ergebnis.fehler));
        return;
      }
      zeigeBestaetigung(ergebnis);
    },
  });

  const zeigeBestaetigung = ({ daten, info }) => {
    bereich.replaceChildren(el('div', { class: 'vorschlag' },
      el('p', {}, el('strong', {}, 'Backup gefunden')),
      el('p', { class: 'klein' },
        `Erstellt: ${info.exportiertAm ? datumZeitFormat.format(new Date(info.exportiertAm)) : 'unbekannt'}`, el('br'),
        `Tage: ${zahl(info.anzahlTage)}${info.vonBis ? ` (${alsDatum(info.vonBis[0])} – ${alsDatum(info.vonBis[1])})` : ''}`, el('br'),
        `Profil enthalten: ${info.hatProfil ? 'ja' : 'nein'}`),
      el('p', { class: 'warnung klein' }, 'Achtung: Alle aktuellen Daten auf diesem Gerät werden durch das Backup ersetzt.'),
      el('div', { class: 'knopfreihe' },
        el('button', {
          class: 'knopf',
          type: 'button',
          onclick: async () => {
            await ersetzeAlles(daten);
            location.hash = '#/heute';
            location.reload();
          },
        }, 'Daten ersetzen'),
        el('button', {
          class: 'knopf zweitrangig',
          type: 'button',
          onclick: () => { auswahl.value = ''; bereich.replaceChildren(); },
        }, 'Abbrechen'))));
  };

  return el('section', { class: 'karte' },
    el('h2', {}, 'Backup wiederherstellen'),
    el('p', { class: 'leise klein' }, 'Backup-Datei auswählen. Vor dem Ersetzen siehst du, was drin ist.'),
    auswahl,
    bereich);
}
