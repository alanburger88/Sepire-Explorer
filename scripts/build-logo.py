"""Vectorise the supplied Sepire logo PNG into the brand assets the explorer uses.

    python3 scripts/build-logo.py        (needs potrace, Pillow and numpy)

The logo was supplied as a 287x72 two-tone raster. It is upsampled 10x, split into its
dark (#FF7100) and light (#FF993B) regions, traced with potrace, and written to
public/brand/: sepire-logo.svg, sepire-mark.svg (the S only), sepire-mark.png,
sepire-mark-white.png and favicon-64.png.

Replace these with official artwork when it is available; nothing else needs to change.
"""
from PIL import Image
import numpy as np, subprocess, re, os, tempfile

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'source', 'brand', 'sepire-logo.png')
OUT = os.path.join(ROOT, 'public', 'brand')
os.makedirs(OUT, exist_ok=True)
TMP = tempfile.mkdtemp(prefix='sepire-logo-')
DARK = '#FF7100'; LIGHT = '#FF993B'

im = Image.open(SRC).convert('RGBA'); W, H = im.size; S = 10
a = np.asarray(im).astype(np.float64) / 255.0
pm = np.concatenate([a[..., :3] * a[..., 3:4], a[..., 3:4]], axis=-1)
up = [np.asarray(Image.fromarray((pm[..., c] * 255).astype(np.uint8), 'L').resize((W * S, H * S), Image.BICUBIC)).astype(np.float64) / 255.0 for c in range(4)]
R, G, B, A = up
g = np.where(A > 0.02, G / np.maximum(A, 1e-6), 0)
shape = A > 0.5
light = shape & (((g - 0.443) / (0.157)) > 0.5)


def trace(mask, name):
    base = os.path.join(TMP, name)
    Image.fromarray(np.where(mask, 0, 255).astype(np.uint8), 'L').convert('1').save(base + '.pbm')
    subprocess.run(['potrace', base + '.pbm', '-s', '-o', base + '.svg', '--turdsize', '40', '--alphamax', '1.0', '--opttolerance', '0.3'], check=True)
    svg = open(base + '.svg').read()
    return ' '.join(re.findall(r'<path d="([^"]+)"', svg))


def compose(x0, x1, fname, title):
    m = np.zeros_like(shape); m[:, x0 * S:x1 * S] = True
    d_all = trace(shape & m, 'all_' + fname); d_light = trace(light & m, 'light_' + fname)
    vb_w = x1 - x0
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} 0 {vb_w} {H}" role="img" aria-label="{title}">'
           f'<title>{title}</title><g transform="scale(0.1) translate(0,{H * S}) scale(0.1,-0.1)">'
           f'<path fill="{DARK}" d="{d_all}"/><path fill="{LIGHT}" d="{d_light}"/></g></svg>')
    open(os.path.join(OUT, fname), 'w').write(svg); print(fname, len(svg))


compose(0, W, 'sepire-logo.svg', 'Sepire')
compose(2, 73, 'sepire-mark.svg', 'Sepire')

# PNG marks from the high-res anti-aliased raster (S region only)
x0, x1 = 2 * S, 73 * S
alpha = A[:, x0:x1]
dark_rgb = np.array([255, 113, 0]) / 255; light_rgb = np.array([255, 153, 59]) / 255
tt = np.clip((g[:, x0:x1] - 0.443) / 0.157, 0, 1)[..., None]
col = dark_rgb * (1 - tt) + light_rgb * tt


def save_png(rgb, alpha, name, size=256, pad=0.1):
    img = Image.fromarray(np.dstack([(rgb * 255).clip(0, 255), alpha * 255]).astype(np.uint8), 'RGBA')
    bbox = img.getbbox(); img = img.crop(bbox)
    inner = int(size * (1 - 2 * pad)); sc = inner / max(img.size)
    img = img.resize((max(1, round(img.width * sc)), max(1, round(img.height * sc))), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0)); canvas.alpha_composite(img, ((size - img.width) // 2, (size - img.height) // 2))
    canvas.save(os.path.join(OUT, name)); print(name, canvas.size)


save_png(col, alpha, 'sepire-mark.png')
save_png(np.ones(alpha.shape + (3,)), alpha, 'sepire-mark-white.png')
save_png(col, alpha, 'favicon-64.png', size=64, pad=0.06)
