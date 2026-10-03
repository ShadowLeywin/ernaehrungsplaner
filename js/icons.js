// Eigenes Icon-Set (24×24, Linien). Offline, ohne externe Bibliothek.
const SVG = 'http://www.w3.org/2000/svg';

const FLAMME_AUSSEN = 'M50 94C24 94 12 75 17 58C21 45 31 38 35 25C40 35 44 40 46 45C46 30 52 15 61 6C63 24 79 36 83 55C87 75 75 94 50 94Z';
const FLAMME_KERN = 'M50 87C38 87 33 77 36 68C39 60 46 56 48 47C55 58 65 64 65 74C65 82 59 87 50 87Z';

// Jedes Icon: Liste von [Element, Attribute]
const ICONS = {
  heute: [['circle', { cx: 12, cy: 12, r: 4 }], ['path', { d: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' }]],
  woche: [['rect', { x: 3, y: 4.5, width: 18, height: 17, rx: 3 }], ['path', { d: 'M8 2.5v4M16 2.5v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01' }]],
  rezepte: [['path', { d: 'M3 11h18a9 9 0 0 1-18 0Z' }], ['path', { d: 'M8 7c0-1.5 1.5-1.5 1.5-3M12 7c0-1.5 1.5-1.5 1.5-3M16 7c0-1.5 1.5-1.5 1.5-3' }]],
  einkauf: [['path', { d: 'M2.5 3h2.6l2.4 12.2a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 2-1.5L21.5 7H6' }], ['circle', { cx: 9.5, cy: 20.5, r: 1.3 }], ['circle', { cx: 17.5, cy: 20.5, r: 1.3 }]],
  mehr: [['rect', { x: 3.5, y: 3.5, width: 7, height: 7, rx: 2 }], ['rect', { x: 13.5, y: 3.5, width: 7, height: 7, rx: 2 }], ['rect', { x: 3.5, y: 13.5, width: 7, height: 7, rx: 2 }], ['rect', { x: 13.5, y: 13.5, width: 7, height: 7, rx: 2 }]],
  gewicht: [['rect', { x: 3, y: 3, width: 18, height: 18, rx: 5 }], ['path', { d: 'M7.5 9a6 6 0 0 1 9 0M12 9.5l1.5-2.5' }]],
  lebensmittel: [['path', { d: 'M12 7c-1-2-3.5-3-5.5-1.8C3.5 7 4 12 6.5 16c1.3 2.1 3 3.5 4.3 2.8.8-.4 1.6-.4 2.4 0 1.3.7 3-.7 4.3-2.8C20 12 20.5 7 17.5 5.2 15.5 4 13 5 12 7Z' }], ['path', { d: 'M12 7c0-2 1-3.5 3-4.5' }]],
  angebote: [['path', { d: 'M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z' }], ['circle', { cx: 7.5, cy: 7.5, r: 1.3 }]],
  mealprep: [['rect', { x: 3, y: 9, width: 18, height: 11, rx: 3 }], ['path', { d: 'M3 13h18M8 9V6.5A1.5 1.5 0 0 1 9.5 5h5A1.5 1.5 0 0 1 16 6.5V9' }]],
  einstellungen: [['path', { d: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0' }], ['circle', { cx: 16, cy: 6, r: 2 }], ['circle', { cx: 10, cy: 12, r: 2 }], ['circle', { cx: 18, cy: 18, r: 2 }]],
  backup: [['path', { d: 'M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 8a4 4 0 0 1 0 8' }], ['path', { d: 'M12 12v8M9 15l3-3 3 3' }]],
  wasser: [['path', { d: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z' }]],
  zurueck: [['path', { d: 'M15 5l-7 7 7 7' }]],
  weiter: [['path', { d: 'M9 5l7 7-7 7' }]],
  schliessen: [['path', { d: 'M6 6l12 12M18 6 6 18' }]],
  plus: [['path', { d: 'M12 5v14M5 12h14' }]],
  // FORGE-Flamme (gleiche Form wie das App-Icon, Raster 100 → 24)
  flamme: [['path', { d: FLAMME_AUSSEN, transform: 'scale(0.24)', 'stroke-width': 8 }]],
  'flamme-voll': [['path', {
    d: `${FLAMME_AUSSEN} ${FLAMME_KERN}`, transform: 'scale(0.24)', fill: 'currentColor', stroke: 'none', 'fill-rule': 'evenodd',
  }]],
  sonne: [['circle', { cx: 12, cy: 12, r: 4 }], ['path', { d: 'M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' }]],
  mond: [['path', { d: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z' }]],
  system: [['rect', { x: 6, y: 2.5, width: 12, height: 19, rx: 3 }], ['path', { d: 'M11 18.5h2' }]],
};

/** SVG-Element für ein Icon; Farbe über currentColor. */
export function icon(name, groesse = 24) {
  const svg = document.createElementNS(SVG, 'svg');
  for (const [k, v] of Object.entries({
    viewBox: '0 0 24 24', width: groesse, height: groesse, fill: 'none', stroke: 'currentColor',
    'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'icon',
  })) svg.setAttribute(k, v);
  for (const [tag, attribute] of ICONS[name] ?? []) {
    const teil = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attribute)) teil.setAttribute(k, v);
    svg.append(teil);
  }
  return svg;
}
