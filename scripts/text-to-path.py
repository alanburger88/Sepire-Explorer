"""Convert a line of text to an SVG path using a font file (fontTools).

Used once to build source/brand/plan-sponsor-logo.svg so the co-brand logo renders
identically in <img> tags (which cannot load web fonts).

usage: python3 scripts/text-to-path.py FONT.woff "Text" SIZE [TRACKING_EM]
prints: JSON {"d": "...", "width": float, "ascent": float, "descent": float}
"""
import json, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

font_path, text, size = sys.argv[1], sys.argv[2], float(sys.argv[3])
tracking = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0
font = TTFont(font_path)
upm = font['head'].unitsPerEm
scale = size / upm
cmap = font.getBestCmap()
glyphs = font.getGlyphSet()
hmtx = font['hmtx']
pen = SVGPathPen(glyphs)
x = 0.0
for ch in text:
    name = cmap.get(ord(ch))
    if name is None:
        continue
    # flip Y (font units are y-up) and place on a baseline at y=0
    tp = TransformPen(pen, (scale, 0, 0, -scale, x, 0))
    glyphs[name].draw(tp)
    x += hmtx[name][0] * scale + tracking * size
os2 = font['OS/2']
print(json.dumps({
    'd': pen.getCommands(),
    'width': round(x - tracking * size, 2),
    'ascent': round(os2.sTypoAscender * scale, 2),
    'descent': round(-os2.sTypoDescender * scale, 2),
}))
