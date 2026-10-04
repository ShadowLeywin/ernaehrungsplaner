// Brom's Geschichte in Kapiteln (freigeschaltet mit dem Level) und Titel, die man mit Erz und Glut erwirbt.

export const KAPITEL = [
  { level: 1, titel: 'Der Fremde am Feuer', text: 'Du kamst in der Dämmerung. Ich saß am Feuer, wie jeden Abend seit vierzig Wintern. Ich frage nicht, woher du kommst. Ich frage nur: Willst du stärker werden? Gut. Dann setz dich. Morgen beginnt die Arbeit.' },
  { level: 2, titel: 'Der erste Schlag', text: 'Weißt du, warum ein Schmied jeden Tag schlägt? Weil Eisen vergisst. Ein Tag Pause verzeiht es dir. Eine Woche nicht. Du hast heute zugeschlagen. Das Eisen erinnert sich daran.' },
  { level: 5, titel: 'Palisaden', text: 'Mein Vater baute dieses Lager mit bloßen Händen. Pfahl um Pfahl, wie du Satz um Satz. Niemand sieht die einzelnen Pfähle. Alle sehen die Mauer.' },
  { level: 8, titel: 'Die Narbe', text: 'Du fragst nach der Narbe? Ein Funke, als ich jung war und zu schnell schlagen wollte. Mehr Gewicht als Verstand. Seitdem lege ich lieber eine Scheibe weniger auf – und schlage dafür jeden Tag.' },
  { level: 12, titel: 'Die Esse erwacht', text: 'Spürst du die Hitze? Die Esse brennt jetzt für dich mit. Du bist kein Gast mehr am Feuer. Du bist einer, der es nährt.' },
  { level: 16, titel: 'Brot und Eisen', text: 'Mein Großvater sagte: Ein leerer Magen schmiedet nichts. Wir aßen Hafer, Bohnen, Fleisch, Kräuter aus dem Garten. Nicht viel Gold, aber genug Kraft für den Hammer. Iss wie ein Schmied, nicht wie ein König.' },
  { level: 20, titel: 'Die Feste am Berg', text: 'Von hier oben sieht man, wie weit der Weg war. Viele, die mit dir anfingen, sitzen noch unten im Tal. Sie sind nicht schwächer als du. Sie sind nur stehen geblieben.' },
  { level: 25, titel: 'Der Golem', text: 'Den Eisengolem hat noch keiner in einem Schlag besiegt. Man schlägt ihn mit Tonnen, nicht mit Wut. Monat für Monat. Erinnert dich das an etwas?' },
  { level: 30, titel: 'Unter dem Berg', text: 'Die Hallen meiner Ahnen. Jede Säule trägt einen Namen – Schmiede, die nicht aufgehört haben. Hier ist Platz für einen weiteren Namen. Ich glaube, ich weiß, wessen.' },
  { level: 40, titel: 'Der Lehrling wird Meister', text: 'Ich habe dir nichts mehr beizubringen, was du nicht schon weißt. Ab jetzt lernst du von dir selbst – von jedem Satz, jedem Tag, jedem Rückschlag. Das ist Meisterschaft.' },
  { level: 50, titel: 'Die Esse der Legenden', text: 'Man erzählt sich Geschichten über Schmiede, die das Feuer selbst geformt haben. Ich habe nie daran geglaubt. Bis heute. Setz dich zu mir. Diesmal erzähle ich nicht. Diesmal hörst du dir selbst zu.' },
];

export function freieKapitel(level) {
  return KAPITEL.filter((k) => level >= k.level);
}

/** Neu freigeschaltete Kapitel zwischen zwei Leveln. */
export function neueKapitel(vonLevel, bisLevel) {
  return KAPITEL.filter((k) => k.level > vonLevel && k.level <= bisLevel);
}

// ---------------------------------------------------------------- Titel

export const TITEL = [
  { id: 'funkenschlaeger', name: 'Funkenschläger', ab: 2, preis: { erz: 60, glut: 30 } },
  { id: 'eisenfaust', name: 'Eisenfaust', ab: 5, preis: { erz: 200, glut: 50 } },
  { id: 'hueter_der_glut', name: 'Hüter der Glut', ab: 5, preis: { erz: 50, glut: 200 } },
  { id: 'taverneneroberer', name: 'Tavernenwirt', ab: 8, preis: { erz: 80, glut: 300 } },
  { id: 'windlaeufer', name: 'Windläufer', ab: 10, preis: { erz: 350, glut: 100 } },
  { id: 'ambossbrecher', name: 'Ambossbrecher', ab: 15, preis: { erz: 700, glut: 200 } },
  { id: 'bergfuerst', name: 'Bergfürst', ab: 20, preis: { erz: 900, glut: 900 } },
  { id: 'golembezwinger', name: 'Golembezwinger', ab: 25, preis: { erz: 1500, glut: 800 } },
  { id: 'flammengeboren', name: 'Flammengeboren', ab: 40, preis: { erz: 3000, glut: 3000 } },
];

/** Titel kaufen oder (wenn schon im Besitz) als aktiven setzen. Liefert { lager } oder { fehler }. */
export function waehleTitel(lager, titelId, konto, level) {
  const t = TITEL.find((x) => x.id === titelId);
  if (!t) return { fehler: 'Unbekannter Titel.' };
  const besitz = lager.titel?.besitz ?? [];
  if (besitz.includes(titelId)) return { lager: { ...lager, titel: { besitz, aktiv: titelId } } };
  if (level < t.ab) return { fehler: `Ab Level ${t.ab}.` };
  if (konto.erz < t.preis.erz || konto.glut < t.preis.glut) return { fehler: 'Nicht genug Erz oder Glut.' };
  return {
    lager: {
      ...lager,
      titel: { besitz: [...besitz, titelId], aktiv: titelId },
      ausgegeben: { erz: (lager.ausgegeben?.erz ?? 0) + t.preis.erz, glut: (lager.ausgegeben?.glut ?? 0) + t.preis.glut },
    },
  };
}

export const titelName = (id) => TITEL.find((t) => t.id === id)?.name ?? null;
