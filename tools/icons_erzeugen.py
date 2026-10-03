"""Erzeugt die App-Icons (PNG) ohne Zusatzbibliotheken.

Motiv: grüner Hintergrund, weißer Teller, grünes Blatt.
Aufruf: python tools/icons_erzeugen.py
"""
import math
import struct
import zlib
from pathlib import Path

GRUEN = (47, 125, 79)
WEISS = (255, 255, 255)
BLATT = (92, 191, 133)


def png_schreiben(pfad, breite, hoehe, pixel):
    roh = b"".join(b"\x00" + bytes(c for px in zeile for c in px) for zeile in pixel)

    def block(typ, daten):
        inhalt = typ + daten
        return struct.pack(">I", len(daten)) + inhalt + struct.pack(">I", zlib.crc32(inhalt) & 0xFFFFFFFF)

    kopf = struct.pack(">IIBBBBB", breite, hoehe, 8, 2, 0, 0, 0)
    daten = b"\x89PNG\r\n\x1a\n" + block(b"IHDR", kopf) + block(b"IDAT", zlib.compress(roh, 9)) + block(b"IEND", b"")
    pfad.write_bytes(daten)


def mische(a, b, anteil):
    return tuple(round(x + (y - x) * anteil) for x, y in zip(a, b))


def icon(groesse, motiv_anteil):
    """motiv_anteil: Anteil der Kantenlänge, den der Teller einnimmt (maskable braucht Rand)."""
    mitte = groesse / 2
    r_teller = groesse * motiv_anteil / 2
    r_innen = r_teller * 0.78
    pixel = []
    for y in range(groesse):
        zeile = []
        for x in range(groesse):
            px, py = x + 0.5, y + 0.5
            d = math.hypot(px - mitte, py - mitte)
            farbe = GRUEN
            # Teller mit weichem Rand (Kantenglättung über 1 px)
            farbe = mische(farbe, WEISS, max(0.0, min(1.0, r_teller - d + 0.5)))
            # Innerer Ring leicht abgesetzt
            ring = max(0.0, min(1.0, r_innen - d + 0.5)) - max(0.0, min(1.0, r_innen - 2 - d + 0.5))
            farbe = mische(farbe, (225, 232, 228), ring)
            # Blatt: Schnittmenge zweier Kreise, um 45° gedreht
            u = ((px - mitte) + (py - mitte)) / math.sqrt(2)
            v = ((px - mitte) - (py - mitte)) / math.sqrt(2)
            versatz = r_innen * 0.45
            r_blatt = r_innen * 0.75
            if math.hypot(u, v - versatz) < r_blatt and math.hypot(u, v + versatz) < r_blatt:
                farbe = BLATT
            zeile.append(farbe)
        pixel.append(zeile)
    return pixel


if __name__ == "__main__":
    ziel = Path(__file__).resolve().parent.parent / "icons"
    ziel.mkdir(exist_ok=True)
    for name, groesse, anteil in [
        ("icon-192.png", 192, 0.80),
        ("icon-512.png", 512, 0.80),
        ("icon-maskable-512.png", 512, 0.60),
    ]:
        png_schreiben(ziel / name, groesse, groesse, icon(groesse, anteil))
        print("geschrieben:", ziel / name)
