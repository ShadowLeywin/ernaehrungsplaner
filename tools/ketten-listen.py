# Baut data/unterwegs-ketten.json aus heruntergeladenen Nährwerttabellen (Format: docs/UNTERWEGS-FORMAT.md).
# Werkzeug für die Entwicklung, nicht Teil der App. Ablauf (Stand 15.11.2026):
#   1. Subway: PDF von subway.com/de-de/menunutrition/nutrition laden (Link „Nährwertinformationen“, liegt auf
#      media.subway.com), dann: pdftotext -layout <pdf> subway.txt
#   2. McDonald's, Burger King, KFC: nutriscan.app/de/calculators/<kette>-nutrition-calculator als ns-<kette>.html
#      speichern (kette = mcdonalds, burgerking, kfc). Die Seiten zitieren die Angaben der Ketten mit Datum.
#      mcdonalds.com blockt automatische Abrufe; das wird nicht umgangen.
#   3. python3 -I tools/ketten-listen.py <ordner>  → schreibt elan-unterwegs-*.json in den Ordner
#   4. Ergebnis prüfen (kcal gegen 4/4/9 aus den Makros), dann nach data/unterwegs-ketten.json übernehmen,
#      „stand“ und Quellen anpassen, VERSION in sw.js erhöhen.
import html, json, re, sys
ordner = sys.argv[1]
# Stand der Gesamtliste, JJJJ-MM-TT oder JJJJ-MM-TTTHH:MM. Nur ein neuerer Stand wird auf dem Handy neu eingemischt
STAND = sys.argv[2] if len(sys.argv) > 2 else '2026-11-15'
zahl = lambda t: float(t.replace(',', '.'))

def ns_tabelle(datei):
    s = open(f'{ordner}/{datei}', encoding='utf-8').read()
    kopf = [html.unescape(re.sub(r'<[^>]+>', '', h)).strip() for h in re.findall(r'<th[^>]*>([\s\S]*?)</th>', s)]
    zeilen = []
    for tr in re.findall(r'<tr>([\s\S]*?)</tr>', s):
        zellen = [html.unescape(re.sub(r'<[^>]+>', '', c)).strip() for c in re.findall(r'<td[^>]*>([\s\S]*?)</td>', tr)]
        if len(zellen) == 5 and re.fullmatch(r'[\d.,]+', zellen[1]):
            name, kcal, p, kh, f = zellen
            try:
                zeilen.append({'name': name, 'kcal': round(zahl(kcal.replace('.', '')) if '.' in kcal and len(kcal.split('.')[-1]) == 3 else zahl(kcal)),
                               'protein': zahl(p.replace(' g', '')), 'kh': zahl(kh.replace(' g', '')), 'fett': zahl(f.replace(' g', ''))})
            except ValueError:
                pass
    return kopf, zeilen

def eindeutig(gerichte):
    gesehen, aus = set(), []
    for g in gerichte:
        if g['name'].lower() in gesehen: continue
        gesehen.add(g['name'].lower()); aus.append(g)
    return aus

listen = {}
quellen = {
    "McDonald's": ('ns-mcdonalds.html', "McDonald's Deutschland, Nährwert- und Allergeninformationen auf mcdonalds.com (abgerufen 21.10.2026), übernommen über nutriscan.app/de/calculators/mcdonalds-nutrition-calculator am 15.11.2026"),
    'Burger King': ('ns-burgerking.html', 'Burger King Deutschland, burgerking.de/naehrwerte_allergene (abgerufen 21.10.2026), übernommen über nutriscan.app/de/calculators/burgerking-nutrition-calculator am 15.11.2026'),
    'KFC': ('ns-kfc.html', 'KFC Deutschland, PDF Allergene & Zusatzinformationen (Stand September 2026, abgerufen 21.10.2026), übernommen über nutriscan.app/de/calculators/kfc-nutrition-calculator am 15.11.2026'),
    # Nur Ketten mit deutscher Karte; US- oder kanadische Werte (Starbucks, Five Guys, Pizza Hut …) passen nicht zu deutschen Restaurants
    'dean&david': ('ns-deananddavid.html', 'dean&david Nährwertübersicht (Stand September 2026, abgerufen 21.10.2026), übernommen über nutriscan.app/de/calculators/deananddavid-nutrition-calculator am 15.11.2026'),
    'Hans im Glück': ('ns-hansimglueck.html', 'Nährwerttabelle Hans im Glück, menu.hansimglueck-burgergrill.de (ohne Datum, abgerufen 21.10.2026), übernommen über nutriscan.app am 15.11.2026'),
    'Peter Pane': ('ns-peterpane.html', 'Nährwerte der Peter Pane Speisekarte, peterpane.de/speisekarte (ohne Datum, abgerufen 21.10.2026), übernommen über nutriscan.app am 15.11.2026'),
    'Coffee Fellows': ('ns-coffeefellows.html', 'Coffee Fellows Nährwertliste (ohne Ausgabedatum, abgerufen 21.10.2026), übernommen über nutriscan.app am 15.11.2026'),
}
for kette, (datei, quelle) in quellen.items():
    kopf, zeilen = ns_tabelle(datei)
    print(kette, 'Spalten:', kopf[:5], 'Zeilen:', len(zeilen))
    listen[kette] = {'quelle': quelle, 'stand': '2026-10-21', 'gerichte': eindeutig(zeilen)}

# Subway: offizielles PDF, Werte pro Portion: g, kJ, kcal, Fett, ges. Fett, KH, Zucker, Ballaststoffe, Eiweiß, Salz
abschnitte = {'Sandwich': 'Sub 15 cm', 'Wraps': 'Wrap', 'Salads': 'Salat', '"Unsere Kreationen" Subs': 'Sub 15 cm', 'Baked Potato': '', 'Panini': 'Panini',
              'Footlong Sidekicks': '', 'Beilagen': '', 'Cookies': 'Cookie'}
weg = {'Sauce Dunk Pots', 'Saucen', 'Käse', 'Zutaten/Toppings', 'Brot', 'Einzel-Zutaten'}
abschnitt, gerichte = None, []
for zeile in open(f'{ordner}/subway.txt', encoding='utf-8'):
    t = re.sub(r'\s+', ' ', zeile).strip()
    if t in abschnitte or t in weg: abschnitt = t; continue
    m = re.match(r'^(.+?) ((?:[\d.]+ ){19}[\d.]+)$', t)
    if not m or abschnitt not in abschnitte: continue
    name, w = m.group(1), [float(x) for x in m.group(2).split()]
    g, kj, kcal, fett, _, kh, _, _, eiweiss, _ = w[:10]
    # Gegenprobe: kcal muss zu kJ passen (1 kcal = 4,184 kJ). Widerspricht das PDF sich selbst, gilt der Wert,
    # der besser zu den Makros passt (4 kcal je g Eiweiß und Kohlenhydrate, 9 je g Fett)
    if kj > 0 and abs(kj / 4.184 - kcal) / (kj / 4.184) > 0.1:
        makros = 4 * eiweiss + 4 * kh + 9 * fett
        neu = kj / 4.184 if abs(kj / 4.184 - makros) < abs(kcal - makros) else kcal
        print('Widerspruch:', name, abschnitt, f'kcal {kcal:.0f}, kJ→{kj / 4.184:.0f}, Makros≈{makros:.0f} → nehme {neu:.0f}')
        kcal = neu
    zusatz = abschnitte[abschnitt]
    voll = f'{name} ({zusatz})' if zusatz and zusatz.lower() not in name.lower() else name
    gerichte.append({'name': voll, 'kcal': round(kcal), 'protein': eiweiss, 'kh': kh, 'fett': fett})
    if zusatz == 'Sub 15 cm':  # laut PDF: Footlong = zwei 15-cm-Portionen
        gerichte.append({'name': f'{name} (Footlong)', 'kcal': round(kcal * 2), 'protein': round(eiweiss * 2, 1), 'kh': round(kh * 2, 1), 'fett': round(fett * 2, 1)})
print('Subway Zeilen:', len(gerichte))
listen['Subway'] = {'quelle': 'Subway Deutschland, „Nährwertinformationen November 2026“ (GermanyNutritionalInformationFullMenuC52026.pdf auf subway.com/de-de/menunutrition/nutrition), abgerufen 15.11.2026. Footlong = doppelte 15-cm-Werte, wie im PDF angegeben', 'stand': '2026-11-15', 'gerichte': eindeutig(gerichte)}

alle = []
for kette, d in listen.items():
    datei = {'format': 'elan-unterwegs', 'version': 1, 'quelle': d['quelle'][:200], 'stand': d['stand'], 'restaurants': [{'name': kette, 'gerichte': d['gerichte']}]}
    name = re.sub(r'[^a-z]', '', kette.lower())
    json.dump(datei, open(f'{ordner}/elan-unterwegs-{name}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    alle.append({'name': kette, 'gerichte': d['gerichte']})
json.dump({'format': 'elan-unterwegs', 'version': 1, 'quelle': "Subway: offizielles PDF Nov. 2026. Alle anderen über nutriscan.app nach den Angaben der Ketten (Okt. 2026). Einzelquellen: tools/ketten-listen.py", 'stand': STAND, 'restaurants': alle},
          open(f'{ordner}/elan-unterwegs-fastfood.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for kette, d in listen.items():
    print(kette, len(d['gerichte']), 'Beispiele:', [(g['name'], g['kcal'], g['protein']) for g in d['gerichte'][:3]])

# Fassung fürs Repo (data/unterwegs-ketten.json): eine Zeile je Gericht, damit Aktualisierungen im Diff lesbar bleiben
zeilen = ['{', ' "format": "elan-unterwegs",', ' "version": 1,',
          ' "quelle": ' + json.dumps("Subway: offizielles PDF Nov. 2026. Alle anderen über nutriscan.app nach den Angaben der Ketten (Okt. 2026). Einzelquellen: tools/ketten-listen.py", ensure_ascii=False) + ',',
          f' "stand": "{STAND}",',
          ' "hinweis": "Werte je Portion. Quellen je Kette: ' + '; '.join(f"{k}: {d['quelle']}" for k, d in listen.items()).replace('"', "'") + '. Rezepturen ändern sich: im Zweifel gilt die Angabe im Restaurant.",',
          ' "restaurants": [']
for i, r in enumerate(alle):
    zeilen.append(f'  {{ "name": {json.dumps(r["name"], ensure_ascii=False)}, "gerichte": [')
    zeilen += ['   ' + json.dumps(g, ensure_ascii=False) + (',' if j < len(r['gerichte']) - 1 else '') for j, g in enumerate(r['gerichte'])]
    zeilen.append('  ] }' + (',' if i < len(alle) - 1 else ''))
zeilen += [' ]', '}']
open(f'{ordner}/unterwegs-ketten.json', 'w', encoding='utf-8').write('\n'.join(zeilen) + '\n')
json.load(open(f'{ordner}/unterwegs-ketten.json', encoding='utf-8'))
print('Repo-Fassung geschrieben:', sum(len(r['gerichte']) for r in alle), 'Gerichte, Stand', STAND)
