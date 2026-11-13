// Aufbau der lokalen Datenbank. Diese Datei ist die eine Stelle, an der Version und Speicher stehen.
// Neue Speicher oder Felder: SCHEMA_VERSION erhöhen und in js/db.js eine Migration anhängen.

export const APP_NAME = 'Elan';
export const APP_KENNUNG = 'elan';
export const APP_VERSION = '0.1.0';

export const SCHEMA_VERSION = 1;

/** Speicher (Object Stores) und ihr Schlüsselfeld. */
export const STORES = {
  zutaten: 'id', // eigene und aus Open Food Facts übernommene Zutaten
  eintraege: 'id', // Tagebuch: eine gegessene Menge in einem Slot
  tage: 'datum', // Angaben je Tag, z. B. abweichender Tagestyp
  einstellungen: 'schluessel', // Ziele, Wochenplan, letztes Backup
};
