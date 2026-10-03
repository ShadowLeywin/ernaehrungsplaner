// Backup-Format für Export und Import aller Nutzerdaten (reine Funktionen).
// Aufbau: { app, format, exportiertAm, daten: { <store>: [[schluessel, wert], …] } }

export const BACKUP_APP = 'ernaehrungsplaner';
export const BACKUP_FORMAT = 1;
export const BACKUP_STORES = ['einstellungen', 'tage'];

export function erstelleBackup(datenProStore, jetzt = new Date()) {
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportiertAm: jetzt.toISOString(),
    daten: datenProStore,
  };
}

export function backupDateiname(jetzt = new Date()) {
  const zweistellig = (n) => String(n).padStart(2, '0');
  return `backup-ernaehrungsplaner-${jetzt.getFullYear()}-${zweistellig(jetzt.getMonth() + 1)}-${zweistellig(jetzt.getDate())}.json`;
}

/** Text einer Backup-Datei prüfen. Liefert { daten, info } oder { fehler }. */
export function pruefeBackup(text) {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    return { fehler: 'Die Datei ist kein gültiges JSON.' };
  }
  if (backup?.app !== BACKUP_APP) return { fehler: 'Das ist keine Backup-Datei dieser App.' };
  if (backup.format > BACKUP_FORMAT) return { fehler: 'Das Backup stammt aus einer neueren App-Version. Bitte zuerst die App aktualisieren.' };
  if (typeof backup.daten !== 'object' || backup.daten === null) return { fehler: 'Das Backup enthält keine Daten.' };

  // Nur Bereiche, die in der Datei stehen, werden ersetzt (z. B. reine Profil-Datei lässt Tage unverändert)
  const daten = {};
  for (const store of BACKUP_STORES) {
    if (!(store in backup.daten)) continue;
    const eintraege = backup.daten[store];
    const gueltig = Array.isArray(eintraege)
      && eintraege.every((e) => Array.isArray(e) && e.length === 2 && typeof e[0] === 'string');
    if (!gueltig) return { fehler: `Der Bereich „${store}“ im Backup ist beschädigt.` };
    daten[store] = eintraege;
  }
  if (!Object.keys(daten).length) return { fehler: 'Das Backup enthält keine Daten.' };

  const tage = daten.tage?.map(([k]) => k).sort() ?? null;
  return {
    daten,
    info: {
      exportiertAm: backup.exportiertAm,
      anzahlTage: tage?.length ?? null, // null = nicht enthalten, bleibt unverändert
      vonBis: tage?.length ? [tage[0], tage.at(-1)] : null,
      hatProfil: (daten.einstellungen ?? []).some(([k]) => k === 'profil'),
      anzahlVorlagen: (daten.einstellungen ?? []).find(([k]) => k === 'vorlagen')?.[1]?.length ?? null,
    },
  };
}

/** Ist eine Erinnerung fällig? (Daten vorhanden und letztes Backup älter als `tage` Tage oder nie) */
export function backupErinnerungFaellig(letztesBackupIso, hatDaten, jetzt = new Date(), tage = 7) {
  if (!hatDaten) return false;
  if (!letztesBackupIso) return true;
  return jetzt - new Date(letztesBackupIso) > tage * 24 * 60 * 60 * 1000;
}
