"""Erzeugt die FORGE-App-Icons (PNG) ohne Zusatzbibliotheken.

Motiv: weiße Flamme mit ausgesparten Kern auf diagonalem Glut-Verlauf (orange → rot).
Die Flamme ist aus Bézierkurven aufgebaut und wird per Scanline mit Kantenglättung gefüllt.
Aufruf: python tools/icons_erzeugen.py
"""
import struct
import zlib
from pathlib import Path

VERLAUF_START = (251, 146, 60)  # #fb923c
VERLAUF_ENDE = (244, 63, 94)    # #f43f5e
WEISS = (255, 255, 255)

# Flamme im 100×100-Raster: Startpunkt, dann kubische Bézierkurven (je 3 Punkte)
AUSSEN = [(50, 94), [
    ((24, 94), (12, 75), (17, 58)),
    ((21, 45), (31, 38), (35, 25)),
    ((40, 35), (44, 40), (46, 45)),
    ((46, 30), (52, 15), (61, 6)),
    ((63, 24), (79, 36), (83, 55)),
    ((87, 75), (75, 94), (50, 94)),
]]
KERN = [(50, 87), [
    ((38, 87), (33, 77), (36, 68)),
    ((39, 60), (46, 56), (48, 47)),
    ((55, 58), (65, 64), (65, 74)),
    ((65, 82), (59, 87), (50, 87)),
]]


def bezier_punkte(form, schritte=24):
    start, kurven = form
    punkte = [start]
    p0 = start
    for p1, p2, p3 in kurven:
        for i in range(1, schritte + 1):
            t = i / schritte
            u = 1 - t
            x = u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0]
            y = u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]
            punkte.append((x, y))
        p0 = p3
    return punkte


def abdeckung(polygon, groesse, unterzeilen=4):
    """Anteil (0..1) jedes Pixels, der im Polygon liegt – Scanline mit Unterzeilen und anteiligen Rändern."""
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


def icon(groesse, motiv_anteil):
    """motiv_anteil: Anteil der Kantenlänge, den die Flamme einnimmt (maskable braucht mehr Rand)."""
    skala = groesse * motiv_anteil / 100
    versatz = (groesse - 100 * skala) / 2
    umrechnen = lambda punkte: [(versatz + x * skala, versatz + y * skala) for x, y in punkte]
    aussen = abdeckung(umrechnen(bezier_punkte(AUSSEN)), groesse)
    kern = abdeckung(umrechnen(bezier_punkte(KERN)), groesse)

    pixel = []
    for y in range(groesse):
        zeile = []
        for x in range(groesse):
            hintergrund = mische(VERLAUF_START, VERLAUF_ENDE, (x + y) / (2 * groesse))
            weiss = max(0.0, aussen[y][x] - kern[y][x])  # Kern ausgespart → Hintergrund scheint durch
            zeile.append(mische(hintergrund, WEISS, weiss))
        pixel.append(zeile)
    return pixel


if __name__ == "__main__":
    ziel = Path(__file__).resolve().parent.parent / "icons"
    ziel.mkdir(exist_ok=True)
    for name, groesse, anteil in [
        ("icon-192.png", 192, 0.78),
        ("icon-512.png", 512, 0.78),
        ("icon-maskable-512.png", 512, 0.58),
    ]:
        png_schreiben(ziel / name, groesse, icon(groesse, anteil))
        print("geschrieben:", ziel / name)
