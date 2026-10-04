// Mengen-Memo: freier Text oder Diktat („Skyr 250, Haferflocken 80 g, 2 Äpfel“) → Lebensmittel mit Gramm.
// Reine Funktionen, keine KI: Zahlen, Einheiten und Namen werden mit der lokalen Datenbank abgeglichen.
import { normalisiere } from '../lebensmittel.js';

const ZAHLWOERTER = {
  ein: 1, eins: 1, eine: 1, einen: 1, einem: 1, einer: 1, zwei: 2, drei: 3, vier: 4, fuenf: 5, sechs: 6,
  sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwoelf: 12, zwanzig: 20, dreissig: 30, vierzig: 40,
  fuenfzig: 50, hundert: 100, einhundert: 100, zweihundert: 200, dreihundert: 300, vierhundert: 400,
  fuenfhundert: 500, halb: 0.5, halbe: 0.5, halben: 0.5, halbes: 0.5, anderthalb: 1.5, eineinhalb: 1.5,
};

// Einheit → Gramm pro Einheit (null = Stückgewicht des Lebensmittels)
const EINHEITEN = {
  g: 1, gr: 1, gramm: 1, kg: 1000, kilo: 1000, kilogramm: 1000, ml: 1, milliliter: 1, l: 1000, liter: 1000,
  el: 15, essloeffel: 15, tl: 5, teeloeffel: 5, prise: 0.5,
  stueck: null, stk: null, stuck: null, scheibe: 30, scheiben: 30, portion: null, portionen: null,
  glas: 200, glaeser: 200, tasse: 150, tassen: 150, becher: 150, handvoll: 30, dose: 400, dosen: 400,
};

const FUELLWOERTER = new Set(['von', 'mit', 'und', 'der', 'die', 'das', 'den', 'dem', 'des', 'etwa', 'ca', 'circa',
  'ungefaehr', 'noch', 'dazu', 'bitte', 'habe', 'hab', 'ich', 'gegessen', 'getrunken', 'auch', 'so', 'plus', 'marke']);

/** Zahl aus einem Wort („250“, „1,5“, „zwei“) oder null. */
function alsZahl(wort) {
  const ziffer = wort.replace(',', '.');
  if (/^\d+(\.\d+)?$/.test(ziffer)) return Number(ziffer);
  return ZAHLWOERTER[wort] ?? null;
}

/** „250g“ → ['250', 'g'] */
function zerlegeWort(wort) {
  const m = wort.match(/^(\d+(?:[.,]\d+)?)([a-z]+)$/);
  return m ? [m[1], m[2]] : [wort];
}

/** Text in Abschnitte je Lebensmittel: [{ menge, einheit, woerter }] */
export function zerlegeMemo(text) {
  const teile = normalisiere(text)
    .replace(/(\d),(\d)/g, '$1.$2')
    .split(/[,;\n]+|\s+und\s+|\s+dann\s+|\s+plus\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const ergebnis = [];
  for (const teil of teile) {
    const tokens = teil.split(/[\s/]+/).flatMap(zerlegeWort).filter(Boolean);
    // Mengen markieren: Zahl, optional gefolgt von Einheit
    const elemente = [];
    for (let i = 0; i < tokens.length; i += 1) {
      const zahl = alsZahl(tokens[i]);
      if (zahl != null) {
        const naechstes = tokens[i + 1];
        if (naechstes != null && naechstes in EINHEITEN) {
          elemente.push({ menge: zahl, einheit: naechstes });
          i += 1;
        } else {
          elemente.push({ menge: zahl, einheit: null });
        }
      } else if (tokens[i] in EINHEITEN && elemente.at(-1)?.menge == null && tokens[i].length > 2) {
        // „Glas Milch“ ohne Zahl = 1 Glas
        elemente.push({ menge: 1, einheit: tokens[i] });
      } else {
        elemente.push({ wort: tokens[i] });
      }
    }
    // Reihenfolge erkennen: Menge vor dem Namen („250 g Skyr“) oder danach („Skyr 250“)
    const mengeZuerst = elemente[0]?.menge != null;
    let aktuell = null;
    const abschliessen = () => { if (aktuell && (aktuell.woerter.length || aktuell.menge != null)) ergebnis.push(aktuell); aktuell = null; };
    for (const e of elemente) {
      if (e.menge != null) {
        if (mengeZuerst) {
          abschliessen();
          aktuell = { menge: e.menge, einheit: e.einheit, woerter: [] };
        } else {
          aktuell ??= { menge: null, einheit: null, woerter: [] };
          aktuell.menge = e.menge;
          aktuell.einheit = e.einheit;
          abschliessen();
        }
      } else if (!FUELLWOERTER.has(e.wort)) {
        aktuell ??= { menge: null, einheit: null, woerter: [] };
        aktuell.woerter.push(e.wort);
      }
    }
    abschliessen();
  }
  return ergebnis.filter((a) => a.woerter.length);
}

// Plural und Umlaut grob angleichen: „Äpfel“ ≈ „Apfel“, „Tomaten“ ≈ „Tomate“
const stamm = (wort) => wort.replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u').replace(/(en|n|e|s)$/, '');

/** Wie gut passt ein Lebensmittelname zu den Suchwörtern? 0 = gar nicht. */
export function trefferWert(name, woerter) {
  const nameWoerter = normalisiere(name).split(/[^a-z0-9]+/).filter(Boolean);
  const ganz = normalisiere(name).replace(/[^a-z0-9]/g, '');
  let wert = 0;
  for (const w of woerter) {
    if (w.length < 2) continue;
    const s = stamm(w);
    if (nameWoerter.some((n) => n === w || stamm(n) === s)) wert += 3;
    else if (nameWoerter.some((n) => stamm(n).startsWith(s) || (s.length >= 4 && n.includes(s)))) wert += 2;
    else if (s.length >= 4 && ganz.includes(s)) wert += 1;
  }
  // Kürzere Namen bevorzugen („Apfel“ vor „Apfelmus“)
  return wert ? wert - nameWoerter.length * 0.05 : 0;
}

export function besterTreffer(lebensmittel, woerter) {
  let bester = null;
  let besterWert = 0;
  for (const lm of lebensmittel) {
    const wert = trefferWert(lm.name, woerter) + (lm.aliase ?? []).reduce((m, a) => Math.max(m, trefferWert(a, woerter)), 0) * 0.9;
    if (wert > besterWert) { bester = lm; besterWert = wert; }
  }
  return bester;
}

/** Menge + Einheit in Gramm für ein Lebensmittel. */
export function inGramm(menge, einheit, lm) {
  if (menge == null) return null;
  if (einheit == null) {
    // Kleine Zahl ohne Einheit bei Stück-Lebensmitteln = Stückzahl („2 Äpfel“)
    if (lm?.stueckG && menge <= 12) return Math.round(menge * lm.stueckG);
    return menge;
  }
  const faktor = EINHEITEN[einheit];
  if (faktor == null) return Math.round(menge * (lm?.stueckG ?? 100));
  return Math.round(menge * faktor * 10) / 10;
}

/**
 * Memo auswerten.
 * vorhandene: Einträge des Tages ([{ id, lebensmittelId, gramm }]) – passende bekommen die Menge.
 * Liefert [{ text, lebensmittel, gramm, eintragId|null }] (lebensmittel null = nicht gefunden).
 */
export function werteMemoAus(text, lebensmittel, vorhandene = []) {
  const nachId = new Map(lebensmittel.map((l) => [l.id, l]));
  const vorhandeneLm = vorhandene.map((e) => nachId.get(e.lebensmittelId)).filter(Boolean);
  const vergeben = new Set();
  return zerlegeMemo(text).map((abschnitt) => {
    // Zuerst unter den Einträgen des Tages suchen, dann in der ganzen Datenbank
    const offenVorhanden = vorhandeneLm.filter((lm) => vorhandene.some((e) => e.lebensmittelId === lm.id && !vergeben.has(e.id)));
    const ausTag = besterTreffer(offenVorhanden, abschnitt.woerter);
    const lm = ausTag ?? besterTreffer(lebensmittel, abschnitt.woerter);
    const eintrag = ausTag ? vorhandene.find((e) => e.lebensmittelId === ausTag.id && !vergeben.has(e.id)) : null;
    if (eintrag) vergeben.add(eintrag.id);
    return {
      text: abschnitt.woerter.join(' '),
      lebensmittel: lm,
      gramm: inGramm(abschnitt.menge, abschnitt.einheit, lm),
      eintragId: eintrag?.id ?? null,
    };
  });
}
