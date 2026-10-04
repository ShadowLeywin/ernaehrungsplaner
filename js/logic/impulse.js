// Tagesimpuls: ein Satz pro Tag – Schmiede-Weisheit oder Wissenshappen (fest je Datum, reine Funktion).

export const IMPULSE = [
  'Muskeln wachsen nicht im Training, sondern in der Erholung danach. Schlaf ist Teil des Plans.',
  'Eisen wird nicht an einem Tag geschmiedet. Beständigkeit schlägt Härte.',
  'Etwa 1,6–2,2 g Protein pro kg Körpergewicht reichen für maximalen Muskelaufbau – mehr bringt kaum mehr.',
  'Ein Satz zählt, wenn er nah am Muskelversagen endet: 1–3 Wiederholungen im Tank sind ideal.',
  'Kreatin wirkt durch tägliche Einnahme – der Zeitpunkt ist fast egal.',
  'Wasser zuerst, Kaffee danach. Schon 2 % Flüssigkeitsverlust kosten messbar Kraft.',
  'Gemüse bringt Ballaststoffe, Kalium und Magnesium – die stillen Helfer jeder Schmiede.',
  'Wer misst, kann schmieden. Wer schätzt, rät.',
  'Ein schlechter Tag macht keine schlechte Woche. Eine gute Woche macht keinen Sommer. Bleib dran.',
  'Progressive Überlastung: ein Kilo mehr, eine Wiederholung mehr – Woche für Woche.',
  'Beim Lean-Bulk ist die Waage launisch. Achte auf den Wochenschnitt, nicht auf den Tag.',
  'Omega-3 aus Fisch oder Algen unterstützt Herz und Entzündungshaushalt.',
  'Vitamin D bildet die Haut aus Sonnenlicht – im Winter reicht das in Deutschland oft nicht.',
  'Die Esse braucht Glut: Kohlenhydrate vor dem Training geben Energie für schwere Sätze.',
  'Ballaststoffe sättigen, nähren die Darmflora und glätten den Blutzucker.',
  'Ruhetage sind keine verlorenen Tage. Der Amboss braucht Zeit zum Abkühlen.',
  'Technik vor Gewicht. Ein sauberer Satz ist mehr wert als zwei unsaubere.',
  'Schlaf unter 6 Stunden senkt Testosteron und Leistung. Plane ihn wie ein Workout.',
  'Iss bunt: jede Farbe bringt andere Pflanzenstoffe.',
  'Wer seine Mahlzeiten vorbereitet, muss nicht improvisieren.',
  'Der schwerste Satz ist der erste Schritt ins Gym.',
  'Salz ist kein Feind, aber viel Fertigessen bringt zu viel davon.',
  'Magnesium aus Nüssen, Samen und Vollkorn hilft Muskeln und Nerven.',
  'Kraft im Verhältnis zum Körpergewicht zählt – darum zeigen die Ränge genau das.',
  'Ein Bier ist okay. Fünf sabotieren Erholung und Muskelaufbau.',
  'Deine Unterarme tragen jedes Gewicht. Vergiss den Reiseimer nicht.',
  'Spazierengehen nach dem Essen senkt den Blutzucker – und kostet nichts.',
  'Hunger ist ein Signal, kein Befehl. Durst wird oft mit Hunger verwechselt.',
  'Plane Deload-Wochen ein: weniger Gewicht, gleiche Bewegung, frische Gelenke.',
  'Fortschritt sieht man im Spiegel oft zuletzt. Fotos und Maße zeigen ihn früher.',
];

export function impulsFuerDatum(datumSchluessel) {
  let h = 0;
  for (const c of datumSchluessel) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return IMPULSE[h % IMPULSE.length];
}
