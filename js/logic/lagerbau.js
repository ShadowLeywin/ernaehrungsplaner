// Lager ausbauen: Training bringt Erz, Disziplin bringt Glut. Damit baust du Bauwerke in deinem Lager aus
// (Holz → Stein → Eisen → Gold → Legendär). Verdientes wird immer aus deinen Daten berechnet, gespeichert
// werden nur die Ausgaben – so kann nichts doppelt zählen (reine Funktionen).
// Gespeichert: einstellungen/lager = { bauten: { id: stufe }, ausgegeben: { erz, glut }, schilde, schildTage: [datum] }

export const STUFEN_NAMEN = ['Holz', 'Stein', 'Eisen', 'Gold', 'Legendär'];
const FAKTOR = [1, 2.5, 6, 14, 30];

// { id, name, episch (Beschreibung), ab (Level), basis: { erz, glut } }
export const BAUTEN = [
  { id: 'amboss', name: 'Amboss', text: 'Das Herz jeder Schmiede. Hier wird jeder Rekord geschmiedet.', ab: 1, basis: { erz: 40, glut: 10 } },
  { id: 'brunnen', name: 'Brunnen', text: 'Frisches Wasser für die Quelle deiner Kraft.', ab: 1, basis: { erz: 10, glut: 40 } },
  { id: 'banner', name: 'Banner', text: 'Dein Wappen weht über dem Lager.', ab: 1, basis: { erz: 20, glut: 20 } },
  { id: 'esse', name: 'Esse', text: 'Glühende Kohlen, bereit für schweres Eisen.', ab: 3, basis: { erz: 60, glut: 30 } },
  { id: 'kraeutergarten', name: 'Kräutergarten', text: 'Kräuter und Elixiere – deine Supplements wachsen hier.', ab: 3, basis: { erz: 15, glut: 60 } },
  { id: 'steinbank', name: 'Steinbank', text: 'Eine Hantelbank aus gehauenem Fels.', ab: 5, basis: { erz: 80, glut: 20 } },
  { id: 'vorratskammer', name: 'Vorratskammer', text: 'Gefüllte Regale – gute Ernährung beginnt hier.', ab: 5, basis: { erz: 30, glut: 80 } },
  { id: 'klimmzugbalken', name: 'Klimmzugbalken', text: 'Ein Balken aus Eichenholz zwischen zwei Felsen.', ab: 8, basis: { erz: 100, glut: 30 } },
  { id: 'statue', name: 'Heldenstatue', text: 'Ein Abbild deiner selbst – wächst mit dir.', ab: 12, basis: { erz: 120, glut: 120 } },
  { id: 'chronikhaus', name: 'Chronikhaus', text: 'Hier werden deine Tagebücher aufbewahrt.', ab: 15, basis: { erz: 60, glut: 160 } },
  { id: 'wachturm', name: 'Wachturm', text: 'Von oben siehst du, wie weit du gekommen bist.', ab: 20, basis: { erz: 200, glut: 100 } },
  { id: 'trophaeenhalle', name: 'Trophäenhalle', text: 'Gold, Obsidian, Legendär – hier glänzt alles.', ab: 30, basis: { erz: 250, glut: 250 } },
];

export const SCHILD_PREIS = { erz: 0, glut: 40 };
export const MAX_SCHILDE = 3;
export const XP_JE_BAUSTUFE = 60;

export function leeresLager() {
  return { bauten: {}, ausgegeben: { erz: 0, glut: 0 }, schilde: 0, schildTage: [] };
}

/** Verdientes aus den Tageskennzahlen. */
export function verdient(kennzahlen) {
  let erz = 0;
  let glut = 0;
  for (const k of kennzahlen) {
    erz += k.workouts * 20 + k.saetze + Math.floor(k.ausdauerMin / 3) + k.aktivitaeten * 5 + k.rekorde * 10;
    glut += (k.geloggt ? 10 : 0) + (k.protein ? 5 : 0) + (k.wasser ? 5 : 0) + (k.supplements ? 3 : 0)
      + (k.gewicht ? 2 : 0) + (k.tagebuch ? 3 : 0) + (k.gemuese ? 3 : 0);
  }
  return { erz, glut };
}

/** Kosten der nächsten Stufe (stufe = 1 … 5). */
export function kosten(bau, stufe) {
  const f = FAKTOR[stufe - 1];
  return { erz: Math.round(bau.basis.erz * f), glut: Math.round(bau.basis.glut * f) };
}

/** Kontostand = verdient + Belohnungen − ausgegeben. */
export function kontostand(verdienst, belohnungen, lager) {
  return {
    erz: verdienst.erz + (belohnungen?.erz ?? 0) - (lager.ausgegeben?.erz ?? 0),
    glut: verdienst.glut + (belohnungen?.glut ?? 0) - (lager.ausgegeben?.glut ?? 0),
  };
}

/** Bauwerk um eine Stufe ausbauen. Liefert { lager } oder { fehler }. */
export function baueAus(lager, bauId, konto, level) {
  const bau = BAUTEN.find((b) => b.id === bauId);
  if (!bau) return { fehler: 'Unbekanntes Bauwerk.' };
  if (level < bau.ab) return { fehler: `Ab Level ${bau.ab} verfügbar.` };
  const stufe = (lager.bauten[bauId] ?? 0) + 1;
  if (stufe > STUFEN_NAMEN.length) return { fehler: 'Schon legendär.' };
  const k = kosten(bau, stufe);
  if (konto.erz < k.erz || konto.glut < k.glut) return { fehler: 'Nicht genug Erz oder Glut.' };
  return {
    lager: {
      ...lager,
      bauten: { ...lager.bauten, [bauId]: stufe },
      ausgegeben: { erz: (lager.ausgegeben?.erz ?? 0) + k.erz, glut: (lager.ausgegeben?.glut ?? 0) + k.glut },
    },
  };
}

export function kaufeSchild(lager, konto) {
  if ((lager.schilde ?? 0) >= MAX_SCHILDE) return { fehler: `Höchstens ${MAX_SCHILDE} Schilde auf Vorrat.` };
  if (konto.glut < SCHILD_PREIS.glut) return { fehler: 'Nicht genug Glut.' };
  return {
    lager: {
      ...lager,
      schilde: (lager.schilde ?? 0) + 1,
      ausgegeben: { ...lager.ausgegeben, glut: (lager.ausgegeben?.glut ?? 0) + SCHILD_PREIS.glut },
    },
  };
}

/** Glutschild auf einen Tag legen: zählt für die Feuer-Serie wie ein aktiver Tag. */
export function setzeSchild(lager, datum) {
  if ((lager.schilde ?? 0) < 1) return { fehler: 'Kein Glutschild vorrätig.' };
  if ((lager.schildTage ?? []).includes(datum)) return { fehler: 'Dieser Tag ist schon geschützt.' };
  return { lager: { ...lager, schilde: lager.schilde - 1, schildTage: [...(lager.schildTage ?? []), datum] } };
}

export function bauXp(lager) {
  return Object.values(lager.bauten ?? {}).reduce((s, stufe) => s + stufe * (stufe + 1) / 2, 0) * XP_JE_BAUSTUFE;
}
