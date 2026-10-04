// Beschreibungen für Muskeln und Übungen (Körperansicht, Übungsdetails).
// Übungen ohne eigenen Text bekommen eine automatisch erzeugte Beschreibung (siehe uebungsBeschreibung).
import { MUSKELN, EQUIPMENT } from './uebungen.js';

export const MUSKEL_INFO = {
  brust: { latein: 'M. pectoralis major/minor', text: 'Drückt die Arme nach vorn und zur Mitte. Wichtig für alle Drückbewegungen.' },
  ruecken: { latein: 'M. trapezius (Mitte), Rhomboiden', text: 'Zieht die Schulterblätter zusammen und stabilisiert die Haltung.' },
  lat: { latein: 'M. latissimus dorsi', text: 'Größter Rückenmuskel. Zieht die Arme nach unten und hinten – sorgt für die V-Form.' },
  schultern: { latein: 'M. deltoideus', text: 'Hebt den Arm nach vorn, zur Seite und nach hinten. Breite Schultern = seitlicher Anteil.' },
  nacken: { latein: 'M. trapezius (oben)', text: 'Hebt die Schultern an und stützt den Nacken.' },
  bizeps: { latein: 'M. biceps brachii, M. brachialis', text: 'Beugt den Ellenbogen und dreht den Unterarm nach außen.' },
  trizeps: { latein: 'M. triceps brachii', text: 'Streckt den Ellenbogen. Macht rund zwei Drittel des Oberarms aus.' },
  unterarme: { latein: 'Unterarmbeuger und -strecker', text: 'Griffkraft und Handgelenk. Entscheidend bei Klimmzügen, Kreuzheben und Hängen.' },
  bauch: { latein: 'M. rectus abdominis, Mm. obliqui', text: 'Beugt und dreht den Rumpf, stabilisiert die Wirbelsäule bei schweren Übungen.' },
  unterer_ruecken: { latein: 'M. erector spinae', text: 'Streckt und stabilisiert die Wirbelsäule – Grundlage für Kreuzheben und Kniebeugen.' },
  quadrizeps: { latein: 'M. quadriceps femoris', text: 'Streckt das Knie. Größter Muskel des Körpers, Hauptarbeiter bei Kniebeugen.' },
  beinbizeps: { latein: 'Ischiocrurale Muskulatur', text: 'Beugt das Knie und streckt die Hüfte. Schützt das Knie und hilft beim Sprinten.' },
  gesaess: { latein: 'M. gluteus maximus/medius', text: 'Streckt die Hüfte und stabilisiert das Becken – Kraftquelle für Sprünge und Heben.' },
  waden: { latein: 'M. gastrocnemius, M. soleus', text: 'Streckt das Sprunggelenk. Wichtig für Laufen und Springen.' },
  adduktoren: { latein: 'Adduktorengruppe', text: 'Zieht die Beine zusammen und stabilisiert die Hüfte bei Kniebeugen.' },
  schienbein: { latein: 'M. tibialis anterior', text: 'Hebt den Fuß an. Gut für Knie- und Sprunggelenkgesundheit.' },
  hueftbeuger: { latein: 'M. iliopsoas', text: 'Hebt das Bein nach vorn. Wichtig für L-Sit, Sprints und Beinheben – oft verkürzt durch Sitzen.' },
};

// Kurze Ausführungshinweise für häufige Übungen
const UEBUNGS_TEXT = {
  bankdruecken_lh: 'Schulterblätter zusammen und nach unten, Füße fest am Boden. Stange kontrolliert zur unteren Brust, dann kraftvoll nach oben drücken.',
  schraegbank_lh: 'Bank auf 30–45°. Stange zur oberen Brust führen, Ellenbogen leicht angewinkelt zum Körper.',
  bankdruecken_kh: 'Wie Langhantel-Bankdrücken, aber mit mehr Bewegungsfreiheit. Hanteln unten leicht nach außen, oben zusammenführen.',
  kniebeuge_lh: 'Stange auf dem oberen Rücken, Füße schulterbreit. Hüfte nach hinten-unten, Knie folgen den Fußspitzen, Rücken neutral. Mindestens bis Oberschenkel waagerecht.',
  frontkniebeuge: 'Stange vorn auf den Schultern, Ellenbogen hoch. Oberkörper bleibt aufrechter als bei der normalen Kniebeuge.',
  kreuzheben: 'Stange über der Fußmitte, Rücken gerade, Brust raus. Mit den Beinen vom Boden drücken, Stange nah am Körper, oben Hüfte strecken.',
  rumaenisches_kh: 'Knie leicht gebeugt, Hüfte weit nach hinten schieben, bis die Oberschenkelrückseite stark dehnt. Rücken bleibt gerade.',
  military_press: 'Stehend, Bauch und Gesäß fest. Stange von den Schultern senkrecht über den Kopf drücken, Kopf durch die Arme nach vorn.',
  schulterdruecken_kh: 'Sitzend oder stehend, Hanteln auf Schulterhöhe, nach oben drücken ohne ins Hohlkreuz zu fallen.',
  seitheben_kh: 'Leicht vorgebeugt, Arme fast gestreckt seitlich bis Schulterhöhe heben. Langsam ablassen, kein Schwung.',
  rudern_lh: 'Oberkörper etwa 45° vorgebeugt, Rücken gerade. Stange zum Bauchnabel ziehen, Schulterblätter zusammen.',
  rudern_kh: 'Eine Hand und ein Knie auf der Bank. Hantel zur Hüfte ziehen, Ellenbogen nah am Körper.',
  latzug_breit: 'Breiter Griff, Brust raus. Stange zur oberen Brust ziehen, Ellenbogen nach unten-hinten führen.',
  kabelrudern: 'Aufrecht sitzen, Griff zum Bauch ziehen, Schulterblätter zusammen, langsam nach vorn lassen.',
  face_pulls: 'Seil auf Augenhöhe, zum Gesicht ziehen und die Hände nach außen drehen. Gut für Schultergesundheit.',
  curls_lh: 'Ellenbogen fest am Körper, Stange kontrolliert nach oben beugen, ohne Schwung aus dem Rücken.',
  hammer_curls: 'Neutraler Griff (Daumen oben), Hanteln abwechselnd oder gleichzeitig beugen.',
  pushdown_seil: 'Ellenbogen am Körper fixiert, Seil nach unten drücken und unten die Enden auseinanderziehen.',
  skull_crusher: 'Liegend, Stange über der Stirn. Nur die Ellenbogen beugen und strecken, Oberarme bleiben ruhig.',
  beinpresse: 'Füße schulterbreit auf der Platte, Knie bis etwa 90° beugen, Rücken bleibt an der Lehne.',
  bulgarian_split_squat: 'Hinterer Fuß auf der Bank, vorderes Bein beugen, bis das hintere Knie fast den Boden berührt.',
  hip_thrust: 'Oberer Rücken an der Bank, Stange auf der Hüfte. Hüfte nach oben strecken, oben Gesäß fest anspannen.',
  beinstrecker: 'Knie auf Höhe der Drehachse, Beine kontrolliert strecken, oben kurz halten.',
  beinbeuger_liegend: 'Hüfte bleibt auf dem Polster, Fersen Richtung Gesäß ziehen, langsam ablassen.',
  wadenheben_stehend: 'Fußballen auf der Kante, ganz nach unten in die Dehnung, dann so hoch wie möglich auf die Zehen.',
  klimmzuege: 'Aus dem Hang (Arme gestreckt) hochziehen, bis das Kinn über der Stange ist. Schulterblätter zuerst nach unten ziehen.',
  chin_ups: 'Untergriff, schulterbreit. Hochziehen bis Kinn über die Stange – mehr Bizeps als bei Klimmzügen.',
  liegestuetze: 'Körper eine gerade Linie, Hände etwas breiter als schulterbreit. Brust bis kurz über den Boden, Ellenbogen etwa 45° vom Körper.',
  dips: 'Am Barren stützen, Körper leicht nach vorn. Bis Oberarme etwa waagerecht absenken, dann hochdrücken.',
  muscle_up: 'Explosiver Klimmzug bis zur Brust, Handgelenke über die Stange drehen und in den Stütz drücken.',
  pike_pushups: 'Hüfte hoch (umgedrehtes V), Kopf zwischen die Hände absenken. Vorstufe zum Handstand-Liegestütz.',
  handstand: 'An der Wand oder frei. Arme gestreckt, Schultern zu den Ohren, Körper gerade und Bauch fest.',
  l_sit: 'Am Boden, an Parallettes oder am Barren stützen, Beine gestreckt waagerecht nach vorn halten.',
  front_lever: 'Am Reck hängend den gestreckten Körper waagerecht halten, Arme gestreckt, Lat drückt die Stange nach unten.',
  planche: 'Nur auf den Händen stützen, Körper waagerecht über dem Boden, Schultern weit vor den Händen.',
  plank: 'Unterarme unter den Schultern, Körper gerade von Kopf bis Ferse, Bauch und Gesäß fest.',
  hollow_body: 'Auf dem Rücken, unteren Rücken in den Boden drücken, Arme und Beine gestreckt knapp über dem Boden halten.',
  beinheben_haengend: 'Im Hang die gestreckten Beine bis mindestens waagerecht heben, ohne zu schwingen.',
  pistol_squats: 'Einbeinige Kniebeuge, das freie Bein gestreckt nach vorn. Ferse bleibt am Boden.',
  nordic_curls: 'Kniend, Fersen fixiert. Oberkörper gerade langsam nach vorn sinken lassen, mit den Händen abfangen.',
  australian_pullups: 'Unter einer tiefen Stange hängend, Körper gerade, Brust zur Stange ziehen.',
  reiseimer: 'Hände in einen Eimer mit Reis stecken und greifen, drehen, spreizen. Stärkt Unterarme, Griff und Handgelenke.',
  farmers_walk: 'Schwere Gewichte in beiden Händen, aufrecht und mit kurzen Schritten gehen.',
  kettlebell_swing: 'Hüftbewegung, kein Kniebeugen: Kettlebell zwischen den Beinen nach hinten, Hüfte explosiv strecken.',
  burpees: 'Aus dem Stand in den Liegestütz, Liegestütz, Füße ran, Strecksprung nach oben.',
  couch_stretch: 'Hinteres Knie an der Wand, Fuß nach oben an der Wand. Gesäß anspannen, Oberkörper aufrichten – dehnt Hüftbeuger.',
  dead_hang: 'Locker an der Stange hängen, Schultern aktiv. Dehnt Schultern und Wirbelsäule, trainiert den Griff.',
};

/** Beschreibung einer Übung: eigener Text oder automatisch aus Muskeln und Ausrüstung. */
export function uebungsBeschreibung(u) {
  if (!u) return '';
  if (UEBUNGS_TEXT[u.id]) return UEBUNGS_TEXT[u.id];
  if (u.met && !u.muskeln.some((m) => MUSKEL_INFO[m])) return 'Ausdauer- bzw. Bewegungsaktivität. Kalorien werden über Dauer und Intensität berechnet.';
  const [haupt, ...neben] = u.muskeln.filter((m) => MUSKELN[m] && m !== 'ausdauer' && m !== 'ganzkoerper');
  const teile = [];
  if (haupt) teile.push(`Trainiert vor allem ${MUSKELN[haupt]}${neben.length ? `, dazu ${neben.map((m) => MUSKELN[m]).join(' und ')}` : ''}.`);
  if (u.muskeln.includes('ganzkoerper')) teile.push('Fordert den ganzen Körper.');
  if (u.equipment && u.equipment !== 'sonstiges') teile.push(`Ausrüstung: ${EQUIPMENT[u.equipment]}.`);
  if (u.art === 'halten') teile.push('Position sauber halten, Zeit in Sekunden eintragen.');
  if (u.art === 'kraft') teile.push('Kontrolliert ausführen, volle Bewegung, Gewicht so wählen, dass die letzten Wiederholungen schwer sind.');
  if (u.art === 'koerpergewicht') teile.push('Mit eigenem Körpergewicht; Zusatzgewicht kann eingetragen werden.');
  return teile.join(' ');
}
