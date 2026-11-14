// Unterseiten von Health: Laborwerte mit Referenzbereich und Symptome mit Zuordnung zu Mahlzeiten.
// Die App deutet nichts medizinisch. Sie zeigt, was eingetragen wurde, und zählt.

import { bereichText, laborGruppen, laborStatus, pruefeLaborwert, pruefeSymptom, STAERKEN, vorSymptomen } from '../logik/befunde.js';
import { formatKurz, isoDatum, istGueltig, verschiebe } from '../logik/datum.js';
import { APP_NAME } from '../logik/schema.js';
import { SLOTS } from '../logik/ziele.js';
import { neuZeichnen } from '../router.js';
import * as speicher from '../speicher.js';
import { blatt, el, feld, haenge, hinweis, icon, zahl } from '../ui.js';

const z = (wert) => zahl(wert, 3);
const slotRang = (id) => SLOTS.findIndex((s) => s.id === id);
const slotName = (id) => SLOTS.find((s) => s.id === id)?.name ?? '';

/* ---------- Laborwerte ---------- */

const STATUS_TEXT = { im: 'im Bereich', unter: 'unter dem Bereich', ueber: 'über dem Bereich', ohne: 'kein Bereich eingetragen' };

function statusZeile(w) {
  const status = laborStatus(w);
  const bereich = bereichText(w);
  return el('p', { class: status === 'unter' || status === 'ueber' ? 'merkzettel' : 'klein' }, bereich ? `${STATUS_TEXT[status]} ${bereich}` : STATUS_TEXT[status]);
}

export async function zeigeLabor(wurzel) {
  const werte = await speicher.alleLaborwerte();
  const gruppen = laborGruppen(werte);
  document.title = `Laborwerte – ${APP_NAME}`;

  const entferne = async (w) => {
    await speicher.loescheLaborwert(w.id);
    hinweis('Wert gelöscht.', { aktion: 'Rückgängig', beiAktion: async () => { await speicher.speichereLaborwert(w); neuZeichnen(); } });
    neuZeichnen();
  };
  const wertZeile = (w) => el('li', { class: 'zeile' },
    el('span', { class: 'zeile-name' }, `${z(w.wert)}${w.einheit ? ` ${w.einheit}` : ''}`, el('small', {}, [formatKurz(w.datum), STATUS_TEXT[laborStatus(w)], w.notiz].filter(Boolean).join(', '))),
    el('button', { type: 'button', class: 'rund', 'aria-label': `Wert vom ${formatKurz(w.datum)} löschen`, onclick: () => entferne(w) }, icon('zu', 20)));

  haenge(wurzel,
    el('a', { class: 'zurueck', href: '#/health' }, icon('zurueck', 18), 'Health'),
    el('header', { class: 'seitenkopf' },
      el('h1', {}, 'Laborwerte'),
      el('button', { type: 'button', class: 'knopf klein', onclick: () => oeffneLaborFormular(gruppen) }, icon('plus', 18), 'Wert eintragen')),
    el('p', { class: 'klein' }, 'Trage Wert und Referenzbereich so ein, wie sie auf dem Laborbericht stehen. Die App zeigt nur, ob der Wert im Bereich liegt. Was das bedeutet, klärst du mit deiner Ärztin oder deinem Arzt.'),
    gruppen.length === 0 ? el('p', { class: 'leer' }, 'Noch kein Laborwert eingetragen.') : null,
    gruppen.map((g) => {
      const [neuester, ...fruehere] = g.werte;
      return el('section', { class: 'bereich laborgruppe' },
        el('h2', {}, g.name),
        el('p', { class: 'laborwert' }, el('strong', {}, `${z(neuester.wert)}${neuester.einheit ? ` ${neuester.einheit}` : ''}`), ` am ${formatKurz(neuester.datum)}`),
        statusZeile(neuester),
        el('ul', { class: 'zeilen' }, wertZeile(neuester)),
        fruehere.length ? el('details', { class: 'aufklappen' },
          el('summary', {}, `Frühere Werte (${fruehere.length})`),
          el('ul', { class: 'zeilen' }, fruehere.map(wertZeile))) : null);
    }));
}

function oeffneLaborFormular(gruppen) {
  const eingabe = { name: '', wert: '', einheit: '', refMin: '', refMax: '', datum: isoDatum(), notiz: '' };
  const alsText = (n) => (typeof n === 'number' ? String(n).replace('.', ',') : '');
  const b = blatt({
    titel: 'Laborwert eintragen',
    inhalt: (blattSteuerung) => {
      const huelle = el('div', {});
      const zeichne = (fehler = {}) => {
        const f = (name, beschriftung, zusatz = {}) => feld({ name: `labor-${name}`, beschriftung, value: eingabe[name], fehler: fehler[name], oninput: (e) => { eingabe[name] = e.target.value; }, ...zusatz });
        huelle.replaceChildren(el('form', {
          class: 'stapel', novalidate: true,
          onsubmit: async (e) => {
            e.preventDefault();
            const pruefung = pruefeLaborwert(eingabe);
            if (!pruefung.ok) { zeichne(pruefung.fehler); huelle.querySelector('[aria-invalid="true"]')?.focus(); return; }
            await speicher.speichereLaborwert(pruefung.laborwert);
            blattSteuerung.schliessen();
            hinweis('Laborwert gespeichert.');
            neuZeichnen();
          },
        },
        f('name', 'Name des Werts', {
          maxlength: 60, list: 'labor-namen',
          // Bekannter Name: Einheit und Bereich vom letzten Mal vorschlagen, wenn noch nichts eingetragen ist
          onchange: (e) => {
            const bekannt = gruppen.find((g) => g.name.toLowerCase() === e.target.value.trim().toLowerCase())?.werte[0];
            if (!bekannt || eingabe.einheit || eingabe.refMin || eingabe.refMax) return;
            Object.assign(eingabe, { name: bekannt.name, einheit: bekannt.einheit ?? '', refMin: alsText(bekannt.refMin), refMax: alsText(bekannt.refMax) });
            zeichne();
            huelle.querySelector('#f-labor-wert')?.focus();
          },
        }),
        el('datalist', { id: 'labor-namen' }, gruppen.map((g) => el('option', { value: g.name }))),
        el('div', { class: 'raster' }, f('wert', 'Wert', { inputmode: 'decimal' }), f('einheit', 'Einheit', { maxlength: 20, placeholder: 'z. B. mg/dl' })),
        el('fieldset', { class: 'gruppe' },
          el('legend', {}, 'Referenzbereich (freiwillig)'),
          el('div', { class: 'raster' }, f('refMin', 'Untere Grenze', { inputmode: 'decimal' }), f('refMax', 'Obere Grenze', { inputmode: 'decimal' }))),
        f('datum', 'Datum der Blutabnahme', { type: 'date' }),
        f('notiz', 'Notiz (freiwillig)', { maxlength: 200 }),
        el('div', { class: 'knopfreihe' }, el('button', { type: 'submit', class: 'knopf' }, 'Laborwert speichern'))));
      };
      zeichne();
      return huelle;
    },
  });
  return b;
}

/* ---------- Symptome ---------- */

export async function zeigeSymptome(wurzel) {
  const heute = isoDatum();
  const von = verschiebe(heute, -60);
  const [symptome, eintraege] = await Promise.all([speicher.symptomeZwischen(von, heute), speicher.eintraegeZwischen(von, heute)]);
  const nachId = new Map(eintraege.map((e) => [e.id, e]));
  const sortiert = [...symptome].sort((a, b) => `${b.datum} ${b.zeit ?? ''}`.localeCompare(`${a.datum} ${a.zeit ?? ''}`));
  const auffaellig = vorSymptomen(symptome, eintraege);
  document.title = `Symptome – ${APP_NAME}`;

  const entferne = async (s) => {
    await speicher.loescheSymptom(s.id);
    hinweis('Symptom gelöscht.', { aktion: 'Rückgängig', beiAktion: async () => { await speicher.speichereSymptom(s); neuZeichnen(); } });
    neuZeichnen();
  };

  haenge(wurzel,
    el('a', { class: 'zurueck', href: '#/health' }, icon('zurueck', 18), 'Health'),
    el('header', { class: 'seitenkopf' },
      el('h1', {}, 'Symptome'),
      el('button', { type: 'button', class: 'knopf klein', onclick: () => oeffneSymptomFormular([...new Set(symptome.map((s) => s.art))].sort()) }, icon('plus', 18), 'Symptom eintragen')),
    el('p', { class: 'klein' }, 'Halte fest, was du bemerkst, und ordne zu, was du davor gegessen hast. Gezeigt werden die letzten 60 Tage.'),
    sortiert.length === 0 ? el('p', { class: 'leer' }, 'Noch kein Symptom eingetragen.') : null,
    sortiert.length ? el('ul', { class: 'zeilen' }, sortiert.map((s) => {
      const davor = (s.eintragIds ?? []).map((id) => nachId.get(id)?.name).filter(Boolean);
      return el('li', { class: 'zeile' },
        el('span', { class: 'zeile-name' }, `${s.art}, Stärke ${s.staerke}`,
          el('small', {}, [`${formatKurz(s.datum)}${s.zeit ? `, ${s.zeit} Uhr` : ''}`, davor.length ? `Davor: ${davor.join(', ')}` : null, s.notiz].filter(Boolean).join('. '))),
        el('button', { type: 'button', class: 'rund', 'aria-label': `${s.art} vom ${formatKurz(s.datum)} löschen`, onclick: () => entferne(s) }, icon('zu', 20)));
    })) : null,
    auffaellig.length ? el('section', { class: 'bereich' },
      el('h2', {}, 'Was stand öfter davor auf dem Teller?'),
      el('table', { class: 'naehrwerte', id: 'vor-symptomen' }, el('tbody', {}, auffaellig.map((a) => el('tr', {},
        el('th', { scope: 'row' }, a.name),
        el('td', {}, `bei ${a.beiSymptomen} von ${symptome.length} Symptomen, gegessen an ${a.tageGegessen} ${a.tageGegessen === 1 ? 'Tag' : 'Tagen'}`))))),
      el('p', { class: 'klein' }, 'Das ist eine Zählung, kein Nachweis. Was du fast täglich isst, steht hier immer oben. Bei anhaltenden Beschwerden hilft eine ärztliche Abklärung.')) : null);
}

function oeffneSymptomFormular(bekannteArten) {
  const jetzt = new Date();
  const eingabe = {
    art: '', staerke: 3, datum: isoDatum(), notiz: '', eintragIds: new Set(),
    zeit: `${String(jetzt.getHours()).padStart(2, '0')}:${String(jetzt.getMinutes()).padStart(2, '0')}`,
  };
  blatt({
    titel: 'Symptom eintragen',
    inhalt: (b) => {
      const huelle = el('div', {});
      const mahlzeiten = el('div', { class: 'stapel', id: 'symptom-mahlzeiten' });
      const ladeMahlzeiten = async () => {
        const eintraege = istGueltig(eingabe.datum) ? await speicher.eintraegeAm(eingabe.datum) : [];
        eintraege.sort((x, y) => slotRang(x.slot) - slotRang(y.slot));
        eingabe.eintragIds = new Set([...eingabe.eintragIds].filter((id) => eintraege.some((e) => e.id === id)));
        mahlzeiten.replaceChildren(eintraege.length
          ? el('ul', { class: 'zeilen' }, eintraege.map((e) => el('li', { class: 'haken' }, el('label', {},
            el('input', { type: 'checkbox', checked: eingabe.eintragIds.has(e.id) ? true : null, onchange: (ev) => { if (ev.target.checked) eingabe.eintragIds.add(e.id); else eingabe.eintragIds.delete(e.id); } }),
            el('span', { class: 'zeile-name' }, e.name, el('small', {}, slotName(e.slot)))))))
          : el('p', { class: 'leer' }, 'Für diesen Tag steht nichts im Tagebuch.'));
      };
      const zeichne = (fehler = {}) => {
        huelle.replaceChildren(el('form', {
          class: 'stapel', novalidate: true,
          onsubmit: async (e) => {
            e.preventDefault();
            const pruefung = pruefeSymptom({ ...eingabe, eintragIds: [...eingabe.eintragIds] });
            if (!pruefung.ok) { zeichne(pruefung.fehler); huelle.querySelector('[aria-invalid="true"]')?.focus(); return; }
            await speicher.speichereSymptom(pruefung.symptom);
            b.schliessen();
            hinweis('Symptom gespeichert.');
            neuZeichnen();
          },
        },
        feld({ name: 'symptom-art', beschriftung: 'Was hast du bemerkt?', value: eingabe.art, fehler: fehler.art, maxlength: 60, list: 'symptom-arten', oninput: (e) => { eingabe.art = e.target.value; } }),
        el('datalist', { id: 'symptom-arten' }, bekannteArten.map((a) => el('option', { value: a }))),
        el('div', { class: 'feld' },
          el('label', { id: 'staerke-label' }, 'Wie stark? 1 ist leicht, 5 ist stark'),
          el('div', { class: 'wahl', role: 'group', 'aria-labelledby': 'staerke-label' }, STAERKEN.map((n) => el('button', {
            type: 'button', class: 'wahl-knopf', 'aria-pressed': String(eingabe.staerke === n), onclick: () => { eingabe.staerke = n; zeichne(fehler); },
          }, String(n))))),
        el('div', { class: 'raster' },
          feld({ name: 'symptom-datum', beschriftung: 'Datum', type: 'date', value: eingabe.datum, fehler: fehler.datum, onchange: (e) => { eingabe.datum = e.target.value; ladeMahlzeiten(); } }),
          feld({ name: 'symptom-zeit', beschriftung: 'Uhrzeit', type: 'time', value: eingabe.zeit, fehler: fehler.zeit, oninput: (e) => { eingabe.zeit = e.target.value; } })),
        el('fieldset', { class: 'gruppe' }, el('legend', {}, 'Was hast du davor gegessen?'), mahlzeiten),
        feld({ name: 'symptom-notiz', beschriftung: 'Notiz (freiwillig)', value: eingabe.notiz, maxlength: 300, oninput: (e) => { eingabe.notiz = e.target.value; } }),
        el('div', { class: 'knopfreihe' }, el('button', { type: 'submit', class: 'knopf' }, 'Symptom speichern'))));
      };
      zeichne();
      ladeMahlzeiten();
      return huelle;
    },
  });
}
