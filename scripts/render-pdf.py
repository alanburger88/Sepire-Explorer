"""Render the source PDF to page images for the PDF → Interactive explorer.

    python3 scripts/render-pdf.py

Writes public/pdf/page-N.webp (2x, for the viewer) and public/pdf/thumb-N.webp, and prints
every text span with its box (PDF points) so hotspot rectangles can be authored by hand
in src/sections/compare/mappings.ts.
"""
import io, json, os, sys
import fitz  # PyMuPDF
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'source', 'Sepire_Statement_v1.1.pdf')
OUT = os.path.join(ROOT, 'public', 'pdf')
os.makedirs(OUT, exist_ok=True)

doc = fitz.open(SRC)
layout = []
for i, page in enumerate(doc, start=1):
    for scale, name, q in ((2.0, f'page-{i}.webp', 82), (0.36, f'thumb-{i}.webp', 80)):
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
        img = Image.open(io.BytesIO(pix.tobytes('png')))
        img.save(os.path.join(OUT, name), 'WEBP', quality=q, method=6)
    layout.append({'page': i, 'width': page.rect.width, 'height': page.rect.height})
    if '--spans' in sys.argv:
        for b in page.get_text('dict')['blocks']:
            for l in b.get('lines', []):
                t = ''.join(s['text'] for s in l['spans']).strip()
                if t:
                    x0, y0, x1, y1 = l['bbox']
                    print(f'p{i} [{x0:6.1f},{y0:6.1f},{x1:6.1f},{y1:6.1f}] {t[:70]}')
print(json.dumps(layout))
