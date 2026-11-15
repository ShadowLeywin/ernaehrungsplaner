// Alle Werte in diesem Test sind erfunden.
import assert from 'node:assert/strict';
import test from 'node:test';
import { fuerMenge, summeEintraege } from '../js/logik/naehrwerte.js';
import { bereinigeGerichte, fuegeZusammen, gerichtId, korbEintraege, korbSumme, leseUnterwegsDatei, pruefeGericht, restaurants, setzeGericht } from '../js/logik/unterwegs.js';

const burger = { restaurant: 'Testgrill', name: 'Testburger', kcal: 500, protein: 25, kh: 40, fett: 25 };
const pommes = { restaurant: 'Testgrill', name: 'Pommes M', kcal: 330, protein: 4, kh: 42, fett: 16 };
const wrap = { restaurant: 'Wrapladen', name: 'Wrap', kcal: 450 };

test('Gericht prüfen: Restaurant und Name nötig, Werte wie bei „Schnell eintragen“', () => {
  const ok = pruefeGericht({ restaurant: ' Testgrill ', name: 'Testburger', kcal: '500', protein: '25,5' });
  assert.deepEqual(ok, { ok: true, gericht: { id: 'testgrill|testburger', restaurant: 'Testgrill', name: 'Testburger', kcal: 500, protein: 25.5 } });
  const leer = pruefeGericht({});
  assert.deepEqual(Object.keys(leer.fehler).sort(), ['kcal', 'name', 'restaurant']);
});

test('Liste bereinigen: Unbrauchbares weg, Doppelte einmal, sortiert; Restaurants alphabetisch', () => {
  const liste = bereinigeGerichte([wrap, burger, { ...burger, kcal: 510 }, { restaurant: '', name: 'x', kcal: 1 }, { restaurant: 'A', name: 'y' }, null]);
  assert.deepEqual(liste.map((g) => `${g.restaurant}/${g.name}/${g.kcal}`), ['Testgrill/Testburger/510', 'Wrapladen/Wrap/450']);
  assert.deepEqual(restaurants(bereinigeGerichte([wrap, burger, pommes])), ['Testgrill', 'Wrapladen']);
});

test('Gericht umbenennen ersetzt das alte statt es zu verdoppeln', () => {
  const liste = bereinigeGerichte([burger, pommes]);
  const neu = setzeGericht(liste, { ...burger, name: 'Testburger XL', id: gerichtId('Testgrill', 'Testburger XL') }, gerichtId('Testgrill', 'Testburger'));
  assert.deepEqual(neu.map((g) => g.name), ['Pommes M', 'Testburger XL']);
});

test('Bestellung: Summe und Einträge rechnen gleich', () => {
  const liste = bereinigeGerichte([burger, pommes, wrap]);
  const korb = new Map([[gerichtId('Testgrill', 'Testburger'), 2], [gerichtId('Testgrill', 'Pommes M'), 1], [gerichtId('Wrapladen', 'Wrap'), 0]]);
  assert.deepEqual(korbSumme(liste, korb), { anzahl: 3, kcal: 1330, protein: 54, kh: 122, fett: 66 });
  const eintraege = korbEintraege(liste, korb, '2026-11-15', 'mittag');
  assert.deepEqual(eintraege.map((e) => `${e.name} (${e.marke})`), ['Pommes M (Testgrill)', '2× Testburger (Testgrill)']);
  assert.ok(eintraege.every((e) => e.schnell && e.gramm === 100 && e.datum === '2026-11-15' && e.slot === 'mittag'));
  assert.equal(summeEintraege(eintraege).kcal, 1330);
  assert.deepEqual(fuerMenge(eintraege[0].je100, 100), { kcal: 330, protein: 4, kh: 42, fett: 16 });
});

test('Datei lesen: Format prüfen, Gerichte übernehmen, Unbrauchbares zählen', () => {
  const datei = { format: 'elan-unterwegs', version: 1, quelle: 'Nährwerttabelle Testgrill', stand: '2026-11-01', restaurants: [{ name: 'Testgrill', gerichte: [burger, pommes, { name: 'ohne Werte' }] }] };
  const r = leseUnterwegsDatei(JSON.stringify(datei));
  assert.equal(r.ok, true);
  assert.equal(r.gerichte.length, 2);
  assert.equal(r.verworfen, 1);
  assert.equal(r.stand, '2026-11-01');
  assert.equal(leseUnterwegsDatei('{kaputt').ok, false);
  assert.match(leseUnterwegsDatei('{"format":"anders"}').fehler, /keine Unterwegs-Liste/);
  assert.match(leseUnterwegsDatei({ ...datei, version: 2 }).fehler, /Version 2/);
  const zusammen = fuegeZusammen(bereinigeGerichte([{ ...burger, kcal: 1 }, wrap]), r.gerichte);
  assert.deepEqual(zusammen.map((g) => `${g.name}:${g.kcal}`), ['Pommes M:330', 'Testburger:500', 'Wrap:450']);
});

test('Vorschläge: passt ins Budget, sortiert nach Eiweiß, mager oder Nähe zum Budget', async () => {
  const { vorschlaege } = await import('../js/logik/unterwegs.js');
  const liste = bereinigeGerichte([
    { restaurant: 'Testgrill', name: 'Hähnchenwrap', kcal: 400, protein: 30, kh: 40, fett: 12 },
    { restaurant: 'Testgrill', name: 'Doppelburger', kcal: 580, protein: 32, kh: 40, fett: 30 },
    { restaurant: 'Testgrill', name: 'Pommes M', kcal: 330, protein: 4, kh: 42, fett: 16 },
    { restaurant: 'Testgrill', name: 'Salat', kcal: 120, protein: 6, kh: 8, fett: 6 },
    { restaurant: 'Testgrill', name: 'Cola Zero', kcal: 1 },
    { restaurant: 'Anderswo', name: 'Riesenbox', kcal: 550, protein: 60, kh: 10, fett: 20 },
  ]);
  const eiweiss = vorschlaege(liste, { restaurant: 'Testgrill', budget: 600, ziel: 'eiweiss' });
  assert.ok(eiweiss.length > 0);
  assert.ok(eiweiss.every((v) => v.kcal <= 600 && v.kcal >= 360));
  assert.ok(eiweiss.every((v) => v.gerichte.every((g) => g.restaurant === 'Testgrill')), 'nur das gewählte Restaurant');
  assert.deepEqual(eiweiss[0].gerichte.map((g) => g.name).sort(), ['Hähnchenwrap', 'Salat']); // 36 g Eiweiß in 520 kcal
  assert.equal(eiweiss[0].protein, 36);
  // keine Obermenge eines Vorschlags („Wrap + Salat + Cola Zero“ bringt nichts Neues)
  assert.ok(!eiweiss.some((v) => v.ids.length === 3 && v.gerichte.some((g) => g.name === 'Cola Zero') && v.gerichte.some((g) => g.name === 'Salat') && v.gerichte.some((g) => g.name === 'Hähnchenwrap')));
  const mager = vorschlaege(liste, { restaurant: 'Testgrill', budget: 600, ziel: 'mager' });
  assert.deepEqual(mager[0].gerichte.map((g) => g.name), ['Hähnchenwrap']); // 30 − 12 = 18, gleich wie mit Salat (36 − 18): weniger Teile gewinnt
  const satt = vorschlaege(liste, { restaurant: 'Testgrill', budget: 600, ziel: 'satt' });
  assert.ok(satt[0].kcal >= Math.max(...eiweiss.map((v) => v.kcal)));
  assert.deepEqual(vorschlaege(liste, { restaurant: 'Testgrill', budget: 0 }), []);
  assert.deepEqual(vorschlaege(liste, { restaurant: 'Testgrill', budget: 50 }), []);
});

test('Offene Kalorien: für die Mahlzeit und den Tag, nie unter 0', async () => {
  const { offeneKcal } = await import('../js/logik/unterwegs.js');
  const slots = [{ id: 'mittag', anteil: 0.3 }, { id: 'abend', anteil: 0.25 }];
  const e = (slot, kcal) => ({ slot, gramm: 100, je100: { kcal } });
  assert.deepEqual(offeneKcal({ zielKcal: 2400, slots, slot: 'abend', eintraege: [e('mittag', 900), e('abend', 104)] }), { mahlzeit: 500, tag: 1400 });
  assert.deepEqual(offeneKcal({ zielKcal: 2000, slots, slot: 'mittag', eintraege: [e('mittag', 2500)] }), { mahlzeit: 0, tag: 0 });
});

test('Vorschläge: ohne Getränke und Saucen, höchstens eine Form je Gericht', async () => {
  const { istGetraenkOderSauce, vorschlaege } = await import('../js/logik/unterwegs.js');
  for (const name of ['Coca-Cola Classic 0,5l', 'Cappuccino', 'Iced Latte', 'Ketchup 20ml', 'BBQ Sauce', 'Café Grande', 'Whey Protein', 'Collagen Matcha (Large)', 'Extra Käse', 'Americano (Medium)', 'Chai Latte (Small)']) assert.equal(istGetraenkOderSauce(name), true, name);
  for (const name of ['Big Mac', 'Chicken Teriyaki (Salat)', '9 Chicken McNuggets', 'Whopper', 'Teriyaki Sub', 'Dippers', 'KFC Salat ohne Dressing', 'McSundae Original mit Karamell-Sauce']) assert.equal(istGetraenkOderSauce(name), false, name);
  const liste = bereinigeGerichte([
    { restaurant: 'T', name: 'Huhn (Sub)', kcal: 300, protein: 25 },
    { restaurant: 'T', name: 'Huhn (Salat)', kcal: 120, protein: 15 },
    { restaurant: 'T', name: 'Cappuccino', kcal: 120, protein: 7 },
    { restaurant: 'T', name: 'Brot', kcal: 150, protein: 5 },
  ]);
  const v = vorschlaege(liste, { restaurant: 'T', budget: 450 });
  assert.ok(v.every((x) => !x.gerichte.some((g) => g.name === 'Cappuccino')));
  assert.ok(v.every((x) => x.gerichte.filter((g) => g.name.startsWith('Huhn')).length <= 1));
  assert.deepEqual(v[0].gerichte.map((g) => g.name), ['Brot', 'Huhn (Sub)']);
});


test('Ketten-Liste: einmal einmischen, nur bei neuerem Stand wieder; eigene Gerichte bleiben', async () => {
  const { mischeKetten } = await import('../js/logik/unterwegs.js');
  const paket = (stand, kcal) => ({ format: 'elan-unterwegs', version: 1, stand, restaurants: [{ name: 'Kette', gerichte: [{ name: 'Burger', kcal }] }] });
  const eigene = bereinigeGerichte([{ restaurant: 'Imbiss', name: 'Döner', kcal: 700 }]);
  const erst = mischeKetten(eigene, paket('2026-11-15', 500), null);
  assert.equal(erst.geaendert, true);
  assert.deepEqual(erst.gerichte.map((g) => `${g.restaurant}/${g.name}/${g.kcal}`), ['Imbiss/Döner/700', 'Kette/Burger/500']);
  assert.equal(mischeKetten(erst.gerichte, paket('2026-11-15', 999), erst.stand).geaendert, false);
  const neuer = mischeKetten(erst.gerichte, paket('2027-02-01', 520), erst.stand);
  assert.deepEqual(neuer.gerichte.map((g) => g.kcal), [700, 520]);
  assert.equal(mischeKetten(eigene, { kaputt: true }, null).geaendert, false);
});

test('Frühstück nur für Frühstück und Morgensnack vorschlagen', async () => {
  const { istFruehstueck, vorschlaege } = await import('../js/logik/unterwegs.js');
  for (const name of ['McMuffin Egg', '6 Mini Pancakes', 'Big Morning Egg', 'King Toasty Bacon Egg', 'Breakfast Tortilla']) assert.equal(istFruehstueck(name), true, name);
  for (const name of ['Big Mac', 'Veggie Delite (Salat)', 'McVeggie TS', 'Buttercroissant']) assert.equal(istFruehstueck(name), false, name);
  const liste = bereinigeGerichte([{ restaurant: 'M', name: 'McMuffin Egg', kcal: 300, protein: 18 }, { restaurant: 'M', name: 'Burger', kcal: 300, protein: 12 }]);
  assert.deepEqual(vorschlaege(liste, { restaurant: 'M', budget: 350, fruehstueck: false }).flatMap((v) => v.gerichte.map((g) => g.name)), ['Burger']);
  assert.equal(vorschlaege(liste, { restaurant: 'M', budget: 350 })[0].gerichte[0].name, 'McMuffin Egg');
});

test('Getränk-Tipp: ohne Kalorien, Zero zuerst, je Getränk eine Größe, keine Saucen', async () => {
  const { nullGetraenke } = await import('../js/logik/unterwegs.js');
  const liste = bereinigeGerichte([
    { restaurant: 'K', name: 'Coca-Cola Zero 0,25 l', kcal: 0 },
    { restaurant: 'K', name: 'Coca-Cola Zero 0,5 l', kcal: 1 },
    { restaurant: 'K', name: 'Wasser Still 0,5l', kcal: 0 },
    { restaurant: 'K', name: 'Espresso', kcal: 1 },
    { restaurant: 'K', name: 'Fanta 0,5 l', kcal: 185 },
    { restaurant: 'K', name: 'Senf Sauce 25ml', kcal: 3 },
    { restaurant: 'Anders', name: 'Pepsi Zero 0,5 l', kcal: 1 },
  ]);
  assert.deepEqual(nullGetraenke(liste, 'K', 3).map((g) => g.name), ['Coca-Cola Zero 0,5 l', 'Wasser Still 0,5l', 'Espresso']);
  assert.deepEqual(nullGetraenke(liste, 'Nirgends'), []);
});
