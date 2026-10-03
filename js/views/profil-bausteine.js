// Formular-Bausteine für Profildaten – genutzt von Einstellungen und Ersteinrichtung.
// Alle Bausteine ändern das übergebene Profil-Objekt direkt und rufen danach `geaendert()` auf.
import { el, setze, zahl, zahlFeld, textFeld } from '../ui.js';
import { ALLTAG, ZIELARTEN, pruefeZiel, zielGewicht, zielZuschlag } from '../logic/bedarf.js';
import { datumSchluessel } from '../logic/ziele.js';

function auswahlFeld(beschriftung, optionen, wert, beiAenderung) {
  const auswahl = el('select', { onchange: () => beiAenderung(auswahl.value) },
    ...Object.entries(optionen).map(([id, name]) => el('option', { value: id, selected: id === wert }, name)));
  return el('label', { class: 'feld' }, el('span', {}, beschriftung), auswahl);
}

export function koerperFelder(profil, geaendert) {
  const k = profil.koerper;
  const zahlWert = (schluessel) => (wert) => { k[schluessel] = wert || null; geaendert(); };
  return el('div', { class: 'felder' },
    auswahlFeld('Geschlecht', { '': '– bitte wählen –', m: 'männlich', w: 'weiblich' }, k.geschlecht ?? '', (wert) => {
      k.geschlecht = wert || null;
      geaendert();
    }),
    zahlFeld('Alter', k.alter ?? '', 'Jahre', zahlWert('alter')),
    zahlFeld('Größe', k.groesseCm ?? '', 'cm', zahlWert('groesseCm')),
    zahlFeld('Gewicht', k.gewichtKg ?? '', 'kg', zahlWert('gewichtKg')));
}

export function alltagFeld(profil, geaendert) {
  const optionen = Object.fromEntries(Object.entries(ALLTAG).map(([id, a]) => [id, a.name]));
  return auswahlFeld('Alltag (ohne Sport)', optionen, profil.alltag, (wert) => { profil.alltag = wert; geaendert(); });
}

/** Liste der Sportarten mit kcal pro Einheit; hinzufügen und entfernen. */
export function aktivitaetenListe(profil, geaendert, neuZeichnen) {
  const zeilen = profil.aktivitaeten.map((a) => el('div', { class: 'aktivitaet' },
    textFeld('Sport / Aktivität', a.name, (wert) => { a.name = wert; geaendert(); }, 'z. B. Gym'),
    zahlFeld('Verbrauch', a.kcal, 'kcal', (wert) => { a.kcal = Math.round(wert); geaendert(); }),
    el('button', {
      class: 'knopf-klein',
      type: 'button',
      'aria-label': `${a.name} entfernen`,
      onclick: () => {
        profil.aktivitaeten.splice(profil.aktivitaeten.indexOf(a), 1);
        for (const t of profil.tagestypen) t.aktivitaeten = (t.aktivitaeten ?? []).filter((id) => id !== a.id);
        geaendert();
        neuZeichnen();
      },
    }, '✕')));

  return el('div', {},
    ...zeilen,
    profil.aktivitaeten.length ? null : el('p', { class: 'leise klein' }, 'Noch keine Aktivität eingetragen.'),
    el('button', {
      class: 'knopf zweitrangig voll',
      type: 'button',
      onclick: () => {
        profil.aktivitaeten.push({ id: `a${Date.now().toString(36)}`, name: '', kcal: 0 });
        geaendert();
        neuZeichnen();
      },
    }, '+ Aktivität'),
    el('p', { class: 'leise klein' },
      'Verbrauch = zusätzliche kcal pro Einheit über dem Alltag. Werte von Fitnessuhren sind oft zu hoch – '
      + 'im Zweifel eher vorsichtig schätzen (z. B. Krafttraining 60 min ≈ 250–350 kcal).'));
}

/** Gewichtsziel: Art, kg pro Woche, Dauer – mit Hinweisen und erwartetem Zielgewicht. */
export function zielFelder(profil, geaendert) {
  const z = profil.ziel;
  z.startDatum ??= datumSchluessel(new Date());
  const info = el('div');
  const aktualisiere = () => {
    const gewicht = profil.koerper.gewichtKg;
    const zuschlag = Math.round(zielZuschlag(z));
    setze(info,
      z.art === 'halten' ? null : el('p', { class: 'klein' },
        `${zuschlag > 0 ? '+' : ''}${zahl(zuschlag)} kcal pro Tag`,
        gewicht ? ` · erwartet nach ${zahl(z.wochen)} Wochen: ca. ${zahl(zielGewicht(gewicht, z))} kg` : ''),
      ...pruefeZiel(z, gewicht).map((h) => el('p', { class: 'warnung klein' }, h)),
    );
  };
  const feld = (beschriftung, schluessel, einheit) => zahlFeld(beschriftung, z[schluessel], einheit, (wert) => {
    z[schluessel] = wert;
    aktualisiere();
    geaendert();
  });
  aktualisiere();
  return el('div', {},
    el('div', { class: 'felder' },
      auswahlFeld('Ziel', ZIELARTEN, z.art, (wert) => {
        z.art = wert;
        if (wert === 'aufbau' && !z.kgProWoche) z.kgProWoche = 0.25;
        if (wert === 'abnehmen' && !z.kgProWoche) z.kgProWoche = 0.5;
        aktualisiere();
        geaendert();
      }),
      feld('Tempo', 'kgProWoche', 'kg/Woche'),
      feld('Dauer', 'wochen', 'Wochen'),
      el('label', { class: 'feld' }, el('span', {}, 'Start'), el('input', {
        type: 'date',
        value: z.startDatum,
        oninput: (e) => { if (e.target.value) { z.startDatum = e.target.value; geaendert(); } },
      }))),
    info);
}

export function makroRegelFelder(profil, geaendert) {
  const r = profil.makroRegeln;
  return el('div', { class: 'felder' },
    zahlFeld('Protein', r.proteinGProKg, 'g pro kg', (wert) => { r.proteinGProKg = wert; geaendert(); }),
    zahlFeld('Fett', Math.round(r.fettAnteil * 100), '% der kcal', (wert) => { r.fettAnteil = wert / 100; geaendert(); }));
}
