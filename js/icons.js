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
  hantel: [['path', { d: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11' }]],
  uhr: [['circle', { cx: 12, cy: 13, r: 8 }], ['path', { d: 'M12 9v4l2.5 2M10 2h4' }]],
  haken: [['path', { d: 'M5 12.5l4.5 4.5L19 7.5' }]],
  zahnrad: [['circle', { cx: 12, cy: 12, r: 3 }], ['path', { d: 'M12 2.5l1.6 2.4 2.9-.7.7 2.9 2.4 1.6-1.4 2.6 1.4 2.6-2.4 1.6-.7 2.9-2.9-.7L12 21.5l-1.6-2.4-2.9.7-.7-2.9-2.4-1.6 1.4-2.6-1.4-2.6 2.4-1.6.7-2.9 2.9.7Z' }]],
  feuer: [['path', { d: 'M12 15.5c2.3 0 3.6-1.4 3.6-3.4 0-2.5-2.9-3.8-2.9-6.3-1.7 1.2-3.8 3.1-3.8 6 0 .5.1 1 .3 1.4-.6-.4-.9-1-.9-1.6-.6.7-.6 1.5-.6 1.9 0 1.5 1.6 2 4.3 2Z' }], ['path', { d: 'M4 21l16-4M4 17l16 4' }]],
  buch: [['path', { d: 'M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17ZM4 19.5A2.5 2.5 0 0 1 6.5 17H20' }]],
  hoch: [['path', { d: 'M6 15l6-6 6 6' }]],
  runter: [['path', { d: 'M6 9l6 6 6-6' }]],
  stift: [['path', { d: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4' }]],
  zurueck: [['path', { d: 'M15 5l-7 7 7 7' }]],
  weiter: [['path', { d: 'M9 5l7 7-7 7' }]],
  schliessen: [['path', { d: 'M6 6l12 12M18 6 6 18' }]],
  plus: [['path', { d: 'M12 5v14M5 12h14' }]],
  // FORGEBORN-Flamme (gleiche Form wie das App-Icon, Raster 100 → 24)
  flamme: [['path', { d: FLAMME_AUSSEN, transform: 'scale(0.24)', 'stroke-width': 8 }]],
  'flamme-voll': [['path', {
    d: `${FLAMME_AUSSEN} ${FLAMME_KERN}`, transform: 'scale(0.24)', fill: 'currentColor', stroke: 'none', 'fill-rule': 'evenodd',
  }]],
  koerper: [['circle', { cx: 12, cy: 4.5, r: 2.2 }], ['path', { d: 'M5 8.5c2.5 1 4.5 1.3 7 1.3s4.5-.3 7-1.3M12 9.8V15M12 15l-3 6.5M12 15l3 6.5M8.5 9.5 7 15M15.5 9.5 17 15' }]],
  pokal: [['path', { d: 'M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8 21h8M9.5 18h5' }]],
  schild: [['path', { d: 'M12 2.5 20 5.5v6c0 5-3.5 8.6-8 10-4.5-1.4-8-5-8-10v-6l8-3Z' }]],
  stern: [['path', { d: 'm12 3 2.7 5.6 6.1.8-4.4 4.3 1.1 6.1L12 16.9l-5.5 2.9 1.1-6.1-4.4-4.3 6.1-.8L12 3Z' }]],
  teilen: [['circle', { cx: 18, cy: 5.5, r: 2.5 }], ['circle', { cx: 6, cy: 12, r: 2.5 }], ['circle', { cx: 18, cy: 18.5, r: 2.5 }], ['path', { d: 'm8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1' }]],
  kamera: [['path', { d: 'M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.5-2.5h6L16.5 6h2A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-9Z' }], ['circle', { cx: 12, cy: 13, r: 3.8 }]],
  barcode: [['path', { d: 'M3 5v14M6 5v14M10 5v14M13 5v14M17 5v14M21 5v14M8 5v14M19 5v14' }]],
  mikro: [['rect', { x: 9, y: 2.5, width: 6, height: 12, rx: 3 }], ['path', { d: 'M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21' }]],
  krone: [['path', { d: 'm3 7 4.5 4L12 4.5 16.5 11 21 7l-2 11H5L3 7Z' }]],
  freunde: [['circle', { cx: 9, cy: 8, r: 3.2 }], ['path', { d: 'M3 20c.6-3.5 3-5.5 6-5.5s5.4 2 6 5.5' }], ['circle', { cx: 17, cy: 9, r: 2.5 }], ['path', { d: 'M16.5 14.5c2.3 0 4 1.6 4.5 4.5' }]],
  trank: [['path', { d: 'M9.5 2.5h5M10.5 2.5v5L5.5 16a4 4 0 0 0 3.5 5.5h6a4 4 0 0 0 3.5-5.5l-5-8.5v-5' }], ['path', { d: 'M7 14.5h10' }]],
  liste: [['path', { d: 'M9 6h11M9 12h11M9 18h11' }], ['circle', { cx: 4.5, cy: 6, r: 1 }], ['circle', { cx: 4.5, cy: 12, r: 1 }], ['circle', { cx: 4.5, cy: 18, r: 1 }]],
  muell: [['path', { d: 'M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13' }]],
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
