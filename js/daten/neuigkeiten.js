// Was ist neu: die Patchnotes, neueste zuerst. Bei jeder Änderung, die man in der App bemerkt, einen Punkt ergänzen.
// Die Versionsnummer bleibt 1.0.0, bis Léon zufrieden ist; bis dahin sind die Einträge nach Datum geordnet.

export const NEUIGKEITEN = [
  {
    version: '1.0.0',
    datum: '2026-11-15',
    titel: 'Einstellungen wie auf dem iPhone',
    punkte: [
      'Alle Einstellungen als ruhige Listen: Wert rechts, Schalter für An und Aus, Häkchen für die Auswahl, Erklärung klein darunter.',
      'Keine abgeschnittenen Auswahlfelder mehr („Keine Ang…“).',
      'Woche als eine Liste mit Kalenderkachel („Do 12“) statt sieben Einzelkarten.',
      'Der Plus-Knopf auf „Heute“ weicht beim Herunterrollen aus und verdeckt keine Mahlzeit mehr.',
    ],
  },
  {
    version: '1.0.0',
    datum: '2026-11-14',
    titel: 'Neues Design: Blatt',
    punkte: [
      'Neues Standard-Design „Blatt“: schlicht im Stil von iOS, in Elans Grün, dunkel oder hell.',
      '„Heute“ neu geordnet: große Kalorien-Karte mit Tagesscheibe, darunter je ein Ring für Eiweiß, Kohlenhydrate, Fett, Ballaststoffe und Wasser.',
      'Wasser mit einem Tipp auf den Ring zählen, mit „Rückgängig“.',
      'Alle Mahlzeiten in einer Karte, jede mit eigenem Symbol.',
      'Runder Plus-Knopf unten rechts: trägt in die Mahlzeit ein, die zur Uhrzeit passt.',
      'Mehr Farbe: jede Mahlzeit und jeder Nährwert hat einen eigenen Farbton, Einstellungen mit farbigen Symbolen wie auf dem iPhone.',
      'Health und Woche im selben Stil: Abschnitte als Karten mit farbigem Symbol, jeder Wochentag in der Farbe seines Tagestyps.',
      'Ringe über 100 % laufen in einer zweiten, dunkleren Runde weiter.',
      'App-Icon auf dunkelgrünem Grund.',
      'Rezepte als Karten mit Symbol und passendem Farbton (Chili rot, Fisch blau); Nährwerte mit Farbpunkt wie die Ringe.',
      'Wochentage kurz („Mittwoch, 12.11.“), damit nichts umbricht.',
      'Health: Gewichts-Karte mit großem 7-Tage-Schnitt, Pfeil zur Vorwoche und Stand zum Wochenziel.',
      'Leichte Vibration beim Eintragen, bei Wasser und Häkchen; unter Mehr → Darstellung abschaltbar.',
      'Ziel erreicht: Wird der Ring für Eiweiß, Ballaststoffe oder Wasser voll, leuchtet er auf und vibriert.',
      'Ringe abwählbar unter Mehr → Ziele je Tagestyp; vier Ringe stehen als 2 × 2.',
      'Widget für den Android-Startbildschirm mit kcal übrig und Wasser.',
      'Weiche Übergänge: Seiten gleiten in Richtung der Leiste, Blätter gleiten hinaus, Ringe füllen sich vom letzten Stand.',
      'Stabiler: Ein Doppeltipp speichert nichts doppelt, Fehler erscheinen als Hinweis, eine kaputte Seite bietet „Neu laden“.',
      'Das erste Design „Zitrus“ gibt es weiter unter Mehr → Darstellung.',
    ],
  },
  {
    version: '1.0.0',
    datum: '2026-11-14',
    titel: 'Aufgeräumt und schneller',
    punkte: [
      '„Mehr“ ist jetzt ein Menü mit Unterseiten statt einer langen Liste.',
      'Neu: „Über Elan“ erklärt alle Funktionen in Kürze, „Was ist neu“ zeigt diese Liste.',
      'Kurze Einrichtung beim ersten Start: Ziele prüfen, Referenzgruppe wählen oder ein Backup einspielen.',
      'Zuletzt Gegessenes mit einem Tipp erneut eintragen, mit der Menge vom letzten Mal.',
      'Wasser direkt auf „Heute“ zählen.',
      'Ruhigeres Design: Übersicht und Mahlzeiten stehen in Karten.',
    ],
  },
  {
    version: '1.0.0',
    datum: '2026-11-14',
    titel: 'Android-App',
    punkte: [
      'Elan gibt es als Android-App (APK), aus demselben Code wie die Web-App.',
      'Backup und Teilen laufen über das Teilen-Menü von Android.',
      'Text aus anderen Apps mit „Teilen → Elan“ als Rezept importieren.',
      'Vergleich mit den Referenzwerten der DGE für Vitamine und Mineralstoffe.',
      'Android sichert die Daten nicht in die Google-Cloud.',
    ],
  },
  {
    version: '0.10',
    datum: '2026-11-14',
    titel: 'Vor der Android-App',
    punkte: [
      'Tagebuch, Zutaten, Rezepte mit „Prinzip dahinter“, Wochenplan, Einkaufsliste, Meal-Prep, Mag-Liste.',
      'Health: Gewicht mit 7-Tage-Schnitt, Wasser, Schlaf, Schritte, Supplements, Maße, Laborwerte, Symptome.',
      'Angebote, Rezept-Import, Coach-Export, Backup, Verläufe, Erinnerung an das Backup.',
    ],
  },
];

/** Die Funktionen der App in Kürze, für „Über Elan“ */
export const FUNKTIONEN = [
  { titel: 'Heute', text: 'Was du isst, in sechs Mahlzeiten. Die Scheibe zeigt, wie viel vom Tagesziel erreicht ist; darunter je ein Ring für Eiweiß, Kohlenhydrate, Fett, Ballaststoffe und Wasser. Der Plus-Knopf trägt in die Mahlzeit zur Uhrzeit ein.' },
  { titel: 'Tagestypen', text: 'Gym, Calisthenics oder Rest: Jeder Typ hat eigene Ziele. Der Wochenplan legt fest, welcher Tag welcher ist.' },
  { titel: 'Alle Nährwerte', text: 'Vitamine und Mineralstoffe für den Tag oder als Wochenschnitt, mit Anteil am Referenzwert der DGE.' },
  { titel: 'Woche und Einkauf', text: 'Mahlzeiten vormerken, mit einem Tipp ins Tagebuch übernehmen. Die Einkaufsliste rechnet Rezepte in Zutaten um und zeigt Angebote.' },
  { titel: 'Rezepte', text: 'Zutaten, Portionen und Schritte, je Schritt mit „Prinzip dahinter“. Meal-Prep mit Gewicht nach dem Kochen und Haltbarkeit. Import aus Text.' },
  { titel: 'Zutaten', text: '184 Lebensmittel sind dabei, eigene kommen dazu. Suche bei Open Food Facts nur auf Knopfdruck. Die Mag-Liste merkt sich, was du (nicht) magst.' },
  { titel: 'Health', text: 'Gewicht mit 7-Tage-Schnitt gegen dein Wochenziel, Wasser, Schlaf, Schritte, Supplements, Maße, Laborwerte und Symptome.' },
  { titel: 'Backup und Coach-Export', text: 'Alle Daten als Datei sichern und wieder einspielen. Der Wochenbericht ist Text zum Einfügen in einen Chat.' },
  { titel: 'Widget (Android)', text: 'Auf dem Startbildschirm: kcal übrig und Wasser von heute. Antippen öffnet Elan.' },
  { titel: 'Darstellung', text: 'Blatt (schlicht und grün) oder Zitrus (das erste Design), jeweils hell, dunkel oder wie das Handy.' },
  { titel: 'Datenschutz', text: 'Kein Konto, kein Server, keine Auswertung. Alles bleibt auf dem Gerät; ins Netz geht nur, was du selbst auslöst.' },
];
