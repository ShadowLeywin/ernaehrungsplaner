#!/usr/bin/env python3
"""Holt die Wochenangebote von marktguru.de und schreibt data/angebote.json.

Läuft als GitHub Action (siehe .github/workflows/angebote.yml).
Nutzt die inoffizielle marktguru-Web-API (dieselbe, die die Website verwendet).
Bei einem Fehler wird die bestehende Datei NICHT überschrieben.
"""
import json, re, sys, time
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
import requests

PLZ = "89344"
AUSGABE = Path(__file__).resolve().parent.parent / "data" / "angebote.json"
API = "https://api.marktguru.de/api/v1"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"}

MAERKTE = [
    # id, Händler, Ort, Suchbegriffe für den Händlernamen bei marktguru, Suchanfrage
    ("netto-offingen", "Netto Marken-Discount", "Offingen", ["netto marken", "netto-marken"], "Netto Marken-Discount"),
    ("edeka-offingen", "EDEKA", "Offingen", ["edeka"], "Edeka"),
    ("lidl-burgau", "Lidl", "Burgau", ["lidl"], "Lidl"),
    ("kaufland-dillingen", "Kaufland", "Dillingen a.d. Donau", ["kaufland"], "Kaufland"),
    ("dm-lauingen", "dm-drogerie markt", "Lauingen (Donau)", ["dm-drogerie", "dm drogerie", "dm "], "dm"),
]

# Zusätzliche Suchbegriffe, damit auch Angebote gefunden werden, die über die Händlersuche fehlen
BEGRIFFE = """milch joghurt quark skyr käse butter sahne eier hähnchen pute rind schwein hackfleisch
wurst schinken salami lachs thunfisch fisch garnelen haferflocken müsli brot brötchen toast nudeln reis
kartoffeln mehl zucker öl obst gemüse banane apfel tomate gurke paprika salat zwiebel karotte beeren
trauben orange mandarine pizza tiefkühl eis schokolade kekse chips nüsse kaffee tee saft wasser limonade
cola bier wein sekt spirituosen energy protein whey müsliriegel erdnussbutter honig marmelade aufstrich
konserve bohnen linsen kichererbsen mais soße ketchup gewürz shampoo duschgel zahnpasta deo creme
waschmittel spülmittel reiniger toilettenpapier windeln katzenfutter hundefutter""".split()

KAT_GETRAENKE = re.compile(r"getränk|saft|wasser|limo|cola|spezi|bier|wein|sekt|likör|whisk|wodka|rum|gin|"
                           r"spirituose|kaffee|espresso|tee\b|energy|schorle|eistee|smoothie|drink", re.I)
KAT_DROGERIE = re.compile(r"drogerie|kosmetik|körperpflege|shampoo|dusch|deo|zahn|creme|haar|rasier|windel|"
                          r"waschmittel|weichspül|reinig|spül|putz|toilettenpapier|taschentuch|hygiene|pflege", re.I)
KAT_LEBENSMITTEL = re.compile(r"lebensmittel|obst|gemüse|fleisch|wurst|fisch|milch|molkerei|käse|joghurt|quark|"
                              r"brot|back|nudel|reis|tiefkühl|süß|snack|konserve|frühstück|müsli|eier|butter|"
                              r"geflügel|hähnchen|pute|rind|schwein|lachs|protein|feinkost", re.I)


def woche():
    heute = datetime.now(ZoneInfo("Europe/Berlin")).date()
    mo = heute - timedelta(days=heute.weekday())
    return mo, mo + timedelta(days=5)


def schluessel(s):
    r = s.get("https://www.marktguru.de/", headers=UA, timeout=30)
    r.raise_for_status()
    for block in re.findall(r'<script[^>]*type="application/json"[^>]*>(.*?)</script>', r.text, re.S):
        try:
            cfg = json.loads(block).get("config", {})
        except Exception:
            continue
        if cfg.get("apiKey") and cfg.get("clientKey"):
            return cfg["apiKey"], cfg["clientKey"]
    a = re.search(r'"apiKey"\s*:\s*"([^"]+)"', r.text)
    c = re.search(r'"clientKey"\s*:\s*"([^"]+)"', r.text)
    if a and c:
        return a.group(1), c.group(1)
    raise RuntimeError("apiKey/clientKey nicht auf marktguru.de gefunden – Seitenaufbau hat sich geändert")


def suche(s, headers, q, limit=100, max_seiten=15):
    out, offset = [], 0
    for _ in range(max_seiten):
        r = s.get(f"{API}/offers/search", headers=headers, timeout=30,
                  params={"as": "web", "q": q, "zipCode": PLZ, "limit": limit, "offset": offset})
        if r.status_code == 404:
            break
        r.raise_for_status()
        d = r.json()
        res = d.get("results") or []
        out += res
        offset += len(res)
        if not res or offset >= (d.get("totalResults") or 0):
            break
        time.sleep(0.3)
    return out


def datum(x):
    return x[:10] if x else None


def kategorie(o, text):
    cats = " ".join(c.get("name", "") for c in (o.get("categories") or []))
    probe = f"{cats} {text}"
    if KAT_DROGERIE.search(probe) and not KAT_LEBENSMITTEL.search(cats):
        return "drogerie"
    if KAT_GETRAENKE.search(probe) and not re.search(r"joghurt|quark|milchreis", text, re.I):
        return "getraenke"
    if KAT_LEBENSMITTEL.search(probe):
        return "lebensmittel"
    return "haushalt_nonfood"


def umwandeln(o):
    produkt = ((o.get("product") or {}).get("name") or o.get("description") or "").strip()
    marke = ((o.get("brand") or {}).get("name") or "").strip() or None
    preis = o.get("price")
    if not produkt or preis is None:
        return None
    alt = o.get("oldPrice") or None
    if alt is not None and alt <= preis:
        alt = None
    vd = (o.get("validityDates") or [{}])[0]
    beschr = o.get("description") or ""
    return {
        "produkt": produkt,
        "marke": marke,
        "preis": round(float(preis), 2),
        "preis_ab": bool(re.match(r"\s*ab\b", beschr, re.I)),
        "streichpreis": round(float(alt), 2) if alt else None,
        "rabatt_prozent": round((1 - preis / alt) * 100) if alt else None,
        "kategorie": kategorie(o, f"{produkt} {beschr}"),
        "gueltig_von": datum(vd.get("from")),
        "gueltig_bis": datum(vd.get("to")),
    }


def haendler_von(o):
    return " ".join(f"{a.get('name','')} {a.get('uniqueName','')}" for a in (o.get("advertisers") or [])).lower() + " "


def main():
    mo, sa = woche()
    s = requests.Session()
    api_key, client_key = schluessel(s)
    h = {**UA, "x-apikey": api_key, "x-clientkey": client_key, "Accept": "application/json"}

    alle = {}
    for q in [m[4] for m in MAERKTE] + BEGRIFFE:
        try:
            for o in suche(s, h, q):
                if o.get("id") is not None:
                    alle[o["id"]] = o
        except requests.HTTPError as e:
            print(f"Warnung: Suche '{q}' fehlgeschlagen: {e}", file=sys.stderr)
        time.sleep(0.3)
    print(f"{len(alle)} Angebote insgesamt von marktguru geladen")
    if not alle:
        raise RuntimeError("Keine Angebote erhalten – Datei bleibt unverändert")

    maerkte = []
    for mid, name, ort, muster, q in MAERKTE:
        angebote, seen = [], set()
        for o in alle.values():
            hn = haendler_von(o)
            if not any(m in hn for m in muster):
                continue
            if mid == "netto-offingen" and "marken" not in hn:
                continue
            a = umwandeln(o)
            if not a or not a["gueltig_von"] or not a["gueltig_bis"]:
                continue
            if a["gueltig_von"] > sa.isoformat() or a["gueltig_bis"] < mo.isoformat():
                continue
            key = (a["produkt"].lower(), a["marke"], a["preis"])
            if key in seen:
                continue
            seen.add(key)
            angebote.append(a)
        angebote.sort(key=lambda a: (a["kategorie"], a["produkt"].lower()))
        eintrag = {"id": mid, "haendler": name, "ort": ort,
                   "quelle": f"https://www.marktguru.de/r/{q.lower().replace(' ', '-')}"}
        if not angebote:
            eintrag["fehler"] = "Keine Angebote bei marktguru gefunden"
        else:
            letzter = max(a["gueltig_bis"] for a in angebote)
            if letzter < sa.isoformat():
                eintrag["hinweis"] = (f"Die Angebote laufen am {letzter} aus; der Folgeprospekt "
                                      "war beim Abruf noch nicht online.")
        zeitraeume = sorted({(a["gueltig_von"], a["gueltig_bis"]) for a in angebote})
        eintrag["prospekte"] = [{"titel": f"Angebote {v} bis {b}", "gueltig_von": v, "gueltig_bis": b}
                                for v, b in zeitraeume[:5]]
        eintrag["angebote"] = angebote
        maerkte.append(eintrag)
        print(f"{mid}: {len(angebote)} Angebote")

    jahr, kw, _ = mo.isocalendar()
    daten = {
        "schema_version": 1,
        "erstellt_am": datetime.now(ZoneInfo("Europe/Berlin")).isoformat(timespec="seconds"),
        "kalenderwoche": f"{jahr}-W{kw:02d}",
        "zeitraum": {"von": mo.isoformat(), "bis": sa.isoformat()},
        "hinweis": f"Angebote laut marktguru.de für PLZ {PLZ} (regionale Abweichungen je Filiale möglich). Preise ohne Gewähr.",
        "maerkte": maerkte,
    }
    if sum(len(m["angebote"]) for m in maerkte) == 0:
        raise RuntimeError("Für keinen Markt Angebote gefunden – Datei bleibt unverändert")
    AUSGABE.parent.mkdir(parents=True, exist_ok=True)
    tmp = AUSGABE.with_suffix(".tmp")
    tmp.write_text(json.dumps(daten, ensure_ascii=False, indent=2), encoding="utf-8")
    json.loads(tmp.read_text(encoding="utf-8"))
    tmp.replace(AUSGABE)
    print(f"Geschrieben: {AUSGABE} (KW {kw:02d})")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"FEHLER: {e}", file=sys.stderr)
        sys.exit(1)
