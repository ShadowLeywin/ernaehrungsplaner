// Platzhalter-Ansichten für Schritt 1. Jede wird in ihrem Schritt durch eine eigene Datei ersetzt.

function karte(titel, text) {
  const el = document.createElement('section');
  el.className = 'karte';
  const h = document.createElement('h2');
  h.textContent = titel;
  const p = document.createElement('p');
  p.className = 'leise';
  p.textContent = text;
  el.append(h, p);
  return el;
}

function platzhalter(titel, text, reiter) {
  return { titel, reiter, render: () => karte(titel, text) };
}

function mehrAnsicht() {
  const eintraege = [
    ['gewicht', '⚖️ Gewicht & Anpassung'],
    ['lebensmittel', '🥦 Lebensmittel'],
    ['angebote', '🏷️ Angebote'],
    ['mealprep', '🥘 Meal-Prep'],
    ['einstellungen', '⚙️ Profil & Einstellungen'],
    ['backup', '💾 Backup'],
  ];
  const wrap = document.createElement('section');
  wrap.className = 'karte';
  wrap.style.padding = '0';
  const ul = document.createElement('ul');
  ul.className = 'liste';
  for (const [route, text] of eintraege) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#/${route}`;
    a.textContent = text;
    li.append(a);
    ul.append(li);
  }
  wrap.append(ul);
  return wrap;
}

export const ansichten = {
  woche: platzhalter('Woche', 'Wochenplaner – kommt in Schritt 7.'),
  rezepte: platzhalter('Rezepte', 'Rezepte mit Bewertung, Geschmack und Vorteilen – kommt in Schritt 5.'),
  einkauf: platzhalter('Einkauf', 'Einkaufsliste aus dem Wochenplan – kommt in Schritt 7.'),
  mehr: { titel: 'Mehr', render: mehrAnsicht },
  angebote: platzhalter('Angebote', 'Angebote der Märkte – kommt in Schritt 9.', 'mehr'),
  mealprep: platzhalter('Meal-Prep', 'Gesamtgewicht ÷ Portionen – kommt in Schritt 6.', 'mehr'),
};
