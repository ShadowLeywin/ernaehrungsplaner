"""Erzeugt die FORGEBORN-App-Icons (PNG) ohne Zusatzbibliotheken.

Motiv: Der Schatten eines zwergenhaften Schmieds schlägt mit dem Hammer auf eine Flamme,
die auf einem Amboss lodert. In der Flamme zeichnet sich der Ziel-Körper ab (V-Form).
Hintergrund: dunkles Glutglühen. Alle Formen im 100×100-Raster, per Scanline mit Kantenglättung gefüllt.
Aufruf: python tools/icons_erzeugen.py
"""
import math
import struct
import zlib
from pathlib import Path

# Farben
DUNKEL = (16, 9, 8)
GLUT_INNEN = (255, 122, 47)
GLUT_MITTE = (170, 48, 30)
SCHATTEN = (8, 4, 4)
AMBOSS = (30, 20, 18)
AMBOSS_KANTE = (92, 56, 40)
FLAMME_UNTEN = (214, 40, 36)
FLAMME_OBEN = (255, 150, 60)
FLAMME_KERN = (255, 244, 214)
KOERPER = (150, 28, 20)
FUNKE = (255, 214, 140)


# ---------------------------------------------------------------- Formen

def bezier(start, kurven, schritte=20):
    punkte = [start]
    p0 = start
    for p1, p2, p3 in kurven:
        for i in range(1, schritte + 1):
            t = i / schritte
            u = 1 - t
            punkte.append((
                u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1],
            ))
        p0 = p3
    return punkte


def kreis(cx, cy, r, n=40):
    return [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n)) for i in range(n)]


def balken(a, b, dicke):
    """Rechteck entlang der Strecke a→b mit gegebener Dicke (z. B. Hammerstiel)."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    laenge = math.hypot(dx, dy)
    nx, ny = -dy / laenge * dicke / 2, dx / laenge * dicke / 2
    return [(a[0] + nx, a[1] + ny), (b[0] + nx, b[1] + ny), (b[0] - nx, b[1] - ny), (a[0] - nx, a[1] - ny)]


def rechteck_gedreht(cx, cy, breite, hoehe, winkel_grad):
    w = math.radians(winkel_grad)
    c, s = math.cos(w), math.sin(w)
    ecken = [(-breite / 2, -hoehe / 2), (breite / 2, -hoehe / 2), (breite / 2, hoehe / 2), (-breite / 2, hoehe / 2)]
    return [(cx + x * c - y * s, cy + x * s + y * c) for x, y in ecken]


# Flamme (gleiche Grundform wie bisher), skaliert auf den Amboss gesetzt
def flamme_auf_amboss(form, mitte_x=60, basis_y=62, faktor=0.46):
    return [(mitte_x + (x - 50) * faktor, basis_y - (94 - y) * faktor) for x, y in form]


FLAMME_AUSSEN = bezier((50, 94), [
    ((24, 94), (12, 75), (17, 58)), ((21, 45), (31, 38), (35, 25)), ((40, 35), (44, 40), (46, 45)),
    ((46, 30), (52, 15), (61, 6)), ((63, 24), (79, 36), (83, 55)), ((87, 75), (75, 94), (50, 94)),
])
FLAMME_INNEN = bezier((50, 92), [
    ((34, 92), (27, 79), (31, 67)), ((35, 56), (45, 50), (47, 38)), ((56, 52), (71, 60), (71, 75)),
    ((71, 86), (62, 92), (50, 92)),
])

AMBOSS_FORM = [
    (12, 63), (20, 61.5), (36, 60.5), (86, 60.5), (88, 66.5), (76, 68.5), (70, 70), (68, 77),
    (77, 84), (79, 91), (39, 91), (41, 84), (50, 77), (48, 70), (40, 68.5), (28, 67), (19, 65.5),
]
AMBOSS_OBERKANTE = [(20, 61.5), (36, 60.5), (86, 60.5), (86.6, 62.3), (36, 62.3), (20, 63.2)]

# Ziel-Körper in der Flamme: leuchtende Bodybuilder-Silhouette (Front), „aus dem Feuer geboren“
_RECHTS = [(61.3, 37.4), (63.6, 38.6), (67.4, 39.8), (69.2, 42.4), (69.8, 46.8), (69, 51.5), (68.4, 54.4),
           (66.9, 54.6), (66.9, 49.4), (66.1, 45), (65, 47.8), (63.2, 52.6), (63.8, 57.2), (60, 58)]
KOERPER_FORMEN = [
    kreis(60, 34.6, 2.7),
    _RECHTS + [(120 - x, y) for x, y in reversed(_RECHTS[:-1])],
]

# Schatten des Schmieds (zwergisch: gedrungen, massiger Arm, Vollbart nach vorn) links, Hammer über der Flamme
SCHMIED_FORMEN = [
    [(0, 100), (0, 56), (5, 48.5), (13, 45), (25, 45.5), (33, 50), (38, 58), (41, 72), (42, 100)],  # Rumpf, Schulter
    kreis(17.5, 35, 8.4),  # Kopf
    [(23.5, 32.5), (28.5, 36.5), (25, 38.5)],  # Nase
    [(9.5, 37.5), (26.5, 38), (31.5, 44), (29.5, 52), (24, 59), (17, 61.5), (12.5, 54), (8.5, 45)],  # Vollbart
    [(19, 47.5), (35, 52.5), (53, 27.5), (43, 18.5)],  # erhobener Arm
    kreis(42.5, 29.5, 6.2),  # Unterarm-Muskel
    kreis(47.5, 22, 5),  # Faust
    balken((47.5, 22), (61.5, 9), 3.2),  # Hammerstiel
    rechteck_gedreht(62.5, 8.5, 17, 9, 45),  # Hammerkopf
]

FUNKEN = [kreis(x, y, r, 12) for x, y, r in [(71, 21, 1.1), (75, 28, 0.8), (49, 17, 0.9), (77, 15, 0.7), (68, 13, 0.6), (53, 27, 0.6)]]


# ---------------------------------------------------------------- Rastern

def abdeckung(polygon, groesse, unterzeilen=4):
    feld = [[0.0] * groesse for _ in range(groesse)]
    kanten = list(zip(polygon, polygon[1:] + polygon[:1]))
    for y in range(groesse):
        for s in range(unterzeilen):
            sy = y + (s + 0.5) / unterzeilen
            schnitte = []
            for (x1, y1), (x2, y2) in kanten:
                if (y1 <= sy < y2) or (y2 <= sy < y1):
                    schnitte.append(x1 + (sy - y1) * (x2 - x1) / (y2 - y1))
            schnitte.sort()
            for links, rechts in zip(schnitte[::2], schnitte[1::2]):
                links, rechts = max(0.0, links), min(float(groesse), rechts)
                for x in range(int(links), min(groesse, int(rechts) + 1)):
                    anteil = min(x + 1, rechts) - max(x, links)
                    if anteil > 0:
                        feld[y][x] += anteil / unterzeilen
    return feld


def vereinige(felder, groesse):
    return [[min(1.0, sum(f[y][x] for f in felder)) for x in range(groesse)] for y in range(groesse)]


def mische(a, b, anteil):
    anteil = max(0.0, min(1.0, anteil))
    return tuple(round(x + (y - x) * anteil) for x, y in zip(a, b))


def png_schreiben(pfad, groesse, pixel):
    roh = b"".join(b"\x00" + bytes(c for px in zeile for c in px) for zeile in pixel)

    def block(typ, daten):
        inhalt = typ + daten
        return struct.pack(">I", len(daten)) + inhalt + struct.pack(">I", zlib.crc32(inhalt) & 0xFFFFFFFF)

    kopf = struct.pack(">IIBBBBB", groesse, groesse, 8, 2, 0, 0, 0)
    pfad.write_bytes(b"\x89PNG\r\n\x1a\n" + block(b"IHDR", kopf) + block(b"IDAT", zlib.compress(roh, 9)) + block(b"IEND", b""))


def icon(groesse, skala_motiv):
    """skala_motiv: Anteil der Kantenlänge, den das 100er-Raster einnimmt (maskable braucht Rand)."""
    s = groesse * skala_motiv / 100
    v = (groesse - 100 * s) / 2
    um = lambda punkte: [(v + x * s, v + y * s) for x, y in punkte]
    feld = lambda formen: vereinige([abdeckung(um(f), groesse) for f in formen], groesse)

    amboss = feld([AMBOSS_FORM])
    kante = feld([AMBOSS_OBERKANTE])
    flamme = feld([flamme_auf_amboss(FLAMME_AUSSEN)])
    koerper = feld(KOERPER_FORMEN)
    schmied = feld(SCHMIED_FORMEN)
    funken = feld(FUNKEN)

    glut_x, glut_y = v + 60 * s, v + 52 * s
    pixel = []
    for y in range(groesse):
        zeile = []
        for x in range(groesse):
            # Glühen um die Flamme, nach außen dunkel
            d = math.hypot(x - glut_x, y - glut_y) / (groesse * 0.62)
            farbe = mische(GLUT_INNEN, GLUT_MITTE, d * 1.6) if d < 0.62 else mische(GLUT_MITTE, DUNKEL, (d - 0.62) * 2.2)
            farbe = mische(farbe, AMBOSS, amboss[y][x])
            farbe = mische(farbe, AMBOSS_KANTE, kante[y][x] * 0.9)
            hoehe = ((y - v) / s - 21) / 41  # 0 = Spitze, 1 = Basis der Flamme
            farbe = mische(farbe, mische(FLAMME_OBEN, FLAMME_UNTEN, hoehe), flamme[y][x])
            farbe = mische(farbe, FLAMME_KERN, koerper[y][x] * flamme[y][x])
            farbe = mische(farbe, FUNKE, funken[y][x])
            farbe = mische(farbe, SCHATTEN, schmied[y][x] * 0.96)
            zeile.append(farbe)
        pixel.append(zeile)
    return pixel


if __name__ == "__main__":
    ziel = Path(__file__).resolve().parent.parent / "icons"
    ziel.mkdir(exist_ok=True)
    for name, groesse, skala in [
        ("icon-192.png", 192, 1.0),
        ("icon-512.png", 512, 1.0),
        ("icon-maskable-512.png", 512, 0.8),
    ]:
        png_schreiben(ziel / name, groesse, icon(groesse, skala))
        print("geschrieben:", ziel / name)
