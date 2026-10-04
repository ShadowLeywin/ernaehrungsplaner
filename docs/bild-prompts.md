# FORGEBORN – Bild-Prompts für den KI-Bildgenerator

Die App nutzt diese Bilder automatisch, sobald sie im Ordner `bilder/` liegen (WebP oder PNG).
Fehlt ein Bild, bleibt die eingebaute Grafik. Du kannst also nach und nach ergänzen.

**Empfohlene Generatoren:** ChatGPT (Bilder, kann transparente Hintergründe), Midjourney, Leonardo.ai, Ideogram.
Prompts auf Englisch eingeben – damit werden die Ergebnisse deutlich besser.

**Ablauf:**
1. Prompt kopieren, Bild erzeugen, das beste von mehreren Versuchen nehmen.
2. Brom freistellen (falls der Generator keinen transparenten Hintergrund kann): z. B. remove.bg oder Photopea.
3. In WebP umwandeln und verkleinern: squoosh.app (Qualität ~75, Ziel unter 400 KB).
4. Mit genau dem Dateinamen in den passenden Ordner legen, committen, pushen.

**Gleicher Brom auf allen Bildern:** Zuerst das Brom-Referenzbild (1) erzeugen. Dann bei den weiteren Bildern dieses
Bild als Referenz anhängen („use this character as reference“) bzw. in Midjourney `--cref <Bild-URL>` nutzen.

---

## Gemeinsamer Stil (steckt schon in jedem Prompt unten)

> Korean manhwa / webtoon illustration, dark fantasy, highly detailed, sharp clean lineart, cel shading with soft
> painterly gradients, dramatic cinematic lighting, warm firelight against deep cold shadows, volumetric light,
> floating embers, Dark Souls bonfire atmosphere, no text, no watermark, no logo

---

## 1. Brom – Referenzbild (Charakterblatt)

Datei: nicht nötig in der App, aber Grundlage für alles Weitere.

```
Character design sheet of BROM, a dwarf blacksmith hero in Korean manhwa webtoon style. Short but enormously broad
and powerful, heroic manhwa proportions: massive trapezius and shoulders, wide V-taper, thick chest, extremely
defined abs and obliques, huge veined forearms and biceps, thick neck. Stern, calm, intimidating face, sharp jaw,
deep-set eyes with glowing amber irises, a vertical scar across the left eye, heavy brows. Short swept-back spiky
dark auburn hair with shaved sides. Long thick dark-red beard braided into two braids with gold rings.
Everyday clothes only: tight black sleeveless shirt, dark loose work trousers, worn leather work boots, leather belt.
Front view and three-quarter view, standing, full body, neutral dark grey background.
Sharp clean lineart, cel shading, highly detailed anatomy, dramatic lighting, no text, no watermark.
```

## 2. Brom sitzend am Feuer → `bilder/brom/sitzend.webp`

Transparenter Hintergrund, Hochformat oder quadratisch (z. B. 1024 × 1024). Er blickt nach **links** (dort ist das Feuer).

```
Full-body illustration of BROM (same character as reference): hyper-muscular dwarf blacksmith with heroic manhwa
proportions, glowing amber eyes, scar across left eye, swept-back spiky auburn hair, long braided red beard with gold
rings, tight black sleeveless shirt, dark work trousers, leather boots. He sits on a thick log, leaning forward,
forearms resting on his knees, hands loosely clasped, body turned three-quarters to the LEFT, gazing left into a
campfire that is OUT OF FRAME on the left. A heavy blacksmith hammer leans against the log beside him.
Strong warm orange firelight from the LEFT with bright rim light on his left side, deep shadows on his right side,
subtle fiery aura and embers around him. Korean manhwa webtoon style, sharp lineart, cel shading, extremely detailed
muscles and veins. TRANSPARENT BACKGROUND, entire figure and log visible, nothing cut off, no text, no watermark.
```

## 3. Brom Porträt → `bilder/brom/portraet.webp`

Quadratisch 512 × 512, dunkler Hintergrund oder transparent.

```
Bust portrait of BROM (same character): dwarf blacksmith, three-quarter view, intense calm gaze toward the viewer,
glowing amber eyes, scar across left eye, swept-back spiky auburn hair, braided red beard with gold rings, massive
trapezius and shoulders, black sleeveless shirt. Warm firelight from the left, rim light, embers drifting, faint
fiery aura. Korean manhwa webtoon style, sharp lineart, cel shading, highly detailed, dark background, no text.
```

---

## 4. Lager-Szenen (werden mit deinem Level prächtiger)

Format **16:10 quer (z. B. 1600 × 1000)**. Wichtig für alle sechs:
- Das Feuer sitzt **leicht links der Mitte, im unteren Drittel** (ca. 42 % von links, 72 % von oben) – dort setzt die App Licht und Funken an.
- **Rechts ist Platz frei** (dort sitzt Brom), **oben ist es ruhiger und dunkler** (dort steht Text).
- **Keine Personen** im Bild.

Zusatz am Ende jedes Szenen-Prompts:
```
, campfire placed slightly left of center in the lower third, empty space on the right side for a seated
character, calmer darker area at the top, no people, wide 16:10, Korean manhwa webtoon background art,
Dark Souls bonfire hub atmosphere, highly detailed, dramatic warm firelight, volumetric light, floating embers,
no text, no watermark
```

| Level | Datei | Prompt-Anfang |
|---|---|---|
| ab 1 | `bilder/lager/szene-1.webp` | `A small humble campfire in a dark misty forest clearing at night, ring of mossy stones, a fallen log, twisted ancient trees, fireflies, cold blue moonlight against warm fire` |
| ab 5 | `bilder/lager/szene-2.webp` | `A campfire inside a fortified camp with a wooden palisade, canvas tents, tattered banners, a weapon rack and training dummy, torches on poles, night sky` |
| ab 10 | `bilder/lager/szene-3.webp` | `A bonfire next to an outdoor blacksmith forge, glowing anvil, hammers and tongs on the wall, quenching barrel, stacked iron ingots, sparks, smoke rising into the night` |
| ab 20 | `bilder/lager/szene-4.webp` | `A great bonfire on the stone terrace of an ancient mountain fortress, crumbling pillars, huge stone statues of warriors, snowy peaks under a stormy sky, distant lightning` |
| ab 35 | `bilder/lager/szene-5.webp` | `A massive bonfire in a vast underground dwarven hall, colossal carved stone pillars and statues of dwarf kings, rivers of molten metal in channels, glowing runes, enormous scale` |
| ab 50 | `bilder/lager/szene-6.webp` | `A legendary bonfire at the heart of a volcanic dwarven forge-cathedral, a giant ancient anvil, waterfalls of lava, golden runes blazing on the walls, floating embers like stars, godlike epic scale` |

Beispiel komplett (Szene 3):
```
A bonfire next to an outdoor blacksmith forge, glowing anvil, hammers and tongs on the wall, quenching barrel,
stacked iron ingots, sparks, smoke rising into the night, campfire placed slightly left of center in the lower
third, empty space on the right side for a seated character, calmer darker area at the top, no people, wide 16:10,
Korean manhwa webtoon background art, Dark Souls bonfire hub atmosphere, highly detailed, dramatic warm firelight,
volumetric light, floating embers, no text, no watermark
```

---

### 4b. Szenen mit Brom → `bilder/lager/szene-<nr>-brom.webp`

Gleiche Szene, aber Brom ist mit im Bild und tut etwas (sitzt, schmiedet, isst, trainiert). Ist Brom in der App
eingeschaltet, wird diese Fassung gezeigt, sonst die leere Szene. Vorhanden: 1 (sitzt im Wald), 2 (isst am Feuer),
3 (schmiedet), 4 (Liegestütze). Für 5 und 6 z. B.:
```
[Szenen-Prompt 5 oder 6], with BROM (use the attached character as reference) [sitting on a stone bench, meditating /
carrying a giant iron ingot / doing pull-ups on a beam] on the RIGHT side, fire left of center, Korean manhwa
webtoon style, no other people, no text
```

## 5. Kopfbilder der Seiten (nur im Stil „Episch“)

Format **12:5 quer (z. B. 1200 × 500)**, Motiv mittig, unten etwas dunkler (dort steht der Titel), keine Personen.

| Datei | Prompt-Anfang |
|---|---|
| `bilder/kopf/taverne.webp` | `A cozy medieval tavern interior, heavy wooden table full of hearty food: roasted chicken, bread, vegetables, fruit, a bowl of oats, potions in glass bottles, candles and hearth fire` |
| `bilder/kopf/uebungsplatz.webp` | `A rugged medieval training yard at dusk, iron weights, stone barbells, pull-up bar made of timber, training dummies, chains, torches, sparks` |
| `bilder/kopf/held.webp` | `A blacksmith's anvil with a glowing sword blade being forged, sparks exploding, hammer mid-strike, dark forge interior` |
| `bilder/kopf/halle.webp` | `A hall of trophies in a dwarven fortress, shields, medals, crowns and weapons displayed on stone walls, golden light, banners` |

Jeweils anhängen:
```
, Korean manhwa webtoon background art, dark fantasy, highly detailed, dramatic lighting, warm firelight, embers,
wide 12:5 banner, darker bottom area, no people, no text, no watermark
```

---

## 6. Bauwerke (Lager ausbauen) → `bilder/bauten/<id>-<stufe>.webp`

Jedes Bauwerk einzeln, **freigestellt (transparenter Hintergrund)**, quadratisch 1024 × 1024, leicht von schräg oben
(gleiche Perspektive wie die Lager-Szene). Stufen: **1 Holz, 2 Stein, 3 Eisen, 4 Gold, 5 Legendär**.
Die App nimmt automatisch die höchste vorhandene Stufe – du musst nicht alle 60 Bilder machen.

Grund-Prompt (Platzhalter ersetzen):
```
A single [BAUWERK] for a dwarven blacksmith camp, made of [MATERIAL], isolated object, three-quarter view from
slightly above, Korean manhwa webtoon style, dark fantasy, highly detailed, sharp lineart, cel shading, warm
firelight from the left, TRANSPARENT BACKGROUND, no ground, no people, no text, no watermark
```

| id (Dateiname) | [BAUWERK] |
|---|---|
| `amboss` | blacksmith anvil on a tree stump with hammer and tongs |
| `brunnen` | water well with bucket and rope |
| `banner` | tall war banner on a pole with a flame emblem |
| `esse` | blacksmith forge with glowing coals and bellows |
| `kraeutergarten` | raised herb garden bed with medicinal plants and potion bottles |
| `steinbank` | weight bench with a heavy stone barbell |
| `vorratskammer` | small storehouse with sacks, barrels and hanging meat |
| `klimmzugbalken` | pull-up bar made of a thick beam between two posts |
| `statue` | statue of a muscular dwarf warrior on a pedestal |
| `chronikhaus` | small library hut with scrolls and books |
| `wachturm` | watchtower with a lit brazier on top |
| `trophaeenhalle` | small trophy hall with shields, crowns and weapons |

| Stufe | [MATERIAL] |
|---|---|
| 1 | rough weathered wood and rope |
| 2 | carved grey stone and wood |
| 3 | dark forged iron with rivets |
| 4 | polished gold with engravings |
| 5 | black obsidian with glowing orange runes and molten gold veins, legendary aura |

Beispiel: `bilder/bauten/amboss-3.webp` = Amboss aus Eisen.

## 7. Monats-Bosse → `bilder/bosse/<id>.webp`

Quadratisch 512 × 512, dunkler Hintergrund, bedrohlich, Manhwa-Stil.

| Datei | Prompt-Anfang |
|---|---|
| `bosse/golem.webp` | `A colossal iron golem made of rusty plates and chains, glowing furnace core in its chest` |
| `bosse/drache.webp` | `A fearsome ember dragon with cracked lava scales, smoke and sparks around it` |
| `bosse/troll.webp` | `A huge swamp troll with moss, mud and a wooden club, glowing yellow eyes` |
| `bosse/lich.webp` | `A starving undead lich king in tattered robes, empty plates and goblets floating around` |
| `bosse/wyrm.webp` | `A frost wyrm with icy crystal scales, freezing breath, snowy mountain night` |

Jeweils anhängen:
```
, boss portrait, Korean manhwa webtoon style, dark fantasy, dramatic lighting, highly detailed, sharp lineart,
cel shading, dark background, no text, no watermark
```

---

## Tipps

- **Zu bunt oder zu „Anime“?** Ergänze: `muted color palette, gritty, realistic shading`.
- **Muskeln zu übertrieben?** Ergänze: `athletic bodybuilder proportions, anatomically accurate`.
- **Midjourney:** `--ar 16:10` (Szenen), `--ar 12:5` (Kopfbilder), `--style raw` und für gleichen Brom `--cref`.
- **Rechte:** Erzeuge eigene Bilder, keine Figuren aus bestehenden Manhwas nachbauen – das Repo ist öffentlich.
