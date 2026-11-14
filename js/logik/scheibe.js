// Geometrie der Tagesscheibe: sechs Segmente wie eine aufgeschnittene Zitrusfrucht.
// Jedes Segment gehört zu einem Slot; seine Breite ist der Anteil am Tagesziel,
// seine Füllung (von innen nach außen) zeigt, wie viel davon gegessen ist. Reine Funktionen.

const GRAD = Math.PI / 180;

/** Punkt auf einem Kreis; 0° zeigt nach oben, positive Winkel laufen im Uhrzeigersinn. */
function punkt(cx, cy, radius, grad) {
  return [cx + radius * Math.sin(grad * GRAD), cy - radius * Math.cos(grad * GRAD)];
}

const f = (n) => Number(n.toFixed(2));

/** SVG-Pfad eines Ringsektors zwischen zwei Radien und zwei Winkeln. */
export function sektorPfad(cx, cy, rInnen, rAussen, startGrad, endGrad) {
  const gross = endGrad - startGrad > 180 ? 1 : 0;
  const [ax, ay] = punkt(cx, cy, rAussen, startGrad);
  const [bx, by] = punkt(cx, cy, rAussen, endGrad);
  const [dx, dy] = punkt(cx, cy, rInnen, endGrad);
  const [ex, ey] = punkt(cx, cy, rInnen, startGrad);
  return `M${f(ax)} ${f(ay)}A${rAussen} ${rAussen} 0 ${gross} 1 ${f(bx)} ${f(by)}L${f(dx)} ${f(dy)}A${rInnen} ${rInnen} 0 ${gross} 0 ${f(ex)} ${f(ey)}Z`;
}

/**
 * Radius, bis zu dem ein Segment gefüllt ist. Flächentreu: halb gegessen = halbe Fläche,
 * nicht halber Radius (außen ist ein Segment breiter als innen).
 */
export function fuellRadius(rInnen, rAussen, anteil) {
  const a = Math.min(1, Math.max(0, anteil));
  return Math.sqrt(rInnen ** 2 + (rAussen ** 2 - rInnen ** 2) * a);
}

/**
 * Winkel und Füllstand je Slot.
 * slots: [{ id, anteil }], kcalJeSlot: { id: kcal }, zielKcal: Tagesziel, luecke: Abstand in Grad.
 */
export function segmente(slots, kcalJeSlot, zielKcal, luecke = 4) {
  let winkel = 0;
  return slots.map((slot) => {
    const breite = slot.anteil * 360;
    const start = winkel + luecke / 2;
    const ende = winkel + breite - luecke / 2;
    winkel += breite;
    const ist = kcalJeSlot[slot.id] ?? 0;
    const ziel = zielKcal * slot.anteil;
    const anteil = ziel > 0 ? ist / ziel : 0;
    // Ein Slot mit 0 % (oder weniger Breite als die Lücke) hat kein Segment; seine Einträge zählen trotzdem zum Tag
    return { id: slot.id, start, ende, ist, ziel, anteil, ueber: anteil > 1.05, sichtbar: ende - start >= 1 };
  });
}
